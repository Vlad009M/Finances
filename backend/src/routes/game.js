const express = require('express')
const prisma = require('../prisma')
const auth = require('../middleware/auth')

const router = express.Router()

// ── Конфіг рівнів ────────────────────────────────────────
// ── Конфіг рівнів ────────────────────────────────────────
const LEVELS = [
  { level: 1,  title: 'Новачок',          xpRequired: 0,    icon: '🌱' },
  { level: 2,  title: 'Економ',            xpRequired: 200,  icon: '💡' },
  { level: 3,  title: 'Розважливий',       xpRequired: 600,  icon: '🧠' },
  { level: 4,  title: 'Планувальник',      xpRequired: 1200, icon: '📋' },
  { level: 5,  title: 'Стратег',           xpRequired: 2000, icon: '♟️' },
  { level: 6,  title: 'Фінансист',         xpRequired: 3500, icon: '💼' },
  { level: 7,  title: 'Інвестор',          xpRequired: 5500, icon: '📈' },
  { level: 8,  title: 'Мудрець грошей',    xpRequired: 8000, icon: '🦉' },
  { level: 9,  title: 'Майстер бюджету',   xpRequired: 12000,icon: '🏆' },
  { level: 10, title: 'Фінансовий Гуру',   xpRequired: 20000,icon: '👑' },
]

// ── Ачівки ───────────────────────────────────────────────
const ACHIEVEMENTS = [
  { code: 'first_tx',       title: 'Перший крок',        desc: 'Додай першу транзакцію',                    icon: '🎯', xp: 50  },
  { code: 'tx_10',          title: 'Активний користувач', desc: 'Додай 10 транзакцій',                      icon: '✨', xp: 75  },
  { code: 'tx_50',          title: 'Ветеран',             desc: 'Додай 50 транзакцій',                      icon: '🎖️', xp: 150 },
  { code: 'tx_100',         title: 'Легенда',             desc: 'Додай 100 транзакцій',                     icon: '🏅', xp: 300 },
  { code: 'streak_3',       title: 'На старті',           desc: '3 дні поспіль з транзакціями',             icon: '🔥', xp: 50  },
  { code: 'streak_7',       title: 'Тижневий герой',      desc: '7 днів поспіль з транзакціями',            icon: '🔥🔥', xp: 150 },
  { code: 'streak_30',      title: 'Місяць вогню',        desc: '30 днів поспіль з транзакціями',           icon: '🔥🔥🔥', xp: 500 },
  { code: 'saved_20',       title: 'Розумний заощаджувач', desc: 'Заощадив понад 20% доходу за місяць',    icon: '🐷', xp: 100 },
  { code: 'saved_50',       title: 'Майстер заощаджень',  desc: 'Заощадив понад 50% доходу за місяць',     icon: '💰', xp: 200 },
  { code: 'no_fun_week',    title: 'Аскет',               desc: 'Тиждень без витрат на розваги',            icon: '🧘', xp: 100 },
  { code: 'health_beats_fun', title: 'Інвестор душі',     desc: 'Здоров\'я > Розваги за місяць',           icon: '💊', xp: 150 },
  { code: 'level_5',        title: 'На півдорозі',         desc: 'Досягни 5 рівня',                         icon: '⭐', xp: 200 },
  { code: 'level_10',       title: 'Фінансовий Гуру',     desc: 'Досягни максимального рівня',              icon: '👑', xp: 500 },
  { code: 'challenge_done', title: 'Приймаю виклик!',     desc: 'Виконай перший тижневий челендж',          icon: '🎪', xp: 100 },
  { code: 'income_month',   title: 'Дохідний місяць',     desc: 'Доходи перевищили витрати',                icon: '📈', xp: 100 },
]

