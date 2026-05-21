const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const cookieParser = require('cookie-parser')

const Sentry = require('@sentry/node')

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
})

require('dotenv').config()

const app = express()

// Helmet — security headers
app.use(helmet())

// CORS — домен з env, не захардкоджений
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

const { doubleCsrf } = require('csrf-csrf')

const { doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'aperio-csrf-secret-key',
  cookieName: 'csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
})

app.use(doubleCsrfProtection)
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() })
})

// --- Rate limiters ---

// Авторизація: 10 спроб за 15 хвилин
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Забагато спроб. Спробуй через 15 хвилин.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// AI аналіз: 10 запитів за годину (захист від витрат на API)
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Ліміт AI аналізу вичерпано. Спробуй через годину.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Адмін: 30 запитів за 15 хвилин
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Забагато запитів до адмін панелі.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Загальний ліміт на всі інші API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Забагато запитів. Спробуй пізніше.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/auth', authLimiter)
app.use('/api/ai', aiLimiter)
app.use('/api/admin', adminLimiter)
app.use('/api', generalLimiter)

// --- Routes ---
app.use('/api/auth', require('./routes/auth'))
app.use('/api/transactions', require('./routes/transactions'))
app.use('/api/categories', require('./routes/categories'))
app.use('/api/ai', require('./routes/ai'))
app.use('/api/admin', require('./routes/admin'))
app.use('/api/messages', require('./routes/messages'))
app.use('/api/user', require('./routes/user'))
app.use('/api/import', require('./routes/import'))
app.use('/api/game', require('./routes/game'))
app.use('/api/budgets', require('./routes/budgets'))

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Aperio API працює!' })
})

Sentry.setupExpressErrorHandler(app)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Сервер запущено на порту ${PORT}`)
})