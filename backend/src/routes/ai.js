const express = require('express')
const Anthropic = require('@anthropic-ai/sdk')
const { PrismaClient } = require('@prisma/client')
const auth = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

router.post('/analyze', auth, async (req, res) => {
  try {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()

    // Отримуємо транзакції поточного місяця
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.userId,
        date: {
          gte: new Date(year, month, 1),
          lt: new Date(year, month + 1, 1)
        }
      },
      include: { category: true }
    })

    // Отримуємо транзакції минулого місяця для порівняння
    const prevTransactions = await prisma.transaction.findMany({
      where: {
        userId: req.userId,
        date: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1)
        }
      },
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

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })

    res.json({ analysis: message.content[0].text })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router