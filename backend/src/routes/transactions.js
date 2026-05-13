const express = require('express')
const { PrismaClient } = require('@prisma/client')
const auth = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// Отримати всі транзакції
router.get('/', auth, async (req, res) => {
  try {
    const { month, year, type } = req.query
    const where = { userId: req.userId }

    if (month && year) {
      where.date = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1)
      }
    }
    if (type) where.type = type

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' }
    })
    res.json(transactions)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Додати транзакцію
router.post('/', auth, async (req, res) => {
  try {
    const { amount, type, description, categoryId, date } = req.body
    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        type,
        description,
        categoryId,
        userId: req.userId,
        date: date ? new Date(date) : new Date()
      },
      include: { category: true }
    })
    res.json(transaction)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Видалити транзакцію
router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.transaction.delete({
      where: { id: req.params.id, userId: req.userId }
    })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Статистика по місяцях
router.get('/stats', auth, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId },
      include: { category: true }
    })

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    res.json({ income, expense, balance: income - expense })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router