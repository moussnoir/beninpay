// ============================================================================
// BENINPAY - Application JavaScript (Connecté au Backend)
// ============================================================================

const API_BASE = '';  // Même domaine
let formData = {};    // Stockage des données du formulaire

const ORDRE = [1, 1.5, 2, 3, 4, 5, 6, 7, 8];
const NOMS = {
  1: 'Créer un compte',
  1.5: 'Vérification SMS',
  2: 'Type d\'activité',
  3: 'Vos informations',
  4: 'Votre activité',
  5: 'Versements',
  6: 'Vérification',
  7: 'Récapitulatif',
  8: 'Terminé'
};

// ============================================================================
// NAVIGATION ENTRE ÉTAPES
// ============================================================================

function afficher(n) {
  document.querySelectorAll('.etape-page').forEach(p => p.classList.toggle('active', +p.dataset.etape === n));
  const jalonCourant = Math.floor(n);
  document.querySelectorAll('.jalon').forEach(j => {
    const num = +j.dataset.j;
    j.classList.toggle('actif', num === jalonCourant);
    j.classList.toggle('fait', num < jalonCourant || n === 8);
    j.querySelector('.num').textContent = (num < jalonCourant || n === 8) ? '✓' : num;
  });
  const pct = Math.round((ORDRE.indexOf(n)) / (ORDRE.length - 1) * 100);
  document.getElementById('a-prog').style.width = pct + '%';
  document.getElementById('a-pct').textContent = pct + ' %';
  document.getElementById('m-prog').style.width = pct + '%';
  document.getElementById('m-etape').textContent = n === 8 ? 'Terminé 🎉' : `Étape ${Math.floor(n)} sur 7 · ${NOMS[n]}`;
  window.scrollTo({ top: 0 });

  // Sauvegarder progression dans localStorage
  localStorage.setItem('beninpay_step', n);
  localStorage.setItem('beninpay_data', JSON.stringify(formData));
}

function valider(n) {
  const page = document.querySelector(`.etape-page[data-etape="${n}"]`);
  let ok = true, premier = null;
  page.querySelectorAll('.champ[required]').forEach(c => {
    const err = c.closest('div')?.querySelector('.msg-erreur') || c.nextElementSibling;
    let valide = c.value.trim() !== '';
    if (c.id === 'i-email') valide = /.+@.+\..+/.test(c.value);
    if (c.id === 'i-mdp') valide = c.value.length >= 8;
    if (c.id === 'i-ifu') valide = /^\d{13}$/.test(c.value.trim());
    c.classList.toggle('erreur', !valide);
    c.classList.toggle('valide', valide && c.value.trim() !== '');
    if (err && err.classList.contains('msg-erreur')) err.style.display = valide ? 'none' : 'flex';
    if (!valide) { ok = false; if (!premier) premier = c; }
  });
  if (premier) premier.focus();
  return ok;
}

function sauvegarderChamps(etape) {
  const page = document.querySelector(`.etape-page[data-etape="${etape}"]`);
  page.querySelectorAll('.champ').forEach(c => {
    if (c.id) formData[c.id] = c.value;
  });
  page.querySelectorAll('input[type="radio"]:checked').forEach(r => {
    formData[r.name] = r.value;
  });
}

function suivant(n) {
  if (!valider(n)) return;
  sauvegarderChamps(n);
  if (n === 6) construireRecap();
  afficher(ORDRE[ORDRE.indexOf(n) + 1]);
}

function precedent(n) {
  sauvegarderChamps(n);
  afficher(ORDRE[ORDRE.indexOf(n) - 1]);
}

// ============================================================================
// ÉTAPE OTP
// ============================================================================

function allerOtp() {
  if (!valider(1)) return;
  sauvegarderChamps(1);

  const phone = document.getElementById('i-tel').value;
  const indicatif = document.getElementById('i-indicatif').value.slice(-4);

  document.getElementById('otp-num').textContent = indicatif + ' ' + phone;

  // Envoyer OTP via API
  envoyerOTP(indicatif + phone);

  afficher(1.5);
  document.querySelector('#otp input').focus();
}

