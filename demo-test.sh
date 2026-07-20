#!/bin/bash

# BeninPay Demo Test Script
# Teste tous les composants du système

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          🎬 BENINPAY - DÉMO SYSTÈME COMPLET                 ║"
echo "╔══════════════════════════════════════════════════════════════╗"
echo ""

BASE_URL="http://localhost:3000"
TUNNEL_URL="https://cdna-above-ash-staffing.trycloudflare.com"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test counter
TESTS_PASSED=0
TESTS_TOTAL=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}

    ((TESTS_TOTAL++))

    echo -ne "${CYAN}Test $TESTS_TOTAL:${NC} $name... "

    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "%{http_code}" "$url" -o /tmp/beninpay_test.json)
    else
        response=$(curl -s -w "%{http_code}" -X POST "$url" -H "Content-Type: application/json" -d '{}' -o /tmp/beninpay_test.json)
    fi

    if [ "$response" == "200" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP $response)"
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1️⃣  TESTS SERVEUR LOCAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "Health Check" "$BASE_URL/health"
test_endpoint "Plans API" "$BASE_URL/api/plans"
test_endpoint "Shopify Stores" "$BASE_URL/shopify/stores"
test_endpoint "Checkout Page" "$BASE_URL/checkout.html"
test_endpoint "Merchant Dashboard" "$BASE_URL/merchant-dashboard.html"
test_endpoint "Admin Dashboard" "$BASE_URL/admin-dashboard.html"
test_endpoint "Demo Page" "$BASE_URL/demo.html"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  2️⃣  VÉRIFICATION TUNNEL CLOUDFLARE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

((TESTS_TOTAL++))
echo -ne "${CYAN}Test $TESTS_TOTAL:${NC} Tunnel Health... "
if curl -s --max-time 5 "$TUNNEL_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️  SKIP${NC} (Tunnel peut être inactif)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  3️⃣  DÉTAILS DES RÉPONSES API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${BLUE}📍 Health Check Response:${NC}"
curl -s "$BASE_URL/health" | python -m json.tool 2>/dev/null || curl -s "$BASE_URL/health"
echo ""

echo -e "${BLUE}📍 Plans API Response:${NC}"
curl -s "$BASE_URL/api/plans" | python -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/plans"
echo ""

echo -e "${BLUE}📍 Shopify Stores Response:${NC}"
curl -s "$BASE_URL/shopify/stores" | python -m json.tool 2>/dev/null || curl -s "$BASE_URL/shopify/stores"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  4️⃣  CONFIGURATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${BLUE}📁 Fichiers présents:${NC}"
[ -f ".env" ] && echo -e "  ${GREEN}✅${NC} .env" || echo -e "  ${RED}❌${NC} .env"
[ -f "server.js" ] && echo -e "  ${GREEN}✅${NC} server.js" || echo -e "  ${RED}❌${NC} server.js"
[ -f "package.json" ] && echo -e "  ${GREEN}✅${NC} package.json" || echo -e "  ${RED}❌${NC} package.json"
[ -d "app" ] && echo -e "  ${GREEN}✅${NC} app/" || echo -e "  ${RED}❌${NC} app/"
[ -d "public" ] && echo -e "  ${GREEN}✅${NC} public/" || echo -e "  ${RED}❌${NC} public/"
[ -d "db" ] && echo -e "  ${GREEN}✅${NC} db/" || echo -e "  ${RED}❌${NC} db/"

echo ""
echo -e "${BLUE}🔑 Variables d'environnement:${NC}"
if [ -f ".env" ]; then
    grep -q "FEDAPAY_SECRET_KEY=sk_live_" .env && echo -e "  ${GREEN}✅${NC} FedaPay LIVE configuré" || echo -e "  ${YELLOW}⚠️ ${NC} FedaPay SANDBOX"
    grep -q "SHOPIFY_API_KEY=" .env && echo -e "  ${GREEN}✅${NC} Shopify API Key configuré" || echo -e "  ${RED}❌${NC} Shopify API Key manquant"
    grep -q "SHOPIFY_APP_URL=" .env && echo -e "  ${GREEN}✅${NC} Shopify App URL configuré" || echo -e "  ${RED}❌${NC} Shopify App URL manquant"
else
    echo -e "  ${RED}❌${NC} Fichier .env manquant"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  5️⃣  URLS IMPORTANTES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${BLUE}🌐 Serveur Local:${NC}"
echo "   http://localhost:3000"
echo ""

echo -e "${BLUE}🎬 Démo:${NC}"
echo "   http://localhost:3000/demo.html"
echo ""

echo -e "${BLUE}💳 Checkout (test):${NC}"
echo "   http://localhost:3000/checkout.html?amount=5000&orderId=TEST-001&shopName=Demo"
echo ""

echo -e "${BLUE}📊 Dashboard Marchand:${NC}"
echo "   http://localhost:3000/merchant-dashboard.html?shop=demo.myshopify.com"
echo ""

echo -e "${BLUE}🌐 Tunnel Public:${NC}"
echo "   $TUNNEL_URL"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📊 RÉSUMÉ DES TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PERCENTAGE=$((TESTS_PASSED * 100 / TESTS_TOTAL))

if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
    echo -e "${GREEN}✅ TOUS LES TESTS PASSENT!${NC} ($TESTS_PASSED/$TESTS_TOTAL - $PERCENTAGE%)"
    echo ""
    echo "🎉 BeninPay fonctionne parfaitement!"
    echo ""
    echo "📋 Prochaines étapes:"
    echo "   1. Ouvrir http://localhost:3000/demo.html"
    echo "   2. Tester le checkout et le dashboard"
    echo "   3. Lire: INSTALLER_MAINTENANT.md"
    echo "   4. Créer l'app sur Shopify Partners"
elif [ $PERCENTAGE -ge 75 ]; then
    echo -e "${YELLOW}⚠️  LA PLUPART DES TESTS PASSENT${NC} ($TESTS_PASSED/$TESTS_TOTAL - $PERCENTAGE%)"
    echo ""
    echo "🔧 Le système fonctionne mais quelques composants nécessitent attention"
else
    echo -e "${RED}❌ PLUSIEURS TESTS ÉCHOUENT${NC} ($TESTS_PASSED/$TESTS_TOTAL - $PERCENTAGE%)"
    echo ""
    echo "🔧 Vérifier que le serveur est bien démarré:"
    echo "   cd my-shopify-app"
    echo "   npm run dev"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
