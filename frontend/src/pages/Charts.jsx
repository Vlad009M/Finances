import { useState, useRef, useEffect } from 'react'

const COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#a18cd1', '#fda085']
const MONTHS = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень']
const fmt = (v) => `₴${Number(v).toLocaleString('uk')}`

// ── Pie Chart ──────────────────────────────────────────────
function PieChartSVG({ data, size = 200 }) {
  const r = size / 2 - 20
  const cx = size / 2
  const cy = size / 2
  const total = data.reduce((s, d) => s + d.value, 0)
  const [hovered, setHovered] = useState(null)

  let angle = -Math.PI / 2
  const slices = data.map((d, i) => {
    const pct = d.value / total
    const a1 = angle
    const a2 = angle + pct * 2 * Math.PI
    angle = a2
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2)
    const large = pct > 0.5 ? 1 : 0
    const mid = (a1 + a2) / 2
    return { ...d, path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`, mid, pct, i }
  })

  return (
    <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
      {slices.map((sl, i) => (
        <path key={i} d={sl.path} fill={COLORS[i % COLORS.length]}
          stroke="#fff" strokeWidth={2}
          opacity={hovered === null || hovered === i ? 1 : 0.6}
          style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        >
          <title>{sl.name}: {fmt(sl.value)} ({(sl.pct * 100).toFixed(1)}%)</title>
        </path>
      ))}
      {/* Center label */}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={12} fill="#888">Всього</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={14} fontWeight="600" fill="#333">{fmt(total)}</text>
    </svg>
  )
}

// ── Bar Chart ──────────────────────────────────────────────
function BarChartSVG({ data, height = 200 }) {
  const ref = useRef(null)
  const [width, setWidth] = useState(400)
  useEffect(() => {
    if (!ref.current) return
    const ob = new ResizeObserver(e => setWidth(e[0].contentRect.width))
    ob.observe(ref.current)
    setWidth(ref.current.offsetWidth)
    return () => ob.disconnect()
  }, [])

  const padL = 50, padR = 16, padT = 16, padB = 32
  const W = width - padL - padR
  const H = height - padT - padB
  const keys = ['income', 'expense']
  const keyColors = { income: '#43e97b', expense: '#fa709a' }
  const keyNames = { income: 'Доходи', expense: 'Витрати' }
  const maxVal = Math.max(...data.flatMap(d => keys.map(k => d[k])), 1)
  const barW = (W / data.length) * 0.35
  const [tooltip, setTooltip] = useState(null)

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg width={width} height={height}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = padT + H * (1 - t)
          return <g key={i}>
            <line x1={padL} x2={padL + W} y1={y} y2={y} stroke="#f0f0f0" strokeWidth={1} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#aaa">
              {t === 0 ? '0' : `${Math.round(maxVal * t / 1000)}k`}
            </text>
          </g>
        })}
        {/* Bars */}
        {data.map((d, di) => {
          const groupW = W / data.length
          const gx = padL + di * groupW + groupW * 0.1
          return keys.map((k, ki) => {
            const bh = Math.max((d[k] / maxVal) * H, d[k] > 0 ? 2 : 0)
            const bx = gx + ki * (barW + 4)
            const by = padT + H - bh
            return (
              <rect key={k} x={bx} y={by} width={barW} height={bh}
                fill={keyColors[k]} rx={3}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setTooltip({ x: bx + barW / 2, y: by, label: `${d.month} ${keyNames[k]}: ${fmt(d[k])}` })}
                onMouseLeave={() => setTooltip(null)}
              />
            )
          })
        })}
        {/* X labels */}
        {data.map((d, di) => {
          const groupW = W / data.length
          const gx = padL + di * groupW + groupW / 2
          return <text key={di} x={gx} y={height - 8} textAnchor="middle" fontSize={11} fill="#888">{d.month}</text>
        })}
        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect x={tooltip.x - 60} y={tooltip.y - 28} width={120} height={22} rx={4} fill="rgba(0,0,0,0.75)" />
            <text x={tooltip.x} y={tooltip.y - 13} textAnchor="middle" fontSize={11} fill="#fff">{tooltip.label}</text>
          </g>
        )}
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4 }}>
        {keys.map(k => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#555' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: keyColors[k], display: 'inline-block' }} />
            {keyNames[k]}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Line Chart ─────────────────────────────────────────────
function LineChartSVG({ data, height = 200 }) {
  const ref = useRef(null)
  const [width, setWidth] = useState(400)
  useEffect(() => {
    if (!ref.current) return
    const ob = new ResizeObserver(e => setWidth(e[0].contentRect.width))
    ob.observe(ref.current)
    setWidth(ref.current.offsetWidth)
    return () => ob.disconnect()
  }, [])

  const padL = 50, padR = 16, padT = 16, padB = 32
  const W = width - padL - padR
  const H = height - padT - padB
  const keys = ['income', 'expense', 'balance']
  const keyColors = { income: '#43e97b', expense: '#fa709a', balance: '#667eea' }
  const keyNames = { income: 'Доходи', expense: 'Витрати', balance: 'Баланс' }
  const allVals = data.flatMap(d => keys.map(k => d[k]))
  const maxVal = Math.max(...allVals, 1)
  const minVal = Math.min(...allVals, 0)
  const range = maxVal - minVal || 1
  const [tooltip, setTooltip] = useState(null)

  const px = (i) => padL + (i / (data.length - 1)) * W
  const py = (v) => padT + H - ((v - minVal) / range) * H

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg width={width} height={height}>
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const v = minVal + range * t
          const y = py(v)
          return <g key={i}>
            <line x1={padL} x2={padL + W} y1={y} y2={y} stroke="#f0f0f0" strokeWidth={1} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#aaa">
              {Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : Math.round(v)}
            </text>
          </g>
        })}
        {/* Zero line */}
        {minVal < 0 && <line x1={padL} x2={padL + W} y1={py(0)} y2={py(0)} stroke="#ddd" strokeWidth={1} strokeDasharray="4 2" />}
        {/* Lines */}
        {keys.map(k => {
          const pts = data.map((d, i) => `${px(i)},${py(d[k])}`).join(' ')
          return <polyline key={k} points={pts} fill="none" stroke={keyColors[k]} strokeWidth={k === 'balance' ? 2.5 : 1.5} strokeLinejoin="round" />
        })}
        {/* Dots + tooltip triggers */}
        {data.map((d, i) => (
          <g key={i}>
            {keys.map(k => (
              <circle key={k} cx={px(i)} cy={py(d[k])} r={3.5} fill={keyColors[k]} stroke="#fff" strokeWidth={1.5}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setTooltip({ x: px(i), y: Math.min(...keys.map(k2 => py(d[k2]))) - 10, d, i })}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </g>
        ))}
        {/* X labels */}
        {data.map((d, i) => (
          <text key={i} x={px(i)} y={height - 8} textAnchor="middle" fontSize={10} fill="#aaa">{d.month}</text>
        ))}
        {/* Tooltip */}
        {tooltip && (() => {
          const tx = Math.min(tooltip.x, width - 100)
          return (
            <g>
              <rect x={tx - 10} y={tooltip.y - 60} width={120} height={68} rx={5} fill="rgba(0,0,0,0.8)" />
              <text x={tx + 50} y={tooltip.y - 46} textAnchor="middle" fontSize={11} fontWeight="600" fill="#fff">{data[tooltip.i].month}</text>
              {keys.map((k, ki) => (
                <text key={k} x={tx + 50} y={tooltip.y - 32 + ki * 14} textAnchor="middle" fontSize={10} fill={keyColors[k]}>
                  {keyNames[k]}: {fmt(tooltip.d[k])}
                </text>
              ))}
            </g>
          )
        })()}
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4 }}>
        {keys.map(k => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#555' }}>
            <span style={{ width: 24, height: 3, background: keyColors[k], display: 'inline-block', borderRadius: 2 }} />
            {keyNames[k]}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────
export default function Charts({ transactions, categories }) {
  const [compareMonth1, setCompareMonth1] = useState(new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1)
  const [compareMonth2, setCompareMonth2] = useState(new Date().getMonth())
  const year = new Date().getFullYear()
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

  const barData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
    const m = d.getMonth(), y = d.getFullYear()
    const income = transactions.filter(t => t.type === 'income' && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y).reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter(t => t.type === 'expense' && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y).reduce((s, t) => s + t.amount, 0)
    return { month: d.toLocaleString('uk', { month: 'short' }), income, expense }
  })

  const lineData = Array.from({ length: 12 }, (_, i) => {
    const income = transactions.filter(t => t.type === 'income' && new Date(t.date).getMonth() === i && new Date(t.date).getFullYear() === year).reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter(t => t.type === 'expense' && new Date(t.date).getMonth() === i && new Date(t.date).getFullYear() === year).reduce((s, t) => s + t.amount, 0)
    return { month: MONTHS[i].slice(0, 3), balance: income - expense, income, expense }
  })

  const getMonthData = (month) => {
    const m = month < 0 ? 11 : month
    const cats = categories.filter(c => c.type === 'expense').map(cat => ({
      name: cat.name, icon: cat.icon,
      value: transactions.filter(t => t.categoryId === cat.id && t.type === 'expense' && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === year).reduce((s, t) => s + t.amount, 0)
    })).filter(d => d.value > 0)
    return { cats, total: cats.reduce((s, c) => s + c.value, 0) }
  }

  const m1 = getMonthData(compareMonth1)
  const m2 = getMonthData(compareMonth2)

  const exportCSV = () => {
    const headers = ['Дата', 'Тип', 'Категорія', 'Опис', 'Сума']
    const rows = transactions.map(t => [new Date(t.date).toLocaleDateString('uk'), t.type === 'income' ? 'Дохід' : 'Витрата', t.category?.name || '', t.description || '', t.amount])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `aperio_${year}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={s.pageTitle}>Графіки і статистика</div>
        <button onClick={exportCSV} style={s.exportBtn}>
          <i className="ti ti-download" style={{ fontSize: 14 }} /> Експорт CSV
        </button>
      </div>

      <div style={s.row2}>
        {/* Pie */}
        <div style={s.card}>
          <div style={s.cardTitle}>Витрати по категоріях (цей місяць)</div>
          {pieData.length > 0 ? (
            <>
              <PieChartSVG data={pieData} size={220} />
              <div style={s.legend}>
                {pieData.map((d, i) => (
                  <div key={i} style={s.legendItem}>
                    <span style={{ ...s.legendDot, background: COLORS[i % COLORS.length] }} />
                    <span style={s.legendName}>{d.name}</span>
                    <span style={s.legendVal}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={s.empty}>Додай витрати щоб побачити графік</div>}
        </div>

        {/* Bar */}
        <div style={s.card}>
          <div style={s.cardTitle}>Доходи vs Витрати (6 місяців)</div>
          <BarChartSVG data={barData} height={220} />
        </div>
      </div>

      {/* Line */}
      <div style={s.card}>
        <div style={s.cardTitle}>Тренд балансу за {year} рік</div>
        <LineChartSVG data={lineData} height={220} />
      </div>

      {/* Compare */}
      <div style={s.card}>
        <div style={s.cardTitle}>Порівняння місяців</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <select style={s.select} value={compareMonth1} onChange={e => setCompareMonth1(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <span style={{ alignSelf: 'center', color: '#999', fontWeight: 500 }}>vs</span>
          <select style={s.select} value={compareMonth2} onChange={e => setCompareMonth2(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div style={s.compareRow}>
          <div style={s.compareCol}>
            <div style={s.compareHeader}>{MONTHS[compareMonth1 < 0 ? 11 : compareMonth1]}</div>
            <div style={s.compareTotal}>{fmt(m1.total)}</div>
            {m1.cats.map((c, i) => (
              <div key={i} style={s.compareItem}>
                <span>{c.icon} {c.name}</span>
                <span style={{ fontWeight: 500 }}>{fmt(c.value)}</span>
              </div>
            ))}
            {m1.cats.length === 0 && <div style={s.empty}>Немає даних</div>}
          </div>
          <div style={{ width: 1, background: '#eee' }} />
          <div style={s.compareCol}>
            <div style={{ ...s.compareHeader, color: '#534AB7' }}>{MONTHS[compareMonth2]}</div>
            <div style={s.compareTotal}>{fmt(m2.total)}</div>
            {m2.cats.map((c, i) => (
              <div key={i} style={s.compareItem}>
                <span>{c.icon} {c.name}</span>
                <span style={{ fontWeight: 500 }}>{fmt(c.value)}</span>
              </div>
            ))}
            {m2.cats.length === 0 && <div style={s.empty}>Немає даних</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  pageTitle: { fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary, #111)' },
  exportBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'var(--color-background-primary, #fff)', border: '0.5px solid #AFA9EC', color: '#534AB7', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  card: { background: 'var(--color-background-primary, #fff)', border: '0.5px solid var(--color-border-tertiary, #e0e0e0)', borderRadius: 12, padding: 20, marginBottom: 20 },
  cardTitle: { fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary, #111)', marginBottom: 16 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 },
  legend: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  legendDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  legendName: { flex: 1, color: 'var(--color-text-secondary, #555)' },
  legendVal: { fontWeight: 500, color: 'var(--color-text-primary, #111)' },
  empty: { color: 'var(--color-text-tertiary, #aaa)', textAlign: 'center', padding: '32px 0', fontSize: 13 },
  select: { flex: 1, padding: '8px 12px', border: '0.5px solid var(--color-border-tertiary, #e0e0e0)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--color-background-secondary, #fafafa)', color: 'var(--color-text-primary)' },
  compareRow: { display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 20 },
  compareCol: { display: 'flex', flexDirection: 'column', gap: 8 },
  compareHeader: { fontSize: 15, fontWeight: 500, color: '#667eea' },
  compareTotal: { fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary, #111)', marginBottom: 8 },
  compareItem: { display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '0.5px solid var(--color-border-tertiary, #f0f0f0)', color: 'var(--color-text-secondary)' },
}