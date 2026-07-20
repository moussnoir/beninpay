# ⚠️ ACTIONS REQUISES - Activation FedaPay

**Date**: 2026-06-16  
**Status**: Compte FedaPay NON ACTIVÉ pour paiements

---

## 🔴 Problème

Ton compte FedaPay **fonctionne en mode lecture seule**:
- ✅ Création de transactions OK
- ✅ Vérification de statut OK  
- ❌ Payment Links ne s'ouvrent PAS
- ❌ Softpay API (paiement direct) retourne 404

**Raison**: Compte en attente d'activation complète.

---

## 📞 ACTION #1: Contacter FedaPay

### Email à envoyer:

**À**: support@fedapay.com  
**Objet**: Activation compte pour paiements Mobile Money

```
Bonjour l'équipe FedaPay,

Je développe BeninPay, une application Shopify pour paiements Mobile Money au Bénin.

Mon compte FedaPay (ID: 28997) peut créer des transactions mais:
- Les payment_url générés ne s'ouvrent pas
- L'API softpay retourne 404

Pourriez-vous activer mon compte pour:
1. Payment Links (paiements via URL)
2. Softpay API (paiements mobile directs)
3. Webhook notifications

Clé API utilisée: sk_live_LAV__IdHdEEz3HWT15Iwk2z3

Merci!

Cordialement,
[Ton nom]
WhatsApp: +229 58 13 78 22
Email: wolim47@gmail.com
```

### Dashboard FedaPay

1. Va sur: https://dashboard.fedapay.com
2. Vérifie section **"Settings" → "API Keys"**
3. Regarde si ton compte est marqué comme "Activé" ou "En attente"
4. Complète toutes les informations KYC si demandées

---

## ⚡ ACTION #2: Mode SIMULATION (immédiat)

En attendant l'activation FedaPay, l'app fonctionne en **MODE SIMULATION**.

### Déjà configuré:

Dans `.env`:
```env
SIMULATION_MODE=true
```

### Ce que ça fait:

✅ L'app Shopify fonctionne normalement
✅ Les boutiques peuvent l'installer
✅ Les paiements retournent "success" immédiatement
✅ Toutes les API fonctionnent
❌ Pas de vrais paiements Mobile Money (simulés)

### Tester:

```bash
cd my-shopify-app
npm run dev

curl -X POST http://localhost:3000/api/payment/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "phone": "22997000000",
    "operator": "mtn",
    "customerName": "Test",
    "customerEmail": "test@test.com",
    "description": "Test simulation",
    "orderId": "SIM-001"
  }'
```

**Résultat**: `success: true` avec transaction simulée.

---

## 🚀 ACTION #3: Publier l'app (simulation)

Tu PEUX publier l'app Shopify **maintenant** en mode simulation:

1. Les boutiques peuvent l'installer
2. Elles voient l'interface BeninPay
3. Elles choisissent un plan (Free/Basic/Premium)
4. Les "paiements" fonctionnent (simulés)
5. **Quand FedaPay s'active** → Passe `SIMULATION_MODE=false` → Tout fonctionne en vrai!

### Avantages:

- ✅ Tester l'intégration Shopify
- ✅ Valider l'UX/UI
- ✅ Collecter des boutiques intéressées
- ✅ Migration transparente vers mode réel

---

## 📋 Checklist

- [ ] Email envoyé à support@fedapay.com
- [ ] Dashboard FedaPay vérifié
- [ ] KYC complété si demandé
- [ ] Mode simulation testé localement
- [ ] App Shopify installée sur boutique test
- [ ] Workflow complet validé (simulation)

**Attendre réponse FedaPay: 24-48h généralement**

---

## 🎯 Prochaines étapes

### Pendant l'attente FedaPay:

1. **Installer l'app sur boutique test**
   - Suis `INSTALLATION_SHOPIFY.md`
   - Valide tout le flux en simulation

2. **Créer l'interface admin**
   - Dashboard pour les boutiques
   - Page choix de plan
   - Historique des transactions

3. **Préparer l'hébergement**
   - VPS (DigitalOcean $5/mois)
   - Domaine: beninpay.bj ou beninpay.com
   - Remplacer Cloudflare Tunnel

### Quand FedaPay activé:

1. Passer `SIMULATION_MODE=false`
2. Redémarrer le serveur
3. Tester un VRAI paiement
4. Publier en production! 🚀

---

## 💡 Alternative: Test avec un VRAI numéro

Si tu veux tester MAINTENANT:

1. Utilise TON numéro MTN/Moov
2. Garde `SIMULATION_MODE=false`
3. Teste un paiement de 100 XOF
4. Si ça marche → Ton compte est bon!
5. Si 404 → Attendre activation FedaPay

**Numéro à utiliser**: Le TIEN (celui enregistré sur FedaPay)

---

**Questions? WhatsApp: +229 58 13 78 22**
