// Чиста функція розрахунку "safe-to-spend" (без React).
// Логіка "денного конверта": ліміт = залишок_на_початок_дня / днів_що_лишились,
// мінус витрачене сьогодні. У бюджетному режимі рахуємо ЛИШЕ забюджетовані категорії.
//
// Вхід:
//   now          — Date (поточна дата)
//   transactions — [{ type, amount, date, categoryId }]
//   income       — дохід за поточний місяць (number)
//   budgets      — [{ categoryId, amount, spent }] (spent рахує бекенд за місяць)
//
// Вихід: null (якщо доходу немає) або
//   { value, baseAmount, monthExpense, spentToday, daysLeft, dailyLimit, hasBudget }
export function calcSafeToSpend({ now, transactions = [], income = 0, budgets = [] }) {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const today = now.getDate()
  const daysLeft = daysInMonth - today + 1 // включно з сьогодні

  if (income === 0) return null

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const hasBudget = totalBudget > 0
  const budgetCatIds = new Set(budgets.map(b => b.categoryId))
  const baseAmount = hasBudget ? totalBudget : income

  const inThisMonth = (d) =>
    d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()

  // Витрати за місяць: у бюджетному режимі = сума spent (лише забюджетовані категорії),
  // інакше — усі витрати місяця.
  const monthExpense = hasBudget
    ? budgets.reduce((s, b) => s + b.spent, 0)
    : transactions
        .filter(t => t.type === 'expense' && inThisMonth(new Date(t.date)))
        .reduce((s, t) => s + t.amount, 0)

  // Витрати сьогодні (у бюджетному режимі — лише по забюджетованих категоріях)
  const spentToday = transactions
    .filter(t => {
      const d = new Date(t.date)
      const sameDay = t.type === 'expense' && d.getDate() === today && inThisMonth(d)
      return hasBudget ? (sameDay && budgetCatIds.has(t.categoryId)) : sameDay
    })
    .reduce((s, t) => s + t.amount, 0)

  const remaining = baseAmount - monthExpense
  if (remaining <= 0) {
    return { value: 0, baseAmount, monthExpense, spentToday, daysLeft, dailyLimit: 0, hasBudget }
  }

  const remainingStartOfDay = remaining + spentToday
  const dailyLimit = remainingStartOfDay / daysLeft
  const value = Math.max(0, dailyLimit - spentToday)

  return { value, baseAmount, monthExpense, spentToday, daysLeft, dailyLimit, hasBudget }
}