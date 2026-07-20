import { createDirectPayment } from './app/services/fedapay-direct.service.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('\n🚀 TEST PAIEMENT MOBILE MONEY DIRECT\n');

const testData = {
  amount: 100,
  phone: '22997000000',  // Numéro test
  operator: 'mtn',
  customerName: 'Test Client Direct',
  customerEmail: 'test@beninpay.com',
  description: 'Test paiement direct sans lien',
  callbackUrl: 'http://localhost:3000/api/payment/webhook',
  orderId: 'DIRECT-TEST-001',
  shopPlan: 'free'
};

console.log('📋 Données du test:');
console.log(JSON.stringify(testData, null, 2));
console.log('\n💡 Le client recevra un USSD *XXX# sur son téléphone\n');

createDirectPayment(
  testData.amount,
  testData.phone,
  testData.operator,
  testData.customerName,
  testData.customerEmail,
  testData.description,
  testData.callbackUrl,
  testData.orderId,
  testData.shopPlan
).then(result => {
  console.log('\n📊 RÉSULTAT:\n');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('\n✅ SUCCESS!');
    console.log('Transaction ID:', result.transactionId);
    console.log('Status:', result.status);
    console.log('\n💬 Instructions:');
    console.log(result.instructions.fr);
  } else {
    console.log('\n❌ ERREUR:', result.error);
  }
  
  process.exit(result.success ? 0 : 1);
}).catch(err => {
  console.error('\n❌ Erreur fatale:', err);
  process.exit(1);
});
