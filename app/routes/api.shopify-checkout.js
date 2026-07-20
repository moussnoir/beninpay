import { json } from "@remix-run/node";
import { createPayment } from "../services/fedapay.service.js";

/**
 * POST /api/shopify-checkout
 * Endpoint appelé par Shopify lors du checkout
 */
export async function action({ request }) {
  try {
    const body = await request.json();

    const {
      orderId,
      amount,
      customerPhone,
      customerName,
      customerEmail,
      operator, // mtn, moov ou celtis
      shopDomain,
      shopPlan = 'free' // Plan de la boutique
    } = body;

    // Validation
    if (!orderId || !amount || !customerPhone || !operator) {
      return json({
        success: false,
        error: 'Paramètres manquants: orderId, amount, customerPhone, operator requis'
      }, { status: 400 });
    }

    // Vérifier le plan et l'opérateur
    const { PLANS, isOperatorSupported, canProcessTransaction } = await import('../config/plans.js');

    // Vérifier si l'opérateur est supporté par le plan
    if (!isOperatorSupported(shopPlan, operator)) {
      return json({
        success: false,
        error: `L'opérateur ${operator.toUpperCase()} n'est pas disponible sur le plan ${shopPlan.toUpperCase()}. Passez au plan supérieur.`
      }, { status: 403 });
    }

    // TODO: Vérifier le nombre de transactions (nécessite une DB)
    // const transactionCount = await db.getMonthlyTransactionCount(shopDomain);
    // const canProcess = canProcessTransaction(shopPlan, transactionCount);
    // if (!canProcess.allowed) {
    //   return json({ success: false, error: canProcess.reason }, { status: 403 });
    // }

    // Créer le paiement FedaPay
    const callbackUrl = `${process.env.SHOPIFY_APP_URL}/api/payment/webhook`;

    const paymentResult = await createPayment(
      amount,
      customerPhone,
      operator,
      customerName || 'Client Shopify',
      customerEmail || '',
      `Commande Shopify #${orderId}`,
      callbackUrl,
      orderId,
      shopPlan // Passer le plan pour calculer la commission
    );

    if (!paymentResult.success) {
      return json({
        success: false,
        error: paymentResult.error
      }, { status: 500 });
    }

    // TODO: Sauvegarder la transaction dans DB
    // await db.transactions.create({
    //   shopDomain,
    //   orderId,
    //   fedapayTransactionId: paymentResult.transactionId,
    //   amount,
    //   plan: shopPlan,
    //   status: 'pending'
    // });

    return json({
      success: true,
      transactionId: paymentResult.transactionId,
      paymentUrl: paymentResult.payment_url,
      reference: paymentResult.reference,
      message: '✅ Paiement créé! Redirigez le client vers paymentUrl.'
    });

  } catch (error) {
    console.error('Erreur checkout Shopify:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
