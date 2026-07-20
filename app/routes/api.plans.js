import { json } from "@remix-run/node";

/**
 * GET /api/plans
 * Retourne la liste des plans disponibles
 */
export async function loader({ request }) {
  const PLANS = {
    FREE: {
      id: 'free',
      name: 'Gratuit',
      price: 0,
      currency: 'XOF',
      features: {
        maxTransactions: 10,
        commission: 2.5,
        operators: ['mtn', 'moov'],
        support: 'Email',
        dashboard: true,
        webhooks: false,
        customBranding: false
      },
      description: 'Parfait pour tester BeninPay',
      recommended: false
    },
    BASIC: {
      id: 'basic',
      name: 'Basique',
      price: 5000,
      currency: 'XOF',
      features: {
        maxTransactions: 100,
        commission: 1.8,
        operators: ['mtn', 'moov', 'celtis'],
        support: 'Email + Chat',
        dashboard: true,
        webhooks: true,
        customBranding: false
      },
      description: 'Pour les petites boutiques',
      recommended: true
    },
    PREMIUM: {
      id: 'premium',
      name: 'Premium',
      price: 25000,
      currency: 'XOF',
      features: {
        maxTransactions: -1,
        commission: 1.2,
        operators: ['mtn', 'moov', 'celtis'],
        support: 'Prioritaire 24/7',
        dashboard: true,
        webhooks: true,
        customBranding: true,
        analytics: true,
        apiAccess: true
      },
      description: 'Pour les grandes boutiques',
      recommended: false
    }
  };

  return json({
    success: true,
    plans: Object.values(PLANS),
    message: '3 plans disponibles'
  });
}

/**
 * POST /api/plans/subscribe
 * Change le plan d'une boutique
 */
export async function action({ request }) {
  const body = await request.json();
  const { shopDomain, planId } = body;

  if (!shopDomain || !planId) {
    return json({
      success: false,
      error: 'shopDomain et planId requis'
    }, { status: 400 });
  }

  const plan = PLANS[planId.toUpperCase()];

  if (!plan) {
    return json({
      success: false,
      error: 'Plan invalide. Choix: free, basic, premium'
    }, { status: 400 });
  }

  // TODO: Sauvegarder dans une DB (pour l'instant simulation)
  // await db.shops.update({ domain: shopDomain }, { plan: planId, subscribedAt: new Date() });

  console.log('📦 Boutique abonnée:', {
    shop: shopDomain,
    plan: planId,
    price: plan.price
  });

  return json({
    success: true,
    plan: plan,
    message: `Abonnement au plan ${plan.name} réussi!`,
    nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // +30 jours
  });
}
