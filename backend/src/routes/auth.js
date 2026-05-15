const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const router = express.Router()
const prisma = new PrismaClient()

const isProd = process.env.NODE_ENV === 'production'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 днів
}

// Реєстрація
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Всі поля обов\'язкові' })
    }
    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Невірний формат email' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль мінімум 6 символів' })
    }
    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'Ім\'я мінімум 2 символи' })
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existing) return res.status(400).json({ error: 'Email вже використовується' })

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email: email.toLowerCase().trim(), password: hashed, name: name.trim() }
    })

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.cookie('token', token, COOKIE_OPTIONS)
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// Вхід
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Введи email і пароль' })
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })

    // Однакове повідомлення щоб не розкривати чи існує email
    if (!user) {
      await bcrypt.compare(password, '$2b$12$invalidhashfortimingattackprevention000000000000000000')
      return res.status(400).json({ error: 'Невірний email або пароль' })
    }

    if (user.blocked) {
      return res.status(403).json({ error: 'Акаунт заблоковано. Зверніться до адміністратора.' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(400).json({ error: 'Невірний email або пароль' })

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.cookie('token', token, COOKIE_OPTIONS)
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// Вихід
router.post('/logout', (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS)
  res.json({ success: true })
})

// Перевірка сесії — тепер через auth middleware, перевіряє blocked
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token
    if (!token) return res.status(401).json({ error: 'Не авторизований' })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, blocked: true }
    })

    if (!user) return res.status(401).json({ error: 'Користувача не знайдено' })

    // Тепер /me теж перевіряє blocked
    if (user.blocked) {
      res.clearCookie('token', COOKIE_OPTIONS)
      return res.status(403).json({ error: 'Акаунт заблоковано' })
    }

    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch {
    res.status(401).json({ error: 'Невалідний токен' })
  }
})

module.exports = router