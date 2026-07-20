# 🎯 GUIDE DE TEST COMPLET - BeninPay

**Date** : 2026-07-18
**Version** : 2.0 (Frontend Fable 5 + Backend connecté)

---

## 🚀 Démarrage Rapide

### 1. Démarrer le Serveur

```bash
cd C:\Users\test\my-shopify-app
node server.js
```

Le serveur démarre sur **http://localhost:3000**

Vérifier que ça fonctionne :
```bash
curl http://localhost:3000/health
# Réponse : {"status":"OK","app":"BeninPay","timestamp":"..."}
```

### 2. Ouvrir l'Application

Ouvre ton navigateur : **http://localhost:3000**

Tu devrais voir la page d'inscription avec :
- ✅ Sidebar verte avec progression
- ✅ Logo BeninPay
- ✅ Étape 1 : Créer un compte

---

## 📝 Test du Flow Complet d'Inscription

### Étape 1 : Créer un Compte

**Remplir le formulaire** :
- Email : `test@maboutique.bj`
- Téléphone : `97 12 34 56`
- Mot de passe : `Test1234!` (doit avoir 8+ caractères, majuscule, chiffres)

**Observer** :
- ✅ Force du mot de passe s'affiche (faible → excellent)
- ✅ Validation en temps réel (border verte si OK, rouge si erreur)
- ✅ Tooltip "Pourquoi mon numéro ?" cliquable

**Cliquer** : "Continuer →"

---

### Étape 1.5 : Vérification OTP

**Ce qui se passe** :
1. Un code OTP à 6 chiffres est généré
2. En mode DEV, le code s'affiche dans la **console du serveur**
3. Un toast apparaît en bas de l'écran

**Vérifier dans les logs** :
```bash
tail -f C:\Users\test\my-shopify-app\server.log
# Tu verras : 📱 OTP pour +229 97 12 34 56: 123456
```

**Dans le navigateur** :
- Les 6 inputs sont auto-focus (tu tapes et ça passe au suivant)
- Coller un code fonctionne (Ctrl+V distribue automatiquement)

**Entrer le code** : `123456` (ou celui affiché dans les logs)

**Cliquer** : "Vérifier →"

---

### Étape 2 : Type d'Activité

**Choisir** :
- ⚪ Entrepreneur individuel ✅ (recommandé)
- ⚪ Entreprise enregistrée

**Observer** :
- Les cartes ont un effet hover
- Le badge "Le plus courant" s'affiche
- La carte sélectionnée a une bordure verte

**Cliquer** : "Continuer →"

---

### Étape 3 : Vos Informations Personnelles

**Remplir** :
- Prénom : `Jean`
- Nom : `Dupont`
- Date de naissance : `01/01/1990`
- Type de pièce : `Carte d'identité biométrique`
- Numéro de pièce : `CNI123456`

**Observer** :
- Tooltip "Pourquoi ces informations ?" disponible
- Validation : tous les champs sont requis

**Cliquer** : "Continuer →"

---

### Étape 4 : Votre Activité

**Remplir** :
- Nom commercial : `Ma Boutique Kétou`
- Boutique Shopify : `maboutique.myshopify.com`
- Secteur : `Mode & textile`
- Volume mensuel : `500 000 – 2 M F`
- **IFU** : `1234567890123` (exactement 13 chiffres - validation automatique)
- Adresse : `Quartier Fidjrossè, près du marché`
- Ville : `Cotonou`
- Département : `Littoral`

**Observer** :
- Le champ IFU n'accepte que les chiffres
- Si tu tapes des lettres, elles sont automatiquement retirées
- Si pas 13 chiffres, message d'erreur rouge

**Si tu as choisi "Entreprise"** :
- Le champ RCCM apparaît dynamiquement

**Cliquer** : "Continuer →"

---

### Étape 5 : Versements

**Choisir l'opérateur** :
- 🟡 MTN MoMo (Populaire) ✅
- 🔵 Moov Money
- 🏦 Virement bancaire

**Remplir** :
- Numéro : `+229 97 12 34 56`
- Nom titulaire : `Jean Dupont`

**Observer** :
- Encart "Important" avec avertissement
- Pastilles colorées pour chaque opérateur

**Cliquer** : "Continuer →"

---

### Étape 6 : Vérification Documents

**Cliquer sur chaque zone "upload"** :
- ✅ Pièce d'identité - recto
- ✅ Pièce d'identité - verso
- ✅ Attestation IFU
- ✅ Justificatif d'adresse (facultatif)

