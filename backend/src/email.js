const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)

// S7: екранування для вставки користувацьких даних у HTML листа
const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  )

const sendVerificationEmail = async (email, name, code) => {
  const safeName = escapeHtml(name)
  await resend.emails.send({
    from: 'Aperio <noreply@aperio.pp.ua>',
    to: email,
    subject: 'Твій код підтвердження — Aperio',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <img src="https://aperio.pp.ua/Aperio.png" width="48" style="border-radius: 12px; margin-bottom: 24px;" />
        <h1 style="font-size: 22px; color: #1a1a2e; margin-bottom: 8px;">Привіт, ${safeName}!</h1>
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Твій код підтвердження email для Aperio:
        </p>
        <div style="background: #f4f5f7; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #534AB7;">${code}</span>
        </div>
        <p style="color: #888; font-size: 13px;">
          Введи цей код на сайті щоб підтвердити свою пошту. Код дійсний 24 години.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px;">© 2026 Aperio</p>
      </div>
    `
  })
}

module.exports = { sendVerificationEmail }