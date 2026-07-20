# 🌐 Exposer BeninPay avec ngrok

## Pourquoi ngrok?

**Problème**: Votre app tourne sur `localhost:3000`
- ❌ FedaPay ne peut pas envoyer webhooks à localhost
- ❌ Clients externes ne peuvent pas accéder

**Solution**: ngrok crée un tunnel HTTPS public → localhost
- ✅ URL publique: `https://xxxx.ngrok.app` → `localhost:3000`
- ✅ FedaPay peut envoyer webhooks
- ✅ Testez avec de vrais paiements

---

## 🚀 Démarrage Manuel

### Option 1: Commande simple
```bash
ngrok http 3000
```

**Résultat**:
```
Session Status   online
Forwarding       https://abc123.ngrok.app -> http://localhost:3000
```

### Option 2: Avec domaine personnalisé (ngrok Pro)
```bash
ngrok http 3000 --domain=beninpay.ngrok.app
```

---

## 📋 Configuration

### 1. Créer compte ngrok (gratuit)
```bash
# Aller sur: https://ngrok.com
# S'inscrire (gratuit)
# Récupérer authtoken
```

### 2. Configurer authtoken
```bash
ngrok config add-authtoken YOUR_TOKEN_HERE
```

### 3. Lancer
```bash
cd ~/my-shopify-app
node server.js &  # Serveur en arrière-plan
ngrok http 3000   # Tunnel ngrok
```

---

## 🔧 Mettre à jour .env

Une fois ngrok lancé, copiez l'URL publique:

```bash
# .env
SHOPIFY_APP_URL=https://abc123.ngrok.app
```

Puis redémarrez le serveur:
```bash
pkill -f "node server.js"
node server.js
```

---

## ✅ Tester

### URL checkout publique
```
https://abc123.ngrok.app/checkout.html?orderId=TEST&amount=10000
```

### Webhook FedaPay
Configurez dans FedaPay dashboard:
```
https://abc123.ngrok.app/api/payment/webhook
```

---

## 🔒 Sécurité

### ngrok gratuit
- ✅ HTTPS automatique
- ⚠️ URL change à chaque redémarrage
- ⚠️ Limites: 40 connexions/min

### ngrok Pro ($8/mois)
- ✅ Domaine fixe (beninpay.ngrok.app)
- ✅ Pas de limite connexions
- ✅ IP whitelisting

---

## 🛠️ Scripts utiles

### start-beninpay.sh
```bash
#!/bin/bash
cd ~/my-shopify-app

# Démarrer serveur
node server.js > server.log 2>&1 &
SERVER_PID=$!
echo "Serveur: PID $SERVER_PID"

# Attendre 2s
sleep 2

# Démarrer ngrok
ngrok http 3000 --log stdout &
NGROK_PID=$!
echo "ngrok: PID $NGROK_PID"

# Attendre tunnel
sleep 5

# Afficher URL
curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | sed 's/"public_url":"//;s/"//'

echo ""
echo "✅ BeninPay exposé sur ngrok!"
echo "PIDs sauvegardés pour arrêt: kill $SERVER_PID $NGROK_PID"
```

### stop-beninpay.sh
```bash
#!/bin/bash
pkill -f "node server.js"
pkill -f "ngrok"
echo "✅ BeninPay arrêté"
```

---

## 📊 Dashboard ngrok

Ouvrir dans navigateur:
```
http://localhost:4040
```

Voir:
- Toutes les requêtes HTTP
- Webhooks reçus
- Replay requêtes
- Inspect headers/body

---

## 🐛 Troubleshooting

### ngrok ne démarre pas
```bash
# Vérifier installation
ngrok version

# Vérifier authtoken
ngrok config check

# Logs
ngrok http 3000 --log stdout
```

### URL change à chaque fois
**Solution**: Utiliser domaine réservé (ngrok Pro)
```bash
ngrok http 3000 --domain=votre-domain.ngrok.app
```

### Webhooks ne fonctionnent pas
1. Vérifier URL dans FedaPay dashboard
2. Vérifier ngrok actif: `curl localhost:4040`
3. Vérifier serveur actif: `curl localhost:3000/health`
4. Voir dashboard ngrok: http://localhost:4040

---

## 🚀 Production

Pour production, **ne pas utiliser ngrok**.

Utiliser:
1. **VPS + domaine**
   - DigitalOcean: $5/mois
   - Domaine: beninpay.bj
   - SSL: Let's Encrypt (gratuit)

2. **Cloudflare Tunnel** (gratuit, alternative à ngrok)
   ```bash
   cloudflared tunnel --url localhost:3000
   ```

3. **Heroku** (gratuit pour démarrer)
   ```bash
   git push heroku main
   ```

---

## ✅ Checklist complète

- [ ] ngrok installé (`ngrok version`)
- [ ] Compte créé sur ngrok.com
- [ ] Authtoken configuré
- [ ] Serveur actif (`node server.js`)
- [ ] ngrok lancé (`ngrok http 3000`)
- [ ] URL publique récupérée
- [ ] .env mis à jour (SHOPIFY_APP_URL)
- [ ] Serveur redémarré
- [ ] Checkout testé sur URL publique
- [ ] Webhook configuré dans FedaPay
- [ ] Test paiement réel effectué

---

✅ Avec ngrok, votre app BeninPay est accessible publiquement et peut recevoir les webhooks FedaPay!