// ── Архетипи ─────────────────────────────────────────────
const ARCHETYPES = [
  { id: 'gourmet',    title: 'Гурман',      desc: 'Ти любиш смачно поїсти',       icon: '🍕', color: '#fa709a', bonus: 'їжа' },
  { id: 'techie',     title: 'Технофіл',    desc: 'Гаджети — твоя слабкість',     icon: '💻', color: '#4facfe', bonus: 'техніка' },
  { id: 'traveler',   title: 'Мандрівник',  desc: 'Завжди в русі',                icon: '🚗', color: '#43e97b', bonus: 'транспорт' },
  { id: 'ascetic',    title: 'Аскет',       desc: 'Мінімалізм — твоя сила',       icon: '🧘', color: '#667eea', bonus: 'всі' },
  { id: 'shopaholic', title: 'Шопоголік',   desc: 'Шопінг — це терапія',          icon: '🛍️', color: '#f093fb', bonus: 'одяг' },
  { id: 'healthy',    title: 'Здоровяк',    desc: 'Здоров\'я понад усе',          icon: '💊', color: '#fee140', bonus: 'здоров\'я' },
]

// ── Хелпери ──────────────────────────────────────────────
function getLevelInfo(xp) {
  let current = LEVELS[0]
  let next = LEVELS[1]
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      current = LEVELS[i]
      next = LEVELS[i + 1] || null
      break
    }
  }
  const xpInLevel = xp - current.xpRequired
  const xpToNext = next ? next.xpRequired - current.xpRequired : 0
  const progress = next ? Math.round((xpInLevel / xpToNext) * 100) : 100
  return { ...current, next, progress, xpInLevel, xpToNext }
}

function getArchetype(transactions) {
  if (transactions.length < 10) return null
  const expenses = transactions.filter(t => t.type === 'expense')
  const byCat = {}
  for (const t of expenses) {
    const name = t.category?.name || 'Інше'
    byCat[name] = (byCat[name] || 0) + t.amount
  }
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
  if (top.includes('Їжа'))       return ARCHETYPES.find(a => a.id === 'gourmet')
  if (top.includes('Транспорт')) return ARCHETYPES.find(a => a.id === 'traveler')
  if (top.includes('Здоров'))    return ARCHETYPES.find(a => a.id === 'healthy')
  if (top.includes('Одяг'))      return ARCHETYPES.find(a => a.id === 'shopaholic')
  const total = Object.values(byCat).reduce((s, v) => s + v, 0)
  if (top && byCat[top] / total < 0.3) return ARCHETYPES.find(a => a.id === 'ascetic')
  return ARCHETYPES.find(a => a.id === 'techie')
}

