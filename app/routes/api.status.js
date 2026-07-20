/**
 * Route API Payment Status
 * Vérifier le statut d'un paiement FedaPay
 */

import express from 'express';
const router = express.Router();

/**
 * GET /api/payment/status/:transactionId
 * Récupère le statut d'une transaction
 */
router.get('/payment/status/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    console.log(`📊 Vérification statut transaction: ${transactionId}`);

    // Mode simulation
    if (process.env.SIMULATION_MODE === 'true') {
      // En simulation, retourner pending
      return res.json({
        success: true,
        transactionId,
        status: 'pending',
        message: 'Mode simulation - utilisez les boutons de test'
      });
    }

    // Mode réel: appel FedaPay
    const FedaPay = (await import('fedapay')).default;

    FedaPay.setApiKey(process.env.FEDAPAY_SECRET_KEY);
    FedaPay.setEnvironment(process.env.NODE_ENV === 'production' ? 'live' : 'sandbox');

    // Récupérer transaction
    const transaction = await FedaPay.Transaction.retrieve(transactionId);

    console.log(`✅ Statut: ${transaction.status}`);

    res.json({
      success: true,
      transactionId: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency?.iso,
      reference: transaction.reference,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at
    });

  } catch (error) {
    console.error('❌ Erreur status:', error);

    // Si transaction non trouvée, considérer comme pending
    if (error.message && error.message.includes('not found')) {
      return res.json({
        success: true,
        transactionId: req.params.transactionId,
        status: 'pending',
        message: 'Transaction en cours de traitement'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
