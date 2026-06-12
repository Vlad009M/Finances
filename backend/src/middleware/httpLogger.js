const { logSecurityEvent, getClientIp } = require('../utils/securityLog')

const httpLogger = (req, res, next) => {
  // Фіксуємо час початку запиту
  const start = Date.now()

  // Чекаємо, поки сервер повністю віддасть відповідь клієнту
  res.on('finish', () => {
    const latencyMs = Date.now() - start

    // Формуємо корисне навантаження
    const logData = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      latencyMs: latencyMs,
      ip: getClientIp(req),
      userAgent: req.get('user-agent') || 'unknown',
      origin: req.headers.origin || req.headers.referer || 'unknown'
    }

    // Відправляємо в Grafana/Loki
    // Якщо у тебе є окрема функція для звичайних логів, використай її, 
    // або просто передай спец-івент у існуючу
    logSecurityEvent('http.access', logData)
  })

  next()
}

module.exports = httpLogger