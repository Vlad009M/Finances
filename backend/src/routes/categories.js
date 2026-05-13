const express = require('express')
const { PrismaClient } = require('@prisma/client')
const auth = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

router.get('/', auth, async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { userId: req.userId }
  })
  res.json(categories)
})

router.post('/', auth, async (req, res) => {
  try {
    const { name, icon, color, type } = req.body
    const category = await prisma.category.create({
      data: { name, icon, color, type, userId: req.userId }
    })
    res.json(category)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router