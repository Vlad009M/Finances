const express = require('express')
const prisma = require('../prisma')
const auth = require('../middleware/auth')

const router = express.Router()

// POST /feedback — створити відгук
router.post('/', auth, async (req, res) => {
  const { type, text, rating } = req.body

  if (!type || !text) {
    return res.status(400).json({ error: 'Тип та текст обовʼязкові' })
  }

  if (!['bug', 'idea', 'other'].includes(type)) {
    return res.status(400).json({ error: 'Невірний тип фідбеку' })
  }

  if (text.length > 2000) {
    return res.status(400).json({ error: 'Текст занадто довгий (макс. 2000 символів)' })
  }

  try {
    const feedback = await prisma.feedback.create({
      data: {
        userId: req.userId,
        type,
        text: text.trim(),
        rating: rating ? parseInt(rating) : null,
      }
    })
    res.status(201).json(feedback)
  } catch (e) {
    console.error('Feedback POST error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// GET /feedback — тільки для ROOT адміна
router.get('/', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (user.role !== 'ROOT') {
      return res.status(403).json({ error: 'Доступ заборонено' })
    }

    const feedbacks = await prisma.feedback.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json(feedbacks)
  } catch (e) {
    console.error('Feedback GET error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router