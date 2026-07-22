import express from 'express';
import '@shopify/shopify-api/adapters/node';
import { shopifyApi, ApiVersion, LATEST_API_VERSION } from '@shopify/shopify-api';
import crypto from 'crypto';

const router = express.Router();

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY || 'temp_key',
  apiSecretKey: process.env.SHOPIFY_API_SECRET || 'temp_secret',
  scopes: (process.env.SHOPIFY_SCOPES || 'read_orders,write_orders').split(','),
  hostName: (process.env.SHOPIFY_APP_URL || 'localhost').replace(/https?:\/\//, ''),
  hostScheme: 'https',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false, // Non-embedded pour faciliter l'installation
});

// Store pour les sessions (en prod, utiliser Redis ou DB)
const sessionStorage = new Map();

/**
 * GET /shopify/auth
 * Démarre le processus OAuth
 */
router.get('/auth', async (req, res) => {
  try {
    const shop = req.query.shop;

    if (!shop) {
      return res.status(400).send('Missing shop parameter. Usage: ?shop=your-store.myshopify.com');
    }

    // Valider le format du shop
    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;
    if (!shopRegex.test(shop)) {
      return res.status(400).send('Invalid shop parameter');
    }

    console.log('🔐 Début authentification OAuth pour:', shop);

    // Créer l'URL OAuth manuellement (plus simple que shopify.auth.begin)
    const scopes = (process.env.SHOPIFY_SCOPES || 'read_orders,write_orders').split(',').join(',');
    const redirectUri = `${process.env.SHOPIFY_APP_URL}/shopify/callback`;
    const nonce = Math.random().toString(36).substring(2, 15);

    const authUrl = `https://${shop}/admin/oauth/authorize?` +
      `client_id=${process.env.SHOPIFY_API_KEY}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${nonce}`;

    console.log('✅ Redirection vers:', authUrl);

    // Rediriger vers Shopify
    return res.redirect(authUrl);

  } catch (error) {
    console.error('Erreur /shopify/auth:', error);
    return res.status(500).send('Erreur lors de l\'authentification: ' + error.message);
  }
});

/**
 * GET /shopify/callback
 * Callback après autorisation OAuth
 */
router.get('/callback', async (req, res) => {
  try {
    console.log('🔄 Callback OAuth reçu');

    // Valider et échanger le code contre un token
    const callback = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    const { session } = callback;

    // Sauvegarder la session
    sessionStorage.set(session.shop, {
      shop: session.shop,
      accessToken: session.accessToken,
      scope: session.scope,
      isOnline: session.isOnline,
      installedAt: new Date().toISOString(),
    });

    console.log('✅ App installée avec succès pour:', session.shop);
    console.log('📊 Scopes accordés:', session.scope);

    // Installer le ScriptTag pour le bouton Mobile Money sur la page panier
    try {
      const scriptSrc = `${process.env.SHOPIFY_APP_URL}/js/beninpay-button.js`;
      const apiBase = `https://${session.shop}/admin/api/${LATEST_API_VERSION}`;
      const headers = {
        'X-Shopify-Access-Token': session.accessToken,
        'Content-Type': 'application/json'
      };

      // D'abord vérifier si le ScriptTag existe déjà
      const listRes = await fetch(`${apiBase}/script_tags.json`, { headers });
      const existing = listRes.ok ? await listRes.json() : { script_tags: [] };
      const alreadyInstalled = existing.script_tags?.some(st => st.src.includes('beninpay-button'));

      if (!alreadyInstalled) {
        const response = await fetch(`${apiBase}/script_tags.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            script_tag: {
              event: 'onload',
              src: scriptSrc,
              display_scope: 'online_store'
            }
          })
        });
        if (response.ok) {
          console.log('✅ ScriptTag installé automatiquement:', scriptSrc);
        } else {
          const errText = await response.text();
          console.warn('⚠️ ScriptTag non installé (status', response.status, '):', errText);
        }
      } else {
        console.log('✅ ScriptTag déjà présent, pas de doublon');
      }
    } catch (stErr) {
      console.warn('⚠️ ScriptTag install error:', stErr.message);
    }

    // Enregistrer le marchand dans la DB
    const { loadData, saveData } = await import('../../db/json-store.js');
    const dbData = loadData();
    if (!dbData.merchants) dbData.merchants = [];
    let merchant = dbData.merchants.find(m => m.shop_domain === session.shop);
    if (!merchant) {
      dbData.merchants.push({
        id: dbData.merchants.length + 1,
        shop_domain: session.shop,
        access_token: session.accessToken,
        plan: 'free',
        balance: 0,
        total_earned: 0,
        total_withdrawn: 0,
        status: 'active',
        installed_at: new Date().toISOString()
      });
      saveData(dbData);
      console.log('✅ Marchand enregistre:', session.shop);
    }

    // Rediriger vers le dashboard marchand
    const redirectUrl = `${process.env.SHOPIFY_APP_URL}/merchant-dashboard.html?shop=${session.shop}&installed=true`;

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Installation Réussie - BeninPay</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 16px;
            padding: 48px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          .icon {
            font-size: 64px;
            margin-bottom: 24px;
            animation: bounce 1s ease infinite;
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          h1 {
            color: #1a1a1a;
            font-size: 28px;
            margin: 0 0 16px 0;
            font-weight: 700;
          }
          p {
            color: #666;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 32px 0;
          }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
          }
          .shop-name {
            background: #f5f5f5;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'Monaco', monospace;
            font-size: 14px;
            color: #333;
            margin: 24px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">🎉</div>
          <h1>Installation Réussie!</h1>
          <p>
            BeninPay a été installé avec succès sur votre boutique Shopify.<br>
            Vous pouvez maintenant accepter les paiements Mobile Money au Bénin.
          </p>
          <div class="shop-name">🏪 ${session.shop}</div>
          <a href="${redirectUrl}" class="btn">
            📊 Accéder au Dashboard
          </a>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Erreur /shopify/callback:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Erreur Installation - BeninPay</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: #f5f5f5;
            padding: 40px;
            text-align: center;
          }
          .error {
            background: white;
            padding: 40px;
            border-radius: 12px;
            max-width: 500px;
            margin: 0 auto;
            border-left: 4px solid #dc2626;
          }
          h1 { color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>❌ Erreur d'Installation</h1>
          <p>${error.message}</p>
          <p><a href="/shopify/auth?shop=${req.query.shop}">Réessayer</a></p>
        </div>
      </body>
      </html>
    `);
  }
});

/**
 * GET /shopify/verify
 * Vérifie si une boutique est installée
 */
router.get('/verify', (req, res) => {
  const { shop } = req.query;

  if (!shop) {
    return res.status(400).json({ error: 'Missing shop parameter' });
  }

  const session = sessionStorage.get(shop);

  if (session) {
    res.json({
      installed: true,
      shop: session.shop,
      installedAt: session.installedAt,
      scopes: session.scope
    });
  } else {
    res.json({
      installed: false,
      shop: shop,
      installUrl: `${process.env.SHOPIFY_APP_URL}/shopify/auth?shop=${shop}`
    });
  }
});

/**
 * GET /shopify/stores
 * Liste des boutiques installées
 */
router.get('/stores', (req, res) => {
  const stores = Array.from(sessionStorage.values());
  res.json({
    count: stores.length,
    stores: stores
  });
});

export default router;
