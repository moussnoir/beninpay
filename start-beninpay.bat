@echo off
echo ============================================
echo   BeninPay - Demarrage Complet
echo ============================================
echo.

REM Aller dans le bon dossier
cd /d C:\Users\test\my-shopify-app

echo [1/3] Arreter les processus existants...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM cloudflared.exe >nul 2>&1
timeout /t 2 >nul

echo [2/3] Demarrer le serveur Node...
start "BeninPay Server" cmd /k "node server.js"
timeout /t 3 >nul

echo [3/3] Demarrer le tunnel Cloudflare...
start "Cloudflare Tunnel" cmd /k "cloudflared tunnel --url http://localhost:3000"

echo.
echo ============================================
echo   BeninPay demarre !
echo ============================================
echo.
echo - Serveur Node  : http://localhost:3000
echo - Tunnel public : Voir la fenetre "Cloudflare Tunnel"
echo.
echo Attends 10 secondes que le tunnel se connecte...
echo Puis teste : curl http://localhost:3000/health
echo.
echo Pour arreter : Ferme les 2 fenetres
echo.
pause
