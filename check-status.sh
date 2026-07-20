#!/bin/bash

# BeninPay Status Checker
# Vérifie que tout fonctionne correctement

echo "🔍 BENINPAY STATUS CHECK"
echo "========================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check server
echo "1️⃣  Checking local server..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running on http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Server is NOT running${NC}"
    echo "   Run: npm run dev"
fi
echo ""

# 2. Check tunnel
echo "2️⃣  Checking Cloudflare tunnel..."
TUNNEL_URL=$(grep -o 'https://[^|]*\.trycloudflare\.com' cloudflare-tunnel.log 2>/dev/null | tail -1 | tr -d ' ')
if [ -n "$TUNNEL_URL" ]; then
    echo -e "${GREEN}✅ Tunnel active: $TUNNEL_URL${NC}"

    # Test tunnel
    if curl -s "$TUNNEL_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Tunnel is responding${NC}"
    else
        echo -e "${YELLOW}⚠️  Tunnel not responding (may be initializing)${NC}"
    fi
else
    echo -e "${RED}❌ Tunnel is NOT running${NC}"
    echo "   Run: cloudflared tunnel --url http://localhost:3000"
fi
echo ""

# 3. Check .env
echo "3️⃣  Checking environment variables..."
if [ -f .env ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"

    # Check important vars
    if grep -q "FEDAPAY_SECRET_KEY=sk_live_" .env; then
        echo -e "${GREEN}✅ FedaPay LIVE key configured${NC}"
    elif grep -q "FEDAPAY_SECRET_KEY=sk_sandbox_" .env; then
        echo -e "${YELLOW}⚠️  FedaPay SANDBOX key configured (test mode)${NC}"
    else
        echo -e "${RED}❌ FedaPay key missing${NC}"
    fi

    if grep -q "SHOPIFY_API_KEY=" .env && [ "$(grep 'SHOPIFY_API_KEY=' .env | cut -d= -f2)" != "" ]; then
        echo -e "${GREEN}✅ Shopify API key configured${NC}"
    else
        echo -e "${RED}❌ Shopify API key missing${NC}"
    fi
else
    echo -e "${RED}❌ .env file missing${NC}"
fi
echo ""

# 4. Check database
echo "4️⃣  Checking database..."
if [ -f db/beninpay-data.json ]; then
    echo -e "${GREEN}✅ Database file exists${NC}"

    # Count stores
    STORES=$(grep -c '"shop":' db/beninpay-data.json 2>/dev/null || echo "0")
    echo "   Installed stores: $STORES"
else
    echo -e "${YELLOW}⚠️  Database file not created yet (normal on first run)${NC}"
fi
echo ""

# 5. Check API routes
echo "5️⃣  Checking API routes..."
if curl -s http://localhost:3000/api/plans > /dev/null 2>&1; then
    echo -e "${GREEN}✅ /api/plans responding${NC}"
else
    echo -e "${RED}❌ /api/plans not responding${NC}"
fi

if [ -d "public" ]; then
    echo -e "${GREEN}✅ Public folder exists${NC}"
else
    echo -e "${RED}❌ Public folder missing${NC}"
fi
echo ""

# 6. Summary
echo "📊 SUMMARY"
echo "=========="

# Count checks passed
PASSED=0
TOTAL=6

# Increment based on checks above
curl -s http://localhost:3000/health > /dev/null 2>&1 && ((PASSED++))
[ -n "$TUNNEL_URL" ] && ((PASSED++))
[ -f .env ] && ((PASSED++))
[ -f db/beninpay-data.json ] || ((PASSED++))  # OK if doesn't exist yet
curl -s http://localhost:3000/api/plans > /dev/null 2>&1 && ((PASSED++))
[ -d "public" ] && ((PASSED++))

if [ $PASSED -eq $TOTAL ]; then
    echo -e "${GREEN}✅ All checks passed ($PASSED/$TOTAL)${NC}"
    echo ""
    echo "🚀 BeninPay is READY!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Open: INSTALLER_MAINTENANT.md"
    echo "   2. Create app on Shopify Partners"
    echo "   3. Install BeninPay via OAuth"
    echo "   4. Test a payment!"
else
    echo -e "${YELLOW}⚠️  Some checks failed ($PASSED/$TOTAL passed)${NC}"
    echo ""
    echo "🔧 Fix the issues above and run again"
fi

echo ""
echo "📖 Documentation: INSTALLER_MAINTENANT.md"
echo "🔗 Tunnel info: TUNNEL_INFO.txt"
echo ""