async function envoyerOTP(phone) {
  try {
    const response = await fetch(`${API_BASE}/api/register/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });

    const data = await response.json();

    if (data.success) {
      // En mode dev, afficher le code dans la console
      if (data.dev_otp) {
        console.log('🔑 Code OTP:', data.dev_otp);
        toast(`Code OTP (dev): ${data.dev_otp}`);
      } else {
        toast('Code envoyé par SMS ✓');
      }
    } else {
      toast('Erreur envoi SMS');
    }
  } catch (error) {
    console.error('Erreur OTP:', error);
    toast('Erreur réseau');
  }
}

document.querySelectorAll('#otp input').forEach((inp, i, tous) => {
  inp.addEventListener('input', () => {
    inp.value = inp.value.replace(/\D/g, '');
    if (inp.value && i < tous.length - 1) tous[i + 1].focus();
  });
  inp.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !inp.value && i > 0) tous[i - 1].focus();
  });
  inp.addEventListener('paste', e => {
    const chiffres = (e.clipboardData.getData('text').match(/\d/g) || []).slice(0, 6);
    chiffres.forEach((c, k) => tous[k].value = c);
    if (chiffres.length) tous[Math.min(chiffres.length, 5)].focus();
    e.preventDefault();
  });
});

async function validerOtp() {
  const code = [...document.querySelectorAll('#otp input')].map(i => i.value).join('');
  const err = document.getElementById('otp-err');

  if (code.length < 6) {
    err.style.display = 'flex';
    return;
  }

  err.style.display = 'none';

  const phone = formData['i-indicatif']?.slice(-4) + formData['i-tel'];

  try {
    const response = await fetch(`${API_BASE}/api/register/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code })
    });

    const data = await response.json();

    if (data.success) {
      toast('Numéro vérifié ✓');
      afficher(2);
    } else {
      err.textContent = data.error || 'Code invalide';
      err.style.display = 'flex';
    }
  } catch (error) {
    console.error('Erreur vérification:', error);
    toast('Erreur réseau');
  }
}

function renvoyerCode(btn) {
  btn.disabled = true;
  let s = 60;
  const t = setInterval(() => {
    s--; btn.textContent = `Renvoyer le code (${s} s)`;
    if (s <= 0) { clearInterval(t); btn.disabled = false; btn.textContent = 'Renvoyer le code'; }
  }, 1000);

  const phone = formData['i-indicatif']?.slice(-4) + formData['i-tel'];
  envoyerOTP(phone);
}

// ============================================================================
// VALIDATION CHAMPS
// ============================================================================

document.getElementById('i-mdp').addEventListener('input', e => {
  const v = e.target.value;
  let s = 0;
  if (v.length >= 8) s++;
  if (/[A-Z]/.test(v)) s++;
  if (/\d/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) s++;
  document.getElementById('force').className = 'force' + (s ? ' f' + s : '');
  document.getElementById('force-txt').textContent = [
    'Au moins 8 caractères, avec chiffres et majuscules.',
    'Mot de passe faible',
    'Mot de passe moyen',
    'Bon mot de passe',
    'Excellent mot de passe 💪'
  ][s];
});

document.getElementById('i-ifu').addEventListener('input', e => e.target.value = e.target.value.replace(/\D/g, ''));
document.getElementById('i-tel').addEventListener('input', e => e.target.value = e.target.value.replace(/[^\d ]/g, ''));

document.querySelectorAll('input[name="type-act"]').forEach(r => r.addEventListener('change', () => {
  document.getElementById('bloc-rccm').style.display = document.querySelector('input[name="type-act"]:checked').value === 'entreprise' ? 'block' : 'none';
}));

// ============================================================================
// UPLOAD DOCUMENTS
// ============================================================================

function marquerUpload(el, nomFichier) {
  el.classList.add('ok');
  el.innerHTML = `<div><b>${nomFichier}</b><span>Envoyé · cliquer pour remplacer</span></div>`;
  toast('Document ajouté ✓');

  // Simuler upload vers API
  // TODO: Vrai upload avec FormData
}

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 2500);
}

// ============================================================================
// RÉCAPITULATIF
// ============================================================================

const v = id => document.getElementById(id)?.value || formData[id] || '—';

function construireRecap() {
  sauvegarderChamps(6);
  const type = document.querySelector('input[name="type-act"]:checked')?.value || formData['type-act'];
  const op = document.querySelector('input[name="op-verse"]:checked')?.value || formData['op-verse'];
  document.getElementById('recap').innerHTML = `
    <div class="recap-sec"><h3>Compte <button onclick="afficher(1)">Modifier</button></h3>
      <div class="recap-l"><span>E-mail</span><span>${v('i-email')}</span></div>
      <div class="recap-l"><span>Téléphone</span><span>${v('i-indicatif').slice(-4)} ${v('i-tel')} · vérifié ✓</span></div>
    </div>
    <div class="recap-sec"><h3>Responsable <button onclick="afficher(3)">Modifier</button></h3>
      <div class="recap-l"><span>Nom</span><span>${v('i-prenom')} ${v('i-nom')}</span></div>
      <div class="recap-l"><span>Pièce</span><span>${v('i-piece')} · ${v('i-numpiece')}</span></div>
    </div>
    <div class="recap-sec"><h3>Activité <button onclick="afficher(4)">Modifier</button></h3>
      <div class="recap-l"><span>Type</span><span>${type === 'entreprise' ? 'Entreprise enregistrée' : 'Entrepreneur individuel'}</span></div>
      <div class="recap-l"><span>Boutique</span><span>${v('i-boutique')}</span></div>
      <div class="recap-l"><span>Shopify</span><span>${v('i-shopify')}</span></div>
      <div class="recap-l"><span>IFU</span><span>${v('i-ifu')}</span></div>
      <div class="recap-l"><span>Adresse</span><span>${v('i-adresse')}, ${v('i-ville')} (${v('i-dept')})</span></div>
    </div>
    <div class="recap-sec"><h3>Versements <button onclick="afficher(5)">Modifier</button></h3>
      <div class="recap-l"><span>Compte</span><span>${op} · ${v('i-numverse')}</span></div>
      <div class="recap-l"><span>Titulaire</span><span>${v('i-titulaire')}</span></div>
    </div>`;
}

