# 🇧🇯 BeninPay - Shopify Mobile Payment Integration

Application Shopify pour paiements mobile money au Bénin via FedaPay.

## 🚀 Démarrage rapide

```bash
# Installer dépendances (déjà fait)
npm install

# Configurer .env
cp .env.example .env
# Éditer .env avec tes clés FedaPay

# Démarrer serveur
npm run dev

# Serveur actif sur http://localhost:3000
```

## 📁 Structure

```
my-shopify-app/
├── server.js                      # Serveur Express + routes API
├── app/
│   └── services/
│       └── fedapay.service.js     # Service FedaPay
├── .env                           # Configuration (à remplir)
├── .env.example                   # Template
└── package.json
```

## 🔌 Routes API

### 1. Initier un paiement

**POST** `/api/payment/initiate`

```json
{
  "amount": 1000,
  "phone": "22997000000",
  "operator": "mtn",
  "customerName": "Jean Dupont",
  "customerEmail": "jean@example.com",
  "description": "Achat produit",
  "orderId": "SHOP-12345"
}
```

**Opérateurs supportés:**
- `mtn` → MTN Mobile Money
- `moov` → Moov Money
- `celtis` → Celtis

### 2. Webhook FedaPay

**POST** `/api/payment/webhook`

Reçoit les notifications de paiement (callback automatique).

### 3. Statut transaction

**GET** `/api/payment/status/:transactionId`

Vérifie le statut d'une transaction FedaPay.

### 4. Health check

**GET** `/health`

Vérifie que le serveur est actif.

## 🔑 Configuration

### Variables d'environnement (.env)

```env
# FedaPay
FEDAPAY_SECRET_KEY=your_fedapay_secret_key_here
FEDAPAY_SANDBOX_KEY=sk_sandbox_your_key_here
FEDAPAY_BASE_URL=https://api.fedapay.com/v1

# Shopify
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_APP_URL=https://your-app.ngrok.io

# Environment
NODE_ENV=development
PORT=3000
```

## 🌐 Exposer avec ngrok

### Option 1: ngrok

```bash
# Télécharger: https://ngrok.com/download
ngrok http 3000

# Copier l'URL ngrok dans .env
SHOPIFY_APP_URL=https://abc123.ngrok.io
```

### Option 2: Cloudflare Tunnel

```bash
npm install -g cloudflared
cloudflared tunnel --url http://localhost:3000
```

## 🧪 Tests

### Test health check

```bash
curl http://localhost:3000/health
```

### Test paiement

```bash
curl -X POST http://localhost:3000/api/payment/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "phone": "22997000000",
    "operator": "mtn",
    "customerName": "Test User",
    "customerEmail": "test@beninpay.com",
    "description": "Test paiement",
    "orderId": "TEST-001"
  }'
```

### Test statut transaction

```bash
curl http://localhost:3000/api/payment/status/txn_abc123
```

## 📦 Dépendances

- **express** - Serveur web
- **axios** - Client HTTP pour FedaPay API
- **uuid** - Génération ID uniques
- **cors** - CORS middleware
- **dotenv** - Variables d'environnement
- **@shopify/shopify-api** - SDK Shopify

## 🔧 Service FedaPay

Le service `fedapay.service.js` gère:

1. **createPayment()** - Crée la transaction, génère le token, initie le paiement mobile
2. **checkTransactionStatus()** - Vérifie le statut d'une transaction

### Flux de paiement

```
1. POST /v1/transactions       → Créer transaction
2. POST /v1/transactions/{id}/token  → Générer token
3. POST /v1/softpay/{operator} → Initier paiement mobile
4. Webhook callback            → Notification statut
```

## 📱 Opérateurs Mobile Money

| Opérateur | Code API | Service |
|-----------|----------|---------|
| MTN | `mtn_open` | MTN Mobile Money |
| Moov | `moov` | Moov Money |
| Celtis | `sbin` | Celtis |

## 🚀 Prochaines étapes

1. ✅ Serveur configuré et actif
2. 📝 Remplir `.env` avec clés FedaPay
3. 🌐 Installer ngrok et exposer le serveur
4. 🧪 Tester les routes API
5. 🔗 Configurer webhook FedaPay avec URL ngrok
6. 🛍️ Intégrer avec Shopify checkout

## 💡 Notes

- Serveur local: `http://localhost:3000`
- FedaPay base URL: `https://api.fedapay.com/v1`
- Environnement sandbox pour tests
- Montants en XOF (Franc CFA)
- Webhook auto-configuré: `{SHOPIFY_APP_URL}/api/payment/webhook`

## 📞 Support

- FedaPay docs: https://docs.fedapay.com
- Shopify docs: https://shopify.dev

---

**Created with ❤️ for Benin's digital economy**
