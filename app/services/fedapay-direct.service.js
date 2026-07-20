/**
 * FedaPay Service - Mobile Money DIRECT
 * Flux sans payment_url - Le client reçoit USSD direct sur son téléphone
 */

import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

function getFedaPayKey() {
  const key = process.env.NODE_ENV === 'production'
    ? process.env.FEDAPAY_SECRET_KEY
    : process.env.FEDAPAY_SANDBOX_KEY;

  return key;
}

const FEDAPAY_BASE_URL = process.env.FEDAPAY_BASE_URL || 'https://api.fedapay.com/v1';

// Mapping des opérateurs
const OPERATOR_MAPPING = {
  mtn: 'mtn_open',
  moov: 'moov',
  celtis: 'sbin'
};

/**
 * Flux Mobile Money DIRECT - Pas de lien, USSD envoyé directement au téléphone
 * @param {number} amount - Montant en XOF
 * @param {string} phone - Numéro de téléphone (22997000000)
 * @param {string} operator - Opérateur (mtn, moov, celtis)
 * @param {string} customerName - Nom du client
 * @param {string} customerEmail - Email du client
 * @param {string} description - Description de la transaction
 * @param {string} callbackUrl - URL de callback
 * @param {string} orderId - ID de la commande Shopify
 * @param {string} shopPlan - Plan de la boutique (pour commission)
 */
export async function createDirectPayment(
  amount,
  phone,
  operator,
  customerName,
  customerEmail,
  description,
  callbackUrl,
  orderId,
  shopPlan = 'free'
) {
  const FEDAPAY_SECRET_KEY = getFedaPayKey();

  // Importer la config des plans
  const { calculateCommission } = await import('../config/plans.js');

  // Calculer la commission BeninPay
  const commission = calculateCommission(shopPlan, amount);
  const merchantAmount = amount - commission;

  console.log('💰 Calcul commission:', {
    plan: shopPlan,
    montantTotal: amount,
    commission: commission,
    montantMarchand: merchantAmount
  });

  // MODE SIMULATION
  if (process.env.SIMULATION_MODE === 'true') {
    console.log('🧪 MODE SIMULATION - Paiement simulé');
    return {
      success: true,
      transactionId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reference: `ref_sim_${Date.now()}`,
      status: 'pending',
      message: '✅ Paiement simulé avec succès (Mode Test)',
      simulation: true,
      instructions: {
        fr: `SIMULATION: Le client ${customerName} recevrait un USSD *XXX# sur le ${phone}`,
        en: `SIMULATION: Customer ${customerName} would receive USSD *XXX# on ${phone}`
      },
      data: {
        amount,
        phone,
        operator,
        customerName,
        customerEmail,
        orderId,
        note: 'Ceci est une simulation. Aucun appel réel à FedaPay.'
      }
    };
  }

  try {
    const operatorCode = OPERATOR_MAPPING[operator.toLowerCase()];

    if (!operatorCode) {
      throw new Error(`Opérateur non supporté: ${operator}`);
    }

    // ÉTAPE 1: Créer la transaction
    console.log('📝 Étape 1/3: Création transaction FedaPay...');
    const transactionResponse = await axios.post(
      `${FEDAPAY_BASE_URL}/transactions`,
      {
        description: description || `Paiement BeninPay - Commande ${orderId}`,
        amount: amount,
        currency: { iso: 'XOF' },
        callback_url: callbackUrl,
        custom_metadata: {
          order_id: orderId,
          customer_name: customerName,
          customer_email: customerEmail,
          shop_plan: shopPlan,
          beninpay_commission: commission,
          merchant_amount: merchantAmount
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        httpsAgent
      }
    );

    const transaction = transactionResponse.data['v1/transaction'] || transactionResponse.data.v1;
    console.log(`✅ Transaction créée: ${transaction.id}`);

    // ÉTAPE 2: Générer le token de paiement
    console.log('🔐 Étape 2/3: Génération token...');
    const tokenResponse = await axios.post(
      `${FEDAPAY_BASE_URL}/transactions/${transaction.id}/token`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        httpsAgent
      }
    );

    const tokenData = tokenResponse.data['v1/token'] || tokenResponse.data.v1 || tokenResponse.data;
    const paymentToken = tokenData.token || transaction.payment_token;
    console.log(`✅ Token généré: ${paymentToken.substring(0, 30)}...`);

    // ÉTAPE 3: Initier le paiement Mobile Money DIRECT
    console.log(`📱 Étape 3/3: Initiation paiement ${operator.toUpperCase()} Direct...`);

    // Formater le numéro de téléphone (enlever +229 si présent)
    let phoneNumber = phone.replace(/\+/g, '').replace(/\s/g, '');
    if (phoneNumber.startsWith('229')) {
      phoneNumber = phoneNumber.substring(3);
    }

    const softpayResponse = await axios.post(
      `${FEDAPAY_BASE_URL}/softpay/${operatorCode}`,
      {
        token: paymentToken,
        phone_number: {
          number: phoneNumber,
          country: 'bj'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        httpsAgent
      }
    );

    console.log('✅ Paiement Mobile Money initié!');

    return {
      success: true,
      transactionId: transaction.id,
      reference: transaction.reference,
      status: 'pending',
      amount: transaction.amount,
      currency: 'XOF',
      message: `✅ Paiement ${operator.toUpperCase()} initié! Le client reçoit un prompt USSD sur son téléphone.`,
      instructions: {
        fr: `Le client ${customerName} doit composer le code USSD reçu sur le ${phone} et entrer son code PIN pour valider le paiement de ${amount} XOF.`,
        en: `Customer ${customerName} must dial the USSD code received on ${phone} and enter PIN code to validate payment of ${amount} XOF.`
      },
      data: {
        transaction,
        softpay: softpayResponse.data
      }
    };

  } catch (error) {
    console.error('❌ Erreur FedaPay Direct:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
      hint: 'Vérifiez que le numéro de téléphone est valide et que l\'opérateur est correct.'
    };
  }
}

/**
 * Vérifie le statut d'une transaction (même fonction que le service normal)
 */
export async function checkTransactionStatus(transactionId) {
  const FEDAPAY_SECRET_KEY = getFedaPayKey();

  // MODE SIMULATION
  if (process.env.SIMULATION_MODE === 'true') {
    console.log('🧪 MODE SIMULATION - Statut simulé');
    return {
      success: true,
      status: transactionId.startsWith('sim_') ? 'approved' : 'pending',
      amount: 100,
      currency: 'XOF',
      description: 'Transaction simulée',
      simulation: true
    };
  }

  try {
    const response = await axios.get(
      `${FEDAPAY_BASE_URL}/transactions/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        httpsAgent
      }
    );

    const tx = response.data['v1/transaction'] || response.data.v1;

    return {
      success: true,
      status: tx.status,
      amount: tx.amount,
      currency: tx.currency?.iso || 'XOF',
      description: tx.description,
      metadata: tx.custom_metadata,
      data: response.data
    };
  } catch (error) {
    console.error('Erreur FedaPay checkTransactionStatus:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

export default {
  createDirectPayment,
  checkTransactionStatus
};
