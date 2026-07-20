# 🛍️ INSTALLATION BENINPAY SUR SHOPIFY

Guide complet pour installer BeninPay sur ton Partner Dashboard et une boutique test.

---

## 📋 PRÉREQUIS

1. ✅ Compte Shopify Partner: https://partners.shopify.com
2. ✅ Boutique test Shopify (gratuite)
3. ✅ BeninPay en ligne (Cloudflare Tunnel actif)
4. ✅ URL publique: https://katrina-character-reflect-header.trycloudflare.com

---

## 🔧 ÉTAPE 1: CRÉER L'APP DANS PARTNER DASHBOARD

### 1.1 Créer l'app

1. Va sur: https://partners.shopify.com
2. Clique **Apps** → **Create app**
3. Choisis **Custom app** (ou Public app si tu veux la publier plus tard)
4. Nom: **BeninPay**
5. URL: **https://katrina-character-reflect-header.trycloudflare.com**

### 1.2 Configuration OAuth

**App URL:**
```
https://katrina-character-reflect-header.trycloudflare.com
```

**Allowed redirection URL(s):**
```
https://katrina-character-reflect-header.trycloudflare.com/auth/callback
https://katrina-character-reflect-header.trycloudflare.com/auth/shopify/callback
```

### 1.3 Scopes (Permissions)

Demande ces permissions:

- ✅ `write_orders` - Créer/modifier commandes
- ✅ `read_products` - Lire les produits
- ✅ `write_payment_gateways` - Ajouter moyen de paiement
- ✅ `read_customers` - Lire infos clients
- ✅ `write_checkouts` - Modifier le checkout

### 1.4 Récupérer les clés

Une fois l'app créée, copie:

- **API Key** (Client ID)
- **API Secret** (Client Secret)

---

## 🔑 ÉTAPE 2: CONFIGURER LES CLÉS SHOPIFY

### 2.1 Mettre à jour `.env`

Ouvre `C:\Users\test\my-shopify-app\.env` et ajoute:

```env
# Shopify OAuth
SHOPIFY_API_KEY=ta_cle_api_ici
SHOPIFY_API_SECRET=ton_secret_ici
SHOPIFY_APP_URL=https://katrina-character-reflect-header.trycloudflare.com
SHOPIFY_SCOPES=write_orders,read_products,write_payment_gateways,read_customers,write_checkouts
```

### 2.2 Redémarrer le serveur

```bash
cd C:\Users\test\my-shopify-app
npm run dev
```

---

## 🎯 ÉTAPE 3: INSTALLER L'APP SUR UNE BOUTIQUE TEST

### 3.1 Créer une boutique test

1. Dans Partner Dashboard → **Stores**
2. **Add store** → **Development store**
3. Nom: **BeninPay Test**
4. Mot de passe: (note-le!)

### 3.2 Installer BeninPay

**URL d'installation:**
```
https://katrina-character-reflect-header.trycloudflare.com/auth/shopify?shop=ta-boutique-test.myshopify.com
```

Remplace `ta-boutique-test` par le nom de ta boutique.

**Ou manuellement:**

1. Va dans ta boutique test
2. **Apps** → **Develop apps**
3. **Allow custom app development**
4. Installe BeninPay

### 3.3 Accepter les permissions

L'app va demander les permissions listées plus haut. Clique **Install**.

---

## 💳 ÉTAPE 4: CONFIGURER LE PAIEMENT

### 4.1 Ajouter BeninPay comme moyen de paiement

1. Dans ta boutique: **Settings** → **Payments**
2. Section **Manual payment methods**
3. **Add manual payment method**
4. Nom: **Mobile Money (MTN/Moov/Celtis)**
5. Instructions:
```
Payez avec votre compte Mobile Money.
Opérateurs supportés: MTN, Moov, Celtis
```

### 4.2 Modifier le checkout (optionnel)

Si tu veux un checkout personnalisé:

1. **Settings** → **Checkout**
2. **Customize** (Shopify Plus requis pour full customization)
3. Ajoute un bouton BeninPay

---

## 📊 ÉTAPE 5: CHOISIR UN PLAN

### 5.1 Accéder à l'admin BeninPay

Une fois l'app installée, va sur:

```
https://katrina-character-reflect-header.trycloudflare.com/admin/plans
```

### 5.2 Les 3 plans disponibles

