const express = require('express')
const { PrismaClient } = require('@prisma/client')
const auth = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

router.get('/', auth, async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { toId: req.userId },
      include: { from: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json(messages)
  } catch (e) {
    console.error('Messages GET error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

router.patch('/:id/read', auth, async (req, res) => {
  try {
    await prisma.message.update({
      where: { id: req.params.id, toId: req.userId },
      data: { read: true }
    })
    res.json({ success: true })
  } catch (e) {
    console.error('Messages PATCH error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router