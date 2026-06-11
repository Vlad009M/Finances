const express = require('express')
const Anthropic = require('@anthropic-ai/sdk')
const prisma = require('../prisma')
const auth = require('../middleware/auth')

const router = express.Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// 1. Новий ендпоінт для перевірки лімітів
router.get('/limits', auth, async (req, res) => {
  try {
    let user = await prisma.user.findUnique({ where: { id: req.userId } })
    const now = new Date()
    const lastRefill = new Date(user.lastRefillAt)
    const hoursPassed = (now - lastRefill) / (1000 * 60 * 60)

    // Якщо минуло 12 годин - автоматично поповнюємо до 5
    if (hoursPassed >= 12) {
      user = await prisma.user.update({
        where: { id: req.userId },
        data: { aiTokens: 5, lastRefillAt: now }
      })
    }

    const nextRefill = new Date(user.lastRefillAt.getTime() + 12 * 60 * 60 * 1000)

    res.json({
      tokens: user.aiTokens,
      nextRefill: nextRefill.toISOString()
    })
  } catch (e) {
    res.status(500).json({ error: 'Помилка отримання лімітів' })
  }
})

// 2. Оновлений ендпоінт аналізу
router.post('/analyze', auth, async (req, res) => {
  let isAdmin = false
  let charged = false // S5: чи списано токен (для повернення при помилці)
  try {
    // --- ПЕРЕВІРКА ЛІМІТІВ ---
    let user = await prisma.user.findUnique({ where: { id: req.userId } })
    const now = new Date()
    const lastRefill = new Date(user.lastRefillAt)

    isAdmin = user.role === 'ROOT' // S5: без хардкоду email

    // Авто-рефіл кожні 12 годин
    if (!isAdmin && (now - lastRefill) / (1000 * 60 * 60) >= 12) {
      user = await prisma.user.update({
        where: { id: req.userId },
        data: { aiTokens: 5, lastRefillAt: now }
      })
    }

    // Швидка (неавторитетна) перевірка — щоб не робити зайву роботу для тих, у кого 0
    if (!isAdmin && user.aiTokens <= 0) {
      return res.status(403).json({ error: 'LIMIT_REACHED' })
    }
    // -------------------------

    const month = now.getMonth()
    const year = now.getFullYear()

    // Отримуємо транзакції поточного місяця
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId, date: { gte: new Date(year, month, 1), lt: new Date(year, month + 1, 1) } },
      include: { category: true }
    })

    // Отримуємо транзакції минулого місяця для порівняння
    const prevTransactions = await prisma.transaction.findMany({
      where: { userId: req.userId, date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } },
      include: { category: true }
    })

    if (transactions.length === 0) {
      return res.json({ analysis: 'Додай транзакції за поточний місяць щоб отримати аналіз!' })
    }

    // Формуємо статистику
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const prevExpense = prevTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

    // Групуємо по категоріях
    const byCategory = {}
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const name = t.category?.name || 'Інше'
      byCategory[name] = (byCategory[name] || 0) + t.amount
    })

    const categoryText = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => `  - ${name}: ₴${amount.toLocaleString()}`)
      .join('\n')

    const MONTHS = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень']

    const prompt = `Ти фінансовий аналітик. Проаналізуй витрати користувача за ${MONTHS[month]} ${year} року і дай конкретні поради українською мовою.

ДАНІ ЗА ${MONTHS[month].toUpperCase()}:
- Доходи: ₴${income.toLocaleString()}
- Витрати: ₴${expense.toLocaleString()}
- Баланс: ₴${(income - expense).toLocaleString()}
- Витрати минулого місяця: ₴${prevExpense.toLocaleString()}

ВИТРАТИ ПО КАТЕГОРІЯХ:
${categoryText}

Дай відповідь у такому форматі:

📊 ЗАГАЛЬНИЙ ВИСНОВОК
(2-3 речення про стан фінансів)

⚠️ НА ЩО ЗВЕРНУТИ УВАГУ
(конкретні категорії де витрати завеликі)

💡 ПОРАДИ НА НАСТУПНИЙ МІСЯЦЬ
(3-4 конкретні поради з цифрами)

🎯 РЕКОМЕНДОВАНИЙ БЮДЖЕТ
(розбивка по категоріях на наступний місяць)`

    // S5: атомарно знімаємо токен ПЕРЕД запитом до Claude (захист від TOCTOU).
    // updateMany з умовою aiTokens > 0 не дасть піти в мінус при гонці запитів.
    if (!isAdmin) {
      const dec = await prisma.user.updateMany({
        where: { id: req.userId, aiTokens: { gt: 0 } },
        data: { aiTokens: { decrement: 1 } }
      })
      if (dec.count === 0) return res.status(403).json({ error: 'LIMIT_REACHED' })
      charged = true
    }

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })

    res.json({ analysis: message.content[0].text })
  } catch (e) {
    // S5: повертаємо токен, якщо аналіз не вдався після списання
    if (charged) {
      await prisma.user.update({
        where: { id: req.userId },
        data: { aiTokens: { increment: 1 } }
      }).catch(() => {})
    }
    console.error('AI analyze error:', e)
    res.status(500).json({ error: 'Не вдалося виконати AI аналіз' }) // S8: без e.message
  }
})

module.exports = router