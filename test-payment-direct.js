/**
 * Test de paiement direct avec FedaPay
 * Teste le flux complet: transaction + token + paiement mobile
 */

import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const FEDAPAY_SECRET_KEY = process.env.FEDAPAY_SECRET_KEY;
const FEDAPAY_BASE_URL = 'https://api.fedapay.com/v1';

console.log('\n🧪 TEST PAIEMENT FEDAPAY DIRECT\n');
console.log('🔑 Clé:', FEDAPAY_SECRET_KEY ? FEDAPAY_SECRET_KEY.substring(0, 20) + '...' : 'MANQUANTE');

async function testPayment() {
  try {
    // Étape 1: Créer la transaction
    console.log('\n📝 Étape 1: Création de la transaction...');
    const transactionResponse = await axios.post(
      `${FEDAPAY_BASE_URL}/transactions`,
      {
        description: 'Test paiement BeninPay - Vérification lien',
        amount: 100,
        currency: { iso: 'XOF' },
        custom_metadata: {
          order_id: 'TEST-DIRECT-001',
          test: true
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

    console.log('✅ Transaction créée:');
    console.log('   ID:', transaction.id);
    console.log('   Référence:', transaction.reference);
    console.log('   Statut:', transaction.status);
    console.log('   Payment URL:', transaction.payment_url);
    console.log('   Payment Token:', transaction.payment_token);

    // Étape 2: Vérifier la structure de la réponse
    console.log('\n📊 Structure complète:');
    console.log(JSON.stringify(transaction, null, 2));

    // Étape 3: Tester le lien
    console.log('\n🔗 Test du lien de paiement...');
    try {
      const linkTest = await axios.get(transaction.payment_url, {
        maxRedirects: 0,
        validateStatus: (status) => status < 500
      });
      console.log('✅ Lien accessible, status:', linkTest.status);
    } catch (linkError) {
      if (linkError.response) {
        console.log('⚠️  Status HTTP:', linkError.response.status);
        console.log('   Headers:', linkError.response.headers);
      } else {
        console.log('❌ Erreur réseau:', linkError.message);
      }
    }

    // Étape 4: Vérifier le statut via API
    console.log('\n🔍 Vérification du statut via API...');
    const statusResponse = await axios.get(
      `${FEDAPAY_BASE_URL}/transactions/${transaction.id}`,
      {
        headers: {
          'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        httpsAgent
      }
    );

    const status = statusResponse.data['v1/transaction'] || statusResponse.data.v1;
    console.log('✅ Statut actuel:', status.status);
    console.log('   Montant:', status.amount, status.currency?.iso || 'XOF');

    // Résumé final
    console.log('\n📋 RÉSUMÉ:');
    console.log('   Transaction ID:', transaction.id);
    console.log('   Lien de paiement:', transaction.payment_url);
    console.log('   Statut:', status.status);
    console.log('\n💡 INSTRUCTIONS:');
    console.log('   1. Ouvre ce lien dans un navigateur:');
    console.log('      ' + transaction.payment_url);
    console.log('   2. Suis les instructions FedaPay pour payer');
    console.log('   3. Vérifie le statut avec: node test-check-status.js ' + transaction.id);

    return {
      success: true,
      transactionId: transaction.id,
      paymentUrl: transaction.payment_url
    };

  } catch (error) {
    console.error('\n❌ ERREUR:', error.response?.data || error.message);
    if (error.response?.data) {
      console.log('Détails:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

// Exécuter le test
testPayment().then(result => {
  console.log('\n🏁 Test terminé\n');
  process.exit(result.success ? 0 : 1);
});
