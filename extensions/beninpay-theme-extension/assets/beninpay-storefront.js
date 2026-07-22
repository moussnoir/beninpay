/**
 * BeninPay - Bouton de paiement Mobile Money pour Shopify
 * Theme App Extension - Fonctionne sur les boutiques dev (protegees par mot de passe)
 *
 * S'affiche sur la page PANIER (/cart) pour payer l'ensemble de la commande.
 */
(function() {
  'use strict';

  // Configuration depuis le block Liquid ou fallback
  const config = window.__BENINPAY_CONFIG__ || {};
  const root = document.getElementById('beninpay-extension-root');

  const APP_URL = config.appUrl || (root && root.dataset.appUrl) || '';
  const SHOP_DOMAIN = config.shopDomain || (root && root.dataset.shop) || window.Shopify?.shop || window.location.hostname;
  const BUTTON_COLOR = config.buttonColor || '#00b894';
  const BUTTON_TEXT = config.buttonText || 'Payer avec Mobile Money';
  const SHOW_OPERATORS = config.showOperators !== false;

  let cartData = null;

  async function getCart() {
    try {
      const res = await fetch('/cart.js', { credentials: 'same-origin' });
      const text = await res.text();
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        cartData = JSON.parse(text);
        console.log('[BeninPay] Cart charge:', cartData.item_count, 'articles');
        return cartData;
      } else {
        console.warn('[BeninPay] /cart.js a retourne du HTML (page protegee?)');
        return null;
      }
    } catch (e) {
      console.error('[BeninPay] Erreur chargement cart:', e);
      return null;
    }
  }

  function isCartPage() {
    const path = window.location.pathname;
    if (path === '/cart' || path.startsWith('/cart')) return true;
    if (document.querySelector('form[action="/cart"], [data-cart-form], .cart, #cart, .cart-form')) return true;
    return false;
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
      <button class="beninpay-cart-btn" id="beninpay-trigger" style="background: linear-gradient(135deg, ${BUTTON_COLOR}, ${adjustColor(BUTTON_COLOR, 20)});">
        <span style="font-size:22px;">📱</span>
        <span>${hasItems ? total.toLocaleString('fr-FR') + ' FCFA - ' + BUTTON_TEXT : BUTTON_TEXT}</span>
      </button>
      ${SHOW_OPERATORS ? `
      <div class="beninpay-cart-info">
        <span>📱 MTN MoMo</span>
        <span>📲 Moov Money</span>
        <span>💵 Celtis Cash</span>
      </div>` : ''}
      <div class="beninpay-cart-secure">Paiement securise via FedaPay</div>
    `;

    // Determiner ou inserer le bouton
    let inserted = false;

    // Si on a un root element (app block), inserer dedans
    if (root) {
      root.appendChild(wrapper);
      inserted = true;
    }

    if (!inserted) {
      // Chercher le bouton Checkout pour inserer apres
      const checkoutBtn = document.querySelector(
        '[name="checkout"], [type="submit"][name="checkout"], .cart__checkout-button, .cart__submit, ' +
        'button[name="checkout"], input[name="checkout"], .cart-checkout-button, ' +
        '[data-cart-checkout], .cart__ctas, .cart__buttons, .cart-buttons, ' +
        '.shopify-payment-button, .additional-checkout-buttons, [data-shopify="payment-button"]'
      );

      if (checkoutBtn) {
        const target = checkoutBtn.closest('.cart__ctas') || checkoutBtn.closest('.cart__buttons') ||
                       checkoutBtn.closest('.cart-buttons') || checkoutBtn.closest('.cart__footer') ||
                       checkoutBtn.parentNode;
        target.appendChild(wrapper);
        inserted = true;
      }
    }

    if (!inserted) {
      const cartForm = document.querySelector('form[action="/cart"], .cart-form, [data-cart-form], .cart, #cart');
      if (cartForm) {
        cartForm.appendChild(wrapper);
        inserted = true;
      }
    }

    if (!inserted) {
      // Dernier recours: bouton flottant
      wrapper.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;padding:12px 16px;background:white;box-shadow:0 -4px 20px rgba(0,0,0,0.15);';
      document.body.appendChild(wrapper);
    }

    wrapper.querySelector('#beninpay-trigger').addEventListener('click', function(e) {
      e.preventDefault();
      openPaymentModal();
    });
  }

  function adjustColor(hex, amount) {
    hex = hex.replace('#', '');
    const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + amount);
    const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + amount);
    const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + amount);
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  }

  function createModal() {
    const modal = document.createElement('div');
    modal.className = 'beninpay-modal-overlay';
    modal.id = 'beninpay-modal';
    modal.innerHTML = `
      <div class="beninpay-modal">
        <div class="beninpay-modal-header">
          <div class="beninpay-modal-title">Paiement Mobile Money</div>
          <button class="beninpay-modal-close" id="beninpay-close-btn">&times;</button>
        </div>
        <div id="beninpay-modal-content"></div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#beninpay-close-btn').addEventListener('click', function() {
      modal.classList.remove('active');
    });
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

    const itemsHtml = cart.items.map(function(item) {
      return `
      <div class="beninpay-cart-item">
        ${item.image ? '<img src="' + item.image + '" alt="">' : '<div style="width:40px;height:40px;background:#eee;border-radius:6px;"></div>'}
        <div class="beninpay-cart-item-info">
          <div class="beninpay-cart-item-name">${item.product_title}</div>
          <div class="beninpay-cart-item-qty">${item.variant_title ? item.variant_title + ' - ' : ''}Qte: ${item.quantity}</div>
        </div>
        <div class="beninpay-cart-item-price">${formatPrice(item.line_price)} F</div>
      </div>`;
    }).join('');

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
          <div class="beninpay-op-option" data-op="mtn">
            <div class="beninpay-op-icon">📱</div>
            <div class="beninpay-op-name">MTN MoMo</div>
          </div>
          <div class="beninpay-op-option" data-op="moov">
            <div class="beninpay-op-icon">📲</div>
            <div class="beninpay-op-name">Moov Money</div>
          </div>
          <div class="beninpay-op-option" data-op="celtis">
            <div class="beninpay-op-icon">💵</div>
            <div class="beninpay-op-name">Celtis Cash</div>
          </div>
        </div>
      </div>

      <button class="beninpay-pay-btn" id="beninpay-submit" style="background: linear-gradient(135deg, ${BUTTON_COLOR}, ${adjustColor(BUTTON_COLOR, 20)});">
        Payer ${total.toLocaleString('fr-FR')} FCFA
      </button>
    `;

    // Evenements operateurs
    content.querySelectorAll('.beninpay-op-option').forEach(function(el) {
      el.addEventListener('click', function() {
        content.querySelectorAll('.beninpay-op-option').forEach(function(o) { o.classList.remove('selected'); });
        el.classList.add('selected');
      });
    });

    // Evenement submit
    content.querySelector('#beninpay-submit').addEventListener('click', submitPayment);

    document.getElementById('beninpay-modal').classList.add('active');
  }

  async function submitPayment() {
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

    const productNames = cart.items.map(function(i) { return i.product_title + ' x' + i.quantity; }).join(', ');

    try {
      const res = await fetch(APP_URL + '/api/checkout/create', {
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
          cart_items: cart.items.map(function(i) {
            return {
              product_id: i.product_id,
              variant_id: i.variant_id,
              title: i.product_title,
              variant_title: i.variant_title,
              quantity: i.quantity,
              price: Math.round(i.price / 100)
            };
          }),
          cart_token: cart.token
        })
      });

      const data = await res.json();

      if (data.success && data.payment_url) {
        msgDiv.innerHTML = '<div class="beninpay-success">Redirection vers le paiement Mobile Money...</div>';
        btn.innerHTML = 'Redirection...';
        setTimeout(function() { window.location.href = data.payment_url; }, 1000);
      } else if (data.success && data.checkout_url) {
        msgDiv.innerHTML = '<div class="beninpay-success">Redirection vers le paiement...</div>';
        setTimeout(function() { window.location.href = data.checkout_url; }, 1000);
      } else {
        throw new Error(data.error || 'Erreur lors du paiement');
      }
    } catch (e) {
      msgDiv.innerHTML = '<div class="beninpay-error">Erreur: ' + e.message + '. Veuillez reessayer.</div>';
      btn.disabled = false;
      btn.textContent = 'Payer ' + total.toLocaleString('fr-FR') + ' FCFA';
    }
  }

  // Initialisation
  function init() {
    console.log('[BeninPay] Theme App Extension charge sur:', window.location.pathname);

    if (isCartPage()) {
      console.log('[BeninPay] Page panier detectee, injection du bouton...');
      createButton();
      createModal();
      return;
    }

    // Observer pour les cart drawers dynamiques
    const observer = new MutationObserver(function() {
      if (isCartPage() && !document.getElementById('beninpay-trigger')) {
        console.log('[BeninPay] Cart detecte via mutation, injection...');
        createButton();
        createModal();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(function() { observer.disconnect(); }, 10000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
