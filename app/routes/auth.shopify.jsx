import { redirect } from "@remix-run/node";

/**
 * OAuth Shopify - Étape 1: Redirection vers Shopify
 * URL: /auth/shopify?shop=nom-boutique.myshopify.com
 */
export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return new Response("Paramètre 'shop' manquant", { status: 400 });
  }

  // Valider le format du shop
  if (!shop.match(/^[a-z0-9-]+\.myshopify\.com$/)) {
    return new Response("Format shop invalide", { status: 400 });
  }

  const clientId = process.env.SHOPIFY_API_KEY;
  const scopes = process.env.SHOPIFY_SCOPES || 'write_orders,read_products,write_payment_gateways,read_customers';
  const redirectUri = `${process.env.SHOPIFY_APP_URL}/auth/shopify/callback`;

  // Générer nonce pour sécurité
  const nonce = Math.random().toString(36).substring(7);

  // URL d'autorisation Shopify
  const authUrl = `https://${shop}/admin/oauth/authorize?` +
    `client_id=${clientId}&` +
    `scope=${scopes}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${nonce}`;

  console.log('🔐 Redirection OAuth Shopify:', {
    shop,
    authUrl: authUrl.substring(0, 80) + '...'
  });

  return redirect(authUrl);
}
