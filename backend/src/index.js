const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', require('./routes/auth'))
app.use('/api/transactions', require('./routes/transactions'))
app.use('/api/categories', require('./routes/categories'))

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Finances API працює!' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Сервер запущено на порту ${PORT}`)
})