const { logSecurityEvent, getClientIp } = require('../utils/securityLog') // SIEM

module.exports = (req, res, next) => {
  if (req.userRole !== 'ROOT') {
    logSecurityEvent('authz.deny', {
      ip: getClientIp(req),
      userId: req.userId,
      role: req.userRole,
      path: req.originalUrl,
      method: req.method,
    })
    return res.status(403).json({ error: 'Доступ заборонено. Потрібні права ROOT.' })
  }
  next()
}
