import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPaymentConfirmation(merchantEmail, transaction) {
  if (!process.env.SMTP_USER) {
    console.log('[Email] SMTP not configured, skipping notification');
    return { sent: false, reason: 'smtp_not_configured' };
  }

  const html = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 40px 20px;">
      <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #635bff; font-size: 28px; margin: 0;">BeninPay</h1>
          <p style="color: #666; margin-top: 8px;">Confirmation de paiement</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #166534; font-weight: 600; margin: 0;">Paiement recu!</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #666;">Montant</td><td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; text-align: right;">${transaction.amount} FCFA</td></tr>
          <tr><td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #666;">Commission BeninPay</td><td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">${transaction.beninpay_fee} FCFA</td></tr>
          <tr><td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #666;">Vous recevez</td><td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #10b981; text-align: right;">${transaction.merchant_amount} FCFA</td></tr>
          <tr><td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #666;">Client</td><td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">${transaction.customer_name || 'N/A'}</td></tr>
          <tr><td style="padding: 12px 0; color: #666;">Transaction ID</td><td style="padding: 12px 0; font-family: monospace; text-align: right;">#${transaction.id}</td></tr>
        </table>
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.SHOPIFY_APP_URL}/merchant-dashboard.html" style="background: #635bff; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Voir le Dashboard</a>
        </div>
      </div>
      <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">BeninPay - Paiements Mobile Money pour Shopify</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"BeninPay" <${process.env.SMTP_USER}>`,
      to: merchantEmail,
      subject: `Paiement recu: ${transaction.amount} FCFA - BeninPay`,
      html,
    });
    return { sent: true };
  } catch (error) {
    console.error('[Email] Error sending payment confirmation:', error.message);
    return { sent: false, error: error.message };
  }
}

export async function sendWithdrawalUpdate(merchantEmail, withdrawal, status) {
  if (!process.env.SMTP_USER) {
    return { sent: false, reason: 'smtp_not_configured' };
  }

  const statusMessages = {
    approved: { title: 'Retrait approuve', color: '#3b82f6', icon: '✅' },
    rejected: { title: 'Retrait refuse', color: '#ef4444', icon: '❌' },
    completed: { title: 'Retrait complete', color: '#10b981', icon: '💰' },
  };

  const msg = statusMessages[status] || { title: 'Mise a jour retrait', color: '#666', icon: '📋' };

  const html = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 40px 20px;">
      <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #635bff; font-size: 28px; margin: 0;">BeninPay</h1>
        </div>
        <div style="background: ${msg.color}15; border: 1px solid ${msg.color}40; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
          <p style="font-size: 24px; margin: 0 0 8px 0;">${msg.icon}</p>
          <p style="color: ${msg.color}; font-weight: 600; margin: 0;">${msg.title}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #666;">Montant</td><td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; text-align: right;">${withdrawal.amount} FCFA</td></tr>
          <tr><td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #666;">Operateur</td><td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">${withdrawal.mobile_money_operator}</td></tr>
          <tr><td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #666;">Numero</td><td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">${withdrawal.mobile_money_number}</td></tr>
          ${withdrawal.admin_note ? `<tr><td style="padding: 12px 0; color: #666;">Note</td><td style="padding: 12px 0; text-align: right;">${withdrawal.admin_note}</td></tr>` : ''}
        </table>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"BeninPay" <${process.env.SMTP_USER}>`,
      to: merchantEmail,
      subject: `${msg.icon} ${msg.title} - ${withdrawal.amount} FCFA`,
      html,
    });
    return { sent: true };
  } catch (error) {
    console.error('[Email] Error sending withdrawal update:', error.message);
    return { sent: false, error: error.message };
  }
}

export async function sendCustomerPaymentLink(customerEmail, customerName, paymentUrl, amount, shopName) {
  if (!process.env.SMTP_USER) {
    return { sent: false, reason: 'smtp_not_configured' };
  }

  const html = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 40px 20px;">
      <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #635bff; font-size: 28px; margin: 0;">BeninPay</h1>
          <p style="color: #666; margin-top: 8px;">Paiement Mobile Money</p>
        </div>
        <p style="color: #333; font-size: 16px;">Bonjour ${customerName},</p>
        <p style="color: #666;">Votre commande chez <strong>${shopName}</strong> est prete pour le paiement.</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
          <p style="color: #666; margin: 0 0 8px 0;">Montant a payer</p>
          <p style="font-size: 32px; font-weight: 700; color: #1a1a1a; margin: 0;">${amount} FCFA</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${paymentUrl}" style="background: #635bff; color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Payer maintenant</a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">Paiement securise via MTN, Moov ou Celtis Mobile Money</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"BeninPay" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `Paiement de ${amount} FCFA - ${shopName}`,
      html,
    });
    return { sent: true };
  } catch (error) {
    console.error('[Email] Error sending payment link:', error.message);
    return { sent: false, error: error.message };
  }
}
