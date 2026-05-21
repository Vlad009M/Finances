import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../api/index.js'

export default function BudgetSection({ categories, categoriesMeta, filterMonth, filterYear }) {
  const [budgets, setBudgets] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ categoryId: '', amount: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadBudgets() }, [filterMonth, filterYear])

  const loadBudgets = async () => {
    try {
      const res = await api.get(`/budgets?month=${filterMonth + 1}&year=${filterYear}`)
      setBudgets(res.data)
    } catch {}
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.categoryId || !form.amount) { toast.error('Заповни всі поля'); return }
    setSaving(true)
    try {
      await api.post('/budgets', {
        categoryId: form.categoryId,
        amount: parseFloat(form.amount),
        month: filterMonth + 1,
        year: filterYear,
      })
      toast.success('Бюджет встановлено!')
      setForm({ categoryId: '', amount: '' })
      setShowForm(false)
      loadBudgets()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Помилка')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/budgets/${id}`)
      toast.success('Бюджет видалено')
      loadBudgets()
    } catch {
      toast.error('Помилка')
    }
  }

  // Категорії витрат без вже існуючого бюджету
  const expenseCategories = categories.filter(c =>
    c.type === 'expense' && !budgets.find(b => b.categoryId === c.id)
  )

  return (
    <div style={s.card}>
      <div style={s.header}>
        <div style={{ ...s.title, display: 'flex', alignItems: 'center', gap: 6 }}>
          <img src="/icons/budget.svg" width={20} height={20} alt="" /> Бюджети
        </div>
        <button onClick={() => setShowForm(!showForm)} style={s.addBtn}>
          {showForm ? '✕' : '+ Додати'}
        </button>
      </div>

      {/* Форма додавання */}
      {showForm && (
        <form onSubmit={handleSave} style={s.form}>
          <select
            style={s.select}
            value={form.categoryId}
            onChange={e => setForm({ ...form, categoryId: e.target.value })}
            required
          >
            <option value="">Оберіть категорію</option>
            {expenseCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              style={s.input}
              type="number"
              placeholder="Ліміт ₴"
              min="1"
              step="1"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              required
            />
            <button type="submit" style={s.saveBtn} disabled={saving}>
              {saving ? '...' : '✓'}
            </button>
          </div>
        </form>
      )}

      {/* Список бюджетів */}
      {budgets.length === 0 && !showForm && (
        <div style={s.empty}>Встанови ліміти щоб контролювати витрати</div>
      )}

      {budgets.map(b => {
        const pct = Math.min((b.spent / b.amount) * 100, 100)
        const over = b.spent > b.amount
        const warn = pct >= 80 && !over
        const color = over ? '#993C1D' : warn ? '#985A00' : '#534AB7'
        const bgColor = over ? '#FAECE7' : warn ? '#FEF9F0' : '#EEEDFE'

        return (
          <div key={b.id} style={s.budgetRow}>
            <div style={s.budgetTop}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <img 
                  src={categoriesMeta.find(c => c.name === b.categoryName)?.icon || '/icons/other.svg'} 
                  width={18} height={18} alt="" style={{ borderRadius: 3 }} 
                />
                {b.categoryName}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ ...s.amounts, color }}>
                  ₴{Math.round(b.spent).toLocaleString()} / ₴{b.amount.toLocaleString()}
                </span>
                <button onClick={() => handleDelete(b.id)} style={s.delBtn}>✕</button>
              </div>
            </div>

            <div style={s.barBg}>
              <div style={{ ...s.barFill, width: `${pct}%`, background: color }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ ...s.status, color, background: bgColor }}>
                {over
                  ? `⚠️ Перевищено на ₴${Math.round(b.spent - b.amount).toLocaleString()}`
                  : warn
                  ? `⚡ Залишилось ₴${Math.round(b.amount - b.spent).toLocaleString()}`
                  : `✓ ₴${Math.round(b.amount - b.spent).toLocaleString()} вільно`}
              </span>
              <span style={s.pct}>{Math.round(pct)}%</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const s = {
  card: { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' },
  addBtn: { fontSize: 12, color: '#534AB7', background: '#EEEDFE', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 500 },
  form: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, padding: '12px', background: 'var(--color-background-secondary)', borderRadius: 8 },
  select: { padding: '7px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 7, fontSize: 12, outline: 'none', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' },
  input: { flex: 1, padding: '7px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 7, fontSize: 12, outline: 'none', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' },
  saveBtn: { padding: '7px 14px', background: '#7F77DD', color: '#fff', border: 'none', borderRadius: 7, fontSize: 14, cursor: 'pointer', fontWeight: 600 },
  empty: { fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '16px 0', lineHeight: 1.5 },
  budgetRow: { marginBottom: 14, paddingBottom: 14, borderBottom: '0.5px solid var(--color-border-tertiary)' },
  budgetTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catName: { fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' },
  amounts: { fontSize: 12, fontWeight: 500 },
  delBtn: { fontSize: 11, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' },
  barBg: { height: 6, background: 'var(--color-background-tertiary)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, transition: 'width 0.4s ease' },
  status: { fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500 },
  pct: { fontSize: 11, color: 'var(--color-text-tertiary)' },
}