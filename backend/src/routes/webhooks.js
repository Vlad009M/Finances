const express = require('express')
const crypto = require('crypto')
const prisma = require('../prisma')

const router = express.Router()

// Секрет — частина URL, на який зареєстровано webhook у Monobank.
// Personal API НЕ підписує statement-вебхуки (X-Sign є лише в acquiring/checkout),
// тому захист = невгадуваний секрет у шляху + ідемпотентність по statementItem.id.
const SECRET = process.env.MONOBANK_WEBHOOK_SECRET

// constant-time порівняння рядків (щоб не зливати секрет через timing)
function safeEqual(a, b) {
  const ab = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

router.post('/monobank/:secret', async (req, res) => {
  if (!SECRET || !safeEqual(req.params.secret, SECRET)) {
    return res.status(403).send('Forbidden')
  }

  try {
    const { type, data } = req.body

    if (type === 'StatementItem' && data && data.statementItem) {
      const { id, amount, comment } = data.statementItem

      // Мінімум 50 грн (5000 копійок) і є коментар
      if (amount >= 5000 && comment) {
        const emailMatch = comment.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi)

        if (emailMatch && emailMatch.length > 0) {
          const userEmail = emailMatch[0].toLowerCase()

          // Ідемпотентність: один statementItem.id зараховуємо лише раз.
          // unique-конфлікт = цей платіж уже оброблено (повтор від Monobank / replay).
          if (id) {
            try {
              await prisma.processedDonation.create({ data: { id: String(id) } })
            } catch {
              return res.status(200).send('OK (duplicate)')
            }
          }

          const user = await prisma.user.findUnique({ where: { email: userEmail } })
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: { aiTokens: { increment: 5 } }
            })
            console.log(`[Monobank Webhook] +5 токенів -> ${userEmail} за ${amount / 100} грн`)
          } else {
            console.log(`[Monobank Webhook] Користувача ${userEmail} не знайдено`)
          }
        }
      }
    }

    res.status(200).send('OK') // Monobank вимагає 200 OK завжди
  } catch (error) {
    console.error('[Monobank Webhook] Помилка:', error)
    res.status(500).send('Internal Server Error')
  }
})

// GET для перевірки доступності (теж за секретом)
router.get('/monobank/:secret', (req, res) => {
  if (!SECRET || !safeEqual(req.params.secret, SECRET)) return res.status(403).send('Forbidden')
  res.status(200).send('Webhook is ready')
})

module.exports = router
