# 🛍️ BeninPay - Installation sur Shopify

**Version** : 2.0
**Date** : 2026-07-18
**URL Tunnel** : https://vic-convert-defendant-acquisitions.trycloudflare.com

---

## ✅ Prérequis

### 1. Serveurs Actifs

```bash
# Terminal 1 : Serveur Node
cd C:\Users\test\my-shopify-app
node server.js

# Terminal 2 : Tunnel Cloudflare
cloudflared tunnel --url http://localhost:3000
```

**Vérifier** :
```bash
curl http://localhost:3000/health
curl https://vic-convert-defendant-acquisitions.trycloudflare.com/health
```

Les deux doivent retourner : `{"status":"OK","app":"BeninPay",...}`

---

### 2. Compte Shopify

Tu as besoin de :
- ✅ Un compte Shopify Partners : https://partners.shopify.com
- ✅ Une boutique de développement OU une vraie boutique
- ✅ L'app BeninPay créée (tu l'as déjà : client_id `40f1c620279...`)

---

## 🚀 Installation en 5 Étapes

### Étape 1 : Démarrer les Serveurs

**Terminal 1 - Serveur** :
```bash
cd C:\Users\test\my-shopify-app
node server.js
```

Tu verras :
```
🔑 ENV DEBUG: { NODE_ENV: 'development', ... }
✅ Base de données JSON initialisée
🚀 BeninPay API Server démarré sur le port 3000
📱 Environment: development
🔗 Health check: http://localhost:3000/health
```

---

**Terminal 2 - Tunnel** :
```bash
cloudflared tunnel --url http://localhost:3000
```

Tu verras (après 5-10 secondes) :
```
INF |  Your quick Tunnel has been created! Visit it at:  |
INF |  https://vic-convert-defendant-acquisitions.trycloudflare.com |
```

⚠️ **Note** : Cette URL change à chaque fois que tu relances cloudflared !

---

### Étape 2 : Mettre à Jour les URLs

**Copie ta nouvelle URL tunnel** : `https://vic-convert-defendant-acquisitions.trycloudflare.com`

**Édite `.env`** :
```bash
nano .env
# ou
notepad .env
```

Change :
```env
SHOPIFY_APP_URL=https://NOUVELLE-URL-ICI.trycloudflare.com
```

**Édite `shopify.app.toml`** :
```toml
application_url = "https://NOUVELLE-URL-ICI.trycloudflare.com"

[auth]
redirect_urls = [
  "https://NOUVELLE-URL-ICI.trycloudflare.com/shopify/callback"
]
```

**Redémarre le serveur** :
```bash
# Ctrl+C dans le terminal du serveur
node server.js
```

---

### Étape 3 : Mettre à Jour l'App Shopify Partners

**Aller sur** : https://partners.shopify.com/organizations