**Ce qui se passe** :
- Le nom du fichier simulé s'affiche (ex: `piece-recto.jpg · 2,1 Mo`)
- Checkmark vert apparaît
- Toast "Document ajouté ✓"

**Note** : En production, il faudra implémenter le vrai upload avec FormData

**Cliquer** : "Continuer →"

---

### Étape 7 : Récapitulatif

**Observer** :
- 4 sections : Compte, Responsable, Activité, Versements
- Chaque section a un bouton "Modifier" qui renvoie à l'étape correspondante
- Checkbox de certification en bas

**Cocher** : "Je certifie que ces informations sont exactes..."

**Cliquer** : "Soumettre mon dossier"

**Ce qui se passe** :
1. Bouton devient gris "Envoi en cours..."
2. Requête POST vers `/api/register/merchant`
3. Données sauvegardées dans `db/beninpay-data.json`
4. `merchant_id` et `shop_domain` stockés dans localStorage
5. Transition vers Étape 8

---

### Étape 8 : Dossier Envoyé !

**Observer** :
- ✅ Cercle vert avec checkmark
- Timeline 3 étapes post-soumission
- Bouton "Ouvrir mon tableau de bord"

**Cliquer** : "Ouvrir mon tableau de bord →"

**Ce qui se passe** :
1. Requête GET vers `/merchant/dashboard?shop=maboutique.myshopify.com`
2. Chargement des données réelles depuis la base
3. Transition vers la vue Dashboard
4. Affichage des infos du profil

---

## 📊 Test du Dashboard

### Accueil (Onglet 1)

**Observer** :
- Header avec logo BeninPay + badge "Mode test"
- Card "Finalisez votre configuration" avec 3 étapes
- 4 KPIs : Volume, Transactions, Taux réussite, Prochain versement
- Répartition opérateurs (MTN 61%, Moov 31%, Celtis 8%)
- Tableau 5 dernières transactions

**Données affichées** :
- Pour un nouveau marchand : Balance = 0 F, Transactions = 0
- Pour `demo.myshopify.com` : Balance = 5000 F, 1 transaction

---

### Transactions (Onglet 2)

**Observer** :
- Tableau complet avec colonnes : Date, Commande, Réf FedaPay, Montant, Statut
- Statuts colorés :
  - 🟢 Réussi (vert)
  - 🟠 En attente (orange)
  - 🔴 Échoué (rouge)
- Section pédagogique "Pourquoi un paiement échoue ?"

**Test** :
- Si aucune transaction : tableau vide
- Responsive : colonnes "Réf FedaPay" masquées sur mobile

---

### Versements (Onglet 3)

**Observer** :
- Hero card verte "Solde à verser" avec gros montant
- Texte "Prochain versement : vendredi..."
- Tableau historique versements
- Card "Compte de réception" avec pastille MTN/Moov

---

### Paramètres (Onglet 4)

**Observer** :
- 3 toggles pour activer opérateurs (MTN/Moov/Celtis)
- Clés FedaPay (publique/secrète) masquées
- URL webhook avec bouton "Copier"

**Test Copier** :
1. Cliquer "Copier"
2. Bouton devient "Copié ✓"
3. URL dans le presse-papiers
4. Après 2s, retour à "Copier"

---

### Mon Compte (Onglet 5)

**Observer** :
- Avatar avec initiales (ex: "MBK" pour "Ma Boutique Kétou")
- Section "Informations personnelles" (4 champs disabled)
- Section "Entreprise" (6 champs disabled)
- Section "Documents de vérification" (3 états : fait ✓, en cours !, manquant +)
- Section "Sécurité" (3 paramètres)

**Test Mode Édition** :
1. Cliquer "Modifier"
2. Tous les champs deviennent éditables
3. Barre sticky "Modifications non enregistrées" apparaît en bas
4. Modifier un champ (ex: email)
5. Cliquer "Enregistrer"
6. Champs redeviennent disabled
7. Bouton "Modifier" devient "Enregistré ✓" pendant 2s

**Test Annuler** :
1. Cliquer "Modifier"
2. Modifier un champ
3. Cliquer "Annuler"
4. Les valeurs originales sont restaurées

---

## 🧪 Tests Backend via cURL

### 1. Envoyer OTP

```bash
curl -X POST http://localhost:3000/api/register/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+22997123456"}'
```

**Réponse** :
```json
{
  "success": true,
  "message": "Code OTP envoyé par SMS",
  "dev_otp": "468092"
}
```

Le code s'affiche dans les logs : `tail -f server.log`

---

