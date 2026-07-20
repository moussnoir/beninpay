# BeninPay - Paiements Mobile Money pour Shopify

Solution de paiement Mobile Money (MTN MoMo, Moov Money, Celtis Cash) pour les boutiques Shopify au Benin.

## Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/moussnoir/beninpay)

## Features

- Bouton "Payer avec Mobile Money" sur la page panier Shopify
- Integration FedaPay LIVE (MTN, Moov, Celtis)
- Dashboard admin avec analytics et graphiques
- Dashboard marchand moderne
- Webhooks temps reel (FedaPay + Shopify)
- Gestion des retraits marchands
- Export CSV, notifications email
- Rate limiting, securite Helmet, Sentry

## Quick Start (dev)

```bash
npm install
cp .env.example .env  # Configurer les cles
node server.js
```

## Variables d'environnement

```env
FEDAPAY_SECRET_KEY=sk_live_xxx
SHOPIFY_API_KEY=xxx
SHOPIFY_API_SECRET=shpss_xxx
SHOPIFY_APP_URL=https://your-app.onrender.com
ADMIN_PASSWORD=xxx
```

## Architecture

```
server.js              # Serveur Express principal
app/routes/            # API routes (merchant, admin, checkout, webhooks)
app/services/          # FedaPay, notifications, CSV
public/                # Dashboards HTML + bouton JS
db/                    # JSON store (dev) / PostgreSQL (prod)
```

## Commission

BeninPay prend 2% par transaction. Le marchand recoit 98%.
