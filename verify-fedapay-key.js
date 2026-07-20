/**
 * Vérification simple de la clé FedaPay
 */

import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const FEDAPAY_SECRET_KEY = process.env.FEDAPAY_SECRET_KEY;

console.log('\n🔑 VÉRIFICATION CLÉ FEDAPAY\n');
console.log('Clé:', FEDAPAY_SECRET_KEY.substring(0, 25) + '...');
console.log('Longueur:', FEDAPAY_SECRET_KEY.length, 'caractères');
console.log('Format:', FEDAPAY_SECRET_KEY.startsWith('sk_live_') ? '✅ LIVE' : 
            FEDAPAY_SECRET_KEY.startsWith('sk_sandbox_') ? '✅ SANDBOX' : 
            '❌ Format invalide');

// Test simple: créer une transaction
async function testKey() {
  try {
    console.log('\n📝 Test: Création d\'une transaction...\n');
    
    const response = await axios.post(
      'https://api.fedapay.com/v1/transactions',
      {
        description: 'Test clé API',
        amount: 100,
        currency: { iso: 'XOF' }
      },
      {
        headers: {
          'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        httpsAgent
      }
    );

    const tx = response.data['v1/transaction'] || response.data.v1;
    
    console.log('✅ CLÉ VALIDE!');
    console.log('\nTransaction créée:');
    console.log('  ID:', tx.id);
    console.log('  Référence:', tx.reference);
    console.log('  Status:', tx.status);
    console.log('  Payment URL:', tx.payment_url || '❌ PAS GÉNÉRÉ');
    
    if (!tx.payment_url) {
      console.log('\n❌ PROBLÈME IDENTIFIÉ:');
      console.log('  → Payment URLs ne sont PAS générées');
      console.log('  → Ton compte FedaPay N\'EST PAS activé pour payment links');
      console.log('\n💡 SOLUTIONS:');
      console.log('  1. Contacter FedaPay: support@fedapay.com');
      console.log('  2. Demander activation "Payment Links"');
      console.log('  3. OU utiliser flux Mobile Money Direct (softpay API)');
      console.log('\n📞 Dashboard FedaPay: https://dashboard.fedapay.com');
    } else {
      console.log('\n✅ Payment URL générée! Teste-la dans un navigateur.');
    }

  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❌ CLÉ INVALIDE!');
      console.log('  La clé API ne fonctionne pas.');
      console.log('  Vérifie dans ton dashboard FedaPay:');
      console.log('  https://dashboard.fedapay.com/settings/api-keys');
    } else {
      console.log('❌ ERREUR:', error.response?.data || error.message);
    }
  }
}

testKey().then(() => process.exit(0));
