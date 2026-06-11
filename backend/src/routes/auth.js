const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto') 
const prisma = require('../prisma')
const { sendVerificationEmail } = require('../email')

const router = express.Router()

const isProd = process.env.NODE_ENV === 'production'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

const isAperio = process.env.FRONTEND_URL?.includes('aperio.pp.ua')

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  domain: isAperio ? '.aperio.pp.ua' : undefined,
}

// S6: constant-time порівняння (для коду верифікації)
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

// Реєстрація
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, captchaToken } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Всі поля обов\'язкові' })
    }
    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Невірний формат email' })
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
  return res.status(400).json({ error: 'Пароль має містити мінімум 8 символів, велику літеру, цифру та спецсимвол' })
    }
    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'Ім\'я мінімум 2 символи' })
    }

    if (!captchaToken) {
  return res.status(400).json({ error: 'Капча обов\'язкова' })
}

// --- ПЕРЕВІРКА КАПЧІ В GOOGLE ---
const verifyResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    secret: process.env.RECAPTCHA_SECRET,
    response: captchaToken,
  }),
})
const verifyData = await verifyResponse.json()

if (!verifyData.success) {
  return res.status(400).json({ error: 'Перевірка на робота не пройдена' })
}

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existing) return res.status(400).json({ error: 'Email вже використовується' })

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email: email.toLowerCase().trim(), password: hashed, name: name.trim() }
    })

    const verifyCode = crypto.randomInt(100000, 1000000).toString()
const verifyTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000)

await prisma.user.update({
  where: { id: user.id },
  data: { verifyToken: verifyCode, verifyTokenExp }
})

sendVerificationEmail(user.email, user.name, verifyCode).catch(console.error)

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.cookie('token', token, COOKIE_OPTIONS)
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: user.emailVerified, avatarUrl: user.avatarUrl } })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// Вхід
router.post('/login', async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Введи email і пароль' })
    }

if (!captchaToken) {
  return res.status(400).json({ error: 'Капча обов\'язкова' })
}

// --- ПЕРЕВІРКА КАПЧІ В GOOGLE ---
const verifyResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    secret: process.env.RECAPTCHA_SECRET,
    response: captchaToken,
  }),
})
const verifyData = await verifyResponse.json()

if (!verifyData.success) {
  return res.status(400).json({ error: 'Перевірка на робота не пройдена' })
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
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: user.emailVerified, avatarUrl: user.avatarUrl } })
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
      select: { id: true, email: true, name: true, role: true, blocked: true, emailVerified: true, avatarUrl: true }
    })

    if (!user) return res.status(401).json({ error: 'Користувача не знайдено' })

    // Тепер /me теж перевіряє blocked
    if (user.blocked) {
      res.clearCookie('token', COOKIE_OPTIONS)
      return res.status(403).json({ error: 'Акаунт заблоковано' })
    }

    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: user.emailVerified, avatarUrl: user.avatarUrl } })
  } catch {
    res.status(401).json({ error: 'Невалідний токен' })
  }
})

router.get('/google', (req, res) => {
  // S9: випадковий state проти login-CSRF; кладемо в коротку cookie
  const state = crypto.randomBytes(16).toString('hex')
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax', // lax — щоб cookie дійшла на callback (top-level GET redirect)
    maxAge: 10 * 60 * 1000,
    domain: isAperio ? '.aperio.pp.ua' : undefined,
  })
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&response_type=code&scope=email profile&prompt=select_account&state=${state}`
  res.redirect(authUrl)
})

// 2. Колбек (Google повертає сюди код)
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query
  if (!code) return res.redirect(`${FRONTEND_URL}/login?error=no_code`)

  // S9: звіряємо state з cookie і одразу його чистимо
  if (!state || state !== req.cookies.oauth_state) {
    res.clearCookie('oauth_state', { domain: isAperio ? '.aperio.pp.ua' : undefined })
    return res.redirect(`${FRONTEND_URL}/login?error=bad_state`)
  }
  res.clearCookie('oauth_state', { domain: isAperio ? '.aperio.pp.ua' : undefined })

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      }),
    })
    const tokenData = await tokenResponse.json()
    if (tokenData.error) throw new Error(tokenData.error_description)

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userData = await userResponse.json()

    // S9: переконуємось що Google підтвердив пошту
    if (!userData.email || userData.verified_email === false) {
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`)
    }

    let user = await prisma.user.findUnique({ where: { email: userData.email } })

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex')
      const hashed = await bcrypt.hash(randomPassword, 12)
      user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name || 'Користувач Google',
          password: hashed,
          emailVerified: true // S14: Google вже верифікував email
        }
      })
    }

    if (user.blocked) return res.redirect(`${FRONTEND_URL}/login?error=blocked`)

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.cookie('token', token, COOKIE_OPTIONS)
    res.redirect(`${FRONTEND_URL}/dashboard`)

  } catch (e) {
    console.error('Google OAuth error:', e.message)
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`)
  }
})

router.post('/verify-email', async (req, res) => {
  const { code } = req.body
  const token = req.cookies.token

  if (!token) return res.status(401).json({ error: 'Не авторизований' })
  if (!code) return res.status(400).json({ error: 'Код обов\'язковий' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user) return res.status(401).json({ error: 'Користувача не знайдено' })
    if (user.emailVerified) return res.json({ success: true, alreadyVerified: true })

    if (!safeEqual(user.verifyToken, code)) {
      return res.status(400).json({ error: 'Невірний код' })
    }

    if (user.verifyTokenExp < new Date()) {
      return res.status(400).json({ error: 'Код застарів. Запросіть новий.' })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verifyToken: null, verifyTokenExp: null }
    })

    res.json({ success: true })
  } catch {
    res.status(401).json({ error: 'Невалідний токен' })
  }
})

// Повторна відправка коду
router.post('/resend-verification', async (req, res) => {
  const token = req.cookies.token
  if (!token) return res.status(401).json({ error: 'Не авторизований' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })

    if (!user) return res.status(401).json({ error: 'Користувача не знайдено' })
    if (user.emailVerified) return res.json({ success: true })

    const verifyCode = crypto.randomInt(100000, 1000000).toString()
    const verifyTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: { verifyToken: verifyCode, verifyTokenExp }
    })

    sendVerificationEmail(user.email, user.name, verifyCode).catch(console.error)
    res.json({ success: true })
  } catch {
    res.status(401).json({ error: 'Помилка сервера' })
  }
})

module.exports = router



