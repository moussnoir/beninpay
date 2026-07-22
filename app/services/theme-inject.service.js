import { LATEST_API_VERSION } from '@shopify/shopify-api';

const BENINPAY_SNIPPET_KEY = 'snippets/beninpay-button.liquid';
const BENINPAY_MARKER = '<!-- BENINPAY_MOBILE_MONEY -->';

const BENINPAY_SNIPPET = `${BENINPAY_MARKER}
{% if template == 'cart' or request.page_type == 'cart' %}
<div id="beninpay-wrapper" style="margin:16px 0;padding:0;">
  <div style="text-align:center;margin:12px 0;font-size:12px;color:#999;display:flex;align-items:center;gap:12px;">
    <span style="flex:1;height:1px;background:#ddd;"></span>
    <span>ou</span>
    <span style="flex:1;height:1px;background:#ddd;"></span>
  </div>
  <button id="beninpay-trigger" style="
    display:flex;align-items:center;justify-content:center;gap:12px;
    width:100%;padding:18px 24px;
    background:linear-gradient(135deg,#0B3D2E,#14503D);
    color:white;border:none;border-radius:12px;
    font-size:16px;font-weight:700;cursor:pointer;
    font-family:inherit;
    box-shadow:0 4px 15px rgba(11,61,46,0.3);
    transition:all 0.3s;
  " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 25px rgba(11,61,46,0.4)'"
     onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 15px rgba(11,61,46,0.3)'"
     onclick="window.location.href='https://beninpay.onrender.com/checkout.html?shop={{ shop.permanent_domain }}&amount={{ cart.total_price }}&currency={{ cart.currency.iso_code }}&items={{ cart.item_count }}'">
    <span style="font-size:22px;">📱</span>
    <span>Payer {{ cart.total_price | money_without_trailing_zeros }} avec Mobile Money</span>
  </button>
  <div style="display:flex;justify-content:center;gap:16px;margin-top:8px;font-size:11px;color:#666;">
    <span>📱 MTN MoMo</span>
    <span>📲 Moov Money</span>
    <span>💵 Celtis Cash</span>
  </div>
  <div style="text-align:center;margin-top:6px;font-size:10px;color:#999;">🔒 Paiement securise via FedaPay</div>
</div>
{% endif %}
${BENINPAY_MARKER}`;

export async function injectButtonIntoTheme(shop, accessToken) {
  const apiBase = `https://${shop}/admin/api/${LATEST_API_VERSION}`;
  const headers = {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Get the main/published theme
    const themesRes = await fetch(`${apiBase}/themes.json`, { headers });
    if (!themesRes.ok) {
      throw new Error(`Failed to fetch themes: ${themesRes.status}`);
    }
    const themesData = await themesRes.json();
    const mainTheme = themesData.themes.find(t => t.role === 'main');

    if (!mainTheme) {
      throw new Error('No main theme found');
    }

    console.log(`[ThemeInject] Main theme: "${mainTheme.name}" (ID: ${mainTheme.id})`);

    // 2. Create the snippet file
    const putSnippetRes = await fetch(`${apiBase}/themes/${mainTheme.id}/assets.json`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        asset: {
          key: BENINPAY_SNIPPET_KEY,
          value: BENINPAY_SNIPPET
        }
      })
    });

    if (!putSnippetRes.ok) {
      const err = await putSnippetRes.text();
      throw new Error(`Failed to create snippet: ${err}`);
    }

    console.log('[ThemeInject] Snippet created: snippets/beninpay-button.liquid');

    // 3. Find and modify the cart template to include our snippet
    const cartTemplateInjected = await injectIntoCartTemplate(apiBase, headers, mainTheme.id);

    return {
      success: true,
      themeId: mainTheme.id,
      themeName: mainTheme.name,
      snippetCreated: true,
      cartTemplateModified: cartTemplateInjected
    };

  } catch (error) {
    console.error('[ThemeInject] Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function injectIntoCartTemplate(apiBase, headers, themeId) {
  // Try multiple possible cart template locations
  const cartFiles = [
    'sections/main-cart-footer.liquid',
    'sections/cart-template.liquid',
    'templates/cart.liquid',
    'sections/main-cart-items.liquid',
    'layout/theme.liquid'
  ];

  for (const fileKey of cartFiles) {
    try {
      const assetRes = await fetch(
        `${apiBase}/themes/${themeId}/assets.json?asset[key]=${fileKey}`,
        { headers }
      );

      if (!assetRes.ok) continue;

      const assetData = await assetRes.json();
      const content = assetData.asset?.value;

      if (!content) continue;

      // Already injected?
      if (content.includes(BENINPAY_MARKER)) {
        console.log(`[ThemeInject] Already injected in ${fileKey}`);
        return true;
      }

      // Inject the render tag
      const renderTag = "{% render 'beninpay-button' %}";
      let newContent;

      if (fileKey === 'layout/theme.liquid') {
        // For theme.liquid, inject before </body>
        newContent = content.replace('</body>', `${renderTag}\n</body>`);
      } else if (content.includes('</form>')) {
        // Inject after the last </form> in cart sections
        const lastFormIndex = content.lastIndexOf('</form>');
        newContent = content.slice(0, lastFormIndex + 7) + '\n' + renderTag + '\n' + content.slice(lastFormIndex + 7);
      } else if (content.includes('{%- endform -%}') || content.includes('{% endform %}')) {
        const endformMatch = content.match(/\{%-?\s*endform\s*-?%\}/g);
        if (endformMatch) {
          const lastEndform = endformMatch[endformMatch.length - 1];
          const lastIndex = content.lastIndexOf(lastEndform);
          newContent = content.slice(0, lastIndex + lastEndform.length) + '\n' + renderTag + '\n' + content.slice(lastIndex + lastEndform.length);
        }
      } else {
        // Append at end
        newContent = content + '\n' + renderTag + '\n';
      }

      if (!newContent || newContent === content) continue;

      // Save the modified template
      const putRes = await fetch(`${apiBase}/themes/${themeId}/assets.json`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          asset: {
            key: fileKey,
            value: newContent
          }
        })
      });

      if (putRes.ok) {
        console.log(`[ThemeInject] Injected render tag into ${fileKey}`);
        return true;
      }

    } catch (err) {
      console.warn(`[ThemeInject] Skipping ${fileKey}:`, err.message);
    }
  }

  console.warn('[ThemeInject] Could not inject into any cart template - snippet still created');
  return false;
}

export async function removeButtonFromTheme(shop, accessToken) {
  const apiBase = `https://${shop}/admin/api/${LATEST_API_VERSION}`;
  const headers = {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json'
  };

  try {
    const themesRes = await fetch(`${apiBase}/themes.json`, { headers });
    const themesData = await themesRes.json();
    const mainTheme = themesData.themes.find(t => t.role === 'main');

    if (!mainTheme) return { success: false, error: 'No main theme' };

    // Delete the snippet
    await fetch(`${apiBase}/themes/${mainTheme.id}/assets.json?asset[key]=${BENINPAY_SNIPPET_KEY}`, {
      method: 'DELETE',
      headers
    });

    console.log('[ThemeInject] Snippet removed');
    return { success: true };

  } catch (error) {
    return { success: false, error: error.message };
  }
}
