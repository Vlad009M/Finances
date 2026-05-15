const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

module.exports = async (req, res, next) => {
  const token = req.cookies.token
  if (!token) return res.status(401).json({ error: 'Не авторизований' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user) return res.status(401).json({ error: 'Користувача не знайдено' })
    if (user.blocked) return res.status(403).json({ error: 'Акаунт заблоковано' })

    req.userId = decoded.userId
    req.userRole = decoded.role
    next()
  } catch {
    res.status(401).json({ error: 'Невалідний токен' })
  }
}