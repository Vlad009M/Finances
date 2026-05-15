const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { z } = require('zod')
const auth = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// Zod схеми валідації
const transactionSchema = z.object({
  amount: z.number({ coerce: true }).positive('Сума має бути більше 0').max(10_000_000, 'Сума занадто велика'),
  type: z.enum(['income', 'expense'], { error: 'Тип має бути income або expense' }),
  description: z.string().max(500, 'Опис занадто довгий').optional().nullable(),
  categoryId: z.string().uuid('Невірний ID категорії'),
  date: z.string().optional(),
})

// GET / — всі транзакції юзера
router.get('/', auth, async (req, res) => {
  try {
    const { month, year, type } = req.query
    const where = { userId: req.userId }

    if (month && year) {
      const m = parseInt(month), y = parseInt(year)
      if (isNaN(m) || isNaN(y) || m < 1 || m > 12) {
        return res.status(400).json({ error: 'Невірний місяць або рік' })
      }
      where.date = {
        gte: new Date(y, m - 1, 1),
        lt: new Date(y, m, 1)
      }
    }

    if (type) {
      if (!['income', 'expense'].includes(type)) {
        return res.status(400).json({ error: 'Невірний тип' })
      }
      where.type = type
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' }
    })
    res.json(transactions)
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// POST / — додати транзакцію
router.post('/', auth, async (req, res) => {
  const parsed = transactionSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message })
  }

  try {
    const { amount, type, description, categoryId, date } = parsed.data

    // Перевірка що категорія належить цьому юзеру
    const category = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!category || category.userId !== req.userId) {
      return res.status(403).json({ error: 'Категорія не знайдена' })
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount,
        type,
        description: description?.trim() || null,
        categoryId,
        userId: req.userId,
        date: date ? new Date(date) : new Date()
      },
      include: { category: true }
    })
    res.json(transaction)
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// PUT /:id — оновити транзакцію
router.put('/:id', auth, async (req, res) => {
  const parsed = transactionSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message })
  }

  try {
    const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Транзакцію не знайдено' })
    if (existing.userId !== req.userId) return res.status(403).json({ error: 'Немає доступу' })

    const { amount, type, description, categoryId, date } = parsed.data

    // Перевірка що категорія належить цьому юзеру
    const category = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!category || category.userId !== req.userId) {
      return res.status(403).json({ error: 'Категорія не знайдена' })
    }

    const updated = await prisma.transaction.update({
      where: { id: req.params.id },
      data: {
        amount,
        type,
        description: description?.trim() || null,
        categoryId,
        date: date ? new Date(date) : existing.date
      },
      include: { category: true }
    })
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// DELETE /:id — видалити транзакцію
router.delete('/:id', auth, async (req, res) => {
  try {
    const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Транзакцію не знайдено' })
    if (existing.userId !== req.userId) return res.status(403).json({ error: 'Немає доступу' })

    await prisma.transaction.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// GET /stats
router.get('/stats', auth, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId },
      include: { category: true }
    })
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    res.json({ income, expense, balance: income - expense })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

module.exports = router