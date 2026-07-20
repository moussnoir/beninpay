/**
 * Vérification complète du compte FedaPay
 */

import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const FEDAPAY_SECRET_KEY = process.env.FEDAPAY_SECRET_KEY;
const FEDAPAY_BASE_URL = 'https://api.fedapay.com/v1';

console.log('\n🔍 DIAGNOSTIC COMPLET COMPTE FEDAPAY\n');

async function checkAccount() {
  try {
    // Test 1: Vérifier les infos du compte
    console.log('1️⃣ Vérification des informations du compte...');
    const accountResponse = await axios.get(
      `${FEDAPAY_BASE_URL}/account`,
      {
        headers: {
          'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        httpsAgent
      }
    );

    const account = accountResponse.data['v1/account'] || accountResponse.data.v1;
    console.log('✅ Compte:', {
      id: account.id,
      name: account.name,
      status: account.status,
      verified: account.verified,
      country: account.country
    });

    // Test 2: Vérifier les capacités du compte
    console.log('\n2️⃣ Vérification des capacités...');
    console.log('   Capacités activées:', account.capabilities || 'Non disponible');

    // Test 3: Lister les transactions récentes
    console.log('\n3️⃣ Transactions récentes...');
    const transactionsResponse = await axios.get(
      `${FEDAPAY_BASE_URL}/transactions?limit=3`,
      {
        headers: {
          'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        httpsAgent
      }
    );

    const transactions = transactionsResponse.data['v1/transactions'] || transactionsResponse.data.v1 || [];
    console.log(`   ${transactions.length} transaction(s) trouvée(s)`);
    
    transactions.forEach((tx, i) => {
      console.log(`   ${i+1}. ID: ${tx.id}, Status: ${tx.status}, Amount: ${tx.amount} XOF`);
      console.log(`      Payment URL: ${tx.payment_url ? 'Généré' : 'Pas de URL'}`);
    });

    // Test 4: Vérifier la dernière transaction en détail
    if (transactions.length > 0) {
      console.log('\n4️⃣ Détails de la dernière transaction...');
      const lastTx = transactions[0];
      const txDetailResponse = await axios.get(
        `${FEDAPAY_BASE_URL}/transactions/${lastTx.id}`,
        {
          headers: {
            'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
            'Content-Type': 'application/json'
          },
          httpsAgent
        }
      );

      const txDetail = txDetailResponse.data['v1/transaction'] || txDetailResponse.data.v1;
      console.log('   Détails complets:');
      console.log('   - Status:', txDetail.status);
      console.log('   - Payment URL:', txDetail.payment_url);
      console.log('   - Payment Token:', txDetail.payment_token ? 'Présent' : 'Absent');
      console.log('   - Mode:', txDetail.mode || 'Non spécifié');
      console.log('   - Last Error:', txDetail.last_error_code || 'Aucune');
    }

    // Test 5: Tester si on peut créer un token
    console.log('\n5️⃣ Test de génération de token...');
    const testTxResponse = await axios.post(
      `${FEDAPAY_BASE_URL}/transactions`,
      {
        description: 'Test diagnostic',
        amount: 50,
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

    const testTx = testTxResponse.data['v1/transaction'] || testTxResponse.data.v1;
    console.log('✅ Transaction test créée:', testTx.id);
    console.log('   Payment URL généré:', testTx.payment_url ? 'OUI' : 'NON');

    if (testTx.payment_url) {
      console.log('   URL:', testTx.payment_url);
      
      // Tester si l'URL répond
      try {
        const urlTest = await axios.head(testTx.payment_url, { 
          timeout: 5000,
          maxRedirects: 0,
          validateStatus: () => true 
        });
        console.log('   ✅ URL accessible (Status:', urlTest.status + ')');
      } catch (urlError) {
        console.log('   ❌ URL inaccessible:', urlError.message);
      }
    }

    // Diagnostic final
    console.log('\n📊 DIAGNOSTIC FINAL:');
    
    if (account.status !== 'activated') {
      console.log('❌ PROBLÈME: Compte non activé');
      console.log('   → Ton compte FedaPay doit être activé');
      console.log('   → Contacte: support@fedapay.com');
      console.log('   → Dashboard: https://dashboard.fedapay.com');
    }

    if (!account.verified) {
      console.log('⚠️  ATTENTION: Compte non vérifié');
      console.log('   → Vérifie ton email et documents KYC');
    }

    if (!testTx.payment_url) {
      console.log('❌ PROBLÈME: Payment URL non générée');
      console.log('   → Les payment links ne sont pas activés');
      console.log('   → SOLUTION: Utiliser le flux Mobile Money Direct (softpay)');
    }

    console.log('\n✅ RECOMMANDATIONS:');
    console.log('1. Si compte non activé → Contacter FedaPay');
    console.log('2. En attendant → Utiliser SIMULATION_MODE=true');
    console.log('3. Alternative → Implémenter flux Mobile Money Direct (pas de lien)');

  } catch (error) {
    console.error('\n❌ ERREUR:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n⚠️  Clé API invalide ou expirée');
      console.log('   Vérifie FEDAPAY_SECRET_KEY dans .env');
    }
  }
}

checkAccount().then(() => {
  console.log('\n🏁 Diagnostic terminé\n');
  process.exit(0);
}).catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
