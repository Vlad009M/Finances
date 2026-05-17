const express = require('express')
const { PrismaClient } = require('@prisma/client')
const auth = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// Словник автокатегоризації
const keywordMap = {
  // Їжа
  'сільпо': 'Їжа', 'silpo': 'Їжа', 'атб': 'Їжа', 'atb': 'Їжа',
  'новус': 'Їжа', 'novus': 'Їжа', 'фора': 'Їжа', 'fora': 'Їжа',
  'мcdonald': 'Їжа', 'mcdonalds': 'Їжа', 'kfc': 'Їжа',
  'pizza': 'Їжа', 'піца': 'Їжа', 'суші': 'Їжа', 'sushi': 'Їжа',
  'metro': 'Їжа', 'ашан': 'Їжа', 'auchan': 'Їжа',
  'варус': 'Їжа', 'varus': 'Їжа', 'rukavychka': 'Їжа',

  // Транспорт
  'uber': 'Транспорт', 'bolt': 'Транспорт', 'uklon': 'Транспорт',
  'уклон': 'Транспорт', 'таксі': 'Транспорт', 'taxi': 'Транспорт',
  'wog': 'Транспорт', 'okko': 'Транспорт', 'окко': 'Транспорт',
  'Shell': 'Транспорт', 'автобус': 'Транспорт', 'metro': 'Транспорт',
  'укрзалізниця': 'Транспорт', 'ukrzaliznytsia': 'Транспорт',

  // Розваги
  'steam': 'Розваги', 'netflix': 'Розваги', 'spotify': 'Розваги',
  'youtube': 'Розваги', 'playstation': 'Розваги', 'xbox': 'Розваги',
  'cinema': 'Розваги', 'кінотеатр': 'Розваги', 'multiplex': 'Розваги',
  'планета кіно': 'Розваги', 'apple': 'Розваги', 'google play': 'Розваги',

  // Здоров'я
  'аптека': 'Здоров\'я', 'pharmacy': 'Здоров\'я', 'бажаємо': 'Здоров\'я',
  'аnc': 'Здоров\'я', 'медицина': 'Здоров\'я', 'лікарня': 'Здоров\'я',
  'клініка': 'Здоров\'я', 'стоматолог': 'Здоров\'я',

  // Одяг
  'zara': 'Одяг', 'h&m': 'Одяг', 'hm': 'Одяг', 'reserved': 'Одяг',
  'lcwaikiki': 'Одяг', 'cropp': 'Одяг', 'house': 'Одяг',
  'adidas': 'Одяг', 'nike': 'Одяг', 'розетка': 'Одяг',

  // Комунальні
  'київенерго': 'Комунальні', 'газ': 'Комунальні', 'водоканал': 'Комунальні',
  'інтернет': 'Комунальні', 'internet': 'Комунальні', 'kyivstar': 'Комунальні',
  'vodafone': 'Комунальні', 'lifecell': 'Комунальні', 'київстар': 'Комунальні',

  // Доходи
  'зарплата': 'Зарплата', 'salary': 'Зарплата', 'аванс': 'Зарплата',
  'фріланс': 'Фріланс', 'freelance': 'Фріланс', 'upwork': 'Фріланс',
}

const findCategory = (description, categories) => {
  const lower = description.toLowerCase()
  for (const [keyword, categoryName] of Object.entries(keywordMap)) {
    if (lower.includes(keyword.toLowerCase())) {
      const found = categories.find(c => c.name === categoryName)
      if (found) return found
    }
  }
  return categories.find(c => c.name === 'Інше') || categories[0]
}

// Імпорт транзакцій
router.post('/', auth, async (req, res) => {
  try {
    const { transactions } = req.body

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Немає транзакцій для імпорту' })
    }

    // Отримуємо категорії юзера
    const categories = await prisma.category.findMany({
      where: { userId: req.userId }
    })

    if (categories.length === 0) {
      return res.status(400).json({ error: 'Спочатку створи категорії' })
    }

    // Отримуємо існуючі транзакції для дедуплікації
    const dates = transactions.map(t => new Date(t.date))
    const minDate = new Date(Math.min(...dates))
    const maxDate = new Date(Math.max(...dates))

    const existing = await prisma.transaction.findMany({
      where: {
        userId: req.userId,
        date: { gte: minDate, lte: maxDate }
      }
    })

    // Створюємо сигнатури існуючих транзакцій
    const existingSignatures = new Set(
      existing.map(t => `${t.date.toISOString().split('T')[0]}_${t.amount}_${t.description}`)
    )

    // Фільтруємо дублікати і готуємо до збереження
    const toImport = []
    let duplicates = 0

    for (const tx of transactions) {
      const signature = `${new Date(tx.date).toISOString().split('T')[0]}_${tx.amount}_${tx.description}`

      if (existingSignatures.has(signature)) {
        duplicates++
        continue
      }

      // Знаходимо категорію
      let categoryId = tx.categoryId
      if (!categoryId) {
        const autoCategory = findCategory(tx.description || '', categories)
        categoryId = autoCategory?.id
      }

      if (!categoryId) continue

      toImport.push({
        amount: parseFloat(tx.amount),
        type: tx.type,
        description: tx.description || '',
        date: new Date(tx.date),
        userId: req.userId,
        categoryId
      })

      existingSignatures.add(signature)
    }

    // Масовий запис
    if (toImport.length > 0) {
      await prisma.transaction.createMany({ data: toImport })
    }

    res.json({
      imported: toImport.length,
      duplicates,
      total: transactions.length
    })
  } catch (e) {
    console.error('Import error:', e)
    res.status(500).json({ error: e.message })
  }
})

// Автокатегоризація (preview без збереження)
router.post('/preview', auth, async (req, res) => {
  try {
    const { transactions } = req.body

    const categories = await prisma.category.findMany({
      where: { userId: req.userId }
    })

    // Перевіряємо дублікати
    const dates = transactions.map(t => new Date(t.date))
    const minDate = new Date(Math.min(...dates))
    const maxDate = new Date(Math.max(...dates))

    const existing = await prisma.transaction.findMany({
      where: {
        userId: req.userId,
        date: { gte: minDate, lte: maxDate }
      }
    })

    const existingSignatures = new Set(
      existing.map(t => `${t.date.toISOString().split('T')[0]}_${t.amount}_${t.description}`)
    )

    const previewed = transactions.map(tx => {
      const signature = `${new Date(tx.date).toISOString().split('T')[0]}_${tx.amount}_${tx.description}`
      const isDuplicate = existingSignatures.has(signature)
      const autoCategory = findCategory(tx.description || '', categories)

      return {
        ...tx,
        categoryId: autoCategory?.id || null,
        categoryName: autoCategory?.name || 'Інше',
        categoryIcon: autoCategory?.icon || '📦',
        autoDetected: !!autoCategory,
        isDuplicate
      }
    })

    res.json({ transactions: previewed, categories })
  } catch (e) {
    console.error('Preview error:', e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router