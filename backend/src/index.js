require('dotenv').config()
const Sentry = require('@sentry/node')

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
})

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const cookieParser = require('cookie-parser')

const app = express()
app.set('trust proxy', 1)

// Helmet — security headers
app.use(helmet())

// CORS — домен з env, не захардкоджений
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://aperio.pp.ua',
    'https://www.aperio.pp.ua'
  ],
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

// --- ВЕБХУКИ (Підключаємо ДО перевірки CSRF та лімітерів) ---
app.use('/api/webhooks', require('./routes/webhooks'))

// CSRF захист через перевірку Origin (точний збіг, не startsWith)
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://aperio.pp.ua',
    'https://www.aperio.pp.ua'
  ]
  const raw = req.headers.origin || req.headers.referer || ''
  let origin = ''
  try { origin = new URL(raw).origin } catch { origin = '' } // S4: дістаємо чистий origin
  if (allowedOrigins.includes(origin)) return next()          // S4: === замість startsWith
  return res.status(403).json({ error: 'CSRF перевірка не пройдена' })
})

// --- Rate limiters ---

// Авторизація: 10 спроб за 15 хвилин
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
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

// S6: жорсткий ліміт на верифікацію email і повторну відправку коду
// (захист від брутфорсу коду та спаму/випалювання квоти Resend)
const verifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  message: { error: 'Забагато спроб верифікації. Спробуй за годину.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/auth/verify-email', verifyLimiter)        // S6
app.use('/api/auth/resend-verification', verifyLimiter) // S6
app.use('/api/auth', authLimiter)
app.use('/api/ai/analyze', aiLimiter)
app.use('/api/import/preview', aiLimiter)               // S5: preview теж кличе Claude
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
app.use('/api/feedback', require('./routes/feedback'))

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Aperio API працює!' })
})

Sentry.setupExpressErrorHandler(app)

const PORT = process.env.PORT || 3001

// Само-пінг щоб не засинав (кожні 14 хвилин)
if (process.env.NODE_ENV === 'production') {
  setInterval(async () => {
    try {
      await fetch(`${process.env.RENDER_EXTERNAL_URL || 'https://api.aperio.pp.ua'}/health`)
    } catch {}
  }, 14 * 60 * 1000)
}

app.listen(PORT, () => {
  console.log(`Сервер запущено на порту ${PORT}`)
})