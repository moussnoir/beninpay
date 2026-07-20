# Deploiement BeninPay sur Render.com

## Etapes rapides (10 minutes)

### 1. Creer un compte Render
- Aller sur https://render.com
- Se connecter avec GitHub

### 2. Creer la base de donnees PostgreSQL
- Dashboard > New > PostgreSQL
- Name: `beninpay-db`
- Plan: Free (ou Starter pour production)
- Region: Frankfurt (EU)
- Cliquer "Create Database"
- Copier le "Internal Database URL"

### 3. Deployer le serveur
- Dashboard > New > Web Service
- Connecter le repo GitHub `beninpay`
- Configuration:
  - Name: `beninpay-api`
  - Runtime: Node
  - Build Command: `npm install`
  - Start Command: `node server.js`
  - Plan: Free (ou Starter)

### 4. Variables d'environnement
Ajouter dans Render > Environment:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=[Internal Database URL de l'etape 2]
FEDAPAY_SECRET_KEY=sk_live_LAV__IdHdEEz3HWT15Iwk2z3
SHOPIFY_API_KEY=[votre cle]
SHOPIFY_API_SECRET=[votre secret]
SHOPIFY_APP_URL=https://beninpay-api.onrender.com
SHOPIFY_SCOPES=read_orders,write_orders,read_products,read_customers,write_checkouts
ADMIN_PASSWORD=[mot de passe fort]
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=[votre email]
SMTP_PASS=[app password gmail]
```

### 5. DNS Custom (optionnel)
- Render > Settings > Custom Domain
- Ajouter: `app.beninpay.com`
- Configurer CNAME chez votre registrar:
  `app.beninpay.com -> beninpay-api.onrender.com`

### 6. Verifier
```bash
curl https://beninpay-api.onrender.com/health
```

## Architecture Production

```
Internet
  |
  v
[Render.com Load Balancer] -- SSL/TLS auto
  |
  v
[BeninPay Node.js] -- Express + Helmet + Rate Limit
  |      |
  |      v
  |  [PostgreSQL] -- Render managed
  |
  v
[FedaPay API] -- Mobile Money payments
  |
  v
[MTN/Moov/Celtis] -- Benin operators
```

## Commandes utiles

```bash
# Voir les logs
render logs beninpay-api

# Redeploy
git push origin main

# Connexion DB
render psql beninpay-db
```
