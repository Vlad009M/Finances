const express = require('express')
const prisma = require('../prisma')
const auth = require('../middleware/auth')

const router = express.Router()

const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Швидкий keyword fallback (для офлайн / помилки AI)
const keywordMap = {
  // ═══ ЇЖА — супермаркети ═══
  'сільпо': 'Їжа', 'silpo': 'Їжа',
  'атб': 'Їжа', 'atb': 'Їжа',
  'новус': 'Їжа', 'novus': 'Їжа',
  'фора': 'Їжа', 'fora': 'Їжа',
  'metro cash': 'Їжа',
  'ашан': 'Їжа', 'auchan': 'Їжа',
  'варус': 'Їжа', 'varus': 'Їжа',
  'близенько': 'Їжа', 'blyzenko': 'Їжа',
  'велика кишеня': 'Їжа', 'велмарт': 'Їжа',
  'таврія': 'Їжа', 'tavria': 'Їжа',
  'рукавичка': 'Їжа', 'rukavychka': 'Їжа',
  'еко-маркет': 'Їжа', 'екомаркет': 'Їжа',
  'fozzy': 'Їжа',
  'сім23': 'Їжа', 'sim23': 'Їжа',
  'коло': 'Їжа', 'kolo market': 'Їжа',
  'наш край': 'Їжа', 'spar': 'Їжа',
  'лоток': 'Їжа', 'lotok': 'Їжа',
  'делві': 'Їжа', 'delvi': 'Їжа',
  'арсен': 'Їжа',
  'torba': 'Їжа', 'торба': 'Їжа',
  'тайстра': 'Їжа',
  'файно маркет': 'Їжа',
  'копійка': 'Їжа',
  'обжора': 'Їжа',
  'dmart': 'Їжа',
  'пюре': 'Їжа',
  'м\'ясомаркет': 'Їжа', 'мясомаркет': 'Їжа',
  'київхліб': 'Їжа',
  'le silpo': 'Їжа', 'favore': 'Їжа',
  'osnova': 'Їжа',
  'ultramarket': 'Їжа',

  // ═══ КАФЕ ТА РЕСТОРАНИ ═══
  'mcdonald': 'Кафе та ресторани',
  'kfc': 'Кафе та ресторани',
  'pizza': 'Кафе та ресторани', 'піца': 'Кафе та ресторани',
  'суші': 'Кафе та ресторани', 'sushi': 'Кафе та ресторани',
  'noa': 'Кафе та ресторани',
  'redmonkey': 'Кафе та ресторани',
  'celentano': 'Кафе та ресторани', 'челентано': 'Кафе та ресторани',
  'mafia': 'Кафе та ресторани', 'мафія': 'Кафе та ресторани',
  'burger': 'Кафе та ресторани', 'бургер': 'Кафе та ресторани',
  'shawarma': 'Кафе та ресторани', 'шаурма': 'Кафе та ресторани',
  'coffee': 'Кафе та ресторани', 'кава': 'Кафе та ресторани',
  'starbucks': 'Кафе та ресторани',
  'lviv croissants': 'Кафе та ресторани',
  'ресторан': 'Кафе та ресторани',
  'кафе': 'Кафе та ресторани',

  // ═══ ТРАНСПОРТ ═══
  'uber': 'Транспорт', 'bolt': 'Транспорт',
  'uklon': 'Транспорт', 'уклон': 'Транспорт',
  'таксі': 'Транспорт', 'taxi': 'Транспорт',
  'wog': 'Транспорт', 'okko': 'Транспорт', 'окко': 'Транспорт',
  'shell': 'Транспорт', 'socar': 'Транспорт', 'азс': 'Транспорт',
  'укрзалізниця': 'Транспорт',
  'паркінг': 'Транспорт', 'parking': 'Транспорт',

  // ═══ РОЗВАГИ ═══
  'steam': 'Розваги', 'netflix': 'Розваги', 'spotify': 'Розваги',
  'youtube': 'Розваги', 'playstation': 'Розваги', 'xbox': 'Розваги',
  'multiplex': 'Розваги', 'планета кіно': 'Розваги',
  'apple': 'Розваги', 'google play': 'Розваги',

  // ═══ ЗДОРОВ'Я ═══
  'аптека': "Здоров'я", 'pharmacy': "Здоров'я",
  'медицина': "Здоров'я", 'лікарня': "Здоров'я",
  'клініка': "Здоров'я", 'стоматолог': "Здоров'я",
  'бажаємо': "Здоров'я",

  // ═══ ОДЯГ ═══
  'zara': 'Одяг', 'h&m': 'Одяг', 'hm': 'Одяг',
  'reserved': 'Одяг', 'lcwaikiki': 'Одяг',
  'cropp': 'Одяг', 'adidas': 'Одяг', 'nike': 'Одяг',

  // ═══ КОМУНАЛЬНІ ═══
  'київенерго': 'Комунальні', 'газ': 'Комунальні',
  'водоканал': 'Комунальні', 'easypay': 'Комунальні',

  // ═══ ЗВ'ЯЗОК ═══
  'kyivstar': "Зв'язок", 'київстар': "Зв'язок",
  'vodafone': "Зв'язок", 'lifecell': "Зв'язок",
  'інтернет': "Зв'язок", 'internet': "Зв'язок",

  // ═══ ТЕХНІКА ═══
  'rozetka': 'Техніка', 'розетка': 'Техніка',
  'comfy': 'Техніка', 'eldorado': 'Техніка', 'фокстрот': 'Техніка',

  // ═══ ПОДОРОЖІ ═══
  'booking': 'Подорожі', 'airbnb': 'Подорожі',
  'hotel': 'Подорожі', 'готель': 'Подорожі',
  'wizz': 'Подорожі', 'ryanair': 'Подорожі',

  // ═══ КРАСА ТА ДОГЛЯД ═══
  'салон': 'Краса та догляд', 'перукарня': 'Краса та догляд',
  'beauty': 'Краса та догляд', 'nail': 'Краса та догляд',

  // ═══ ТВАРИНИ ═══
  'зоо': 'Тварини', 'ветеринар': 'Тварини', 'зоомагазин': 'Тварини',

  // ═══ ЖИТЛО ═══
  'оренда': 'Житло', 'аренда': 'Житло',

  // ═══ ЗАРПЛАТА ═══
  'зарплата': 'Зарплата', 'salary': 'Зарплата',
  'аванс': 'Зарплата', 'виплата': 'Зарплата',

  // ═══ КЕШБЕК ═══
  'кешбек': 'Кешбек', 'cashback': 'Кешбек',

  // ═══ ФРІЛАНС ═══
  'upwork': 'Фріланс', 'freelance': 'Фріланс', 'фріланс': 'Фріланс',
}

