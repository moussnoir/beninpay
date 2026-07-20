# 🚀 INSTALLE BENINPAY MAINTENANT (3 Minutes)

**Serveurs actifs ✅** | **Tunnel prêt ✅** | **Tout configuré ✅**

---

## ⚡ Installation Express (Copie-Colle)

### Étape 1 : Ouvre Ton Navigateur

Lance **Chrome**, **Firefox** ou **Edge**

---

### Étape 2 : Copie Cette URL

**Remplace `TA-BOUTIQUE` par le nom de ta boutique Shopify** :

```
https://vic-convert-defendant-acquisitions.trycloudflare.com/shopify/auth?shop=TA-BOUTIQUE.myshopify.com
```

**Exemples** :
- Si ta boutique = `test` → `https://vic-convert-defendant-acquisitions.trycloudflare.com/shopify/auth?shop=test.myshopify.com`
- Si ta boutique = `beninlivraison` → `https://vic-convert-defendant-acquisitions.trycloudflare.com/shopify/auth?shop=beninlivraison.myshopify.com`

---

### Étape 3 : Colle dans le Navigateur

1. **Colle l'URL** dans la barre d'adresse
2. **Appuie sur Entrée**

---

### Étape 4 : Tu Arrives sur Shopify

**Shopify te montre** :

```
┌─────────────────────────────────────────────┐
│                                             │
│  BeninPay wants to access your store:       │
│                                             │
│  ☑️ Read orders                             │
│  ☑️ Write orders                            │
│  ☑️ Read products                           │
│  ☑️ Read customers                          │
│  ☑️ Write checkouts                         │
│                                             │
│  [ Install app ] [ Cancel ]                 │
│                                             │
└─────────────────────────────────────────────┘
```

**👉 Clique sur "Install app"**

---

### Étape 5 : Page de Confirmation

**Tu es redirigé vers BeninPay** :

```
╔═══════════════════════════════════════════╗
║                                           ║
║              🎉                           ║
║                                           ║
║      Installation Réussie!                ║
║                                           ║
║  BeninPay a été installé avec succès      ║
║  sur votre boutique Shopify.              ║
║                                           ║
║  🏪 ta-boutique.myshopify.com             ║
║                                           ║
║  [ 📊 Accéder au Dashboard ]              ║
║                                           ║
╚═══════════════════════════════════════════╝
```

**✅ C'EST FAIT ! L'app est installée !**

---

### Étape 6 : Ouvre le Dashboard

**Clique sur "📊 Accéder au Dashboard"**

Tu verras :
- Ton solde
- Tes transactions
- Paramètres
- Etc.

---

## 🔍 Vérifier que Ça Marche

### Dans Shopify Admin

1. Va sur `https://ta-boutique.myshopify.com/admin`
2. **Settings** → **Apps and sales channels**
3. Tu devrais voir **"BeninPay"** dans la liste

---

### Via la Console

```bash
curl "https://vic-convert-defendant-acquisitions.trycloudflare.com/shopify/verify?shop=ta-boutique.myshopify.com"
```

**Réponse** :
```json
{
  "installed": true,
  "shop": "ta-boutique.myshopify.com",
  "installedAt": "2026-07-18T...",
  "scopes": "read_orders,write_orders,..."
}
```

---

## 🧪 Tester un Paiement

### 1. Crée une Commande

1. Va sur ta boutique : `https://ta-boutique.myshopify.com`
2. Ajoute un produit au panier
3. **Checkout**

---

### 2. Configure le Paiement Mobile Money

**Dans Shopify Admin** :
1. **Settings** → **Payments**
2. **Manual payment methods** → **Add manual payment method**
3. **Name** : `Mobile Money (MTN/Moov)`
4. **Payment instructions** :
   ```
   Paiement Mobile Money via BeninPay.
   Opérateurs: MTN MoMo, Moov Money, Celtis Pay
   ```
5. **Save**

---

### 3. Passe une Commande Test

1. Ajoute produit au panier
2. Checkout
3. **Sélectionne "Mobile Money"**
4. **Complete order**

Tu seras redirigé vers la page BeninPay pour payer !

---

## ❓ Questions Fréquentes

### Q: "L'URL ne fonctionne pas"

**R:** Vérifie que les serveurs tournent :

```bash
# Serveur Node
ps aux | grep "node server"

# Tunnel Cloudflare
ps aux | grep cloudflared

# Si pas actifs, relance :
node server.js &
cloudflared tunnel --url http://localhost:3000 &
```

---

### Q: "App not found" sur Shopify

**R:** L'app n'existe pas encore dans Shopify Partners.

**Solution** :
1. Va sur https://partners.shopify.com
2. Crée une nouvelle app
3. Configure avec :
   - App URL : `https://vic-convert-defendant-acquisitions.trycloudflare.com`
   - Redirect URL : `https://vic-convert-defendant-acquisitions.trycloudflare.com/shopify/callback`

---

### Q: "Invalid shop parameter"

**R:** Le format de la boutique est incorrect.

**Format correct** : `nom-boutique.myshopify.com`
**Format incorrect** : `https://nom-boutique.myshopify.com` ❌

---

### Q: L'app est installée mais pas visible dans Shopify

**R:** Parfois ça prend 1-2 minutes. Rafraîchis la page.

Ou vérifie avec :
```bash
curl "https://vic-convert-defendant-acquisitions.trycloudflare.com/shopify/stores"
```

---

## 📞 Besoin d'Aide ?

**Documentation complète** : `INSTALLATION_SHOPIFY_COMPLETE.md`

**Logs** :
- Serveur : `tail -f server.log`
- Tunnel : `tail -f cloudflare-tunnel.log`

**Support** :
- Lis `INSTALLATION_SHOPIFY_COMPLETE.md` section "Déboguer"
- Tous les problèmes courants y sont expliqués

---

## ✅ Checklist

- [ ] Serveurs actifs (Node + Cloudflare)
- [ ] URL construite avec TA boutique
- [ ] URL ouverte dans le navigateur
- [ ] Permissions accordées ("Install app")
- [ ] Page "Installation Réussie" affichée
- [ ] Dashboard accessible
- [ ] App visible dans Shopify Admin
- [ ] Paiement Mobile Money configuré
- [ ] Commande test passée

---

## 🎯 C'est Tout !

**3 étapes** :
1. Construis l'URL avec ton nom de boutique
2. Ouvre dans le navigateur
3. Clique "Install app"

**Durée** : 1 minute

**Après** : Tu peux accepter des paiements Mobile Money sur Shopify ! 🇧🇯💰

---

**Date** : 2026-07-18
**Version** : 2.0
**Status** : Prêt à installer ✅
