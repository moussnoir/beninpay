/**
 * BeninPay - Plans de tarification
 * Définit les 3 plans disponibles et calcule les commissions
 */

export const PLANS = {
  FREE: {
    id: 'free',
    name: 'Gratuit',
    price: 0,
    currency: 'XOF',
    features: {
      maxTransactions: 10,
      commission: 3.5, // 3.5% de commission
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
      commission: 3.5, // 3.5% de commission
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
      maxTransactions: -1, // Illimité
      commission: 3.5, // 3.5% de commission
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

/**
 * Calcule la commission BeninPay selon le plan du marchand
 * @param {string} planId - ID du plan ('free', 'basic', 'premium')
 * @param {number} amount - Montant total de la transaction en XOF
 * @returns {number} Montant de la commission en XOF
 */
export function calculateCommission(planId, amount) {
  // Valider le plan
  const planKey = planId.toUpperCase();
  const plan = PLANS[planKey];

  if (!plan) {
    console.warn('⚠️ Plan inconnu:', planId, ', utilisation du plan FREE par défaut');
    return calculateCommission('free', amount);
  }

  // Calculer la commission (pourcentage du montant)
  const commissionRate = plan.features.commission / 100;
  const commission = Math.round(amount * commissionRate);

  console.log('💰 Commission calculée:', {
    plan: plan.name,
    rate: plan.features.commission + '%',
    amount: amount,
    commission: commission,
    merchantReceives: amount - commission
  });

  return commission;
}

/**
 * Récupère un plan par son ID
 * @param {string} planId - ID du plan
 * @returns {object|null} Plan ou null si inexistant
 */
export function getPlan(planId) {
  const planKey = planId.toUpperCase();
  return PLANS[planKey] || null;
}

/**
 * Vérifie si un plan permet un certain nombre de transactions
 * @param {string} planId - ID du plan
 * @param {number} currentTransactions - Nombre actuel de transactions ce mois
 * @returns {boolean} true si autorisé, false sinon
 */
export function canProcessTransaction(planId, currentTransactions) {
  const plan = getPlan(planId);

  if (!plan) {
    return false;
  }

  // -1 = illimité
  if (plan.features.maxTransactions === -1) {
    return true;
  }

  return currentTransactions < plan.features.maxTransactions;
}

/**
 * Vérifie si un opérateur est supporté par le plan
 * @param {string} planId - ID du plan
 * @param {string} operator - Code opérateur ('mtn', 'moov', 'celtis')
 * @returns {boolean} true si supporté
 */
export function isOperatorSupported(planId, operator) {
  const plan = getPlan(planId);

  if (!plan) {
    return false;
  }

  return plan.features.operators.includes(operator.toLowerCase());
}

/**
 * Exporte tous les plans sous forme de tableau
 * @returns {array} Liste des plans
 */
export function getAllPlans() {
  return Object.values(PLANS);
}

// Export par défaut
export default {
  PLANS,
  calculateCommission,
  getPlan,
  canProcessTransaction,
  isOperatorSupported,
  getAllPlans
};