async function soumettre() {
  sauvegarderChamps(7);

  // Désactiver le bouton
  const btn = document.getElementById('btn-soumettre');
  btn.disabled = true;
  btn.textContent = 'Envoi en cours...';

  try {
    const payload = {
      // Étape 1
      email: formData['i-email'],
      phone: formData['i-tel'],
      password: formData['i-mdp'],
      phone_country_code: formData['i-indicatif']?.slice(-4) || '+229',

      // Étape 2
      business_type: formData['type-act'] || 'individuel',

      // Étape 3
      first_name: formData['i-prenom'],
      last_name: formData['i-nom'],
      birth_date: formData['i-naissance'],
      id_type: formData['i-piece'],
      id_number: formData['i-numpiece'],

      // Étape 4
      business_name: formData['i-boutique'],
      shopify_domain: formData['i-shopify'],
      sector: formData['i-secteur'],
      monthly_volume: formData['i-volume'],
      ifu: formData['i-ifu'],
      rccm: formData['i-rccm'],
      address: formData['i-adresse'],
      city: formData['i-ville'],
      department: formData['i-dept'],

      // Étape 5
      payout_operator: formData['op-verse'] || 'MTN MoMo',
      payout_number: formData['i-numverse'],
      payout_account_name: formData['i-titulaire']
    };

    const response = await fetch(`${API_BASE}/api/register/merchant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.success) {
      // Stocker merchant_id et shop_domain
      localStorage.setItem('beninpay_merchant_id', data.merchant_id);
      localStorage.setItem('beninpay_shop_domain', data.shop_domain);

      // Nettoyer le localStorage temporaire
      localStorage.removeItem('beninpay_step');
      localStorage.removeItem('beninpay_data');

      afficher(8);
    } else {
      toast(data.error || 'Erreur inscription');
      btn.disabled = false;
      btn.textContent = 'Soumettre mon dossier';
    }

  } catch (error) {
    console.error('Erreur soumission:', error);
    toast('Erreur réseau');
    btn.disabled = false;
    btn.textContent = 'Soumettre mon dossier';
  }
}

// ============================================================================
// DASHBOARD - NAVIGATION ONGLETS
// ============================================================================

const boutons = document.querySelectorAll('nav button');
const pages = document.querySelectorAll('.page');
boutons.forEach(b => b.addEventListener('click', () => {
  boutons.forEach(x => x.classList.remove('actif'));
  pages.forEach(p => p.classList.remove('active'));
  b.classList.add('actif');
  document.getElementById(b.dataset.page).classList.add('active');
  window.scrollTo({ top: 0 });
}));

// ============================================================================
// DASHBOARD - MODE ÉDITION COMPTE
// ============================================================================

const champsModif = document.querySelectorAll('.modif');
const barre = document.getElementById('barre-enregistrer');
const btnModifier = document.getElementById('btn-modifier');
let valeursInitiales = {};

btnModifier.addEventListener('click', () => {
  champsModif.forEach(c => { valeursInitiales[c.id] = c.value; c.disabled = false; });
  barre.style.display = 'block';
  btnModifier.style.display = 'none';
  document.getElementById('c-nom').focus();
});

document.getElementById('btn-annuler').addEventListener('click', () => {
  champsModif.forEach(c => { c.value = valeursInitiales[c.id]; c.disabled = true; });
  barre.style.display = 'none';
  btnModifier.style.display = '';
});

document.getElementById('btn-enregistrer').addEventListener('click', () => {
  champsModif.forEach(c => c.disabled = true);
  barre.style.display = 'none';
  btnModifier.style.display = '';
  btnModifier.textContent = 'Enregistré ✓';
  setTimeout(() => btnModifier.textContent = 'Modifier', 2000);
});

document.getElementById('btn-copier').addEventListener('click', e => {
  navigator.clipboard.writeText(document.getElementById('callback').value);
  e.target.textContent = 'Copié ✓';
  setTimeout(() => e.target.textContent = 'Copier', 2000);
});

// ============================================================================
// PASSERELLE INSCRIPTION → DASHBOARD
// ============================================================================

async function ouvrirDashboard() {
  const shopDomain = localStorage.getItem('beninpay_shop_domain') || formData['i-shopify'];

  if (!shopDomain) {
    toast('Erreur: pas de boutique trouvée');
    return;
  }

  try {
    // Charger les données du dashboard
    const response = await fetch(`${API_BASE}/merchant/dashboard?shop=${shopDomain}`);
    const data = await response.json();

    if (data.merchant) {
      // Remplir les infos du profil
      const boutique = data.merchant.business_name || data.merchant.shop_name;
      const initiales = (boutique.split(/\s+/).map(m => m[0]).join('').slice(0, 2) || 'MB').toUpperCase();

      document.getElementById('d-boutique-nom').textContent = boutique;
      document.getElementById('d-avatar').textContent = initiales;

      // Remplir Mon compte
      document.getElementById('c-nom').value = `${data.merchant.first_name || ''} ${data.merchant.last_name || ''}`.trim();
      document.getElementById('c-email').value = data.merchant.email || '';
      document.getElementById('c-tel').value = data.merchant.phone || '';
      document.getElementById('c-boutique').value = boutique;
      document.getElementById('c-ifu').value = data.merchant.ifu || '';
      document.getElementById('c-rccm').value = data.merchant.rccm || '';
      document.getElementById('c-adresse').value = data.merchant.address || '';
      document.getElementById('c-ville').value = `${data.merchant.city || ''}, ${data.merchant.department || ''}`.trim();

      // Remplir les KPIs
      const kpis = document.querySelectorAll('.kpi .val');
      kpis[0].textContent = `${data.merchant.balance || 0} F`;
      kpis[1].textContent = data.stats?.total_transactions || 0;

      // Remplir les transactions
      chargerTransactions(data.recent_transactions);
    }

    // Basculer vers dashboard
    document.getElementById('vue-inscription').style.display = 'none';
    document.getElementById('vue-dashboard').style.display = 'block';
    window.scrollTo({ top: 0 });

  } catch (error) {
    console.error('Erreur chargement dashboard:', error);
    // Afficher quand même le dashboard avec données par défaut
    const boutique = formData['i-boutique'] || 'Ma Boutique';
    const initiales = (boutique.split(/\s+/).map(m => m[0]).join('').slice(0, 2) || 'MB').toUpperCase();

    document.getElementById('d-boutique-nom').textContent = boutique;
    document.getElementById('d-avatar').textContent = initiales;
    document.getElementById('c-nom').value = `${formData['i-prenom'] || ''} ${formData['i-nom'] || ''}`.trim();
    document.getElementById('c-email').value = formData['i-email'] || '';
    document.getElementById('c-tel').value = `${formData['i-indicatif']?.slice(-4) || ''} ${formData['i-tel'] || ''}`.trim();
    document.getElementById('c-boutique').value = boutique;
    document.getElementById('c-ifu').value = formData['i-ifu'] || '';
    document.getElementById('c-rccm').value = formData['i-rccm'] || '';
    document.getElementById('c-adresse').value = formData['i-adresse'] || '';
    document.getElementById('c-ville').value = `${formData['i-ville'] || ''}, ${formData['i-dept'] || ''}`.trim();

    document.getElementById('vue-inscription').style.display = 'none';
    document.getElementById('vue-dashboard').style.display = 'block';
    window.scrollTo({ top: 0 });
  }
}

function chargerTransactions(transactions) {
  if (!transactions || transactions.length === 0) return;

  // TODO: Mettre à jour le tableau des transactions
  console.log('Transactions chargées:', transactions);
}

// ============================================================================
// INITIALISATION
// ============================================================================

// Restaurer progression si elle existe
window.addEventListener('DOMContentLoaded', () => {
  const savedStep = localStorage.getItem('beninpay_step');
  const savedData = localStorage.getItem('beninpay_data');

  if (savedStep && savedData) {
    try {
      formData = JSON.parse(savedData);
      // Restaurer les valeurs dans les champs
      Object.keys(formData).forEach(key => {
        const el = document.getElementById(key);
        if (el && el.tagName !== 'BUTTON') {
          el.value = formData[key];
        }
      });
      // Aller à l'étape sauvegardée
      // afficher(parseFloat(savedStep));
    } catch (error) {
      console.error('Erreur restauration:', error);
    }
  }
});
