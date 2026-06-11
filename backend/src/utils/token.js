const jwt = require('jsonwebtoken')

const isProd = process.env.NODE_ENV === 'production'
const isAperio = process.env.FRONTEND_URL?.includes('aperio.pp.ua')

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  domain: isAperio ? '.aperio.pp.ua' : undefined,
}

// S3: tokenVersion вшивається в токен → дозволяє відкликати всі сесії
function signToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, tokenVersion: user.tokenVersion ?? 0 },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

module.exports = { signToken, COOKIE_OPTIONS }