| Plan | Prix | Transactions | Commission | Opérateurs |
|------|------|--------------|------------|------------|
| **Gratuit** | 0 XOF/mois | 10/mois | 2.5% | MTN, Moov |
| **Basique** | 5,000 XOF/mois | 100/mois | 1.8% | MTN, Moov, Celtis |
| **Premium** | 25,000 XOF/mois | Illimité | 1.2% | Tous + Analytics |

**Recommandé pour débuter:** Plan Basique (5,000 XOF/mois)

### 5.3 Souscrire

Clique sur **Choisir [Plan]** dans l'interface admin.

---

## 🧪 ÉTAPE 6: TESTER UN PAIEMENT

### 6.1 Créer une commande test

1. Va sur ta boutique test
2. Ajoute un produit au panier
3. **Checkout**
4. Choisis **Mobile Money**

### 6.2 Appel API test

Ou teste directement l'API:

```bash
curl -X POST https://katrina-character-reflect-header.trycloudflare.com/api/shopify-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-001",
    "amount": 1000,
    "customerPhone": "+22958137822",
    "customerName": "Test Client",
    "customerEmail": "test@example.com",
    "operator": "mtn",
    "shopDomain": "ta-boutique-test.myshopify.com",
    "shopPlan": "basic"
  }'
```

**Réponse attendue:**
```json
{
  "success": true,
  "transactionId": 111479427,
  "paymentUrl": "https://process.fedapay.com/...",
  "message": "✅ Paiement créé! Redirigez le client vers paymentUrl."
}
```

### 6.3 Payer

Ouvre le `paymentUrl` et complète le paiement avec ton compte Mobile Money test.

---

## 🔔 ÉTAPE 7: CONFIGURER LES WEBHOOKS

### 7.1 Webhooks Shopify

Dans Partner Dashboard → Ton app → **Webhooks**:

1. **app/uninstalled**
   - URL: `https://katrina-character-reflect-header.trycloudflare.com/api/webhooks/app-uninstalled`
   - Format: JSON

2. **orders/create**
   - URL: `https://katrina-character-reflect-header.trycloudflare.com/api/webhooks/orders-create`
   - Format: JSON

3. **orders/paid**
   - URL: `https://katrina-character-reflect-header.trycloudflare.com/api/webhooks/orders-paid`
   - Format: JSON

### 7.2 Webhooks FedaPay

Dans FedaPay Dashboard:

1. **Settings** → **Webhooks**
2. URL: `https://katrina-character-reflect-header.trycloudflare.com/api/payment/webhook`
3. Events: `transaction.approved`, `transaction.canceled`

---

## ✅ ÉTAPE 8: VÉRIFIER L'INSTALLATION

### Checklist finale:

- [ ] App créée dans Partner Dashboard
- [ ] Clés API configurées dans `.env`
- [ ] App installée sur boutique test
- [ ] Plan choisi (Free/Basic/Premium)
- [ ] Paiement test réussi
- [ ] Webhooks configurés

---

## 🚀 PROCHAINES ÉTAPES

### Production:

1. **Hébergement permanent**
   - Remplace Cloudflare Tunnel par un VPS (DigitalOcean, AWS, etc.)
   - Nom de domaine fixe: `beninpay.com`

2. **Base de données**
   - MongoDB, PostgreSQL ou Supabase
   - Sauvegarder: boutiques, plans, transactions

3. **Publier l'app**
   - Partner Dashboard → **Submit for review**
   - Shopify App Store (optionnel)

4. **Marketing**
   - Site web BeninPay
   - Docs pour marchands
   - Support client

---

## 📞 SUPPORT

Besoin d'aide?

- 📧 Email: wolim47@gmail.com
- 📱 WhatsApp: +229 58 13 78 22
- 📚 Docs: https://shopify.dev/docs

---

## 💡 NOTES IMPORTANTES

1. **URL Cloudflare change au redémarrage!**
   - Mets à jour dans Partner Dashboard si tu redémarres le tunnel
   - Ou utilise un nom de domaine fixe

2. **Mode simulation**
   - Pour tester sans FedaPay: `SIMULATION_MODE=true` dans `.env`

3. **Commissions**
   - Free: 2.5%
   - Basic: 1.8%
   - Premium: 1.2%
   - BeninPay prélève automatiquement sa commission

4. **FedaPay en attente**
   - Dès que FedaPay active ton compte, les vrais paiements marcheront!
   - En attendant, utilise `SIMULATION_MODE=true`

---

**BeninPay est prêt à installer! Suis ces étapes et tu auras une app Shopify complète avec 3 plans!** 🎉
