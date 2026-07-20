import { json } from "@remix-run/node";

/**
 * Webhook Shopify: orders/paid
 * Appelé quand une commande est payée
 */
export async function action({ request }) {
  try {
    const order = await request.json();

    console.log('✅ Commande payée:', {
      orderId: order.id,
      orderNumber: order.order_number,
      total: order.total_price,
      paymentMethod: order.payment_gateway_names?.[0]
    });

    // TODO: Confirmer le paiement dans la DB
    // await db.transactions.update(
    //   { orderId: order.id },
    //   { status: 'paid', paidAt: new Date() }
    // );

    return json({ success: true });

  } catch (error) {
    console.error('Erreur webhook orders/paid:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
