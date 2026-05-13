import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
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

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 })
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ amount: '', type: 'expense', description: '', categoryId: '', date: new Date().toISOString().split('T')[0] })
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      let cats = await api.get('/categories')
      if (cats.data.length === 0) {
        for (const cat of CATEGORIES) {
          await api.post('/categories', cat)
        }
        cats = await api.get('/categories')
      }
      setCategories(cats.data)
      const txRes = await api.get('/transactions')
      setTransactions(txRes.data)
      const statsRes = await api.get('/transactions/stats')
      setStats(statsRes.data)
    } catch (e) {
      console.error(e)
    }
  }

  const addTransaction = async (e) => {
    e.preventDefault()
    try {
      await api.post('/transactions', form)
      setForm({ amount: '', type: 'expense', description: '', categoryId: '', date: new Date().toISOString().split('T')[0] })
      setShowForm(false)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const deleteTransaction = async (id) => {
    await api.delete(`/transactions/${id}`)
    loadData()
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  // Дані для pie chart
  const pieData = categories
    .filter(c => c.type === 'expense')
    .map(cat => ({
      name: cat.name,
      value: transactions.filter(t => t.categoryId === cat.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    }))
    .filter(d => d.value > 0)

  // Дані для bar chart (останні 6 місяців)
  const barData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const month = d.toLocaleString('uk', { month: 'short' })
    const m = d.getMonth()
    const y = d.getFullYear()
    const income = transactions.filter(t => t.type === 'income' && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y).reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter(t => t.type === 'expense' && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y).reduce((s, t) => s + t.amount, 0)
    return { month, income, expense }
  })

  const filteredCategories = categories.filter(c => c.type === form.type)

  return (
    <div style={s.app}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={s.logo}>💰 Finances</div>
        <div style={s.userName}>{user.name}</div>
        {['dashboard', 'transactions', 'charts'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ ...s.navBtn, ...(activeTab === tab ? s.navBtnActive : {}) }}>
            {tab === 'dashboard' ? '📊 Дашборд' : tab === 'transactions' ? '📋 Транзакції' : '📈 Графіки'}
          </button>
        ))}
        <button onClick={logout} style={s.logoutBtn}>🚪 Вийти</button>
      </div>

      {/* Main */}
      <div style={s.main}>
        {/* Dashboard tab */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={s.header}>
              <h1 style={s.title}>Дашборд</h1>
              <button onClick={() => setShowForm(!showForm)} style={s.addBtn}>+ Додати</button>
            </div>

            {/* Stats */}
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
                <div style={{ ...s.statValue, color: stats.balance >= 0 ? '#43e97b' : '#fa709a' }}>₴{stats.balance.toLocaleString()}</div>
              </div>
            </div>

            {/* Form */}
            {showForm && (
              <div style={s.formCard}>
                <h3 style={{ marginBottom: 16 }}>Нова транзакція</h3>
                <form onSubmit={addTransaction} style={s.form}>
                  <div style={s.formRow}>
                    <select style={s.input} value={form.type} onChange={e => setForm({ ...form, type: e.target.value, categoryId: '' })}>
                      <option value="expense">Витрата</option>
                      <option value="income">Дохід</option>
                    </select>
                    <input style={s.input} type="number" placeholder="Сума ₴" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                    <input style={s.input} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                  </div>
                  <div style={s.formRow}>
                    <select style={s.input} value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} required>
                      <option value="">Категорія</option>
                      {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                    <input style={{ ...s.input, flex: 2 }} type="text" placeholder="Опис (необов'язково)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <button style={s.addBtn} type="submit">Зберегти</button>
                </form>
              </div>
            )}

            {/* Recent transactions */}
            <div style={s.card}>
              <h3 style={{ marginBottom: 16 }}>Останні транзакції</h3>
              {transactions.slice(0, 8).map(t => (
                <div key={t.id} style={s.txRow}>
                  <span style={s.txIcon}>{t.category?.icon || '📦'}</span>
                  <div style={s.txInfo}>
                    <div style={s.txName}>{t.category?.name || 'Інше'}</div>
                    <div style={s.txDate}>{t.description} · {new Date(t.date).toLocaleDateString('uk')}</div>
                  </div>
                  <div style={{ ...s.txAmount, color: t.type === 'income' ? '#43e97b' : '#fa709a' }}>
                    {t.type === 'income' ? '+' : '-'}₴{t.amount.toLocaleString()}
                  </div>
                  <button onClick={() => deleteTransaction(t.id)} style={s.delBtn}>✕</button>
                </div>
              ))}
              {transactions.length === 0 && <p style={{ color: '#999', textAlign: 'center' }}>Ще немає транзакцій. Додай першу!</p>}
            </div>
          </div>
        )}

        {/* Transactions tab */}
        {activeTab === 'transactions' && (
          <div>
            <div style={s.header}>
              <h1 style={s.title}>Всі транзакції</h1>
              <button onClick={() => { setActiveTab('dashboard'); setShowForm(true) }} style={s.addBtn}>+ Додати</button>
            </div>
            <div style={s.card}>
              {transactions.map(t => (
                <div key={t.id} style={s.txRow}>
                  <span style={s.txIcon}>{t.category?.icon || '📦'}</span>
                  <div style={s.txInfo}>
                    <div style={s.txName}>{t.category?.name || 'Інше'}</div>
                    <div style={s.txDate}>{t.description} · {new Date(t.date).toLocaleDateString('uk')}</div>
                  </div>
                  <div style={{ ...s.txAmount, color: t.type === 'income' ? '#43e97b' : '#fa709a' }}>
                    {t.type === 'income' ? '+' : '-'}₴{t.amount.toLocaleString()}
                  </div>
                  <button onClick={() => deleteTransaction(t.id)} style={s.delBtn}>✕</button>
                </div>
              ))}
              {transactions.length === 0 && <p style={{ color: '#999', textAlign: 'center' }}>Ще немає транзакцій</p>}
            </div>
          </div>
        )}

        {/* Charts tab */}
        {activeTab === 'charts' && (
          <div>
            <h1 style={s.title}>Графіки</h1>
            <div style={s.chartsRow}>
              <div style={s.card}>
                <h3 style={{ marginBottom: 16 }}>Витрати по категоріях</h3>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => `₴${v.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </>
                ) : <p style={{ color: '#999', textAlign: 'center' }}>Додай витрати щоб побачити графік</p>}
              </div>
              <div style={s.card}>
                <h3 style={{ marginBottom: 16 }}>Доходи vs Витрати</h3>
                <ResponsiveContainer width="100%" height={250}>
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
  sidebar: { width: 220, background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 8 },
  logo: { fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 },
  userName: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.2)' },
  navBtn: { padding: '10px 14px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.8)', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 14 },
  navBtnActive: { background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600 },
  logoutBtn: { marginTop: 'auto', padding: '10px 14px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 14 },
  main: { flex: 1, padding: 32, overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 700, color: '#1a1a2e' },
  addBtn: { padding: '10px 20px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
  statCard: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  statLabel: { fontSize: 13, color: '#999', marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: 700 },
  card: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 24 },
  formCard: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  formRow: { display: 'flex', gap: 12 },
  input: { flex: 1, padding: '10px 14px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fafafa' },
  txRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f5f5f5' },
  txIcon: { fontSize: 24, width: 36, textAlign: 'center' },
  txInfo: { flex: 1 },
  txName: { fontSize: 14, fontWeight: 500, color: '#1a1a2e' },
  txDate: { fontSize: 12, color: '#999', marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: 600 },
  delBtn: { background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 16, padding: '4px 8px' },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
}