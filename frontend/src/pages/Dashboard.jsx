import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import api from '../api/index.js'

const COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#a18cd1', '#fda085']

const CATEGORIES = [
  { name: 'Їжа', icon: '🍕', color: '#667eea', type: 'expense' },
  { name: 'Транспорт', icon: '🚗', color: '#f093fb', type: 'expense' },
  { name: 'Розваги', icon: '🎮', color: '#4facfe', type: 'expense' },
  { name: 'Здоров\'я', icon: '💊', color: '#43e97b', type: 'expense' },
  { name: 'Одяг', icon: '👕', color: '#fa709a', type: 'expense' },
  { name: 'Комунальні', icon: '🏠', color: '#fee140', type: 'expense' },
  { name: 'Зарплата', icon: '💰', color: '#43e97b', type: 'income' },
  { name: 'Фріланс', icon: '💻', color: '#4facfe', type: 'income' },
  { name: 'Інше', icon: '📦', color: '#a18cd1', type: 'expense' },
]

const MONTHS = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень']

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const navigate = useNavigate()
  const now = new Date()
  const [transactions, setTransactions] = useState([])
  const [allTransactions, setAllTransactions] = useState([])
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 })
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm] = useState(false)
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

  useEffect(() => {
    applyFilters()
  }, [allTransactions, search, filterMonth, filterYear])

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
      recalcStats(txRes.data, filterMonth, filterYear)
    } catch (e) {
      toast.error('Помилка завантаження даних')
    }
  }

  const applyFilters = () => {
    let filtered = allTransactions
    if (search) {
      filtered = filtered.filter(t =>
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.category?.name?.toLowerCase().includes(search.toLowerCase())
      )
    }
    filtered = filtered.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === filterMonth && d.getFullYear() === filterYear
    })
    setTransactions(filtered)
    recalcStats(filtered, filterMonth, filterYear)
  }

  const recalcStats = (txs, month, year) => {
    const filtered = txs.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === month && d.getFullYear() === year
    })
    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    setStats({ income, expense, balance: income - expense })
  }

  const addTransaction = async (e) => {
    e.preventDefault()
    if (!form.amount || !form.categoryId) {
      toast.error('Заповни всі обов\'язкові поля')
      return
    }
    setLoading(true)
    try {
      await api.post('/transactions', form)
      setForm({ amount: '', type: 'expense', description: '', categoryId: '', date: now.toISOString().split('T')[0] })
      setShowForm(false)
      toast.success('Транзакцію додано!')
      loadData()
    } catch {
      toast.error('Помилка при додаванні')
    }
    setLoading(false)
  }

  const deleteTransaction = async (id) => {
    try {
      await api.delete(`/transactions/${id}`)
      toast.success('Видалено')
      loadData()
    } catch {
      toast.error('Помилка видалення')
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const pieData = categories
    .filter(c => c.type === 'expense')
    .map(cat => ({
      name: cat.name,
      value: transactions.filter(t => t.categoryId === cat.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    }))
    .filter(d => d.value > 0)

  const barData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const month = d.toLocaleString('uk', { month: 'short' })
    const m = d.getMonth()
    const y = d.getFullYear()
    const income = allTransactions.filter(t => t.type === 'income' && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y).reduce((s, t) => s + t.amount, 0)
    const expense = allTransactions.filter(t => t.type === 'expense' && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y).reduce((s, t) => s + t.amount, 0)
    return { month, income, expense }
  })

  const filteredCategories = categories.filter(c => c.type === form.type)

  const MonthFilter = () => (
    <div style={s.monthFilter}>
      <button onClick={() => {
        const d = new Date(filterYear, filterMonth - 1)
        setFilterMonth(d.getMonth())
        setFilterYear(d.getFullYear())
      }} style={s.monthBtn}>‹</button>
      <span style={s.monthLabel}>{MONTHS[filterMonth]} {filterYear}</span>
      <button onClick={() => {
        const d = new Date(filterYear, filterMonth + 1)
        setFilterMonth(d.getMonth())
        setFilterYear(d.getFullYear())
      }} style={s.monthBtn}>›</button>
    </div>
  )

  return (
    <div style={s.app}>
      <div style={s.sidebar}>
        <div style={s.logo}>💰 Finances</div>
        <div style={s.userName}>{user.name}</div>
        {[
          { id: 'dashboard', label: '📊 Дашборд' },
          { id: 'transactions', label: '📋 Транзакції' },
          { id: 'charts', label: '📈 Графіки' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ ...s.navBtn, ...(activeTab === tab.id ? s.navBtnActive : {}) }}>
            {tab.label}
          </button>
        ))}
        <button onClick={logout} style={s.logoutBtn}>🚪 Вийти</button>
      </div>

      <div style={s.main}>
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={s.header}>
              <div>
                <h1 style={s.title}>Дашборд</h1>
                <MonthFilter />
              </div>
              <button onClick={() => setShowForm(!showForm)} style={s.addBtn}>
                {showForm ? '✕ Закрити' : '+ Додати'}
              </button>
            </div>

            <div style={s.statsRow}>
              <div style={{ ...s.statCard, borderTop: '4px solid #43e97b' }}>
                <div style={s.statLabel}>Доходи</div>
                <div style={{ ...s.statValue, color: '#43e97b' }}>₴{stats.income.toLocaleString()}</div>
              </div>
              <div style={{ ...s.statCard, borderTop: '4px solid #fa709a' }}>
                <div style={s.statLabel}>Витрати</div>
                <div style={{ ...s.statValue, color: '#fa709a' }}>₴{stats.expense.toLocaleString()}</div>
              </div>
              <div style={{ ...s.statCard, borderTop: '4px solid #667eea' }}>
                <div style={s.statLabel}>Баланс</div>
                <div style={{ ...s.statValue, color: stats.balance >= 0 ? '#43e97b' : '#fa709a' }}>
                  ₴{stats.balance.toLocaleString()}
                </div>
              </div>
            </div>

            {showForm && (
              <div style={s.formCard}>
                <h3 style={{ marginBottom: 16 }}>Нова транзакція</h3>
                <form onSubmit={addTransaction} style={s.form}>
                  <div style={s.formRow}>
                    <select style={s.input} value={form.type}
                      onChange={e => setForm({ ...form, type: e.target.value, categoryId: '' })}>
                      <option value="expense">💸 Витрата</option>
                      <option value="income">💵 Дохід</option>
                    </select>
                    <input style={s.input} type="number" placeholder="Сума ₴" min="0.01" step="0.01"
                      value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                    <input style={s.input} type="date" value={form.date}
                      onChange={e => setForm({ ...form, date: e.target.value })} required />
                  </div>
                  <div style={s.formRow}>
                    <select style={s.input} value={form.categoryId}
                      onChange={e => setForm({ ...form, categoryId: e.target.value })} required>
                      <option value="">Оберіть категорію</option>
                      {filteredCategories.map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </select>
                    <input style={{ ...s.input, flex: 2 }} type="text" placeholder="Опис (необов'язково)"
                      value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <button style={{ ...s.addBtn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
                    {loading ? 'Збереження...' : 'Зберегти транзакцію'}
                  </button>
                </form>
              </div>
            )}

            <div style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3>Транзакції за {MONTHS[filterMonth]}</h3>
                <span style={{ fontSize: 13, color: '#999' }}>{transactions.length} записів</span>
              </div>
              {transactions.slice(0, 8).map(t => (
                <div key={t.id} style={s.txRow}>
                  <span style={s.txIcon}>{t.category?.icon || '📦'}</span>
                  <div style={s.txInfo}>
                    <div style={s.txName}>{t.category?.name || 'Інше'}</div>
                    <div style={s.txDate}>{t.description || '—'} · {new Date(t.date).toLocaleDateString('uk')}</div>
                  </div>
                  <div style={{ ...s.txAmount, color: t.type === 'income' ? '#43e97b' : '#fa709a' }}>
                    {t.type === 'income' ? '+' : '-'}₴{t.amount.toLocaleString()}
                  </div>
                  <button onClick={() => deleteTransaction(t.id)} style={s.delBtn}>✕</button>
                </div>
              ))}
              {transactions.length === 0 && (
                <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>
                  Немає транзакцій за {MONTHS[filterMonth]}. Додай першу!
                </p>
              )}
            </div>
          </div>
        )}

        {/* TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <div>
            <div style={s.header}>
              <div>
                <h1 style={s.title}>Всі транзакції</h1>
                <MonthFilter />
              </div>
              <button onClick={() => { setActiveTab('dashboard'); setShowForm(true) }} style={s.addBtn}>
                + Додати
              </button>
            </div>

            <div style={s.card}>
              <input style={{ ...s.input, marginBottom: 16, width: '100%' }}
                type="text" placeholder="🔍 Пошук по опису або категорії..."
                value={search} onChange={e => setSearch(e.target.value)} />

              {transactions.map(t => (
                <div key={t.id} style={s.txRow}>
                  <span style={s.txIcon}>{t.category?.icon || '📦'}</span>
                  <div style={s.txInfo}>
                    <div style={s.txName}>{t.category?.name || 'Інше'}</div>
                    <div style={s.txDate}>{t.description || '—'} · {new Date(t.date).toLocaleDateString('uk')}</div>
                  </div>
                  <div style={{ ...s.txAmount, color: t.type === 'income' ? '#43e97b' : '#fa709a' }}>
                    {t.type === 'income' ? '+' : '-'}₴{t.amount.toLocaleString()}
                  </div>
                  <button onClick={() => deleteTransaction(t.id)} style={s.delBtn}>✕</button>
                </div>
              ))}
              {transactions.length === 0 && (
                <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>Немає транзакцій за цей період</p>
              )}
            </div>
          </div>
        )}

        {/* CHARTS */}
        {activeTab === 'charts' && (
          <div>
            <h1 style={s.title}>Графіки</h1>
            <div style={s.chartsRow}>
              <div style={s.card}>
                <h3 style={{ marginBottom: 16 }}>Витрати по категоріях</h3>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `₴${v.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>Додай витрати щоб побачити графік</p>
                )}
              </div>
              <div style={s.card}>
                <h3 style={{ marginBottom: 16 }}>Доходи vs Витрати (6 місяців)</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(v) => `₴${v.toLocaleString()}`} />
                    <Bar dataKey="income" fill="#43e97b" name="Доходи" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="#fa709a" name="Витрати" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  app: { display: 'flex', minHeight: '100vh', background: '#f0f2f5' },
  sidebar: { width: 220, background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 8, position: 'sticky', top: 0, height: '100vh' },
  logo: { fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 },
  userName: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.2)' },
  navBtn: { padding: '10px 14px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.8)', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 14, transition: 'all 0.2s' },
  navBtnActive: { background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600 },
  logoutBtn: { marginTop: 'auto', padding: '10px 14px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 14 },
  main: { flex: 1, padding: 32, overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 },
  monthFilter: { display: 'flex', alignItems: 'center', gap: 12 },
  monthBtn: { width: 28, height: 28, borderRadius: '50%', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 14, fontWeight: 500, color: '#555', minWidth: 130, textAlign: 'center' },
  addBtn: { padding: '10px 20px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
  statCard: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  statLabel: { fontSize: 13, color: '#999', marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: 700 },
  card: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 24 },
  formCard: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 24, border: '2px solid #667eea' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  formRow: { display: 'flex', gap: 12 },
  input: { flex: 1, padding: '10px 14px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fafafa' },
  txRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f5f5f5' },
  txIcon: { fontSize: 24, width: 36, textAlign: 'center' },
  txInfo: { flex: 1 },
  txName: { fontSize: 14, fontWeight: 500, color: '#1a1a2e' },
  txDate: { fontSize: 12, color: '#999', marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: 600 },
  delBtn: { background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 16, padding: '4px 8px', borderRadius: 4 },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
}