1. **Clique sur ton organisation**
2. **Apps** → **BeninPay** (ou ton nom d'app)
3. **Configuration** → **App setup**

**Mettre à jour** :
- **App URL** : `https://vic-convert-defendant-acquisitions.trycloudflare.com`
- **Allowed redirection URL(s)** :
  ```
  https://vic-convert-defendant-acquisitions.trycloudflare.com/shopify/callback
  ```

4. **Sauvegarder**

---

### Étape 4 : Installer sur ta Boutique

#### Option A : Via URL Directe (Recommandé)

**Construis l'URL** :
```
https://vic-convert-defendant-acquisitions.trycloudflare.com/shopify/auth?shop=TA-BOUTIQUE.myshopify.com
```

**Remplace** `TA-BOUTIQUE` par le nom de ta boutique.

**Exemples** :
- `https://vic-convert-defendant-acquisitions.trycloudflare.com/shopify/auth?shop=beninlivraison.myshopify.com`
- `https://vic-convert-defendant-acquisitions.trycloudflare.com/shopify/auth?shop=test-benin.myshopify.com`

**Ouvre cette URL dans ton navigateur**.

---

#### Option B : Via Shopify CLI

```bash
cd C:\Users\test\my-shopify-app
shopify app dev
```

Le CLI va :
1. Détecter ton app
2. Demander quelle boutique utiliser
3. Ouvrir automatiquement l'URL d'installation

---

### Étape 5 : Autoriser l'App

**Tu arrives sur Shopify** qui te demande :

```
BeninPay wants to:
☑️ Read orders
☑️ Write orders
☑️ Read products
☑️ Read customers
☑️ Write checkouts
```

**Clique** : **"Install app"** ou **"Installer l'application"**

---

**Tu es redirigé vers** :
```
https://vic-convert-defendant-acquisitions.trycloudflare.com/shopify/callback?code=...
```

**Tu verras une page** :
```
🎉 Installation Réussie!

BeninPay a été installé avec succès sur votre boutique Shopify.
Vous pouvez maintenant accepter les paiements Mobile Money au Bénin.

🏪 ta-boutique.myshopify.com

[📊 Accéder au Dashboard]
```

✅ **C'EST BON ! L'app est installée !**

---

## 📊 Vérifier l'Installation

### 1. Via l'API

```bash
curl "https://vic-convert-defendant-acquisitions.trycloudflare.com/shopify/verify?shop=ta-boutique.myshopify.com"
```

**Réponse attendue** :
```json
{
  "installed": true,
  "shop": "ta-boutique.myshopify.com",
  "installedAt": "2026-07-18T17:40:00.000Z",
  "scopes": "read_orders,write_orders,..."
}
```

---

### 2. Via l'Admin Shopify

1. **Connecte-toi à ton admin Shopify** : `https://ta-boutique.myshopify.com/admin`
2. **Settings** → **Apps and sales channels**
3. Tu devrais voir **"BeninPay"** dans la liste

---

### 3. Voir les Boutiques Installées

```bash
curl "https://vic-convert-defendant-acquisitions.trycloudflare.com/shopify/stores"
```

**Réponse** :
```json
{
  "count": 1,
  "stores": [
    {
      "shop": "ta-boutique.myshopify.com",
      "accessToken": "shpat_...",
      "installedAt": "..."
    }
  ]
}
```

---

## 🔗 Intégrer BeninPay au Checkout

Maintenant que l'app est installée, il faut l'activer comme méthode de paiement.

### Méthode 1 : Payment Gateway Personnalisé (Simple)

**Créer une page de checkout custom** :

1. **Dans ton admin Shopify** → **Settings** → **Payments**
2. **Manual payment methods** → **Add manual payment method**
3. **Nom** : `Mobile Money (MTN/Moov/Celtis)`
4. **Instructions** : 
   ```
   Vous serez redirigé pour payer avec votre compte Mobile Money.
   Opérateurs acceptés : MTN MoMo, Moov Money, Celtis Pay
   ```
5. **Sauvegarder**

**Hook dans le checkout** :

Ajoute dans **Settings** → **Checkout** → **Order status page** → **Additional scripts** :

```html
<script>
  // Rediriger vers BeninPay après la commande
  if (Shopify.Checkout.step === 'thank_you') {
    const orderId = Shopify.checkout.order_id;
    const totalPrice = Shopify.checkout.total_price / 100; // En XOF
    
    // Si paiement "Manual payment" sélectionné
    if (Shopify.checkout.payment_gateway === 'Manual payment') {
      // Rediriger vers page paiement BeninPay
      window.location.href = 'https://vic-convert-defendant-acquisitions.trycloudflare.com/checkout.html?' +
        'order_id=' + orderId +
        '&amount=' + totalPrice +
        '&shop=' + Shopify.shop;
    }
  }
</script>
```

---

### Méthode 2 : Checkout Extension (Avancé)

**Créer une extension** :

```bash
cd C:\Users\test\my-shopify-app
shopify app generate extension
```

**Choix** :
- Type : `Checkout UI`
- Name : `beninpay-checkout`
- Framework : `React`

**Éditer `extensions/beninpay-checkout/src/Checkout.jsx`** :

```jsx
import {
  reactExtension,
  Button,
  Banner,
  useApi,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <Extension />
);

function Extension() {
  const { cost, shop } = useApi();
  
  const handleBeninPayClick = () => {
    const amount = cost.totalAmount.amount;
    const url = `https://vic-convert-defendant-acquisitions.trycloudflare.com/checkout.html?` +
      `amount=${amount}&shop=${shop}`;
    
    window.open(url, '_blank');
  };

  return (
    <Banner title="Payer avec Mobile Money">
      <Button onPress={handleBeninPayClick}>
        💰 MTN MoMo / Moov Money
      </Button>
    </Banner>
  );
}
```

**Déployer** :
```bash
shopify app deploy
```

---

## 🧪 Tester le Flow Complet

### 1. Créer une Commande Test

1. **Va sur ta boutique** : `https://ta-boutique.myshopify.com`
2. **Ajoute un produit au panier**
3. **Checkout**
4. **Choisis "Mobile Money (MTN/Moov/Celtis)"** comme paiement
5. **Complete order**

---

### 2. Tu es Redirigé vers BeninPay

**URL** : 
```
https://vic-convert-defendant-acquisitions.trycloudflare.com/checkout.html?
  order_id=1234&
  amount=10000&
  shop=ta-boutique.myshopify.com
```

**Page BeninPay** affiche :
- Montant à payer : `10 000 F CFA`
- Choix opérateur : MTN / Moov / Celtis
- Formulaire : Numéro de téléphone

---

### 3. Payer

1. **Choisis MTN MoMo**
2. **Entre ton numéro** : `+229 97 12 34 56`
3. **Clique "Payer"**

**Ce qui se passe** :
1. Requête → `POST /api/payment/initiate`
2. FedaPay crée une transaction
3. Tu reçois un prompt USSD sur ton téléphone
4. Tu confirmes avec ton code PIN MTN
5. Webhook FedaPay → `/api/payment/webhook`
6. Mise à jour de la commande Shopify
7. Email de confirmation envoyé