const keywordFallback = (description, categories) => {
  const lower = description.toLowerCase()
  for (const [keyword, categoryName] of Object.entries(keywordMap)) {
    if (lower.includes(keyword.toLowerCase())) {
      const found = categories.find(c => c.name === categoryName)
      if (found) return found
    }
  }
  return categories.find(c => c.name === 'Інше') || categories[0]
}

// AI категоризація батчем
const aiCategorize = async (transactions, categories) => {
  const categoryNames = categories.map(c => c.name).join(', ')
  
  const items = transactions.map((tx, i) => 
    `${i}: "${tx.description}" | ${tx.type === 'income' ? 'ДОХІД' : 'ВИТРАТА'} | ₴${tx.amount}`
  ).join('\n')

  const prompt = `Ти система категоризації українських банківських транзакцій з Monobank.

ДОСТУПНІ КАТЕГОРІЇ: ${categoryNames}

ВАЖЛИВІ ПРАВИЛА:
- Їжа → супермаркети, продуктові магазини (АТБ, Сільпо, Близенько, Рукавичка, будь-який "маркет" чи "market")
- Кафе та ресторани → ресторани, кафе, фастфуд, доставка їжі, заклади з назвами типу NOA, MAFIA, REDMONKEY, будь-яка назва що звучить як заклад харчування
- Транспорт → таксі, АЗС, паркінг, залізниця, пальне
- Розваги → стрімінги, ігри, кінотеатри, підписки (Netflix, Spotify, Steam, YouTube)
- Здоров'я → аптеки, клініки, лікарі
- Зв'язок → мобільний зв'язок, інтернет (Kyivstar, Vodafone, Lifecell)
- Техніка → електроніка, гаджети (Rozetka, Comfy)
- Зарплата → надходження від роботодавця, великі регулярні суми з описом "від [ім'я]", "виплата", "аванс"
- Кешбек → повернення коштів, cashback
- Фріланс → Upwork, міжнародні перекази за послуги
- Інші доходи → будь-який інший дохід що не підходить під Зарплату чи Фріланс
- Переказ → якщо опис містить "часткове зняття", "з картки", "між рахунками", "від себе" → тип transfer

КОНТЕКСТ:
- Описи транзакцій часто скорочені або містять технічні коди банку
- Невідомі назви закладів (ресторани, кафе) краще відносити до "Кафе та ресторани" ніж "Інше"
- Якщо сума > 5000 грн і це дохід — скоріш за все Зарплата або Інші доходи
- ANTHROPIC, OPENAI, GOOGLE — це підписки на AI сервіси → Техніка або Розваги

ТРАНЗАКЦІЇ ДЛЯ КАТЕГОРИЗАЦІЇ:
${items}

Відповідай ТІЛЬКИ валідним JSON масивом без пояснень і markdown:
[{"index": 0, "category": "Назва категорії"}, ...]`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = message.content[0].text.trim()
  const json = JSON.parse(text.replace(/```json|```/g, '').trim())
  
  return json
}

