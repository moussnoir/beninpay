# 🛒 Guide d'Intégration Shopify - BeninPay

## ✅ Prérequis

- ✅ Serveur BeninPay actif sur port 3000
- ✅ Tunnel Cloudflare actif
- ✅ Compte Shopify Partner
- ✅ API FedaPay configurée

## 📋 Étapes d'Installation

### 1. Démarrer le Tunnel Cloudflare

```bash
cloudflared tunnel --url http://localhost:3000
```

**Note**: Copiez l'URL générée (ex: https://xxx.trycloudflare.com)

### 2. Créer l'Application sur Shopify Partner

1. **Aller sur**: https://partners.shopify.com/
2. **Apps** → **Create app**
3. **Remplir les informations**:

```
App name: BeninPay
App URL: https://[VOTRE-TUNNEL].trycloudflare.com
Allowed redirection URL(s): 
  https://[VOTRE-TUNNEL].trycloudflare.com/shopify/callback

App setup:
  - ✅ Non-embedded app
  - ✅ Distribution: Public
```

4. **Configuration OAuth**:

```
Scopes requis:
- read_orders
- write_orders
- read_products
- read_customers
- write_payment_gateways (optionnel)
```

5. **Sauvegarder les credentials**:
   - API Key
   - API Secret Key

### 3. Mettre à Jour .env

Copiez vos credentials dans `.env`:

```env
# Shopify Configuration
SHOPIFY_API_KEY=VOTRE_API_KEY_ICI
SHOPIFY_API_SECRET=VOTRE_SECRET_KEY_ICI
SHOPIFY_APP_URL=https://VOTRE_TUNNEL.trycloudflare.com
SHOPIFY_SCOPES=read_orders,write_orders,read_products,read_customers
```

### 4. Redémarrer le Serveur

```bash
npm start
```

### 5. Installer sur une Boutique de Développement

#### Créer une boutique de dev:
1. Partners → **Stores** → **Add store** → **Development store**
2. Nom: `beninpay-test-store`

#### Installer l'app:
1. URL d'installation:
```
https://VOTRE_TUNNEL.trycloudflare.com/shopify/auth?shop=beninpay-test-store.myshopify.com
```

2. Ouvrir cette URL dans le navigateur
3. Cliquer **Install app**
4. ✅ Redirection vers dashboard BeninPay!

## 🔗 URLs Importantes

### Développement
```
Server:           http://localhost:3000
Health:           http://localhost:3000/health
Tunnel:           https://[TUNNEL].trycloudflare.com

OAuth Start:      /shopify/auth?shop=STORE.myshopify.com
OAuth Callback:   /shopify/callback
Verify Install:   /shopify/verify?shop=STORE.myshopify.com
List Stores:      /shopify/stores
```

### Checkout
```
Checkout URL:     /checkout.html?amount=1000&orderId=ORDER123&shopName=Store
Dashboard:        /merchant-dashboard.html?shop=STORE.myshopify.com
```

## 🧪 Tester l'Installation

### 1. Vérifier OAuth
```bash
curl "http://localhost:3000/shopify/verify?shop=beninpay-test-store.myshopify.com"
```

### 2. Tester Paiement
```
http://localhost:3000/checkout.html?amount=5000&orderId=TEST123&shopName=BeninPay%20Test
```

### 3. Voir les Boutiques Installées
```bash
curl http://localhost:3000/shopify/stores
```

## 🔄 Workflow Complet

```
┌─────────────────────────────────────────────────────────┐
│ 1. CLIENT COMMANDE SUR SHOPIFY                          │
├─────────────────────────────────────────────────────────┤
│ • Client ajoute produit au panier                        │
│ • Client clique "Checkout"                               │
│ • Shopify crée la commande (status: pending)            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. WEBHOOK SHOPIFY → BENINPAY                           │
├─────────────────────────────────────────────────────────┤
│ • Shopify envoie webhook "order/created"                 │
│ • BeninPay reçoit: orderId, amount, customerEmail        │
│ • BeninPay génère lien de paiement                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. EMAIL AU CLIENT                                       │
├─────────────────────────────────────────────────────────┤
│ • BeninPay envoie email avec lien:                       │
│   https://[tunnel]/checkout.html?amount=5000&orderId=... │
│ • Client clique sur le lien                              │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. CHECKOUT BENINPAY                                     │
├─────────────────────────────────────────────────────────┤
│ • Client voit montant + frais BeninPay (4%)             │
│ • Client clique "Payer"                                  │
│ • Redirection vers FedaPay                               │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. PAIEMENT MOBILE MONEY                                 │
├─────────────────────────────────────────────────────────┤
│ • Client choisit opérateur (MTN/Moov/Celtis)            │
│ • Client entre numéro et code PIN                        │
│ • FedaPay confirme le paiement                           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 6. WEBHOOK FEDAPAY → BENINPAY                           │
├─────────────────────────────────────────────────────────┤
│ • FedaPay envoie webhook "transaction.approved"          │
│ • BeninPay met à jour DB (transaction + solde)           │
│ • BeninPay notifie Shopify (mark order as paid)          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 7. COMMANDE SHOPIFY CONFIRMÉE                           │
├─────────────────────────────────────────────────────────┤
│ • Shopify marque la commande "Paid"                      │
│ • Email de confirmation au client                         │
│ • Marchand peut préparer la livraison                    │
└─────────────────────────────────────────────────────────┘
```

## 📊 Intégration Recommandée

### Option 1: Paiement Manuel (Simple)
- Marchand reçoit commande sur Shopify
- Marchand copie montant + email client
- Marchand génère lien checkout BeninPay manuellement
- Marchand envoie lien au client par WhatsApp/Email

### Option 2: Webhook Automatique (Avancé)
- Webhook Shopify `order/created` → BeninPay
- BeninPay génère lien automatiquement
- Email automatique au client
- Mise à jour automatique de la commande après paiement

### Option 3: Gateway Intégré (Pro)
- BeninPay apparaît comme méthode de paiement sur Shopify
- Client choisit "BeninPay" au checkout
- Redirection automatique vers page paiement
- Retour automatique sur Shopify après paiement

## 🔐 Sécurité

### Validation Webhook Shopify
```javascript
import crypto from 'crypto';

function verifyShopifyWebhook(body, hmacHeader) {
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64');
  
  return hash === hmacHeader;
}
```

### Validation Webhook FedaPay
```javascript
// FedaPay envoie un secret dans les headers
function verifyFedaPayWebhook(signature, body) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.FEDAPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
  
  return signature === expectedSignature;
}
```

## 🚀 Déploiement Production

### Hébergement Recommandé
- **Render.com** (gratuit)
- **Railway.app** (gratuit)
- **Heroku** ($7/mois)
- **DigitalOcean** ($4/mois)
- **AWS Lightsail** ($3.50/mois)

### Variables d'Environnement Production
```env
NODE_ENV=production
PORT=3000

# Shopify
SHOPIFY_API_KEY=xxx
SHOPIFY_API_SECRET=xxx
SHOPIFY_APP_URL=https://beninpay.app
SHOPIFY_SCOPES=read_orders,write_orders,read_products,read_customers

# FedaPay
FEDAPAY_SECRET_KEY=sk_live_xxx
FEDAPAY_BASE_URL=https://api.fedapay.com/v1

# Database
DATABASE_URL=postgresql://user:pass@host:5432/beninpay
```

## 📞 Support

- **Documentation**: https://shopify.dev/docs/apps
- **FedaPay**: https://docs.fedapay.com
- **BeninPay**: dashboard@beninpay.com

---

**Fait avec ❤️ au Bénin 🇧🇯**
