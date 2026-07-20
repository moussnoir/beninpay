# 🚀 INSTALLER BENINPAY SUR SHOPIFY - GUIDE RAPIDE

**Date**: 2026-06-19
**Statut**: ✅ Serveur actif + ✅ Tunnel actif

---

## ⚡ Installation en 5 Minutes

### ✅ État Actuel
- [x] Serveur BeninPay: `http://localhost:3000` (actif)
- [x] Tunnel Cloudflare: `https://cdna-above-ash-staffing.trycloudflare.com` (actif)
- [x] FedaPay LIVE configuré
- [ ] App créée sur Shopify Partners ← **À FAIRE**
- [ ] Boutique dev créée ← **À FAIRE**
- [ ] App installée ← **À FAIRE**

---

## 📝 ÉTAPE 1: Créer l'App Shopify (5 min)

### 1️⃣ Aller sur Shopify Partners
👉 **Ouvrir**: https://partners.shopify.com/

**Pas de compte?**
- Cliquer "Sign up"
- Email professionnel
- Créer le compte (gratuit)

### 2️⃣ Créer l'App
1. **Apps** (menu gauche) → **Create app**
2. Choisir: **Create app manually**
3. Remplir:

```
App name: BeninPay

App URL:
https://cdna-above-ash-staffing.trycloudflare.com

Allowed redirection URL(s):
https://cdna-above-ash-staffing.trycloudflare.com/shopify/callback
```

4. **Create app** → Attendre 10s

### 3️⃣ Configurer les Scopes (Permissions)
1. Onglet **Configuration**
2. Section **API access scopes**
3. **Cocher**:
   - ✅ `read_orders` - Read orders
   - ✅ `write_orders` - Write orders
   - ✅ `read_products` - Read products
   - ✅ `read_customers` - Read customers
   - ✅ `write_checkouts` - Write checkouts

4. **Save** en bas de page

### 4️⃣ Récupérer les Credentials
1. Onglet **Overview**
2. Copier:
   - **API key**: (commence par lettres/chiffres)
   - **API secret key**: (commence par `shpss_`)

**Note**: Ajoutez-les dans votre fichier `.env`:
```env
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
```

---

## 📝 ÉTAPE 2: Créer une Boutique de Test (2 min)

### 1️⃣ Créer la Boutique
1. **Stores** (menu gauche) → **Add store**
2. Choisir: **Development store**
3. Remplir:

```
Store name: beninpay-test
Store URL: beninpay-test.myshopify.com
Password: (créer un password)
Purpose: Test an app or theme
Industry: Retail
```

4. **Save** → Attendre 30-60s (création auto)

### 2️⃣ Se Connecter à la Boutique
1. Email reçu: "Your development store is ready"
2. Cliquer le lien ou aller sur:
   ```
   https://beninpay-test.myshopify.com/admin
   ```
3. Login avec email + password créé

---

## 📝 ÉTAPE 3: Installer BeninPay (1 min)

### 1️⃣ Ouvrir l'URL d'Installation

**Copier-coller cette URL dans le navigateur**:
```
https://cdna-above-ash-staffing.trycloudflare.com/shopify/auth?shop=beninpay-test.myshopify.com
```

### 2️⃣ Flow OAuth (3 clics)

**Page 1**: Login Shopify
- Email/password de la boutique dev
- **Login**

**Page 2**: Install App
- Voir les permissions demandées:
  - Read/Write orders
  - Read products
  - Read customers
  - Write checkouts
- **Cliquer**: "Install app" (bouton vert)

**Page 3**: Redirection
- URL change pour: `...shopify/callback?code=XXX&shop=beninpay-test.myshopify.com`
- BeninPay échange le code contre un access token
- Sauvegarde dans `db/beninpay-data.json`

**Page 4**: Dashboard BeninPay
- Redirection automatique vers le dashboard marchand
- ✅ **SUCCÈS!** BeninPay est installé!

---

## 🧪 ÉTAPE 4: Vérifier l'Installation (30s)

### Test 1: Vérifier le Statut
```bash
curl "http://localhost:3000/shopify/verify?shop=beninpay-test.myshopify.com"
```

**Résultat attendu**:
```json
{
  "installed": true,
  "shop": "beninpay-test.myshopify.com",
  "accessToken": "shpat_...",
  "scopes": "read_orders,write_orders,read_products,read_customers,write_checkouts"
}
```

### Test 2: Lister les Boutiques
```bash
curl http://localhost:3000/shopify/stores
```

**Résultat attendu**:
```json
{
  "success": true,
  "count": 1,
  "stores": [
    {
      "shop": "beninpay-test.myshopify.com",
      "installedAt": "2026-06-19T06:05:00Z",
      "plan": "free",
      "status": "active"
    }
  ]
}
```

---

## 💳 ÉTAPE 5: Tester un Paiement (2 min)

### 1️⃣ Créer une Commande sur Shopify

