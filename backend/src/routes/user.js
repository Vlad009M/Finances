const express = require('express')
const bcrypt = require('bcryptjs')
const prisma = require('../prisma')
const { z } = require('zod')
const auth = require('../middleware/auth')
const { signToken, COOKIE_OPTIONS } = require('../utils/token') // S2/S3

const router = express.Router()

// PUT /api/user/profile — оновлення лише імені (avatarUrl ставиться через POST /avatar)
router.put('/profile', auth, async (req, res) => {
  const schema = z.object({
    name: z.string().min(2, 'Ім\'я мінімум 2 символи').max(50),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message })
  }

  try {
    const { name } = parsed.data
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name: name.trim() },
      select: { id: true, email: true, name: true, avatarUrl: true, role: true, emailVerified: true },
    })
    res.json({ user })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// PUT /api/user/password — зміна пароля
router.put('/password', auth, async (req, res) => {
  const schema = z.object({
    oldPassword: z.string().min(1, 'Введи старий пароль'),
    // S12: та сама політика, що й при реєстрації
    newPassword: z.string()
      .min(8, 'Пароль мінімум 8 символів')
      .regex(/[A-Z]/, 'Пароль має містити велику літеру')
      .regex(/[0-9]/, 'Пароль має містити цифру')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Пароль має містити спецсимвол'),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message })
  }

  try {
    const { oldPassword, newPassword } = parsed.data
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) return res.status(404).json({ error: 'Користувача не знайдено' })

    const valid = await bcrypt.compare(oldPassword, user.password)
    if (!valid) return res.status(400).json({ error: 'Старий пароль невірний' })

    const hashed = await bcrypt.hash(newPassword, 12)
    // S3: інкремент tokenVersion → усі ІНШІ сесії стають недійсними
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashed, tokenVersion: { increment: 1 } },
    })
    // Поточну сесію лишаємо живою — видаємо свіжий токен з новою версією
    res.cookie('token', signToken(updated), COOKIE_OPTIONS)

    res.json({ message: 'Пароль успішно змінено' })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

router.delete('/account', auth, async (req, res) => {
  try {
    await prisma.transaction.deleteMany({ where: { userId: req.userId } })
    await prisma.category.deleteMany({ where: { userId: req.userId } })
    await prisma.message.deleteMany({ where: { OR: [{ fromId: req.userId }, { toId: req.userId }] } })
    await prisma.gameProfile.delete({ where: { userId: req.userId } }).catch(() => {})
    await prisma.user.delete({ where: { id: req.userId } })
    res.clearCookie('token')
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: 'Помилка видалення' })
  }
})

// POST /api/user/avatar — завантаження аватарки ЧЕРЕЗ бекенд (S2)
// Клієнт більше НЕ пише в Supabase напряму. Бекенд валідує файл і пише
// service-role ключем у шлях, привʼязаний до автентифікованого userId.
router.post('/avatar', auth, async (req, res) => {
  try {
    const { image } = req.body
    if (typeof image !== 'string') {
      return res.status(400).json({ error: 'Немає зображення' })
    }

    // Приймаємо лише data:image/jpeg;base64,...
    const m = image.match(/^data:image\/jpe?g;base64,([A-Za-z0-9+/=]+)$/)
    if (!m) return res.status(400).json({ error: 'Підтримується лише JPEG' })

    const buffer = Buffer.from(m[1], 'base64')

    // Розмір ≤ 2MB
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Файл завеликий (макс. 2MB)' })
    }
    // Magic bytes JPEG: FF D8 FF (не довіряємо лише MIME з data-URL)
    if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return res.status(400).json({ error: 'Файл не є коректним JPEG' })
    }

    const SUPABASE_URL = process.env.SUPABASE_URL
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error('Avatar: SUPABASE_URL / SUPABASE_SERVICE_KEY не налаштовані')
      return res.status(500).json({ error: 'Сервіс зображень недоступний' })
    }

    // Шлях за автентифікованим userId — клієнт не може писати чужий шлях
    const path = `${req.userId}.jpg`
    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true',
        'cache-control': '3600',
      },
      body: buffer,
    })

    if (!uploadRes.ok) {
      const detail = await uploadRes.text().catch(() => '')
      console.error('Supabase upload failed:', uploadRes.status, detail)
      return res.status(502).json({ error: 'Не вдалося завантажити фото' })
    }

    const avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}?t=${Date.now()}`
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { avatarUrl },
      select: { id: true, email: true, name: true, avatarUrl: true, role: true, emailVerified: true },
    })
    res.json({ user })
  } catch (e) {
    console.error('Avatar route error:', e.message)
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// POST /api/user/logout-all — вийти з усіх пристроїв (S3)
router.post('/logout-all', auth, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: { tokenVersion: { increment: 1 } }, // усі наявні токени стають недійсні
    })
    res.clearCookie('token', COOKIE_OPTIONS) // включно з поточним пристроєм
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

module.exports = router