// Імпорт транзакцій
router.post('/', auth, async (req, res) => {
  try {
    const { transactions } = req.body

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Немає транзакцій для імпорту' })
    }
    if (transactions.length > 1000) {
      return res.status(400).json({ error: 'Забагато транзакцій за раз (макс. 1000)' }) // S5
    }

    // Отримуємо категорії юзера
    const categories = await prisma.category.findMany({
      where: { userId: req.userId }
    })

    if (categories.length === 0) {
      return res.status(400).json({ error: 'Спочатку створи категорії' })
    }

    // Отримуємо існуючі транзакції для дедуплікації
    const dates = transactions.map(t => new Date(t.date))
    const minDate = new Date(Math.min(...dates))
    const maxDate = new Date(Math.max(...dates))

    const existing = await prisma.transaction.findMany({
      where: {
        userId: req.userId,
        date: { gte: minDate, lte: maxDate }
      }
    })

    // Створюємо сигнатури існуючих транзакцій
    const existingSignatures = new Set(
      existing.map(t => `${t.date.toISOString().split('T')[0]}_${t.amount}_${t.description}`)
    )

    // Фільтруємо дублікати і готуємо до збереження
    const toImport = []
    let duplicates = 0

    for (const tx of transactions) {
      const signature = `${new Date(tx.date).toISOString().split('T')[0]}_${tx.amount}_${tx.description}`

      if (existingSignatures.has(signature)) {
        duplicates++
        continue
      }

      // Знаходимо категорію
      let categoryId = tx.categoryId
      if (!categoryId) {
        const autoCategory = keywordFallback(tx.description || '', categories)
        categoryId = autoCategory?.id
      }

      if (!categoryId) continue

      // S7: валідація вхідних даних (Monobank-файл — теж недовірений ввід)
      const amt = parseFloat(tx.amount)
      const date = new Date(tx.date)
      if (!Number.isFinite(amt) || isNaN(date.getTime())) continue
      const type = ['income', 'expense', 'transfer'].includes(tx.type) ? tx.type : 'expense'

      toImport.push({
        amount: Math.abs(amt),
        type,
        description: (tx.description || '').slice(0, 500),
        date,
        userId: req.userId,
        categoryId
      })

      existingSignatures.add(signature)
    }

    // Масовий запис
    if (toImport.length > 0) {
      await prisma.transaction.createMany({ data: toImport })
    }

    res.json({
      imported: toImport.length,
      duplicates,
      total: transactions.length
    })
  } catch (e) {
    console.error('Import error:', e)
    res.status(500).json({ error: 'Помилка імпорту' })
  }
})

// Автокатегоризація (preview без збереження)
router.post('/preview', auth, async (req, res) => {
  try {
    const { transactions } = req.body

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Немає транзакцій' }) // S5
    }
    if (transactions.length > 1000) {
      return res.status(400).json({ error: 'Забагато транзакцій за раз (макс. 1000)' }) // S5
    }

    const categories = await prisma.category.findMany({
      where: { userId: req.userId }
    })

    // Перевіряємо дублікати
    const dates = transactions.map(t => new Date(t.date))
    const minDate = new Date(Math.min(...dates))
    const maxDate = new Date(Math.max(...dates))

    const existing = await prisma.transaction.findMany({
      where: {
        userId: req.userId,
        date: { gte: minDate, lte: maxDate }
      }
    })

    const existingSignatures = new Set(
      existing.map(t => `${t.date.toISOString().split('T')[0]}_${t.amount}_${t.description}`)
    )

    // Спочатку keyword fallback для всіх
const withKeywords = transactions.map(tx => {
  const signature = `${new Date(tx.date).toISOString().split('T')[0]}_${tx.amount}_${tx.description}`
  const isDuplicate = existingSignatures.has(signature)
  const autoCategory = keywordFallback(tx.description || '', categories)
  const isOther = autoCategory?.name === 'Інше'

  return {
    ...tx,
    categoryId: autoCategory?.id || null,
    categoryName: autoCategory?.name || 'Інше',
    categoryIcon: autoCategory?.icon || '📦',
    autoDetected: !isOther,
    isDuplicate,
    _needsAI: isOther && !isDuplicate // позначаємо що треба AI
  }
})

// AI тільки для тих що пішли в "Інше" (S5: не більше 100 за раз — контроль витрат)
const needsAI = withKeywords.filter(tx => tx._needsAI).slice(0, 100)

if (needsAI.length > 0) {
  try {
    const aiResults = await aiCategorize(needsAI, categories)
    
    aiResults.forEach(({ index, category }) => {
      const tx = needsAI[index]
      if (!tx) return
      const found = categories.find(c => c.name === category)
      if (found && found.name !== 'Інше') {
        tx.categoryId = found.id
        tx.categoryName = found.name
        tx.categoryIcon = found.icon || '📦'
        tx.autoDetected = true
      }
    })
  } catch (e) {
    console.error('AI categorization failed, using keywords only:', e.message)
  }
}

const previewed = withKeywords.map(tx => {
  const { _needsAI, ...rest } = tx
  return rest
})

res.json({ transactions: previewed, categories })
  } catch (e) {
    console.error('Preview error:', e)
    res.status(500).json({ error: 'Помилка обробки файлу' })
  }
})

module.exports = router