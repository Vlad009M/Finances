const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const router = express.Router()
const prisma = new PrismaClient()

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 днів
}

// Реєстрація
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Всі поля обов\'язкові' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль мінімум 6 символів' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ error: 'Email вже використовується' })

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, password: hashed, name }
    })

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.cookie('token', token, COOKIE_OPTIONS)
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Вхід
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Введи email і пароль' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(400).json({ error: 'Користувача не знайдено' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(400).json({ error: 'Невірний пароль' })

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.cookie('token', token, COOKIE_OPTIONS)
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Вихід
router.post('/logout', (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS)
  res.json({ success: true })
})

// Перевірка сесії
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token
    if (!token) return res.status(401).json({ error: 'Не авторизований' })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true }
    })
    if (!user) return res.status(401).json({ error: 'Користувача не знайдено' })

    res.json({ user })
  } catch {
    res.status(401).json({ error: 'Невалідний токен' })
  }
})

module.exports = router