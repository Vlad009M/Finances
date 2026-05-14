const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json())

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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Finances API працює!' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Сервер запущено на порту ${PORT}`)
})