function getWeekStart() {
  const now = new Date()
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function generateChallenge(transactions, categories) {
  const now = new Date()
  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
  const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  const foodCat = categories.find(c => c.name === 'Їжа')
  const funCat = categories.find(c => c.name === 'Розваги')

  const lastMonthFood = foodCat
    ? transactions.filter(t => t.categoryId === foodCat.id && new Date(t.date).getMonth() === lastMonth && new Date(t.date).getFullYear() === lastYear).reduce((s, t) => s + t.amount, 0)
    : 0

  const lastMonthFun = funCat
    ? transactions.filter(t => t.categoryId === funCat.id && new Date(t.date).getMonth() === lastMonth && new Date(t.date).getFullYear() === lastYear).reduce((s, t) => s + t.amount, 0)
    : 0

  if (lastMonthFood > 0) {
    return { type: 'spend_less_food', targetAmount: lastMonthFood * 0.8, xpReward: 150, title: 'Економ на їжі', desc: `Витрать на їжу менше ніж ${Math.round(lastMonthFood * 0.8)}₴ цього тижня` }
  }
  if (lastMonthFun > 0) {
    return { type: 'spend_less_fun', targetAmount: lastMonthFun * 0.7, xpReward: 120, title: 'Без розваг', desc: `Витрать на розваги менше ніж ${Math.round(lastMonthFun * 0.7)}₴ цього тижня` }
  }
  return { type: 'add_transactions', targetAmount: 7, xpReward: 100, title: 'Щоденний щоденник', desc: 'Додавай хоча б одну транзакцію кожен день цього тижня' }
}

// ── Основна функція перерахунку ──────────────────────────
async function recalcGame(userId) {
  const [profile, transactions, categories] = await Promise.all([
    prisma.gameProfile.findUnique({ where: { userId }, include: { achievements: true, challenges: true } }),
    prisma.transaction.findMany({ where: { userId }, include: { category: true }, orderBy: { date: 'asc' } }),
    prisma.category.findMany({ where: { userId } }),
  ])

  let xp = 0
  const unlockedCodes = new Set(profile?.achievements?.map(a => a.code) || [])
  const newAchievements = []

  const addXP = (amount, code) => {
    if (code && unlockedCodes.has(code)) return
    xp += amount
    if (code) {
      unlockedCodes.add(code)
      newAchievements.push(code)
    }
  }

  // XP за транзакції
  const txCount = transactions.length
  xp += txCount * 10

  // Ачівки за кількість транзакцій
  if (txCount >= 1)   addXP(50, 'first_tx')
  if (txCount >= 10)  addXP(75, 'tx_10')
  if (txCount >= 50)  addXP(150, 'tx_50')
  if (txCount >= 100) addXP(300, 'tx_100')

  // Streak
  const today = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const lastActive = profile?.lastActiveDate ? new Date(profile.lastActiveDate) : null
  lastActive?.setHours(0,0,0,0)

  let streak = profile?.streak || 0
  if (!lastActive || lastActive.getTime() === yesterday.getTime()) {
    streak = (lastActive?.getTime() === yesterday.getTime() ? streak : 0) + 1
  } else if (!lastActive || lastActive.getTime() < yesterday.getTime()) {
    streak = 1
  }

  xp += streak * 5
  if (streak >= 3)  addXP(50, 'streak_3')
  if (streak >= 7)  addXP(150, 'streak_7')
  if (streak >= 30) addXP(500, 'streak_30')

  // Місячна статистика
  const now = new Date()
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const monthIncome = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthExpense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const savingsRate = monthIncome > 0 ? (monthIncome - monthExpense) / monthIncome : 0

  if (savingsRate >= 0.2) addXP(100, 'saved_20')
  if (savingsRate >= 0.5) addXP(200, 'saved_50')
  if (monthIncome > monthExpense) addXP(100, 'income_month')

  // Тиждень без розваг
  const weekStart = getWeekStart()
  const funCat = categories.find(c => c.name === 'Розваги')
  const weekFun = funCat ? transactions.filter(t => t.categoryId === funCat.id && new Date(t.date) >= weekStart).reduce((s, t) => s + t.amount, 0) : 0
  if (weekFun === 0 && transactions.some(t => new Date(t.date) >= weekStart)) addXP(100, 'no_fun_week')

  // Здоров'я > розваги
  const healthCat = categories.find(c => c.name === 'Здоров\'я')
  const monthHealth = healthCat ? thisMonth.filter(t => t.categoryId === healthCat.id).reduce((s, t) => s + t.amount, 0) : 0
  const monthFun = funCat ? thisMonth.filter(t => t.categoryId === funCat.id).reduce((s, t) => s + t.amount, 0) : 0
  if (monthHealth > 0 && monthHealth > monthFun) addXP(150, 'health_beats_fun')

  // Рівень
  const levelInfo = getLevelInfo(xp)
  if (levelInfo.level >= 5)  addXP(200, 'level_5')
  if (levelInfo.level >= 10) addXP(500, 'level_10')

  // Архетип
  const archetype = getArchetype(transactions)

  // Тижневий челендж
  const existingChallenge = profile?.challenges?.find(c => {
    const cs = new Date(c.weekStart); cs.setHours(0,0,0,0)
    return cs.getTime() === weekStart.getTime()
  })

  let challenge = existingChallenge
  if (!existingChallenge) {
    const gen = generateChallenge(transactions, categories)
    challenge = { ...gen, weekStart, completed: false, currentAmount: 0 }
  } else if (!existingChallenge.completed) {
    // Перевіряємо прогрес
    if (existingChallenge.type === 'add_transactions') {
      const weekTx = transactions.filter(t => new Date(t.date) >= weekStart).length
      challenge = { ...existingChallenge, currentAmount: weekTx }
      if (weekTx >= existingChallenge.targetAmount) {
        addXP(existingChallenge.xpReward, 'challenge_done')
        challenge.completed = true
      }
    } else {
      const catName = existingChallenge.type === 'spend_less_food' ? 'Їжа' : 'Розваги'
      const cat = categories.find(c => c.name === catName)
      const spent = cat ? transactions.filter(t => t.categoryId === cat.id && new Date(t.date) >= weekStart).reduce((s, t) => s + t.amount, 0) : 0
      challenge = { ...existingChallenge, currentAmount: spent }
      if (spent <= existingChallenge.targetAmount) {
        const daysLeft = 7 - Math.floor((now - weekStart) / 86400000)
        if (daysLeft <= 0) {
          addXP(existingChallenge.xpReward, 'challenge_done')
          challenge.completed = true
        }
      }
    }
  }

  const finalLevel = getLevelInfo(xp).level

  // Зберігаємо в БД
  const updatedProfile = await prisma.gameProfile.upsert({
    where: { userId },
    create: { userId, xp, level: finalLevel, streak, lastActiveDate: today, archetype: archetype?.id || null },
    update: { xp, level: finalLevel, streak, lastActiveDate: today, archetype: archetype?.id || null },
  })

  // Нові ачівки
  for (const code of newAchievements) {
    await prisma.achievement.upsert({
      where: { gameProfileId_code: { gameProfileId: updatedProfile.id, code } },
      create: { gameProfileId: updatedProfile.id, code },
      update: {},
    }).catch(() => {})
  }

  // Оновлюємо/створюємо челендж
  if (challenge) {
    await prisma.weeklyChallenge.upsert({
      where: { gameProfileId_weekStart: { gameProfileId: updatedProfile.id, weekStart } },
      create: {
        gameProfileId: updatedProfile.id,
        weekStart,
        type: challenge.type,
        targetAmount: challenge.targetAmount || null,
        currentAmount: challenge.currentAmount || 0,
        completed: challenge.completed || false,
        xpReward: challenge.xpReward || 100,
      },
      update: {
        currentAmount: challenge.currentAmount || 0,
        completed: challenge.completed || false,
      },
    }).catch(() => {})
  }

  return updatedProfile.id
}

// ── Routes ───────────────────────────────────────────────

// GET /api/game — отримати повний профіль
router.get('/', auth, async (req, res) => {
  try {
    const [transactions, categories] = await Promise.all([
      prisma.transaction.findMany({ where: { userId: req.userId }, include: { category: true }, orderBy: { date: 'asc' } }),
      prisma.category.findMany({ where: { userId: req.userId } }),
    ])

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: req.userId },
      include: { achievements: true, challenges: { orderBy: { weekStart: 'desc' }, take: 1 } },
    })

    if (!profile) {
  // Створюємо профіль якщо не існує
  await prisma.gameProfile.create({
    data: { userId: req.userId, xp: 0, level: 1, streak: 0 }
  })
  return res.json({
    xp: 0,
    level: getLevelInfo(0),
    streak: 0,
    archetype: null,
    savingsRate: 0,
    achievements: { unlocked: [], locked: ACHIEVEMENTS },
    challenge: null,
    allAchievements: ACHIEVEMENTS,
  })
}

const levelInfo = getLevelInfo(profile.xp)
    const archetype = ARCHETYPES.find(a => a.id === profile.archetype) || null
    const unlockedAchievements = profile.achievements.map(a => {
      const def = ACHIEVEMENTS.find(ac => ac.code === a.code)
      return def ? { ...def, unlockedAt: a.unlockedAt } : null
    }).filter(Boolean)

    const lockedAchievements = ACHIEVEMENTS.filter(a => !profile.achievements.find(ua => ua.code === a.code))
    const currentChallenge = profile.challenges[0] || null

    // Дані для міні-віджету на дашборді
    const monthNow = new Date()
    const thisMonth = transactions.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === monthNow.getMonth() && d.getFullYear() === monthNow.getFullYear()
    })
    const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0

    res.json({
      xp: profile.xp,
      level: levelInfo,
      streak: profile.streak,
      archetype,
      savingsRate,
      achievements: { unlocked: unlockedAchievements, locked: lockedAchievements },
      challenge: currentChallenge ? {
        ...currentChallenge,
        meta: generateChallenge(transactions, categories),
      } : null,
      allAchievements: ACHIEVEMENTS,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// POST /api/game/sync — виклик після кожної нової транзакції
router.post('/sync', auth, async (req, res) => {
  try {
    await recalcGame(req.userId)
    res.json({ ok: true })
  } catch (e) {
    console.error('SYNC ERROR:', e.message, e.stack)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
module.exports.LEVELS = LEVELS
module.exports.ACHIEVEMENTS = ACHIEVEMENTS
module.exports.ARCHETYPES = ARCHETYPES