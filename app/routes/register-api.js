/**
 * API Inscription Marchands - BeninPay
 */

import express from 'express';
import { initDatabase, get, insert, update, query } from '../../db/json-store.js';

const router = express.Router();

// Init DB
await initDatabase();

/**
 * POST /api/register/merchant
 * Inscription complète d'un nouveau marchand
 */
router.post('/merchant', async (req, res) => {
  try {
    const {
      // Étape 1 - Compte
      email,
      phone,
      password,
      phone_country_code,

      // Étape 2 - Type activité
      business_type, // 'individuel' ou 'entreprise'

      // Étape 3 - Informations personnelles
      first_name,
      last_name,
      birth_date,
      id_type,
      id_number,

      // Étape 4 - Activité
      business_name,
      shopify_domain,
      sector,
      monthly_volume,
      ifu,
      rccm,
      address,
      city,
      department,

      // Étape 5 - Versements
      payout_operator, // 'MTN MoMo', 'Moov Money', 'Virement bancaire'
      payout_number,
      payout_account_name
    } = req.body;

    // Validation basique
    if (!email || !phone || !business_name || !shopify_domain) {
      return res.status(400).json({
        success: false,
        error: 'Champs requis manquants'
      });
    }

    // Vérifier si email ou shopify_domain existe déjà
    const existingByEmail = await get('merchants', { email });
    if (existingByEmail) {
      return res.status(409).json({
        success: false,
        error: 'Cet email est déjà enregistré'
      });
    }

    const existingByShop = await get('merchants', { shop_domain: shopify_domain });
    if (existingByShop) {
      return res.status(409).json({
        success: false,
        error: 'Cette boutique Shopify est déjà enregistrée'
      });
    }

    // Créer le marchand
    const merchantData = {
      // Compte
      email,
      phone: `${phone_country_code || '+229'} ${phone}`,
      password_hash: password, // TODO: Hasher en production avec bcrypt

      // Informations personnelles
      first_name,
      last_name,
      birth_date,
      id_type,
      id_number,

      // Activité
      business_name,
      shop_domain: shopify_domain,
      shop_name: business_name,
      business_type,
      sector,
      monthly_volume,
      ifu,
      rccm,
      address,
      city,
      department,

      // Versements
      payout_operator,
      payout_number,
      payout_account_name,
      mobile_money_operator: payout_operator === 'MTN MoMo' ? 'MTN' : payout_operator === 'Moov Money' ? 'Moov' : 'Bank',
      mobile_money_number: payout_number,

      // Statut
      status: 'pending_verification', // pending_verification, active, suspended
      verification_status: 'pending', // pending, approved, rejected
      kyc_status: 'pending', // pending, verified, rejected

      // Finances
      balance: 0,
      total_earned: 0,
      total_withdrawn: 0,

      // Dates
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await insert('merchants', merchantData);

    // Log l'inscription
    await insert('activity_logs', {
      merchant_id: result.id,
      action: 'merchant_registered',
      description: `Nouveau marchand: ${business_name}`,
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      merchant_id: result.id,
      shop_domain: shopify_domain,
      email,
      status: 'pending_verification',
      message: 'Inscription réussie ! Votre dossier est en cours de vérification.'
    });

  } catch (error) {
    console.error('[Register] Erreur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'inscription'
    });
  }
});

/**
 * POST /api/register/documents
 * Upload documents de vérification
 */
router.post('/documents', async (req, res) => {
  try {
    const { merchant_id, document_type, file_name, file_size } = req.body;

    if (!merchant_id || !document_type || !file_name) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres manquants'
      });
    }

    // Simuler l'upload (en prod: sauvegarder sur S3 ou serveur)
    const documentData = {
      merchant_id,
      document_type, // 'id_front', 'id_back', 'ifu_attestation', 'address_proof'
      file_name,
      file_size: file_size || 0,
      file_url: `/uploads/${merchant_id}/${file_name}`, // URL fictive
      status: 'pending_review',
      uploaded_at: new Date().toISOString()
    };

    // TODO: Créer table documents si elle n'existe pas
    // Pour l'instant on log dans activity_logs
    await insert('activity_logs', {
      merchant_id,
      action: 'document_uploaded',
      description: `Document ${document_type} uploadé: ${file_name}`,
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      document: documentData,
      message: 'Document uploadé avec succès'
    });

  } catch (error) {
    console.error('[Documents] Erreur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload du document'
    });
  }
});

/**
 * POST /api/register/send-otp
 * Envoyer code OTP par SMS
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Numéro de téléphone requis'
      });
    }

    // Générer un code OTP à 6 chiffres
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // TODO: Envoyer SMS via Twilio ou service SMS
    console.log(`📱 OTP pour ${phone}: ${otp}`);

    // Sauvegarder OTP temporairement (expire après 10 min)
    // En prod: utiliser Redis ou table otp_codes avec expiration
    // Pour l'instant on simule

    res.json({
      success: true,
      message: 'Code OTP envoyé par SMS',
      // En dev seulement - RETIRER EN PRODUCTION
      dev_otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error('[OTP] Erreur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi du code'
    });
  }
});

/**
 * POST /api/register/verify-otp
 * Vérifier code OTP
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        error: 'Téléphone et code requis'
      });
    }

    // TODO: Vérifier le code OTP en base/Redis
    // Pour l'instant on accepte tous les codes en dev
    const isValid = code.length === 6;

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Code invalide ou expiré'
      });
    }

    res.json({
      success: true,
      message: 'Numéro vérifié avec succès'
    });

  } catch (error) {
    console.error('[Verify OTP] Erreur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification'
    });
  }
});

/**
 * GET /api/register/check-availability
 * Vérifier disponibilité email/shop
 */
router.get('/check-availability', async (req, res) => {
  try {
    const { email, shop } = req.query;

    const results = {
      email_available: true,
      shop_available: true
    };

    if (email) {
      const existing = await get('merchants', { email });
      results.email_available = !existing;
    }

    if (shop) {
      const existing = await get('merchants', { shop_domain: shop });
      results.shop_available = !existing;
    }

    res.json(results);

  } catch (error) {
    console.error('[CheckAvailability] Erreur:', error);
    res.status(500).json({ error: 'Erreur de vérification' });
  }
});

export default router;