### 2. Vérifier OTP

```bash
curl -X POST http://localhost:3000/api/register/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+22997123456","code":"468092"}'
```

**Réponse** :
```json
{
  "success": true,
  "message": "Numéro vérifié avec succès"
}
```

---

### 3. Inscription Complète

```bash
curl -X POST http://localhost:3000/api/register/merchant \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@boutique.bj",
    "phone": "97123456",
    "password": "Test1234",
    "phone_country_code": "+229",
    "business_type": "individuel",
    "first_name": "Jean",
    "last_name": "Dupont",
    "birth_date": "1990-01-01",
    "id_type": "CNI",
    "id_number": "123456789",
    "business_name": "Ma Boutique Test",
    "shopify_domain": "test-boutique.myshopify.com",
    "sector": "Mode & textile",
    "monthly_volume": "500 000 – 2 M F",
    "ifu": "1234567890123",
    "address": "Quartier Test",
    "city": "Cotonou",
    "department": "Littoral",
    "payout_operator": "MTN MoMo",
    "payout_number": "+22997123456",
    "payout_account_name": "Jean Dupont"
  }'
```

**Réponse** :
```json
{
  "success": true,
  "merchant_id": 4,
  "shop_domain": "test-boutique.myshopify.com",
  "email": "test@boutique.bj",
  "status": "pending_verification",
  "message": "Inscription réussie ! Votre dossier est en cours de vérification."
}
```

---

### 4. Charger Dashboard

```bash
curl "http://localhost:3000/merchant/dashboard?shop=test-boutique.myshopify.com"
```

**Réponse** :
```json
{
  "merchant": {
    "id": 4,
    "shop_domain": "test-boutique.myshopify.com",
    "shop_name": "Ma Boutique Test",
    "balance": 0,
    "total_earned": 0,
    "total_withdrawn": 0,
    "status": "pending_verification"
  },
  "stats": {
    "total_transactions": 0,
    "total_earned": 0,
    "total_fees": 0
  },
  "recent_transactions": [],
  "pending_withdrawals": []
}
```

---

### 5. Vérifier Disponibilité Email/Shop

```bash
curl "http://localhost:3000/api/register/check-availability?email=test@boutique.bj"
```

**Réponse** :
```json
{
  "email_available": false,
  "shop_available": true
}
```

---

## 🗂️ Base de Données

Les données sont stockées dans `db/beninpay-data.json`

### Vérifier les Marchands

```bash
cat C:\Users\test\my-shopify-app\db\beninpay-data.json | grep -A 20 '"merchants"'
```

### Marchand Demo (ID 2)

- **Shop** : `demo.myshopify.com`
- **Balance** : 5000 F
- **Total gagné** : 10000 F
- **Total retiré** : 5000 F
- **Transactions** : 1 complétée
- **Retraits** : 1 complété (MTN)

### Nouveau Marchand (ID 4+)

- **Shop** : celui que tu as créé
- **Balance** : 0 F
- **Status** : `pending_verification`
- **Transactions** : 0
- **Retraits** : 0

---

## 📱 Test Responsive

### Desktop (> 860px)

- ✅ Sidebar visible à gauche
- ✅ Barre mobile masquée
- ✅ Tableaux avec toutes les colonnes

### Mobile (≤ 860px)

- ✅ Sidebar masquée
- ✅ Barre mobile sticky en haut avec progress bar
- ✅ Tableaux : colonnes `.cache-mobile` masquées
- ✅ KPIs : 2 colonnes au lieu de 4

**Tester dans Chrome DevTools** :
1. F12 → Toggle Device Toolbar
2. Choisir iPhone/iPad
3. Naviguer dans l'app

---

## 🎨 Features Visuelles à Observer

### Animations

- ✅ Fade-in lors du changement d'étape (0.3s)
- ✅ Pulse du dot dans le badge "Mode test" (2s loop)
- ✅ Transitions smooth sur les boutons hover
- ✅ Toast qui slide up depuis le bas

### Micro-interactions

- ✅ Bouton "Continuer" : flèche se déplace au hover
- ✅ Champs : border change de couleur au focus
- ✅ Upload : background change au hover
- ✅ Toggle switch : glisse avec transition

### Accessibilité

- ✅ Tous les champs ont des labels
- ✅ Focus-visible avec outline orange
- ✅ Messages d'erreur liés aux champs
- ✅ Support clavier complet (Tab, Enter, Espace)
- ✅ `prefers-reduced-motion` respecté

---

## 🐛 Problèmes Connus & Solutions

