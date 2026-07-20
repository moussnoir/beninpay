import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';

// Contourner la vérification SSL pour développement local Windows
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

function getFedaPayKey() {
  const key = process.env.FEDAPAY_SECRET_KEY || process.env.FEDAPAY_SANDBOX_KEY;
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
 * Crée un paiement FedaPay
 * @param {number} amount - Montant en XOF
 * @param {string} phone - Numéro de téléphone
 * @param {string} operator - Opérateur (mtn, moov, celtis)
 * @param {string} customerName - Nom du client
 * @param {string} customerEmail - Email du client
 * @param {string} description - Description de la transaction
 * @param {string} callbackUrl - URL de callback
 * @param {string} orderId - ID de la commande Shopify
 */
export async function createPayment(
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
  const { PLANS, calculateCommission } = await import('../config/plans.js');

  // Calculer la commission BeninPay
  const commission = calculateCommission(shopPlan, amount);
  const merchantAmount = amount - commission;

  console.log('💰 Calcul commission:', {
    plan: shopPlan,
    montantTotal: amount,
    commission: commission,
    montantMarchand: merchantAmount
  });

  // MODE SIMULATION - Pour tester sans vraie API FedaPay
  if (process.env.SIMULATION_MODE === 'true') {
    console.log('🧪 MODE SIMULATION - Paiement simulé');
    return {
      success: true,
      transactionId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      token: `tok_simulation_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      message: '✅ Paiement simulé avec succès (Mode Test)',
      simulation: true,
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
    // Si operator est vide, FedaPay demandera (hosted payment)
    // Sinon vérifier qu'il est supporté
    if (operator && operator.toLowerCase()) {
      const operatorCode = OPERATOR_MAPPING[operator.toLowerCase()];
      if (!operatorCode) {
        console.log('⚠️ Opérateur non mappé, FedaPay demandera:', operator);
      }
    }

    // Étape 1: Créer la transaction (FedaPay hosted payment)
    const transactionResponse = await axios.post(
      `${FEDAPAY_BASE_URL}/transactions`,
      {
        description: description || `Paiement BeninPay - Commande ${orderId}`,
        amount: amount,
        currency: {
          iso: 'XOF'
        },
        callback_url: callbackUrl,  // Activer webhook
        custom_metadata: {
          order_id: orderId,
          customer_name: customerName,
          customer_email: customerEmail,
          shop_domain: orderId.split('-')[0] // Extraire shop si format shop-orderid
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

    // FedaPay retourne "v1/transaction" pas "v1"
    const transaction = transactionResponse.data['v1/transaction'] || transactionResponse.data.v1;

    // La transaction contient déjà tout ce qu'il faut!
    return {
      success: true,
      transactionId: transaction.id,
      reference: transaction.reference,
      payment_url: transaction.payment_url,
      payment_token: transaction.payment_token,
      status: transaction.status,
      amount: transaction.amount,
      currency: 'XOF',
      message: '✅ Transaction créée! Le client doit ouvrir payment_url pour payer.',
      instructions: {
        fr: `Envoyez ce lien au client: ${transaction.payment_url}`,
        en: `Send this link to customer: ${transaction.payment_url}`
      },
      data: transaction
    };
  } catch (error) {
    console.error('Erreur FedaPay createPayment:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      details: error.response?.data
    };
  }
}

/**
 * Vérifie le statut d'une transaction
 * @param {string} transactionId - ID de la transaction FedaPay
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
      simulation: true,
      data: {
        note: 'Ceci est une simulation. Statut fictif.'
      }
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

    return {
      success: true,
      status: response.data.v1.status,
      amount: response.data.v1.amount,
      currency: response.data.v1.currency.iso,
      description: response.data.v1.description,
      metadata: response.data.v1.custom_metadata,
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
