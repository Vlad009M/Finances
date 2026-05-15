const express = require('express')
const { PrismaClient } = require('@prisma/client')
const auth = require('../middleware/auth')
const requireRoot = require('../middleware/requireRoot')

const router = express.Router()
const prisma = new PrismaClient()

// Всі користувачі
router.get('/users', auth, requireRoot, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true,
        createdAt: true, blocked: true,
        _count: { select: { transactions: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(users)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Загальна статистика
router.get('/stats', auth, requireRoot, async (req, res) => {
  try {
    const usersCount = await prisma.user.count()
    const txCount = await prisma.transaction.count()
    const totalIncome = await prisma.transaction.aggregate({
      where: { type: 'income' }, _sum: { amount: true }
    })
    const totalExpense = await prisma.transaction.aggregate({
      where: { type: 'expense' }, _sum: { amount: true }
    })
    res.json({
      usersCount, txCount,
      totalIncome: totalIncome._sum.amount || 0,
      totalExpense: totalExpense._sum.amount || 0,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Змінити роль
router.patch('/users/:id/role', auth, requireRoot, async (req, res) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'Не можна змінити свою роль' })
    }
    const { role } = req.body
    if (!['USER', 'ROOT'].includes(role)) {
      return res.status(400).json({ error: 'Невірна роль' })
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role }
    })
    res.json({ success: true, role: user.role })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Заблокувати/розблокувати
router.patch('/users/:id/block', auth, requireRoot, async (req, res) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'Не можна заблокувати себе' })
    }
    const user = await prisma.user.findUnique({ where: { id: req.params.id } })
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { blocked: !user.blocked }
    })
    res.json({ success: true, blocked: updated.blocked })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Видалити користувача
router.delete('/users/:id', auth, requireRoot, async (req, res) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'Не можна видалити себе' })
    }
    await prisma.transaction.deleteMany({ where: { userId: req.params.id } })
    await prisma.category.deleteMany({ where: { userId: req.params.id } })
    await prisma.user.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Надіслати повідомлення
router.post('/messages', auth, requireRoot, async (req, res) => {
  try {
    const { toId, text } = req.body
    if (!toId || !text?.trim()) {
      return res.status(400).json({ error: 'Вкажи отримувача і текст' })
    }
    const message = await prisma.message.create({
      data: { text: text.trim(), fromId: req.userId, toId }
    })
    res.json(message)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router