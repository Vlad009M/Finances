module.exports = (req, res, next) => {
  if (req.userRole !== 'ROOT') {
    return res.status(403).json({ error: 'Доступ заборонено. Потрібні права ROOT.' })
  }
  next()
}