#!/bin/bash
# Installation BeninPay sur Shopify - Script automatique

echo "======================================================================"
echo "           INSTALLATION BENINPAY SUR SHOPIFY"
echo "======================================================================"
echo ""

# Étape 1: Vérifier que le serveur tourne
echo "[1/5] Vérification serveur..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Serveur actif sur port 3000"
else
    echo "⚠️  Serveur non actif"
    echo "Démarrage du serveur..."
    node server.js > server.log 2>&1 &
    SERVER_PID=$!
    echo "Serveur démarré (PID: $SERVER_PID)"
    sleep 3
fi

echo ""

# Étape 2: Lancer tunnel Cloudflare
echo "[2/5] Création tunnel Cloudflare..."
cloudflared tunnel --url http://localhost:3000 > tunnel.log 2>&1 &
TUNNEL_PID=$!
echo "Tunnel lancé (PID: $TUNNEL_PID)"
sleep 5

# Extraire l'URL du tunnel
TUNNEL_URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" tunnel.log | head -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "❌ Impossible de démarrer le tunnel"
    echo "Essayez manuellement: cloudflared tunnel --url http://localhost:3000"
    exit 1
fi

echo "✅ Tunnel actif: $TUNNEL_URL"
echo ""

# Étape 3: Mettre à jour .env avec l'URL
echo "[3/5] Configuration .env..."
if grep -q "SHOPIFY_APP_URL" .env; then
    sed -i "s|SHOPIFY_APP_URL=.*|SHOPIFY_APP_URL=$TUNNEL_URL|" .env
else
    echo "SHOPIFY_APP_URL=$TUNNEL_URL" >> .env
fi
echo "✅ URL mise à jour dans .env"
echo ""

# Étape 4: Afficher les informations
echo "[4/5] Informations d'installation"
echo "======================================================================"
echo ""
echo "URL de l'app: $TUNNEL_URL"
echo ""
echo "Configuration Shopify Partners:"
echo "  1. Allez sur: https://partners.shopify.com"
echo "  2. Apps → Create app → Custom app"
echo "  3. App name: BeninPay"
echo "  4. App URL: $TUNNEL_URL"
echo "  5. Redirect URLs:"
echo "     - $TUNNEL_URL/auth/callback"
echo "     - $TUNNEL_URL/api/auth/callback"
echo ""
echo "Permissions (scopes) nécessaires:"
echo "  ✅ write_orders"
echo "  ✅ read_orders"
echo "  ✅ write_checkouts"
echo "  ✅ read_customers"
echo "  ✅ write_payment_gateways"
echo ""
echo "======================================================================"
echo ""

# Étape 5: Créer fichier d'info
echo "[5/5] Sauvegarde informations..."
cat > INSTALLATION_INFO.txt << EOF
BeninPay - Informations d'installation
======================================

Date: $(date)

TUNNEL URL: $TUNNEL_URL

Serveur PID: $SERVER_PID
Tunnel PID: $TUNNEL_PID

Configuration Shopify
---------------------
App URL: $TUNNEL_URL
Redirect URLs:
  - $TUNNEL_URL/auth/callback
  - $TUNNEL_URL/api/auth/callback

Scopes:
  - write_orders
  - read_orders
  - write_checkouts
  - read_customers
  - write_payment_gateways

Commandes utiles
----------------
# Arrêter le serveur
kill $SERVER_PID

# Arrêter le tunnel
kill $TUNNEL_PID

# Relancer tout
./install-shopify.sh

# Voir les logs
tail -f server.log
tail -f tunnel.log

Prochaines étapes
-----------------
1. Créer l'app sur Shopify Partners
2. Copier API Key et Secret
3. Mettre à jour .env avec ces credentials
4. Redémarrer le serveur: kill $SERVER_PID && node server.js &
5. Installer sur boutique test
6. Tester un paiement
EOF

echo "✅ Informations sauvegardées: INSTALLATION_INFO.txt"
echo ""

echo "======================================================================"
echo "✅ INSTALLATION PRÊTE!"
echo "======================================================================"
echo ""
echo "IMPORTANT: Gardez ce terminal ouvert!"
echo "Le tunnel et le serveur tournent en arrière-plan."
echo ""
echo "URL de l'app: $TUNNEL_URL"
echo ""
echo "Prochaines étapes:"
echo "  1. Ouvrez: https://partners.shopify.com"
echo "  2. Créez l'app avec l'URL ci-dessus"
echo "  3. Revenez me donner l'API Key et Secret"
echo ""
echo "Pour arrêter:"
echo "  kill $SERVER_PID $TUNNEL_PID"
echo ""