---

## 🔍 Déboguer

### Problème 1 : "App not found"

**Cause** : URL pas mise à jour dans Shopify Partners

**Solution** :
1. Va sur partners.shopify.com
2. Met à jour l'App URL avec la nouvelle URL tunnel
3. Réessaye l'installation

---

### Problème 2 : "Invalid redirect_uri"

**Cause** : L'URL callback n'est pas dans la whitelist

**Solution** :
1. Édite `shopify.app.toml`
2. Ajoute : `https://NOUVELLE-URL.trycloudflare.com/shopify/callback`
3. Sauvegarde et réessaye

---

### Problème 3 : Tunnel ne fonctionne pas

**Vérifier** :
```bash
# Tester local
curl http://localhost:3000/health

# Tester tunnel
curl https://vic-convert-defendant-acquisitions.trycloudflare.com/health
```

**Si local OK mais tunnel KO** :
1. Relance cloudflared
2. Attends 10-20 secondes
3. Réessaye

---

### Problème 4 : "Cannot POST /shopify/callback"

**Cause** : Route pas chargée ou serveur pas redémarré

**Solution** :
```bash
# Kill node
taskkill //F //IM node.exe

# Redémarre
node server.js
```

---

## 📝 Logs Utiles

### Logs Serveur

```bash
tail -f server.log
```

Tu verras :
```
🔐 Début authentification OAuth pour: ta-boutique.myshopify.com
✅ Redirection vers: https://ta-boutique.myshopify.com/admin/oauth/authorize?...
🔄 Callback OAuth reçu
✅ App installée avec succès pour: ta-boutique.myshopify.com
📊 Scopes accordés: read_orders,write_orders,...
```

---

### Logs Tunnel

```bash
tail -f cloudflare-tunnel.log
```

Tu verras :
```
INF +------------------------------------------------------------------------------------+
INF |  Your quick Tunnel has been created! Visit it at:                                |
INF |  https://vic-convert-defendant-acquisitions.trycloudflare.com                     |
INF +------------------------------------------------------------------------------------+
```

---

## 🎯 Checklist Installation

- [ ] Serveur Node actif (`node server.js`)
- [ ] Tunnel Cloudflare actif (`cloudflared tunnel ...`)
- [ ] Health check local OK (`curl localhost:3000/health`)
- [ ] Health check tunnel OK (`curl https://...trycloudflare.com/health`)
- [ ] `.env` mis à jour avec nouvelle URL
- [ ] `shopify.app.toml` mis à jour
- [ ] App Shopify Partners mise à jour
- [ ] URL d'installation générée
- [ ] Boutique sélectionnée
- [ ] Permissions accordées
- [ ] Page "Installation Réussie" affichée
- [ ] App visible dans Settings → Apps
- [ ] Test commande effectué

---

## 🔐 Sécurité en Production

⚠️ **Avant de passer en production** :

1. **Utiliser un tunnel permanent** :
   - Cloudflare nommé : `cloudflared tunnel create beninpay`
   - Ou ngrok payant avec domaine custom
   - Ou déployer sur Render/Heroku

2. **HTTPS obligatoire** :
   - Shopify exige HTTPS
   - Le tunnel gratuit fonctionne en dev mais pas en prod

3. **Webhooks Shopify** :
   - Configurer les webhooks pour `orders/create`, `orders/paid`
   - Vérifier les signatures HMAC
   - Endpoint : `/api/webhooks/orders-create`

4. **Variables d'environnement** :
   - Ne jamais commiter `.env`
   - Utiliser des secrets en production

5. **Rate limiting** :
   - Limiter les tentatives OTP
   - Protéger contre les abus

---

## 📞 Support

**Documentation** :
- Guide test : `GUIDE_TEST_COMPLET.md`
- Lancement rapide : `LANCEMENT_RAPIDE.md`

**URLs** :
- Local : http://localhost:3000
- Tunnel : https://vic-convert-defendant-acquisitions.trycloudflare.com
- Health : `/health`
- OAuth : `/shopify/auth?shop=...`
- Verify : `/shopify/verify?shop=...`

**Logs** :
- Serveur : `tail -f server.log`
- Tunnel : `tail -f cloudflare-tunnel.log`

---

## ✅ Prochaines Étapes

Une fois l'app installée :

1. **Tester un paiement** avec un vrai numéro MTN/Moov
2. **Configurer les webhooks FedaPay** pour recevoir les confirmations
3. **Personnaliser la page checkout** (`public/checkout.html`)
4. **Créer une extension checkout** pour afficher BeninPay dans le flow natif
5. **Déployer en production** sur un serveur permanent

---

**🎉 Tu es prêt à intégrer BeninPay sur Shopify !**

Suis les étapes, teste, et tu auras une boutique qui accepte Mobile Money ! 🇧🇯💰
