import { json } from "@remix-run/node";

/**
 * Webhook Shopify: app/uninstalled
 * Appelé quand une boutique désinstalle BeninPay
 */
export async function action({ request }) {
  try {
    const body = await request.json();
    const shopDomain = body.domain || body.myshopify_domain;

    console.log('🗑️ App désinstallée:', {
      shop: shopDomain,
      timestamp: new Date().toISOString()
    });

    // TODO: Mettre à jour la DB
    // await db.shops.update(
    //   { domain: shopDomain },
    //   { uninstalledAt: new Date(), active: false }
    // );

    return json({ success: true, message: 'App uninstalled processed' });

  } catch (error) {
    console.error('Erreur webhook app/uninstalled:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
