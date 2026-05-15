const express = require('express')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const { z } = require('zod')
const auth = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// PUT /api/user/profile — оновлення імені та аватарки
router.put('/profile', auth, async (req, res) => {
  const schema = z.object({
    name: z.string().min(2, 'Ім\'я мінімум 2 символи').max(50),
    avatarUrl: z.string().url('Невірний URL').optional().nullable(),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message })
  }

  try {
    const { name, avatarUrl } = parsed.data
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name: name.trim(), ...(avatarUrl !== undefined && { avatarUrl }) },
      select: { id: true, email: true, name: true, avatarUrl: true, role: true },
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
    newPassword: z.string().min(6, 'Новий пароль мінімум 6 символів'),
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
    await prisma.user.update({ where: { id: req.userId }, data: { password: hashed } })

    res.json({ message: 'Пароль успішно змінено' })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

module.exports = router
