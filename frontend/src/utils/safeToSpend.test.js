import { test, expect, describe } from 'bun:test'
import { calcSafeToSpend } from './safeToSpend.js'

const JUN13 = new Date(2026, 5, 13) // 13 червня 2026, у місяці 30 днів → daysLeft = 18
const JUN30 = new Date(2026, 5, 30) // останній день → daysLeft = 1

describe('calcSafeToSpend', () => {
  test('немає доходу → null', () => {
    expect(calcSafeToSpend({ now: JUN13, income: 0 })).toBeNull()
  })

  test('без бюджету: витрата сьогодні зменшує денний ліміт', () => {
    const r = calcSafeToSpend({
      now: JUN13,
      income: 40000,
      transactions: [{ type: 'expense', amount: 10000, date: '2026-06-13', categoryId: 'house' }],
    })
    expect(r.hasBudget).toBe(false)
    expect(r.monthExpense).toBe(10000)
    expect(r.spentToday).toBe(10000)
    expect(r.dailyLimit).toBeCloseTo(40000 / 18, 2) // ≈2222.22
    expect(r.value).toBe(0) // max(0, 2222 − 10000)
  })

  test('без бюджету: вчорашня витрата НЕ обнуляє сьогодні', () => {
    const r = calcSafeToSpend({
      now: JUN13,
      income: 40000,
      transactions: [{ type: 'expense', amount: 10000, date: '2026-06-12', categoryId: 'house' }],
    })
    expect(r.spentToday).toBe(0)
    expect(r.value).toBeCloseTo(30000 / 18, 2) // ≈1666.67
  })

  test('бюджетний режим: витрати ПОЗА бюджетом ігноруються', () => {
    const r = calcSafeToSpend({
      now: JUN13,
      income: 40000,
      budgets: [{ categoryId: 'food', amount: 5000, spent: 1000 }],
      transactions: [
        { type: 'expense', amount: 1000, date: '2026-06-12', categoryId: 'food' },
        { type: 'expense', amount: 10000, date: '2026-06-12', categoryId: 'house' }, // поза бюджетом
      ],
    })
    expect(r.hasBudget).toBe(true)
    expect(r.baseAmount).toBe(5000) // база = бюджет, не дохід
    expect(r.monthExpense).toBe(1000) // лише їжа; житло НЕ враховано
    expect(r.value).toBeCloseTo(4000 / 18, 2) // ≈222.22  (стара логіка дала б 0!)
  })

  test('бюджетний режим: сьогоднішня витрата в бюджетній категорії знижує ліміт', () => {
    const r = calcSafeToSpend({
      now: JUN13,
      income: 40000,
      budgets: [{ categoryId: 'food', amount: 5000, spent: 1000 }],
      transactions: [{ type: 'expense', amount: 1000, date: '2026-06-13', categoryId: 'food' }],
    })
    expect(r.spentToday).toBe(1000)
    expect(r.dailyLimit).toBeCloseTo(5000 / 18, 2) // ≈277.78
    expect(r.value).toBe(0) // max(0, 277 − 1000)
  })

  test('перевитрата (залишок ≤ 0) → 0', () => {
    const r = calcSafeToSpend({
      now: JUN13,
      income: 1000,
      transactions: [{ type: 'expense', amount: 2000, date: '2026-06-10', categoryId: 'x' }],
    })
    expect(r.value).toBe(0)
    expect(r.dailyLimit).toBe(0)
  })

  test('останній день місяця → весь залишок доступний', () => {
    const r = calcSafeToSpend({ now: JUN30, income: 40000 })
    expect(r.daysLeft).toBe(1)
    expect(r.value).toBe(40000) // 40000 / 1
  })
})