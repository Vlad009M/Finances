const jwt = require('jsonwebtoken')
const prisma = require('../prisma') // S11: singleton замість власного new PrismaClient()

module.exports = async (req, res, next) => {
  const token = req.cookies.token
  if (!token) return res.status(401).json({ error: 'Не авторизований' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user) return res.status(401).json({ error: 'Користувача не знайдено' })
    if (user.blocked) return res.status(403).json({ error: 'Акаунт заблоковано' })

    req.userId = user.id
    req.userRole = user.role // S3: свіжа роль із БД, а не decoded.role з JWT
    next()
  } catch {
    res.status(401).json({ error: 'Невалідний токен' })
  }
}
