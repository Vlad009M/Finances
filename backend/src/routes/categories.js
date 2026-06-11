const express = require('express')
const prisma = require('../prisma')
const auth = require('../middleware/auth')
const { z } = require('zod') // S7

const router = express.Router()

// S7: валідація вводу (раніше name/icon/color/type приймались як завгодно)
const HEX = /^#[0-9a-fA-F]{6}$/
const createSchema = z.object({
  name: z.string().trim().min(1, 'Назва обовʼязкова').max(50, 'Назва задовга'),
  type: z.enum(['income', 'expense'], { error: 'Тип має бути income або expense' }),
  icon: z.string().max(200).optional().nullable(),
  color: z.string().regex(HEX, 'Колір має бути у форматі #RRGGBB').optional().nullable(),
})
const updateSchema = z.object({
  icon: z.string().max(200).optional().nullable(),
  color: z.string().regex(HEX, 'Колір має бути у форматі #RRGGBB').optional().nullable(),
})

router.get('/', auth, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: req.userId }
    })

    // Рахуємо використання за останні 30 днів
    const since = new Date()
    since.setDate(since.getDate() - 30)

    const usage = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId: req.userId,
        date: { gte: since }
      },
      _count: { categoryId: true }
    })

    // Мапа categoryId -> кількість використань
    const usageMap = {}
    usage.forEach(u => {
      usageMap[u.categoryId] = u._count.categoryId
    })

    // Сортуємо: спочатку по частоті (desc), потім алфавітно
    const sorted = categories.sort((a, b) => {
      const countA = usageMap[a.id] || 0
      const countB = usageMap[b.id] || 0
      if (countB !== countA) return countB - countA
      return a.name.localeCompare(b.name)
    })

    res.json(sorted)
  } catch (e) {
    console.error('Category error:', e.message)
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

router.post('/', auth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body) // S7
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message })
  }
  try {
    const { name, icon, color, type } = parsed.data
    const category = await prisma.category.create({
      data: { name, icon, color, type, userId: req.userId }
    })
    res.json(category)
  } catch (e) {
    console.error('Category POST error:', e.message)
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

router.put('/:id', auth, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body) // S7
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message })
  }
  try {
    const { icon, color } = parsed.data
    const cat = await prisma.category.findUnique({ where: { id: req.params.id } })
    if (!cat || cat.userId !== req.userId) return res.status(403).json({ error: 'Немає доступу' })
    const updated = await prisma.category.update({
      where: { id: req.params.id },
      data: { icon, color }
    })
    res.json(updated)
  } catch (e) {
    console.error('Category PUT error:', e.message)
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const cat = await prisma.category.findUnique({ where: { id: req.params.id } })
    if (!cat || cat.userId !== req.userId) return res.status(403).json({ error: 'Немає доступу' })
    await prisma.category.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) {
    console.error('Category error:', e.message)
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

module.exports = router