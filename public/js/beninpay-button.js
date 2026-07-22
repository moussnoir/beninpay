/**
 * BeninPay - Bouton de paiement Mobile Money pour Shopify
 *
 * S'affiche sur la page PANIER (/cart) pour payer l'ensemble de la commande.
 * Le client ajoute ses produits, va au panier, puis clique "Payer avec Mobile Money".
 *
 * Installation: Ajouter dans theme.liquid avant </body> :
 * <script src="https://YOUR_APP_URL/js/beninpay-button.js" data-shop="votre-boutique.myshopify.com"></script>
 */
(function() {
  'use strict';

  const scriptTag = document.currentScript || document.querySelector('script[src*="beninpay-button"]');
  const APP_URL = scriptTag ? new URL(scriptTag.src).origin : '';
  const SHOP_DOMAIN = scriptTag?.dataset?.shop || window.Shopify?.shop || window.location.hostname;

  const STYLES = `
    .beninpay-cart-wrapper {
      margin: 16px 0; padding: 0;
    }
    .beninpay-cart-btn {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      width: 100%; padding: 18px 24px;
      background: linear-gradient(135deg, #00b894, #00cec9);
      color: white; border: none; border-radius: 12px;
      font-size: 16px; font-weight: 700; cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: inherit; position: relative; overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 184, 148, 0.3);
    }
    .beninpay-cart-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 184, 148, 0.4);
    }
    .beninpay-cart-btn:active { transform: translateY(0); }
    .beninpay-cart-info {
      display: flex; justify-content: center; gap: 16px;
      margin-top: 8px; font-size: 11px; color: #666;
    }
    .beninpay-cart-info span { display: flex; align-items: center; gap: 4px; }
    .beninpay-cart-secure { text-align: center; margin-top: 6px; font-size: 10px; color: #999; }
    .beninpay-or {
      text-align: center; margin: 12px 0; font-size: 12px; color: #999;
      display: flex; align-items: center; gap: 12px;
    }
    .beninpay-or::before, .beninpay-or::after {
      content: ''; flex: 1; height: 1px; background: #ddd;
    }

    /* Modal */
    .beninpay-modal-overlay {
      display: none; position: fixed; inset: 0; z-index: 999999;
      background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      align-items: center; justify-content: center; padding: 20px;
    }
    .beninpay-modal-overlay.active { display: flex; }
    .beninpay-modal {
      background: white; border-radius: 20px; padding: 32px;
      max-width: 480px; width: 100%; max-height: 90vh; overflow-y: auto;
      box-shadow: 0 24px 80px rgba(0,0,0,0.3);
      animation: beninpaySlide 0.3s ease-out;
    }
    @keyframes beninpaySlide { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .beninpay-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .beninpay-modal-title { font-size: 20px; font-weight: 700; color: #1a1a1a; }
    .beninpay-modal-close { background: #f0f0f0; border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .beninpay-modal-close:hover { background: #e0e0e0; }

    /* Cart summary in modal */
    .beninpay-cart-summary {
      background: #f8f9fa; border-radius: 12px; padding: 16px; margin-bottom: 20px;
      max-height: 180px; overflow-y: auto;
    }
    .beninpay-cart-item {
      display: flex; align-items: center; gap: 12px; padding: 8px 0;
      border-bottom: 1px solid #eee; font-size: 13px;
    }
    .beninpay-cart-item:last-child { border: none; }
    .beninpay-cart-item img { width: 40px; height: 40px; object-fit: cover; border-radius: 6px; }
    .beninpay-cart-item-info { flex: 1; }
    .beninpay-cart-item-name { font-weight: 600; color: #333; font-size: 12px; }
    .beninpay-cart-item-qty { font-size: 11px; color: #888; }
    .beninpay-cart-item-price { font-weight: 700; color: #333; white-space: nowrap; }
    .beninpay-cart-total {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 12px; margin-top: 8px; border-top: 2px solid #eee;
      font-weight: 800; font-size: 16px;
    }
    .beninpay-cart-total-amount { color: #00b894; }

    .beninpay-form-group { margin-bottom: 14px; }
    .beninpay-label { display: block; font-size: 12px; font-weight: 600; color: #555; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .beninpay-input {
      width: 100%; padding: 12px 16px; border: 2px solid #e8e8e8; border-radius: 10px;
      font-size: 14px; font-family: inherit; transition: border-color 0.2s;
    }
    .beninpay-input:focus { outline: none; border-color: #00b894; }

    .beninpay-operators-select { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .beninpay-op-option {
      padding: 14px 10px; border: 2px solid #e8e8e8; border-radius: 12px;
      text-align: center; cursor: pointer; transition: all 0.2s;
    }
    .beninpay-op-option:hover { border-color: #00b894; }
    .beninpay-op-option.selected { border-color: #00b894; background: rgba(0,184,148,0.05); box-shadow: 0 0 0 3px rgba(0,184,148,0.1); }
    .beninpay-op-icon { font-size: 24px; margin-bottom: 4px; }
    .beninpay-op-name { font-size: 11px; font-weight: 700; color: #333; }

    .beninpay-pay-btn {
      width: 100%; padding: 16px; margin-top: 20px;
      background: linear-gradient(135deg, #00b894, #00cec9);
      color: white; border: none; border-radius: 12px; font-size: 16px;
      font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s;
    }
    .beninpay-pay-btn:hover { box-shadow: 0 6px 20px rgba(0,184,148,0.4); transform: translateY(-1px); }
    .beninpay-pay-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

    .beninpay-loading { display: inline-block; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: beninpaySpin 0.6s linear infinite; }
    @keyframes beninpaySpin { to { transform: rotate(360deg); } }

    .beninpay-error { background: #fff5f5; border: 1px solid #feb2b2; color: #c53030; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
    .beninpay-success { background: #f0fff4; border: 1px solid #9ae6b4; color: #22543d; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
  `;

  let cartData = null;

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  async function getCart() {
    try {
      const res = await fetch('/cart.js', { credentials: 'same-origin' });
      const text = await res.text();
      // Vérifier que c'est bien du JSON (pas la page mot de passe)
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        cartData = JSON.parse(text);
        console.log('[BeninPay] Cart chargé:', cartData.item_count, 'articles');
        return cartData;
      } else {
        console.warn('[BeninPay] /cart.js a retourné du HTML (page protégée?)');
        return null;
      }
    } catch (e) {
      console.error('[BeninPay] Error fetching cart:', e);
      return null;
    }
  }

  function isCartPage() {
    const path = window.location.pathname;
    if (path === '/cart' || path.startsWith('/cart')) return true;
    // Chercher un formulaire de panier sur la page actuelle
    if (document.querySelector('form[action="/cart"], [data-cart-form], .cart, #cart, .cart-form')) return true;
    return false;
  }

  function isCheckoutPage() {
    const path = window.location.pathname;
    return path.startsWith('/checkout');
  }

  function formatPrice(cents) {
    return Math.round(cents / 100).toLocaleString('fr-FR');
  }

  async function createButton() {
    const cart = await getCart();
    const total = cart ? Math.round(cart.total_price / 100) : 0;
    const hasItems = cart && cart.item_count > 0;

    const wrapper = document.createElement('div');
    wrapper.className = 'beninpay-cart-wrapper';
    wrapper.innerHTML = `
      <div class="beninpay-or">ou</div>
      <button class="beninpay-cart-btn" id="beninpay-trigger">
        <span style="font-size:22px;">📱</span>
        <span>${hasItems ? `Payer ${total.toLocaleString('fr-FR')} FCFA avec Mobile Money` : 'Payer avec Mobile Money'}</span>
      </button>
      <div class="beninpay-cart-info">
        <span>📱 MTN MoMo</span>
        <span>📲 Moov Money</span>
        <span>💵 Celtis Cash</span>
      </div>
      <div class="beninpay-cart-secure">🔒 Paiement securise via FedaPay</div>
    `;

    // Inserer apres le bouton Checkout / Passer la commande
    const checkoutBtn = document.querySelector(
      '[name="checkout"], [type="submit"][name="checkout"], .cart__checkout-button, .cart__submit, ' +
      'button[name="checkout"], input[name="checkout"], .cart-checkout-button, ' +
      '[data-cart-checkout], .cart__ctas, .cart__buttons, .cart-buttons, ' +
      '.shopify-payment-button, .additional-checkout-buttons, [data-shopify="payment-button"]'
    );

    let inserted = false;

    if (checkoutBtn) {
      const target = checkoutBtn.closest('.cart__ctas') || checkoutBtn.closest('.cart__buttons') ||
                     checkoutBtn.closest('.cart-buttons') || checkoutBtn.closest('.cart__footer') ||
                     checkoutBtn.parentNode;
      target.appendChild(wrapper);
      inserted = true;
    }

    if (!inserted) {
      // Fallback: chercher le formulaire du panier
      const cartForm = document.querySelector('form[action="/cart"], .cart-form, [data-cart-form], .cart, #cart, #CartDrawer, .cart-drawer');
      if (cartForm) {
        cartForm.appendChild(wrapper);
        inserted = true;
      }
    }

    if (!inserted) {
      // Dernier recours: bouton flottant en bas de page
      wrapper.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;padding:12px 16px;background:white;box-shadow:0 -4px 20px rgba(0,0,0,0.15);';
      document.body.appendChild(wrapper);
    }

    wrapper.querySelector('#beninpay-trigger').addEventListener('click', function(e) {
      e.preventDefault();
      openPaymentModal();
    });
  }

  function createModal() {
    const modal = document.createElement('div');
    modal.className = 'beninpay-modal-overlay';
    modal.id = 'beninpay-modal';
    modal.innerHTML = `
      <div class="beninpay-modal">
        <div class="beninpay-modal-header">
          <div class="beninpay-modal-title">Paiement Mobile Money</div>
          <button class="beninpay-modal-close" onclick="document.getElementById('beninpay-modal').classList.remove('active')">&times;</button>
        </div>
        <div id="beninpay-modal-content"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  async function openPaymentModal() {
    const cart = await getCart();
    if (!cart || cart.item_count === 0) {
      alert('Ajoutez des produits au panier avant de payer.');
      return;
    }

    const total = Math.round(cart.total_price / 100);

    // Construire le resume du panier
    const itemsHtml = cart.items.map(item => `
      <div class="beninpay-cart-item">
        ${item.image ? `<img src="${item.image}" alt="">` : '<div style="width:40px;height:40px;background:#eee;border-radius:6px;"></div>'}
        <div class="beninpay-cart-item-info">
          <div class="beninpay-cart-item-name">${item.product_title}</div>
          <div class="beninpay-cart-item-qty">${item.variant_title ? item.variant_title + ' · ' : ''}Qte: ${item.quantity}</div>
        </div>
        <div class="beninpay-cart-item-price">${formatPrice(item.line_price)} F</div>
      </div>
    `).join('');

    const content = document.getElementById('beninpay-modal-content');
    content.innerHTML = `
      <div class="beninpay-cart-summary">
        ${itemsHtml}
        <div class="beninpay-cart-total">
          <span>Total</span>
          <span class="beninpay-cart-total-amount">${total.toLocaleString('fr-FR')} FCFA</span>
        </div>
      </div>

      <div id="beninpay-msg"></div>

      <div class="beninpay-form-group">
        <label class="beninpay-label">Votre nom complet</label>
        <input type="text" class="beninpay-input" id="beninpay-name" placeholder="Jean Koffi" required>
      </div>

      <div class="beninpay-form-group">
        <label class="beninpay-label">Numero de telephone Mobile Money</label>
        <input type="tel" class="beninpay-input" id="beninpay-phone" placeholder="+229 97 12 34 56" required>
      </div>

      <div class="beninpay-form-group">
        <label class="beninpay-label">Email (pour le recu)</label>
        <input type="email" class="beninpay-input" id="beninpay-email" placeholder="jean@email.com">
      </div>

      <div class="beninpay-form-group">
        <label class="beninpay-label">Choisir votre operateur</label>
        <div class="beninpay-operators-select">
          <div class="beninpay-op-option" data-op="mtn" onclick="window.beninpaySelectOp(this)">
            <div class="beninpay-op-icon">📱</div>
            <div class="beninpay-op-name">MTN MoMo</div>
          </div>
          <div class="beninpay-op-option" data-op="moov" onclick="window.beninpaySelectOp(this)">
            <div class="beninpay-op-icon">📲</div>
            <div class="beninpay-op-name">Moov Money</div>
          </div>
          <div class="beninpay-op-option" data-op="celtis" onclick="window.beninpaySelectOp(this)">
            <div class="beninpay-op-icon">💵</div>
            <div class="beninpay-op-name">Celtis Cash</div>
          </div>
        </div>
      </div>

      <button class="beninpay-pay-btn" id="beninpay-submit" onclick="window.beninpaySubmit()">
        Payer ${total.toLocaleString('fr-FR')} FCFA
      </button>
    `;

    document.getElementById('beninpay-modal').classList.add('active');
  }

  window.beninpaySelectOp = function(el) {
    document.querySelectorAll('.beninpay-op-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
  };

  window.beninpaySubmit = async function() {
    const cart = cartData;
    if (!cart) return;

    const total = Math.round(cart.total_price / 100);
    const name = document.getElementById('beninpay-name')?.value?.trim();
    const phone = document.getElementById('beninpay-phone')?.value?.trim();
    const email = document.getElementById('beninpay-email')?.value?.trim();
    const opEl = document.querySelector('.beninpay-op-option.selected');
    const operator = opEl?.dataset?.op;

    const msgDiv = document.getElementById('beninpay-msg');
    msgDiv.innerHTML = '';

    if (!name) { msgDiv.innerHTML = '<div class="beninpay-error">Veuillez entrer votre nom</div>'; return; }
    if (!phone) { msgDiv.innerHTML = '<div class="beninpay-error">Veuillez entrer votre numero de telephone</div>'; return; }
    if (!operator) { msgDiv.innerHTML = '<div class="beninpay-error">Veuillez choisir un operateur Mobile Money</div>'; return; }

    const btn = document.getElementById('beninpay-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="beninpay-loading"></span> Traitement en cours...';

    // Description avec les produits du panier
    const productNames = cart.items.map(i => `${i.product_title} x${i.quantity}`).join(', ');

    try {
      const res = await fetch(`${APP_URL}/api/checkout/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: SHOP_DOMAIN,
          product_title: productNames,
          quantity: cart.item_count,
          amount: total,
          customer_name: name,
          customer_phone: phone,
          customer_email: email || '',
          operator: operator,
          cart_items: cart.items.map(i => ({
            product_id: i.product_id,
            variant_id: i.variant_id,
            title: i.product_title,
            variant_title: i.variant_title,
            quantity: i.quantity,
            price: Math.round(i.price / 100)
          })),
          cart_token: cart.token
        })
      });

      const data = await res.json();

      if (data.success && data.payment_url) {
        msgDiv.innerHTML = '<div class="beninpay-success">Redirection vers le paiement Mobile Money...</div>';
        btn.innerHTML = '✓ Redirection...';
        setTimeout(() => { window.location.href = data.payment_url; }, 1000);
      } else if (data.success && data.checkout_url) {
        msgDiv.innerHTML = '<div class="beninpay-success">Redirection vers le paiement...</div>';
        setTimeout(() => { window.location.href = data.checkout_url; }, 1000);
      } else {
        throw new Error(data.error || 'Erreur lors du paiement');
      }
    } catch (e) {
      msgDiv.innerHTML = `<div class="beninpay-error">Erreur: ${e.message}. Veuillez reessayer.</div>`;
      btn.disabled = false;
      btn.textContent = `Payer ${total.toLocaleString('fr-FR')} FCFA`;
    }
  };

  // Init: s'affiche sur la page panier ou toute page avec un formulaire cart
  function init() {
    console.log('[BeninPay] Script chargé sur:', window.location.pathname);

    // Sur la page panier, afficher immédiatement
    if (isCartPage()) {
      console.log('[BeninPay] Page panier détectée, injection du bouton...');
      injectStyles();
      createButton();
      createModal();
      return;
    }

    // Sur les autres pages, observer si un cart drawer apparait
    const observer = new MutationObserver(() => {
      if (isCartPage() && !document.getElementById('beninpay-trigger')) {
        console.log('[BeninPay] Cart détecté via mutation, injection...');
        injectStyles();
        createButton();
        createModal();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Arrêter après 10s pour ne pas gaspiller de ressources
    setTimeout(() => observer.disconnect(), 10000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
