const express = require('express')
const prisma = require('../prisma')
const crypto = require('crypto')

const router = express.Router()

// Ендпоінт, куди Monobank буде слати POST-запити
router.post('/monobank', async (req, res) => {
  try {
    // 1. Отримуємо дані про платіж від Монобанку
    const { type, data } = req.body

    // Нас цікавлять тільки успішні надходження на банку (StatementItem)
    if (type === 'StatementItem' && data && data.statementItem) {
      const { amount, comment } = data.statementItem

      // amount приходить в копійках. 50 грн = 5000.
      // Шукаємо email у коментарі (коментар може містити щось окрім email-у, тому робимо базовий пошук)
      if (amount > 0 && comment) {
        
        // Регулярний вираз для пошуку email у тексті коментаря
        const emailMatch = comment.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi)
        
        if (emailMatch && emailMatch.length > 0) {
          const userEmail = emailMatch[0].toLowerCase()

          // Знаходимо користувача за email
          const user = await prisma.user.findUnique({
            where: { email: userEmail }
          })

          if (user) {
            // Розраховуємо кількість бонусних токенів (наприклад, 1 токен за кожні 10 грн, або фіксовано +5 за будь-який донат від 50 грн)
            // Давай зробимо просто: будь-який донат додає +5 токенів (можеш змінити логіку пізніше)
            const tokensToAdd = 5;

            // Оновлюємо баланс користувача
            await prisma.user.update({
              where: { id: user.id },
              data: {
                aiTokens: { increment: tokensToAdd }
              }
            })
            
            console.log(`[Monobank Webhook] Успішно додано ${tokensToAdd} токенів користувачу ${userEmail} за донат ${amount / 100} грн.`)
          } else {
             console.log(`[Monobank Webhook] Користувача з email ${userEmail} не знайдено в базі.`)
          }
        }
      }
    }

    // Monobank вимагає, щоб ми завжди повертали статус 200 OK
    res.status(200).send('OK')
  } catch (error) {
    console.error('[Monobank Webhook] Помилка обробки:', error)
    res.status(500).send('Internal Server Error')
  }
})

// Ендпоінт для GET-запиту (Монобанк іноді перевіряє доступність URL через GET)
router.get('/monobank', (req, res) => {
  res.status(200).send('Webhook is ready')
})

module.exports = router