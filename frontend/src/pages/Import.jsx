import { useState, useRef, useCallback } from 'react'
import Papa from 'papaparse'
import toast from 'react-hot-toast'
import api from '../api/index.js'

const MONOBANK_COLUMNS = {
  date: ['Дата i час операції', 'Дата і час операції', 'Дата i час', 'Date'],
  description: ['Деталі операції', 'Description', 'Опис'],
  amount: ['Сума в валюті картки (UAH)', 'Сума в гривнях', 'Сума', 'Amount'],
}

const findColumn = (headers, variants) => {
  return variants.find(v => headers.includes(v)) || null
}

export default function Import({ categories, onSuccess }) {
  const [step, setStep] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [parsed, setParsed] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef()

  const processFile = (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      toast.error('Потрібен CSV файл')
      return
    }
    setFileName(file.name)

    Papa.parse(file, {
      header: true,
      encoding: 'UTF-8',
      skipEmptyLines: true,
      complete: async (results) => {
        const headers = results.meta.fields || []

        const dateCol = findColumn(headers, MONOBANK_COLUMNS.date)
        const descCol = findColumn(headers, MONOBANK_COLUMNS.description)
        const amountCol = findColumn(headers, MONOBANK_COLUMNS.amount)

        if (!dateCol || !descCol || !amountCol) {
          toast.error('Файл не схожий на виписку monobank. Перевір формат.')
          return
        }

        const transactions = results.data
          .filter(row => row[amountCol] && row[dateCol])
          .map(row => {
            const rawAmount = parseFloat(String(row[amountCol]).replace(/\s/g, '').replace(',', '.'))
            const amount = Math.abs(rawAmount)
            const type = rawAmount < 0 ? 'expense' : 'income'
            const dateStr = row[dateCol]
            const date = new Date(dateStr.replace(' ', 'T'))

            return {
              date: date.toISOString(),
              description: row[descCol] || '',
              amount,
              type,
            }
          })
          .filter(t => !isNaN(t.amount) && t.amount > 0)

        if (transactions.length === 0) {
          toast.error('Не знайдено транзакцій у файлі')
          return
        }

        setLoading(true)
        try {
          const res = await api.post('/import/preview', { transactions })
          setParsed(res.data.transactions)
          setStats({
            total: res.data.transactions.length,
            auto: res.data.transactions.filter(t => t.autoDetected && !t.isDuplicate).length,
            manual: res.data.transactions.filter(t => !t.autoDetected && !t.isDuplicate).length,
            duplicates: res.data.transactions.filter(t => t.isDuplicate).length,
          })
          setStep(2)
        } catch {
          toast.error('Помилка обробки файлу')
        }
        setLoading(false)
      },
      error: () => toast.error('Помилка читання файлу')
    })
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    processFile(file)
  }, [])

  const handleFileChange = (e) => {
    processFile(e.target.files[0])
  }

  const updateCategory = (index, categoryId, categoryName, categoryIcon) => {
    setParsed(prev => prev.map((t, i) =>
      i === index ? { ...t, categoryId, categoryName, categoryIcon, autoDetected: false } : t
    ))
  }

  const toggleRow = (index) => {
    setParsed(prev => prev.map((t, i) =>
      i === index ? { ...t, skip: !t.skip } : t
    ))
  }

  const handleImport = async () => {
    const toImport = parsed.filter(t => !t.isDuplicate && !t.skip && t.categoryId)

    if (toImport.length === 0) {
      toast.error('Немає транзакцій для імпорту')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/import', { transactions: toImport })
      toast.success(`Імпортовано ${res.data.imported} транзакцій! Пропущено ${res.data.duplicates} дублікатів.`)
      setStep(3)
      onSuccess()
    } catch {
      toast.error('Помилка імпорту')
    }
    setLoading(false)
  }

  const reset = () => {
    setStep(1)
    setParsed([])
    setStats(null)
    setFileName('')
  }

  const toImportCount = parsed.filter(t => !t.isDuplicate && !t.skip).length
  const needsCategoryCount = parsed.filter(t => !t.isDuplicate && !t.skip && !t.categoryId).length

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>📥 Імпорт з monobank</h1>
          <p style={s.subtitle}>Завантаж CSV виписку і ми автоматично розпізнаємо категорії</p>
        </div>
        {step === 2 && (
          <button onClick={reset} style={s.resetBtn}>
            <i className="ti ti-refresh" /> Новий файл
          </button>
        )}
      </div>

      {/* Прогрес */}
      <div style={s.progress}>
        {['Завантаження', 'Перегляд', 'Готово'].map((label, i) => (
          <div key={i} style={s.progressItem}>
            <div style={{ ...s.progressDot, background: step > i ? '#7F77DD' : step === i + 1 ? '#7F77DD' : 'var(--color-border-tertiary)' }}>
              {step > i + 1 ? <i className="ti ti-check" style={{ fontSize: 12, color: '#fff' }} /> : <span style={{ fontSize: 11, color: step === i + 1 ? '#fff' : 'var(--color-text-tertiary)' }}>{i + 1}</span>}
            </div>
            <span style={{ ...s.progressLabel, color: step === i + 1 ? '#7F77DD' : 'var(--color-text-tertiary)' }}>{label}</span>
            {i < 2 && <div style={{ ...s.progressLine, background: step > i + 1 ? '#7F77DD' : 'var(--color-border-tertiary)' }} />}
          </div>
        ))}
      </div>

      {/* КРОК 1 — Dropzone */}
      {step === 1 && (
        <div style={s.stepCard}>
          <div
            style={{ ...s.dropzone, ...(dragging ? s.dropzoneActive : {}) }}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />
            {loading ? (
              <div style={s.dropContent}>
                <div style={s.dropIcon}>⏳</div>
                <p style={s.dropText}>Обробляємо файл...</p>
              </div>
            ) : (
              <div style={s.dropContent}>
                <div style={s.dropIcon}>📂</div>
                <p style={s.dropText}>Перетягніть CSV файл сюди</p>
                <p style={s.dropSub}>або натисніть для вибору файлу</p>
                <div style={s.dropBadge}>CSV · monobank</div>
              </div>
            )}
          </div>

          {/* Інструкція */}
          <div style={s.instruction}>
            <div style={s.instructionTitle}>
              <i className="ti ti-info-circle" style={{ color: '#7F77DD' }} /> Як отримати файл виписки
            </div>
            <div style={s.instructionSteps}>
              {[
                'Відкрийте додаток monobank',
                'Виберіть потрібну картку',
                'Натисніть на іконку "Виписка" (аркуш з рядками)',
                'Виберіть потрібний період',
                'Натисніть "Поділитися" → виберіть формат CSV',
                'Надішліть файл собі в Telegram або Email'
              ].map((step, i) => (
                <div key={i} style={s.instructionStep}>
                  <span style={s.stepNum}>{i + 1}</span>
                  <span style={s.stepText}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* КРОК 2 — Preview таблиця */}
      {step === 2 && (
        <div>
          {/* Статистика */}
          <div style={s.statsRow}>
            <div style={s.statPill}>
              <i className="ti ti-file-text" style={{ color: '#534AB7' }} />
              <span>Всього: <b>{stats?.total}</b></span>
            </div>
            <div style={{ ...s.statPill, background: '#EAF3DE' }}>
              <i className="ti ti-robot" style={{ color: '#3B6D11' }} />
              <span>Авто: <b>{stats?.auto}</b></span>
            </div>
            <div style={{ ...s.statPill, background: '#FEF9F0' }}>
              <i className="ti ti-hand" style={{ color: '#985A00' }} />
              <span>Вручну: <b>{stats?.manual}</b></span>
            </div>
            <div style={{ ...s.statPill, background: '#FAECE7' }}>
              <i className="ti ti-copy" style={{ color: '#993C1D' }} />
              <span>Дублікати: <b>{stats?.duplicates}</b></span>
            </div>
            <div style={{ ...s.statPill, background: '#EEEDFE' }}>
              <i className="ti ti-download" style={{ color: '#534AB7' }} />
              <span>До імпорту: <b>{toImportCount}</b></span>
            </div>
          </div>

          {needsCategoryCount > 0 && (
            <div style={s.warningBanner}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 16 }} />
              {needsCategoryCount} транзакцій без категорії — вибери вручну перед імпортом
            </div>
          )}

          {/* Таблиця */}
          <div style={s.tableCard}>
            <div style={s.tableHeader}>
              <span style={{ width: 32 }}></span>
              <span style={{ flex: 1 }}>Дата</span>
              <span style={{ flex: 3 }}>Опис</span>
              <span style={{ flex: 2 }}>Категорія</span>
              <span style={{ flex: 1, textAlign: 'right' }}>Сума</span>
            </div>

            {parsed.map((tx, i) => (
              <div key={i} style={{
                ...s.tableRow,
                opacity: tx.isDuplicate || tx.skip ? 0.4 : 1,
                background: tx.isDuplicate ? 'var(--color-background-tertiary)' : 'transparent'
              }}>
                <div style={{ width: 32 }}>
                  {tx.isDuplicate ? (
                    <span title="Дублікат" style={s.dupIcon}><i className="ti ti-copy" style={{ fontSize: 14 }} /></span>
                  ) : (
                    <input type="checkbox" checked={!tx.skip} onChange={() => toggleRow(i)}
                      style={{ cursor: 'pointer', width: 16, height: 16 }} />
                  )}
                </div>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  {new Date(tx.date).toLocaleDateString('uk', { day: 'numeric', month: 'short' })}
                </span>
                <span style={{ flex: 3, fontSize: 13, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.description}
                </span>
                <span style={{ flex: 2 }}>
                  {tx.isDuplicate ? (
                    <span style={s.dupBadge}>Вже є в базі</span>
                  ) : (
                    <select
                      style={{ ...s.catSelect, borderColor: tx.categoryId ? 'var(--color-border-tertiary)' : '#993C1D' }}
                      value={tx.categoryId || ''}
                      onChange={e => {
                        const cat = categories.find(c => c.id === e.target.value)
                        updateCategory(i, cat?.id, cat?.name, cat?.icon)
                      }}
                      disabled={tx.skip}
                    >
                      <option value="">Оберіть категорію</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </select>
                  )}
                </span>
                <span style={{ flex: 1, textAlign: 'right', fontWeight: 500, fontSize: 14, color: tx.type === 'income' ? '#3B6D11' : '#993C1D' }}>
                  {tx.type === 'income' ? '+' : '-'}₴{tx.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div style={s.importFooter}>
            <button onClick={reset} style={s.cancelBtn}>Скасувати</button>
            <button
              onClick={handleImport}
              style={{ ...s.importBtn, opacity: loading || needsCategoryCount > 0 ? 0.6 : 1 }}
              disabled={loading || needsCategoryCount > 0}
            >
              <i className="ti ti-download" />
              {loading ? 'Імпортуємо...' : `Імпортувати ${toImportCount} транзакцій`}
            </button>
          </div>
        </div>
      )}

      {/* КРОК 3 — Успіх */}
      {step === 3 && (
        <div style={s.successCard}>
          <div style={s.successIcon}>✅</div>
          <h2 style={s.successTitle}>Імпорт завершено!</h2>
          <p style={s.successText}>Транзакції додано до твого дашборду. Графіки вже оновились.</p>
          <button onClick={reset} style={s.importBtn}>
            <i className="ti ti-plus" /> Імпортувати ще
          </button>
        </div>
      )}
    </div>
  )
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'var(--color-text-tertiary)' },
  resetBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)' },
  progress: { display: 'flex', alignItems: 'center', marginBottom: 28 },
  progressItem: { display: 'flex', alignItems: 'center', gap: 8 },
  progressDot: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  progressLabel: { fontSize: 13, fontWeight: 500 },
  progressLine: { width: 48, height: 1, margin: '0 8px' },
  stepCard: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  dropzone: { background: 'var(--color-background-primary)', border: '2px dashed var(--color-border-tertiary)', borderRadius: 16, padding: 48, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dropzoneActive: { borderColor: '#7F77DD', background: '#F5F4FE' },
  dropContent: { textAlign: 'center' },
  dropIcon: { fontSize: 48, marginBottom: 16 },
  dropText: { fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 8 },
  dropSub: { fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 16 },
  dropBadge: { display: 'inline-block', background: '#EEEDFE', color: '#534AB7', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500 },
  instruction: { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 16, padding: 24 },
  instructionTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 16 },
  instructionSteps: { display: 'flex', flexDirection: 'column', gap: 10 },
  instructionStep: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  stepNum: { width: 22, height: 22, borderRadius: '50%', background: '#EEEDFE', color: '#534AB7', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepText: { fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 },
  statsRow: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  statPill: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#EEEDFE', borderRadius: 20, fontSize: 13, color: 'var(--color-text-secondary)' },
  warningBanner: { display: 'flex', alignItems: 'center', gap: 10, background: '#FEF9F0', border: '0.5px solid #F5CBA7', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#985A00', marginBottom: 16 },
  tableCard: { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  tableHeader: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'var(--color-background-secondary)', fontSize: 11, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '0.5px solid var(--color-border-tertiary)' },
  tableRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)', transition: 'opacity 0.2s' },
  dupIcon: { color: 'var(--color-text-tertiary)' },
  dupBadge: { fontSize: 11, background: 'var(--color-background-tertiary)', color: 'var(--color-text-tertiary)', padding: '3px 10px', borderRadius: 20 },
  catSelect: { width: '100%', padding: '6px 10px', border: '0.5px solid', borderRadius: 7, fontSize: 12, outline: 'none', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', cursor: 'pointer' },
  importFooter: { display: 'flex', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { padding: '10px 20px', background: 'none', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)' },
  importBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: '#7F77DD', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  successCard: { background: 'var(--color-background-primary)', borderRadius: 16, padding: 48, textAlign: 'center', border: '0.5px solid var(--color-border-tertiary)' },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 8 },
  successText: { fontSize: 14, color: 'var(--color-text-tertiary)', marginBottom: 24 },
}