1. **Admin Shopify**: https://beninpay-test.myshopify.com/admin
2. **Orders** (menu gauche) → **Create order**
3. **Add product**:
   - Chercher un produit existant
   - OU créer un produit rapide: "Test Product - 5000 XOF"
4. **Add customer**:
   - Name: Test User
   - Email: test@beninpay.com
5. **Payment**: Mark as "Pending"
6. **Create order** → Noter l'Order ID (ex: `#1001`)

### 2️⃣ Générer le Lien de Paiement

**Option A**: Via Dashboard BeninPay
```
https://cdna-above-ash-staffing.trycloudflare.com/merchant-dashboard.html?shop=beninpay-test.myshopify.com
```
- Section "Créer un paiement"
- Montant: 5000
- Order ID: 1001
- **Générer** → Copier le lien

**Option B**: Lien Direct (rapide)
```
https://cdna-above-ash-staffing.trycloudflare.com/checkout.html?amount=5000&orderId=1001&shopName=BeninPay%20Test
```

### 3️⃣ Payer avec FedaPay

1. Ouvrir le lien checkout
2. Voir le récapitulatif:
   ```
   Montant produits: 5000 XOF
   Frais BeninPay (4%): 200 XOF
   ─────────────────────────────
   TOTAL À PAYER: 5200 XOF
   ```
3. **Cliquer**: "Payer maintenant"
4. Redirection FedaPay → Choisir opérateur:
   - MTN Mobile Money
   - Moov Money
   - Celtis
5. Entrer numéro de téléphone
6. Entrer code PIN
7. ✅ Confirmation!

### 4️⃣ Vérifier le Webhook (logs serveur)

**Terminal** (voir les logs):
```
Webhook FedaPay reçu: {
  transaction_id: "txn_abc123",
  status: "approved",
  amount: 5200,
  custom_metadata: { order_id: "1001" }
}
✅ Paiement approuvé - Transaction: txn_abc123, Commande: 1001
```

---

## 🎉 SUCCÈS!

BeninPay est maintenant installé et fonctionnel sur Shopify!

### 📊 Prochaines Étapes

**Court terme (aujourd'hui)**:
- [ ] Tester 2-3 paiements de plus
- [ ] Vérifier les transactions dans FedaPay Dashboard
- [ ] Vérifier les commandes dans Shopify Admin

**Moyen terme (cette semaine)**:
- [ ] Configurer webhooks automatiques Shopify (`order/created`)
- [ ] Email automatique au client avec lien de paiement
- [ ] Mise à jour automatique commande Shopify après paiement

**Long terme (production)**:
- [ ] Créer un tunnel permanent (Cloudflare named tunnel)
- [ ] Déployer sur Render.com / Railway.app
- [ ] Soumettre sur Shopify App Store
- [ ] Marketing + acquisition marchands

---

## 🆘 Problèmes Courants

### ❌ "redirect_uri mismatch" pendant OAuth
**Solution**: Vérifier que l'URL callback sur Shopify Partners est exactement:
```
https://cdna-above-ash-staffing.trycloudflare.com/shopify/callback
```

### ❌ Tunnel ne répond pas
**Solution**: Redémarrer cloudflared
```bash
pkill cloudflared
cd my-shopify-app
cloudflared tunnel --url http://localhost:3000
```

### ❌ FedaPay erreur "Invalid API key"
**Solution**: Vérifier `.env`:
```env
FEDAPAY_SECRET_KEY=sk_live_LAV__IdHdEEz3HWT15Iwk2z3
```
Mode LIVE actif ✅

### ❌ Webhook FedaPay ne passe pas
**Solution**: Configurer l'URL webhook sur FedaPay Dashboard:
1. https://dashboard.fedapay.com/settings/webhooks
2. Ajouter:
   ```
   https://cdna-above-ash-staffing.trycloudflare.com/api/payment/webhook
   ```

---

## 📚 Documentation

- **Installation complète**: `INSTALLATION_SHOPIFY_PARTNERS.md`
- **Guide intégration**: `SHOPIFY_INTEGRATION_GUIDE.md`
- **Info tunnel**: `TUNNEL_INFO.txt`
- **Shopify Docs**: https://shopify.dev/docs/apps
- **FedaPay Docs**: https://docs.fedapay.com

---

## 🎯 Commandes Utiles

```bash
# Démarrer serveur
npm run dev

# Démarrer tunnel
cloudflared tunnel --url http://localhost:3000

# Health check
curl http://localhost:3000/health

# Vérifier installation
curl "http://localhost:3000/shopify/verify?shop=beninpay-test.myshopify.com"

# Lister boutiques
curl http://localhost:3000/shopify/stores

# Voir logs serveur
tail -f my-shopify-app/server.log

# Voir logs tunnel
tail -f my-shopify-app/cloudflare-tunnel.log
```

---

**🇧🇯 Fait avec ❤️ pour l'économie numérique du Bénin**

**Support**: contact@beninpay.com
