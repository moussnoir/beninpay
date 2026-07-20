import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Trop de requetes. Reessayez dans 15 minutes.',
    retryAfter: '15 minutes'
  }
});

export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Trop de tentatives de paiement. Reessayez dans 1 minute.',
    retryAfter: '1 minute'
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Trop de tentatives. Reessayez dans 15 minutes.',
    retryAfter: '15 minutes'
  }
});

export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: { error: 'Rate limit exceeded for webhooks' }
});
