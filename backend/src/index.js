const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const cookieParser = require('cookie-parser')
require('dotenv').config()

const app = express()

app.use(helmet())
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Забагато спроб. Спробуй через 15 хвилин.' }
})

app.use('/api/auth', authLimiter)
app.use('/api/auth', require('./routes/auth'))
app.use('/api/transactions', require('./routes/transactions'))
app.use('/api/categories', require('./routes/categories'))
app.use('/api/ai', require('./routes/ai'))
app.use('/api/admin', require('./routes/admin'))
app.use('/api/messages', require('./routes/messages'))

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Aperio API працює!' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Сервер запущено на порту ${PORT}`)
})