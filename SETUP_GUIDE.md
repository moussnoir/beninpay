# BeninPay - Guide d'installation complete

## Configuration actuelle (sauvegardee)

| Parametre | Valeur |
|-----------|--------|
| Shopify Store | beninpay-test.myshopify.com |
| Shopify API Key | (voir .env local) |
| Shopify API Secret | (voir .env local) |
| App URL | https://beninpay.onrender.com |
| FedaPay Key | (voir .env local) |
| Theme | Horizon #146729238605 |
| Commission | 3.5% |
| Admin Password | (voir .env local) |
| GitHub | https://github.com/moussnoir/beninpay |

## Etapes pour integrer une NOUVELLE boutique

### 1. Prerequis

- Compte Shopify Partners (https://partners.shopify.com)
- Compte FedaPay active (https://app.fedapay.com)
- Compte Neon.tech pour la base de donnees (https://neon.tech)
- Compte Render (https://render.com)

### 2. Configuration base de donnees (une seule fois)

1. Aller sur https://neon.tech > New Project > "beninpay"
2. Copier le connection string
3. Sur Render > Environment > ajouter `DATABASE_URL` avec la valeur

### 3. Installer l'app sur une nouvelle boutique

L'app s'installe via OAuth. Le marchand visite:
```
https://beninpay.onrender.com/shopify/auth?shop=NOM-BOUTIQUE.myshopify.com
```

Cela va:
- Demander les permissions au marchand
- Sauvegarder l'access token
- Injecter le bouton Mobile Money dans le theme

### 4. Injection manuelle du bouton (si necessaire)

Si le bouton n'apparait pas apres l'installation:

1. Aller dans le theme editor Shopify
2. Ouvrir `layout/theme.liquid`
3. Ajouter avant `</body>`:
```liquid
{% render 'beninpay-global' %}
```

4. Creer `snippets/beninpay-global.liquid` avec le contenu du fichier
   dans le dossier du projet

### 5. Fichiers theme requis

| Fichier | Role |
|---------|------|
| `snippets/beninpay-global.liquid` | Bouton produit + panier + intercepteur checkout |
| `snippets/cart-summary.liquid` | Bouton dans le checkout collant (drawer) |
| `layout/theme.liquid` | Charge beninpay-global avant </body> |

### 6. Variables d'environnement Render

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| DATABASE_URL | OUI | PostgreSQL (Neon.tech) |
| FEDAPAY_SECRET_KEY | OUI | Cle live FedaPay |
| SHOPIFY_API_KEY | OUI | API key Shopify Partners |
| SHOPIFY_API_SECRET | OUI | API secret Shopify Partners |
| SHOPIFY_APP_URL | OUI | https://beninpay.onrender.com |
| SHOPIFY_SCOPES | OUI | (voir .env.example) |
| ADMIN_PASSWORD | OUI | Mot de passe admin |
| NODE_ENV | OUI | production |
| BENINPAY_FEE_PERCENT | OUI | 3.5 |
| SIMULATION_MODE | NON | false (defaut) |
| SMTP_HOST | NON | Pour emails |
| REDIS_URL | NON | Pour queues async |

### 7. URLs importantes

| URL | Role |
|-----|------|
| /merchant-dashboard.html?shop=xxx | Dashboard marchand |
| /admin-dashboard.html | Dashboard admin BeninPay |
| /checkout.html?shop=xxx&raw_amount=X&currency=Y | Page paiement |
| /webhooks/fedapay (GET) | Redirect client apres paiement |
| /webhooks/fedapay (POST) | Webhook notification FedaPay |
| /health | Health check |
| /shopify/auth?shop=xxx | OAuth installation |

### 8. Flux de paiement

```
Client clique "Payer avec Mobile Money"
  → Redirige vers /checkout.html avec montant + devise
  → Client remplit nom + telephone + operateur
  → POST /api/checkout/create
    → Cree commande dans DB
    → Appelle FedaPay API (cree transaction)
    → Retourne payment_url FedaPay
  → Client redirige vers FedaPay
  → Client paye via Mobile Money (USSD)
  → FedaPay redirige vers /webhooks/fedapay?status=approved
    → Marque commande comme payee
    → Cree transaction dashboard
    → Met a jour solde marchand
  → Client voit page confirmation
```

### 9. Conversion de devises

Le systeme gere automatiquement les devises:
- Shopify envoie le prix brut (sous-unites) + code devise
- Le checkout detecte si c'est une devise a centimes (EUR/USD) ou pas (XOF)
- Conversion automatique en FCFA avant envoi a FedaPay

Taux fixes:
- EUR → XOF: 655.957 (parite fixe zone CFA)
- USD → XOF: ~600
- GBP → XOF: ~760

### 10. Commission BeninPay

- Taux: 3.5% sur chaque transaction
- Exemple: paiement 10000 FCFA → fee 350 FCFA, marchand recoit 9650 FCFA
- Le marchand peut demander un retrait depuis son dashboard
