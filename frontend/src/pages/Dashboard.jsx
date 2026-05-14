import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Charts from './Charts.jsx'
import AIAnalysis from './AIAnalysis.jsx'
import api from '../api/index.js'
import EditModal from '../components/EditModal.jsx'
import { sanitize } from '../utils/sanitize.js'

const MONTHS = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень']

const CATEGORIES = [
  { name: 'Їжа', icon: '🍕', color: '#FAECE7', iconColor: '#993C1D', type: 'expense' },
  { name: 'Транспорт', icon: '🚗', color: '#FAECE7', iconColor: '#993C1D', type: 'expense' },
  { name: 'Розваги', icon: '🎮', color: '#FAECE7', iconColor: '#993C1D', type: 'expense' },
  { name: 'Здоров\'я', icon: '💊', color: '#FAECE7', iconColor: '#993C1D', type: 'expense' },
  { name: 'Одяг', icon: '👕', color: '#FAECE7', iconColor: '#993C1D', type: 'expense' },
  { name: 'Комунальні', icon: '🏠', color: '#FAECE7', iconColor: '#993C1D', type: 'expense' },
  { name: 'Зарплата', icon: '💰', color: '#EAF3DE', iconColor: '#3B6D11', type: 'income' },
  { name: 'Фріланс', icon: '💻', color: '#EAF3DE', iconColor: '#3B6D11', type: 'income' },
  { name: 'Інше', icon: '📦', color: '#EEEDFE', iconColor: '#534AB7', type: 'expense' },
]

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const navigate = useNavigate()
  const now = new Date()
  const [transactions, setTransactions] = useState([])
  const [allTransactions, setAllTransactions] = useState([])
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 })
  const [prevStats, setPrevStats] = useState({ expense: 0, income: 0 })
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editTx, setEditTx] = useState(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterMonth, setFilterMonth] = useState(now.getMonth())
  const [filterYear, setFilterYear] = useState(now.getFullYear())
  const [form, setForm] = useState({
    amount: '', type: 'expense', description: '', categoryId: '',
    date: now.toISOString().split('T')[0]
  })
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => { loadData() }, [])
  useEffect(() => { applyFilters() }, [allTransactions, search, filterMonth, filterYear])

  const loadData = async () => {
    try {
      let cats = await api.get('/categories')
      if (cats.data.length === 0) {
        for (const cat of CATEGORIES) await api.post('/categories', cat)
        cats = await api.get('/categories')
      }
      setCategories(cats.data)
      const txRes = await api.get('/transactions')
      setAllTransactions(txRes.data)
      calcPrevStats(txRes.data)
    } catch {
      toast.error('Помилка завантаження')
    }
  }

  const calcPrevStats = (txs) => {
    const prev = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const prevTxs = txs.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === prev && d.getFullYear() === prevYear
    })
    setPrevStats({
      income: prevTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    })
  }

  const applyFilters = () => {
    let filtered = allTransactions
    if (search) filtered = filtered.filter(t =>
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.name?.toLowerCase().includes(search.toLowerCase())
    )
    filtered = filtered.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === filterMonth && d.getFullYear() === filterYear
    })
    setTransactions(filtered)
    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    setStats({ income, expense, balance: income - expense })
  }

  const addTransaction = async (e) => {
    e.preventDefault()
    if (!form.amount || !form.categoryId) { toast.error('Заповни всі поля'); return }
    setLoading(true)
    try {
      await api.post('/transactions', {
      ...form,
      description: sanitize(form.description),
      amount: parseFloat(form.amount)
    })
      setForm({ amount: '', type: 'expense', description: '', categoryId: '', date: now.toISOString().split('T')[0] })
      setShowForm(false)
      toast.success('Транзакцію додано!')
      loadData()
    } catch { toast.error('Помилка') }
    setLoading(false)
  }

  const deleteTransaction = async (id) => {
    try {
      await api.delete(`/transactions/${id}`)
      toast.success('Видалено')
      loadData()
    } catch { toast.error('Помилка') }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {}
    localStorage.removeItem('user')
    navigate('/login')
}

  const incomeChange = prevStats.income > 0 ? Math.round(((stats.income - prevStats.income) / prevStats.income) * 100) : null
  const expenseChange = prevStats.expense > 0 ? Math.round(((stats.expense - prevStats.expense) / prevStats.expense) * 100) : null
  const savings = stats.income > 0 ? Math.round(((stats.income - stats.expense) / stats.income) * 100) : 0

  const pieData = categories
    .filter(c => c.type === 'expense')
    .map(cat => ({
      ...cat,
      value: transactions.filter(t => t.categoryId === cat.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const totalExpense = pieData.reduce((s, d) => s + d.value, 0)

  const barData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const m = d.getMonth(), y = d.getFullYear()
    const expense = allTransactions.filter(t => t.type === 'expense' && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y).reduce((s, t) => s + t.amount, 0)
    const maxExpense = Math.max(...Array.from({ length: 6 }, (_, j) => {
      const dd = new Date(); dd.setMonth(dd.getMonth() - (5 - j))
      return allTransactions.filter(t => t.type === 'expense' && new Date(t.date).getMonth() === dd.getMonth()).reduce((s, t) => s + t.amount, 0)
    }), 1)
    return { month: d.toLocaleString('uk', { month: 'short' }), expense, height: Math.round((expense / maxExpense) * 100), active: m === now.getMonth() }
  })

  const navItems = [
    { id: 'dashboard', icon: 'ti-layout-dashboard', label: 'Дашборд' },
    { id: 'transactions', icon: 'ti-arrows-exchange', label: 'Транзакції' },
    { id: 'charts', icon: 'ti-chart-bar', label: 'Графіки' },
    { id: 'ai', icon: 'ti-robot', label: 'AI Аналіз' },
  ]

  const filteredCategories = categories.filter(c => c.type === form.type)
  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'VL'

  return (
    <div style={s.app}>
      {/* SIDEBAR */}
      <div style={s.sidebar}>
        <div style={s.logoRow}>
          <img src="/Aperio.png" alt="Aperio" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }} />
          <span style={s.logoText}>Aperio</span>
        </div>
        <div style={s.navLabel}>Меню</div>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)}
            style={{ ...s.navItem, ...(activeTab === item.id ? s.navActive : {}) }}>
            <i className={`ti ${item.icon}`} style={{ fontSize: 18 }} />
            {item.label}
          </button>
        ))}
        <div style={s.navLabel}>Акаунт</div>
        <button onClick={logout} style={s.navItem}>
          <i className="ti ti-logout" style={{ fontSize: 18 }} />
          Вийти
        </button>
        <div style={s.userRow}>
          <div style={s.avatar}>{initials}</div>
          <div>
            <div style={s.userName}>{user.name}</div>
            <div style={s.userRole}>Особистий</div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={s.main}>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={s.topBar}>
              <div>
                <div style={s.pageTitle}>Дашборд</div>
                <div style={s.monthNav}>
                  <button onClick={() => { const d = new Date(filterYear, filterMonth - 1); setFilterMonth(d.getMonth()); setFilterYear(d.getFullYear()) }} style={s.monthBtn}>‹</button>
                  <span style={s.monthLabel}>{MONTHS[filterMonth]} {filterYear}</span>
                  <button onClick={() => { const d = new Date(filterYear, filterMonth + 1); setFilterMonth(d.getMonth()); setFilterYear(d.getFullYear()) }} style={s.monthBtn}>›</button>
                </div>
              </div>
              <button onClick={() => setShowForm(!showForm)} style={s.addBtn}>
                <i className="ti ti-plus" /> {showForm ? 'Закрити' : 'Додати'}
              </button>
            </div>

            {/* FORM */}
            {showForm && (
              <div style={s.formCard}>
                <div style={s.formTitle}>Нова транзакція</div>
                <form onSubmit={addTransaction}>
                  <div style={s.formRow}>
                    <select style={s.select} value={form.type} onChange={e => setForm({ ...form, type: e.target.value, categoryId: '' })}>
                      <option value="expense">💸 Витрата</option>
                      <option value="income">💵 Дохід</option>
                    </select>
                    <input style={s.input} type="number" placeholder="Сума ₴" min="0.01" step="0.01"
                      value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                    <input style={s.input} type="date" value={form.date}
                      onChange={e => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div style={s.formRow}>
                    <select style={s.select} value={form.categoryId}
                      onChange={e => setForm({ ...form, categoryId: e.target.value })} required>
                      <option value="">Оберіть категорію</option>
                      {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                    <input style={{ ...s.input, flex: 2 }} type="text" placeholder="Опис (необов'язково)"
                      value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <button style={{ ...s.addBtn, width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
                    type="submit" disabled={loading}>
                    {loading ? 'Збереження...' : 'Зберегти транзакцію'}
                  </button>
                </form>
              </div>
            )}

            <div style={s.twoCol}>
              {/* LEFT */}
              <div>
                {/* Balance card */}
                <div style={s.balanceCard}>
                  <div style={s.balanceLabel}>Загальний баланс</div>
                  <div style={s.balanceAmount}>₴{stats.balance.toLocaleString()}</div>
                  <div style={s.balanceRow}>
                    <div style={s.balanceSub}>
                      <span style={s.balanceSubLabel}>Доходи</span>
                      <span style={s.balanceSubVal}>₴{stats.income.toLocaleString()}</span>
                    </div>
                    <div style={s.balanceSub}>
                      <span style={s.balanceSubLabel}>Витрати</span>
                      <span style={s.balanceSubVal}>₴{stats.expense.toLocaleString()}</span>
                    </div>
                    <div style={s.balanceSub}>
                      <span style={s.balanceSubLabel}>Місяць</span>
                      <span style={s.balanceSubVal}>{MONTHS[filterMonth].slice(0, 3)}</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div style={s.statsGrid}>
                  <div style={s.statCard}>
                    <div style={{ ...s.statIcon, background: '#EAF3DE' }}>
                      <i className="ti ti-trending-up" style={{ color: '#3B6D11', fontSize: 18 }} />
                    </div>
                    <div style={s.statLabel}>Доходи</div>
                    <div style={s.statVal}>₴{stats.income.toLocaleString()}</div>
                    {incomeChange !== null && (
                      <div style={{ ...s.statChange, color: incomeChange >= 0 ? '#3B6D11' : '#993C1D' }}>
                        <i className={`ti ti-arrow-${incomeChange >= 0 ? 'up' : 'down'}`} /> {Math.abs(incomeChange)}% vs минулий
                      </div>
                    )}
                  </div>
                  <div style={s.statCard}>
                    <div style={{ ...s.statIcon, background: '#FAECE7' }}>
                      <i className="ti ti-trending-down" style={{ color: '#993C1D', fontSize: 18 }} />
                    </div>
                    <div style={s.statLabel}>Витрати</div>
                    <div style={s.statVal}>₴{stats.expense.toLocaleString()}</div>
                    {expenseChange !== null && (
                      <div style={{ ...s.statChange, color: expenseChange <= 0 ? '#3B6D11' : '#993C1D' }}>
                        <i className={`ti ti-arrow-${expenseChange >= 0 ? 'up' : 'down'}`} /> {Math.abs(expenseChange)}% vs минулий
                      </div>
                    )}
                  </div>
                  <div style={s.statCard}>
                    <div style={{ ...s.statIcon, background: '#EEEDFE' }}>
                      <i className="ti ti-wallet" style={{ color: '#534AB7', fontSize: 18 }} />
                    </div>
                    <div style={s.statLabel}>Заощаджено</div>
                    <div style={s.statVal}>{savings}%</div>
                    <div style={{ ...s.statChange, color: savings >= 20 ? '#3B6D11' : '#993C1D' }}>
                      {savings >= 50 ? 'Відмінно!' : savings >= 20 ? 'Добре' : 'Варто більше'}
                    </div>
                  </div>
                </div>

                {/* Transactions */}
                <div style={s.sectionHeader}>
                  <span style={s.sectionTitle}>Останні транзакції</span>
                  <span style={s.seeAll} onClick={() => setActiveTab('transactions')}>Всі →</span>
                </div>
                <div style={s.txCard}>
                  {transactions.slice(0, 6).map(t => {
                    const catDef = CATEGORIES.find(c => c.name === t.category?.name)
                    return (
                      <div key={t.id} style={s.txRow}>
                        <div style={{ ...s.txIcon, background: catDef?.color || '#EEEDFE' }}>
                          <span style={{ fontSize: 18 }}>{t.category?.icon || '📦'}</span>
                        </div>
                        <div style={s.txInfo}>
                          <div style={s.txName}>{t.category?.name || 'Інше'}</div>
                          <div style={s.txDate}>{t.description || '—'} · {new Date(t.date).toLocaleDateString('uk', { day: 'numeric', month: 'short' })}</div>
                        </div>
                        <div style={{ ...s.txAmount, color: t.type === 'income' ? '#3B6D11' : '#993C1D' }}>
                          {t.type === 'income' ? '+' : '-'}₴{t.amount.toLocaleString()}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => setEditTx(t)} style={s.actionBtn} title="Редагувати">
                          ✏️
                        </button>
                        <button onClick={() => deleteTransaction(t.id)} style={{ ...s.actionBtn, color: '#993C1D' }} title="Видалити">
                          🗑️
                        </button>
                      </div>
                      </div>
                    )
                  })}
                  {transactions.length === 0 && (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                      Немає транзакцій за {MONTHS[filterMonth]}. Додай першу!
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div style={s.rightCol}>
                {/* Bar chart */}
                <div style={s.rightCard}>
                  <div style={s.sectionTitle}>Витрати по місяцях</div>
                  <div style={s.bars}>
                    {barData.map((d, i) => (
                      <div key={i} style={s.barCol}>
                        <div style={{ ...s.bar, height: Math.max(d.height, 4) + '%', background: d.active ? '#7F77DD' : '#EEEDFE' }} />
                        <div style={s.barLabel}>{d.month}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category breakdown */}
                <div style={s.rightCard}>
                  <div style={s.sectionTitle}>Категорії витрат</div>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {pieData.slice(0, 4).map((d, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                          <span>{d.icon} {d.name}</span>
                          <span style={{ fontWeight: 500 }}>{totalExpense > 0 ? Math.round((d.value / totalExpense) * 100) : 0}%</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--color-background-tertiary)', borderRadius: 3 }}>
                          <div style={{ height: '100%', width: (totalExpense > 0 ? (d.value / totalExpense) * 100 : 0) + '%', background: i === 0 ? '#7F77DD' : i === 1 ? '#AFA9EC' : i === 2 ? '#CECBF6' : '#EEEDFE', borderRadius: 3 }} />
                        </div>
                      </div>
                    ))}
                    {pieData.length === 0 && <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 12 }}>Додай витрати</div>}
                  </div>
                </div>

                {/* AI tip */}
                <div style={s.aiCard}>
                  <div style={s.aiBadge}><i className="ti ti-robot" style={{ fontSize: 13 }} /> AI Порада</div>
                  <div style={s.aiText}>
                    {stats.income === 0 ? 'Додай транзакції щоб отримати AI пораду на основі твоїх даних.' :
                      savings >= 50 ? `Чудово! Ти заощаджуєш ${savings}% доходу. Розглянь інвестування надлишку.` :
                      savings >= 20 ? `Непогано — ${savings}% заощаджень. Спробуй довести до 30%.` :
                      `Витрати ${stats.expense > stats.income ? 'перевищують' : 'майже рівні'} доходам. Перейди до AI Аналізу для детальних порад.`}
                  </div>
                  <button onClick={() => setActiveTab('ai')} style={s.aiBtn}>
                    Детальний аналіз →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === 'transactions' && (
          <div>
            <div style={s.topBar}>
              <div>
                <div style={s.pageTitle}>Транзакції</div>
                <div style={s.monthNav}>
                  <button onClick={() => { const d = new Date(filterYear, filterMonth - 1); setFilterMonth(d.getMonth()); setFilterYear(d.getFullYear()) }} style={s.monthBtn}>‹</button>
                  <span style={s.monthLabel}>{MONTHS[filterMonth]} {filterYear}</span>
                  <button onClick={() => { const d = new Date(filterYear, filterMonth + 1); setFilterMonth(d.getMonth()); setFilterYear(d.getFullYear()) }} style={s.monthBtn}>›</button>
                </div>
              </div>
              <button onClick={() => { setActiveTab('dashboard'); setShowForm(true) }} style={s.addBtn}>
                <i className="ti ti-plus" /> Додати
              </button>
            </div>
            <div style={s.txCard}>
              <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <input style={{ ...s.input, width: '100%' }} type="text"
                  placeholder="🔍 Пошук по опису або категорії..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {transactions.map(t => {
                const catDef = CATEGORIES.find(c => c.name === t.category?.name)
                return (
                  <div key={t.id} style={s.txRow}>
                    <div style={{ ...s.txIcon, background: catDef?.color || '#EEEDFE' }}>
                      <span style={{ fontSize: 18 }}>{t.category?.icon || '📦'}</span>
                    </div>
                    <div style={s.txInfo}>
                      <div style={s.txName}>{t.category?.name || 'Інше'}</div>
                      <div style={s.txDate}>{t.description || '—'} · {new Date(t.date).toLocaleDateString('uk', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <div style={{ ...s.txAmount, color: t.type === 'income' ? '#3B6D11' : '#993C1D' }}>
                      {t.type === 'income' ? '+' : '-'}₴{t.amount.toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => setEditTx(t)} style={s.actionBtn} title="Редагувати">
                      ✏️
                    </button>
                    <button onClick={() => deleteTransaction(t.id)} style={{ ...s.actionBtn, color: '#993C1D' }} title="Видалити">
                      🗑️
                    </button>
                    </div>
                  </div>
                )
              })}
              {transactions.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                  Немає транзакцій за цей період
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'charts' && <Charts transactions={allTransactions} categories={categories} />}
        {activeTab === 'ai' && <AIAnalysis />}
      </div>
      {editTx && (
        <EditModal
          transaction={editTx}
          categories={categories}
          onClose={() => setEditTx(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  )
}

const s = {
  app: { display: 'flex', minHeight: '100vh', background: 'var(--color-background-tertiary, #f4f5f7)' },
  sidebar: { width: 210, background: 'var(--color-background-primary)', borderRight: '0.5px solid var(--color-border-tertiary)', padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 2, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px', marginBottom: 20 },
  logoIcon: { width: 34, height: 34, borderRadius: 9, background: '#7F77DD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 },
  logoText: { fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)' },
  navLabel: { fontSize: 10, color: 'var(--color-text-tertiary)', padding: '12px 12px 4px', textTransform: 'uppercase', letterSpacing: 0.6 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, fontSize: 13, color: 'var(--color-text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' },
  navActive: { background: '#EEEDFE', color: '#534AB7', fontWeight: 500 },
  userRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 8px 4px', marginTop: 'auto', borderTop: '0.5px solid var(--color-border-tertiary)' },
  avatar: { width: 34, height: 34, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: '#534AB7', flexShrink: 0 },
  userName: { fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' },
  userRole: { fontSize: 11, color: 'var(--color-text-tertiary)' },
  main: { flex: 1, padding: 28, overflowY: 'auto', minWidth: 0 },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 8 },
  monthNav: { display: 'flex', alignItems: 'center', gap: 10 },
  monthBtn: { width: 28, height: 28, borderRadius: '50%', border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)', cursor: 'pointer', fontSize: 16, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', minWidth: 120, textAlign: 'center' },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#7F77DD', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  formCard: { background: 'var(--color-background-primary)', border: '0.5px solid #AFA9EC', borderRadius: 12, padding: 20, marginBottom: 20 },
  formTitle: { fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 14 },
  formRow: { display: 'flex', gap: 10, marginBottom: 10 },
  select: { flex: 1, padding: '9px 12px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)' },
  input: { flex: 1, padding: '9px 12px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' },
  balanceCard: { borderRadius: 14, padding: '22px 24px', background: 'linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)', color: '#fff', marginBottom: 16, position: 'relative', overflow: 'hidden' },
  balanceLabel: { fontSize: 12, opacity: 0.75, marginBottom: 6 },
  balanceAmount: { fontSize: 32, fontWeight: 500, marginBottom: 18 },
  balanceRow: { display: 'flex', gap: 24 },
  balanceSub: { display: 'flex', flexDirection: 'column', gap: 2 },
  balanceSubLabel: { fontSize: 11, opacity: 0.7 },
  balanceSubVal: { fontSize: 15, fontWeight: 500 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 },
  statCard: { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '14px 16px' },
  statIcon: { width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statLabel: { fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4 },
  statVal: { fontSize: 19, fontWeight: 500, color: 'var(--color-text-primary)' },
  statChange: { fontSize: 11, marginTop: 4 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' },
  seeAll: { fontSize: 12, color: '#7F77DD', cursor: 'pointer' },
  txCard: { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12 },
  txRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)' },
  txIcon: { width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txInfo: { flex: 1, minWidth: 0 },
  txName: { fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' },
  txDate: { fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  txAmount: { fontSize: 14, fontWeight: 500, flexShrink: 0 },
  delBtn: { background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, display: 'flex', alignItems: 'center' },
  rightCol: { display: 'flex', flexDirection: 'column', gap: 14 },
  rightCard: { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: 16 },
  bars: { display: 'flex', alignItems: 'flex-end', gap: 6, height: 70, marginTop: 14 },
  barCol: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: '3px 3px 0 0', minHeight: 4, transition: 'height 0.3s' },
  barLabel: { fontSize: 10, color: 'var(--color-text-tertiary)' },
  aiCard: { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: 16 },
  aiBadge: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EEEDFE', color: '#534AB7', fontSize: 11, padding: '4px 10px', borderRadius: 20, marginBottom: 10 },
  aiText: { fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 12 },
  aiBtn: { fontSize: 12, color: '#7F77DD', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 },
  actionBtn: { background: '#EEEDFE', border: 'none', color: '#534AB7', cursor: 'pointer', padding: '5px 7px', borderRadius: 6, display: 'flex', alignItems: 'center' },
}