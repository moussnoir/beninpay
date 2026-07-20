import { json } from "@remix-run/node";
import axios from "axios";

/**
 * OAuth Shopify - Étape 2: Callback après autorisation
 * URL: /auth/shopify/callback?code=xxx&shop=xxx
 */
export async function loader({ request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const shop = url.searchParams.get("shop");

  if (!code || !shop) {
    return json({
      success: false,
      error: "Paramètres OAuth manquants"
    }, { status: 400 });
  }

  try {
    // Échanger le code contre un access token
    const response = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code: code
      }
    );

    const { access_token, scope } = response.data;

    console.log('✅ OAuth Shopify réussi:', {
      shop,
      scope,
      tokenStart: access_token.substring(0, 10) + '...'
    });

    // TODO: Sauvegarder le token dans une DB
    // await db.shops.upsert({
    //   domain: shop,
    //   accessToken: access_token,
    //   scope: scope,
    //   installedAt: new Date()
    // });

    // Rediriger vers l'admin de l'app
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/admin/dashboard?shop=${shop}&installed=true`
      }
    });

  } catch (error) {
    console.error('❌ Erreur OAuth Shopify:', error.response?.data || error.message);

    return json({
      success: false,
      error: 'Échec de l\'authentification OAuth',
      details: error.response?.data
    }, { status: 500 });
  }
}
