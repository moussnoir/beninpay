import { json } from "@remix-run/node";

/**
 * Webhook Shopify: orders/create
 * Appelé quand une commande est créée
 */
export async function action({ request }) {
  try {
    const order = await request.json();

    console.log('📦 Nouvelle commande:', {
      orderId: order.id,
      orderNumber: order.order_number,
      total: order.total_price,
      currency: order.currency,
      customer: order.customer?.email
    });

    // TODO: Traiter la commande si paiement Mobile Money sélectionné
    // if (order.payment_gateway_names.includes('Mobile Money')) {
    //   // Créer le paiement FedaPay automatiquement
    // }

    return json({ success: true });

  } catch (error) {
    console.error('Erreur webhook orders/create:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
