const jwt = require('jsonwebtoken')
const prisma = require('../prisma') // S11: singleton замість власного new PrismaClient()
const { logSecurityEvent, getClientIp } = require('../utils/securityLog') // SIEM
const { COOKIE_OPTIONS } = require('../utils/token') // ДОДАНО: Імпорт налаштувань куки

module.exports = async (req, res, next) => {
  const token = req.cookies.token
  // Тут куку чистити не треба, бо її і так немає
  if (!token) return res.status(401).json({ error: 'Не авторизований' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    
    if (!user) {
      res.clearCookie('token', COOKIE_OPTIONS) // ДОДАНО
      return res.status(401).json({ error: 'Користувача не знайдено' })
    }
    
    if (user.blocked) {
      res.clearCookie('token', COOKIE_OPTIONS) // ДОДАНО
      return res.status(403).json({ error: 'Акаунт заблоковано' })
    }

    // S3: відкликання сесій — токен зі старою версією більше не дійсний.
    // (?? 0) — щоб старі токени без поля не розлогінились одразу після деплою.
    if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      logSecurityEvent('auth.token.revoked', { ip: getClientIp(req), userId: user.id }) // SIEM
      res.clearCookie('token', COOKIE_OPTIONS) // ДОДАНО: Знищуємо застарілу сесію
      return res.status(401).json({ error: 'Сесію завершено. Увійди знову.' })
    }

    req.userId = user.id
    req.userRole = user.role // S3: свіжа роль із БД, а не decoded.role з JWT
    next()
  } catch {
    res.clearCookie('token', COOKIE_OPTIONS) // ДОДАНО: Знищуємо пошкоджений/прострочений токен
    res.status(401).json({ error: 'Невалідний токен' })
  }
}