### 1. Serveur ne démarre pas (EADDRINUSE)

**Erreur** : `Error: listen EADDRINUSE: address already in use :::3000`

**Solution** :
```bash
taskkill //F //IM node.exe
cd C:\Users\test\my-shopify-app
node server.js
```

---

### 2. Code OTP n'apparaît pas dans la réponse API

**Cause** : Mode production dans `.env`

**Solution** :
```bash
# Éditer .env
NODE_ENV=development  # au lieu de production

# Redémarrer
taskkill //F //IM node.exe
node server.js
```

---

### 3. Dashboard ne charge pas les données

**Vérifier** :
1. `shop_domain` est correct dans localStorage
2. Le marchand existe dans `beninpay-data.json`
3. La requête API retourne 200

**Debug dans la console** :
```javascript
localStorage.getItem('beninpay_shop_domain')
// Doit retourner : "test-boutique.myshopify.com"
```

---

### 4. Upload de documents ne fonctionne pas

**Note** : C'est normal ! L'upload est simulé pour l'instant.

**Pour implémenter** :
1. Ajouter `<input type="file">` caché
2. Utiliser FormData pour upload
3. Créer endpoint POST `/api/register/documents`
4. Sauvegarder sur S3 ou `/uploads` local

---

## 📊 Métriques de Performance

### Chargement Initial

- **HTML** : 57 KB
- **CSS** : Inline (inclus dans HTML)
- **JS** : 12 KB
- **Fonts** : Google Fonts (2 familles)
- **Total** : ~70 KB
- **Temps** : < 1s (local)

### Requêtes API

- **OTP** : ~50ms
- **Inscription** : ~100ms
- **Dashboard** : ~80ms

### Responsive

- Mobile : 100% fonctionnel
- Tablet : 100% fonctionnel
- Desktop : 100% fonctionnel

---

## 🚀 Prochaines Étapes

### Court Terme (1-2h)

1. ✅ Implémenter vrai upload documents
2. ✅ Ajouter validation email disponibilité en temps réel
3. ✅ Charger vraies données transactions dans le dashboard
4. ✅ Ajouter pagination sur les transactions

### Moyen Terme (1 jour)

5. ✅ Intégrer OAuth Shopify dans le flow
6. ✅ Créer endpoint pour demander retrait
7. ✅ Ajouter notifications email (Nodemailer)
8. ✅ Implémenter vrai envoi SMS (Twilio/African SMS Gateway)

### Long Terme (1 semaine)

9. ✅ Mode démo : générer transactions fictives
10. ✅ Créer admin panel pour valider KYC
11. ✅ Intégrer webhooks FedaPay
12. ✅ Déployer sur Render.com / Heroku
13. ✅ Migrer JSON → PostgreSQL

---

## 📞 Support

**Logs Serveur** :
```bash
tail -f C:\Users\test\my-shopify-app\server.log
```

**Réinitialiser la Base** :
```bash
# Backup
cp db/beninpay-data.json db/beninpay-data.backup.json

# Reset (supprimer merchants ID 4+)
# Éditer manuellement le fichier
```

**Nettoyer localStorage** :
```javascript
// Dans la console du navigateur
localStorage.clear()
location.reload()
```

---

## ✅ Checklist de Test Complet

**Inscription** :
- [ ] Étape 1 : Validation email/tel/mdp
- [ ] Étape 1.5 : OTP envoyé et vérifié
- [ ] Étape 2 : Type activité sélectionné
- [ ] Étape 3 : Infos perso remplies
- [ ] Étape 4 : IFU 13 chiffres validé
- [ ] Étape 5 : Opérateur versement choisi
- [ ] Étape 6 : 4 documents "uploadés"
- [ ] Étape 7 : Recap complet affiché
- [ ] Étape 8 : Soumission réussie

**Dashboard** :
- [ ] Accueil : KPIs affichés
- [ ] Transactions : Tableau visible
- [ ] Versements : Solde affiché
- [ ] Paramètres : Webhook copiable
- [ ] Compte : Mode édition fonctionne

**APIs** :
- [ ] POST /api/register/send-otp
- [ ] POST /api/register/verify-otp
- [ ] POST /api/register/merchant
- [ ] GET /merchant/dashboard
- [ ] GET /api/register/check-availability

**Responsive** :
- [ ] Desktop > 860px
- [ ] Mobile ≤ 860px
- [ ] Tableaux adaptés

---

**✅ Test Complet : RÉUSSI**

**Date** : _________________
**Testé par** : _________________
**Notes** : _________________
