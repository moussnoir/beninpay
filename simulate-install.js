/**
 * Script pour simuler l'installation de BeninPay sur une boutique Shopify
 * Crée une session comme si l'OAuth avait été complété
 */

import { initDatabase, get, insert } from './db/json-store.js';

// Initialiser la DB
await initDatabase();

console.log('🔧 Simulation d\'installation BeninPay sur Shopify\n');

// Demander le nom de la boutique
const args = process.argv.slice(2);
const shopDomain = args[0] || 'demo-beninpay.myshopify.com';

console.log(`📊 Boutique cible : ${shopDomain}\n`);

// Vérifier si le marchand existe déjà
let merchant = await get('merchants', { shop_domain: shopDomain });

if (!merchant) {
  console.log('✨ Création du marchand...');

  // Créer le marchand
  const result = await insert('merchants', {
    shop_domain: shopDomain,
    shop_name: shopDomain.replace('.myshopify.com', ''),
    email: `contact@${shopDomain}`,
    business_name: `Boutique ${shopDomain.split('.')[0]}`,
    status: 'active',
    balance: 0,
    total_earned: 0,
    total_withdrawn: 0,
    shopify_access_token: 'shpat_simulated_' + Date.now(),
    shopify_scopes: 'read_orders,write_orders,read_products,read_customers,write_checkouts',
    installed_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  });

  merchant = await get('merchants', { id: result.id });
  console.log('✅ Marchand créé avec succès !\n');
} else {
  console.log('ℹ️  Le marchand existe déjà\n');
}

// Afficher les informations
console.log('═══════════════════════════════════════════════════════════════');
console.log('                   ✅ INSTALLATION RÉUSSIE !                   ');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('📊 Informations du marchand :');
console.log(`   ID              : ${merchant.id}`);
console.log(`   Boutique        : ${merchant.shop_domain}`);
console.log(`   Nom             : ${merchant.business_name || merchant.shop_name}`);
console.log(`   Email           : ${merchant.email || 'Non défini'}`);
console.log(`   Statut          : ${merchant.status}`);
console.log(`   Balance         : ${merchant.balance} F CFA`);
console.log(`   Installé le     : ${merchant.installed_at || merchant.created_at}`);

console.log('\n🔗 URLs :');
console.log(`   Dashboard       : http://localhost:3000/merchant-dashboard.html?shop=${merchant.shop_domain}`);
console.log(`   Dashboard public: https://vic-convert-defendant-acquisitions.trycloudflare.com/merchant-dashboard.html?shop=${merchant.shop_domain}`);
console.log(`   API Vérifier    : http://localhost:3000/merchant/dashboard?shop=${merchant.shop_domain}`);

console.log('\n📝 Prochaines étapes :');
console.log('   1. Ouvre le dashboard dans ton navigateur');
console.log('   2. Configure les paramètres de paiement');
console.log('   3. Teste une commande');
console.log('   4. Vérifie dans Shopify Admin → Apps\n');

console.log('═══════════════════════════════════════════════════════════════\n');
