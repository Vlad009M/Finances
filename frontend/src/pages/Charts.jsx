import { useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'

const COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#a18cd1', '#fda085']
const MONTHS = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень']

export default function Charts({ transactions, categories }) {
  const [compareMonth1, setCompareMonth1] = useState(new Date().getMonth() - 1)
  const [compareMonth2, setCompareMonth2] = useState(new Date().getMonth())
  const year = new Date().getFullYear()

  // Pie chart — витрати по категоріях (поточний місяць)
  const currentMonth = new Date().getMonth()
  const pieData = categories
    .filter(c => c.type === 'expense')
    .map(cat => ({
      name: cat.name,
      value: transactions
        .filter(t => t.categoryId === cat.id && t.type === 'expense' && new Date(t.date).getMonth() === currentMonth)
        .reduce((s, t) => s + t.amount, 0)
    }))
    .filter(d => d.value > 0)

  // Bar chart — 6 місяців
  const barData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const m = d.getMonth()
    const y = d.getFullYear()
    const income = transactions.filter(t => t.type === 'income' && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y).reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter(t => t.type === 'expense' && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y).reduce((s, t) => s + t.amount, 0)
    return { month: d.toLocaleString('uk', { month: 'short' }), income, expense, balance: income - expense }
  })

  // Line chart — тренд балансу
  const lineData = Array.from({ length: 12 }, (_, i) => {
    const income = transactions.filter(t => t.type === 'income' && new Date(t.date).getMonth() === i && new Date(t.date).getFullYear() === year).reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter(t => t.type === 'expense' && new Date(t.date).getMonth() === i && new Date(t.date).getFullYear() === year).reduce((s, t) => s + t.amount, 0)
    return { month: MONTHS[i].slice(0, 3), balance: income - expense, income, expense }
  })

  // Порівняння двох місяців
  const getMonthData = (month) => {
    const cats = categories.filter(c => c.type === 'expense').map(cat => ({
      name: cat.name,
      icon: cat.icon,
      value: transactions.filter(t => t.categoryId === cat.id && t.type === 'expense' && new Date(t.date).getMonth() === month && new Date(t.date).getFullYear() === year).reduce((s, t) => s + t.amount, 0)
    })).filter(d => d.value > 0)
    const total = cats.reduce((s, c) => s + c.value, 0)
    return { cats, total }
  }

  const m1 = getMonthData(compareMonth1 < 0 ? 11 : compareMonth1)
  const m2 = getMonthData(compareMonth2)

  // Експорт CSV
  const exportCSV = () => {
    const headers = ['Дата', 'Тип', 'Категорія', 'Опис', 'Сума']
    const rows = transactions.map(t => [
      new Date(t.date).toLocaleDateString('uk'),
      t.type === 'income' ? 'Дохід' : 'Витрата',
      t.category?.name || '',
      t.description || '',
      t.amount
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finances_${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={s.title}>Графіки і статистика</h1>
        <button onClick={exportCSV} style={s.exportBtn}>⬇ Експорт CSV</button>
      </div>

      {/* Row 1: Pie + Bar */}
      <div style={s.row2}>
        <div style={s.card}>
          <h3 style={s.cardTitle}>Витрати по категоріях (цей місяць)</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `₴${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
              <div style={s.legend}>
                {pieData.map((d, i) => (
                  <div key={i} style={s.legendItem}>
                    <span style={{ ...s.legendDot, background: COLORS[i % COLORS.length] }} />
                    <span style={s.legendName}>{d.name}</span>
                    <span style={s.legendVal}>₴{d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p style={s.empty}>Додай витрати щоб побачити графік</p>}
        </div>

        <div style={s.card}>
          <h3 style={s.cardTitle}>Доходи vs Витрати (6 місяців)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `₴${v.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="income" fill="#43e97b" name="Доходи" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#fa709a" name="Витрати" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Line chart */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>Тренд балансу за {year} рік</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={lineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => `₴${v.toLocaleString()}`} />
            <Legend />
            <Line type="monotone" dataKey="income" stroke="#43e97b" strokeWidth={2} dot={{ r: 4 }} name="Доходи" />
            <Line type="monotone" dataKey="expense" stroke="#fa709a" strokeWidth={2} dot={{ r: 4 }} name="Витрати" />
            <Line type="monotone" dataKey="balance" stroke="#667eea" strokeWidth={3} dot={{ r: 5 }} name="Баланс" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Row 3: Порівняння місяців */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>Порівняння місяців</h3>
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <select style={s.select} value={compareMonth1} onChange={e => setCompareMonth1(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <span style={{ alignSelf: 'center', color: '#999' }}>vs</span>
          <select style={s.select} value={compareMonth2} onChange={e => setCompareMonth2(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div style={s.compareRow}>
          <div style={s.compareCol}>
            <div style={s.compareHeader}>{MONTHS[compareMonth1 < 0 ? 11 : compareMonth1]}</div>
            <div style={s.compareTotal}>₴{m1.total.toLocaleString()}</div>
            {m1.cats.map((c, i) => (
              <div key={i} style={s.compareItem}>
                <span>{c.icon} {c.name}</span>
                <span>₴{c.value.toLocaleString()}</span>
              </div>
            ))}
            {m1.cats.length === 0 && <p style={s.empty}>Немає даних</p>}
          </div>
          <div style={{ width: 1, background: '#eee' }} />
          <div style={s.compareCol}>
            <div style={s.compareHeader}>{MONTHS[compareMonth2]}</div>
            <div style={s.compareTotal}>₴{m2.total.toLocaleString()}</div>
            {m2.cats.map((c, i) => (
              <div key={i} style={s.compareItem}>
                <span>{c.icon} {c.name}</span>
                <span>₴{c.value.toLocaleString()}</span>
              </div>
            ))}
            {m2.cats.length === 0 && <p style={s.empty}>Немає даних</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  title: { fontSize: 28, fontWeight: 700, color: '#1a1a2e' },
  exportBtn: { padding: '10px 20px', background: '#fff', border: '2px solid #667eea', color: '#667eea', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  card: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 24 },
  cardTitle: { fontSize: 16, fontWeight: 600, color: '#1a1a2e', marginBottom: 16 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 0 },
  legend: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  legendDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  legendName: { flex: 1, color: '#555' },
  legendVal: { fontWeight: 600, color: '#1a1a2e' },
  empty: { color: '#999', textAlign: 'center', padding: 40 },
  select: { flex: 1, padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none' },
  compareRow: { display: 'grid', gridTemplateColumns: '1fr 2px 1fr', gap: 20 },
  compareCol: { display: 'flex', flexDirection: 'column', gap: 8 },
  compareHeader: { fontSize: 16, fontWeight: 600, color: '#667eea' },
  compareTotal: { fontSize: 24, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 },
  compareItem: { display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0', borderBottom: '1px solid #f5f5f5' },
}