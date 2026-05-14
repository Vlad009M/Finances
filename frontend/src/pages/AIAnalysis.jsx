import { useState } from 'react'
import api from '../api/index.js'

export default function AIAnalysis() {
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const analyze = async () => {
    setLoading(true)
    setError('')
    setAnalysis('')
    try {
      const res = await api.post('/ai/analyze')
      setAnalysis(res.data.analysis)
    } catch (e) {
      setError('Помилка аналізу. Перевір що є транзакції за поточний місяць.')
    }
    setLoading(false)
  }

  const formatAnalysis = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('📊') || line.startsWith('⚠️') || line.startsWith('💡') || line.startsWith('🎯')) {
        return <div key={i} style={s.sectionTitle}>{line}</div>
      }
      if (line.trim() === '') return <div key={i} style={{ height: 8 }} />
      return <div key={i} style={s.line}>{line}</div>
    })
  }

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>🤖 AI Аналіз</h1>
          <p style={s.subtitle}>Claude аналізує твої витрати і дає персональні поради</p>
        </div>
        <button onClick={analyze} disabled={loading} style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}>
          {loading ? '⏳ Аналізую...' : '✨ Проаналізувати місяць'}
        </button>
      </div>

      {!analysis && !loading && !error && (
        <div style={s.emptyCard}>
          <div style={s.emptyIcon}>🤖</div>
          <h2 style={s.emptyTitle}>Готовий до аналізу!</h2>
          <p style={s.emptyText}>Натисни кнопку вище і Claude проаналізує твої витрати за поточний місяць, знайде де ти переплачуєш і запропонує бюджет на наступний місяць.</p>
          <div style={s.features}>
            {['📊 Загальний висновок про фінанси', '⚠️ Категорії з надмірними витратами', '💡 Конкретні поради з цифрами', '🎯 Рекомендований бюджет'].map((f, i) => (
              <div key={i} style={s.feature}>{f}</div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div style={s.loadingCard}>
          <div style={s.spinner}>⏳</div>
          <p style={s.loadingText}>Claude аналізує твої фінанси...</p>
          <p style={s.loadingSubtext}>Це займе кілька секунд</p>
        </div>
      )}

      {error && (
        <div style={s.errorCard}>
          <p>❌ {error}</p>
        </div>
      )}

      {analysis && (
        <div style={s.analysisCard}>
          <div style={s.analysisHeader}>
            <span style={s.analysisTag}>AI Аналіз</span>
            <span style={s.analysisDate}>{new Date().toLocaleDateString('uk', { month: 'long', year: 'numeric' })}</span>
          </div>
          <div style={s.analysisContent}>
            {formatAnalysis(analysis)}
          </div>
          <button onClick={analyze} style={s.refreshBtn}>🔄 Оновити аналіз</button>
        </div>
      )}
    </div>
  )
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#999' },
  btn: { padding: '12px 24px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' },
  emptyCard: { background: '#fff', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#666', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.6 },
  features: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 400, margin: '0 auto' },
  feature: { background: '#f8f9ff', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#555', textAlign: 'left' },
  loadingCard: { background: '#fff', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  spinner: { fontSize: 48, marginBottom: 16 },
  loadingText: { fontSize: 18, fontWeight: 600, color: '#1a1a2e', marginBottom: 8 },
  loadingSubtext: { fontSize: 14, color: '#999' },
  errorCard: { background: '#fff5f5', borderRadius: 12, padding: 20, color: '#e53e3e', border: '1px solid #fed7d7' },
  analysisCard: { background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  analysisHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' },
  analysisTag: { background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  analysisDate: { fontSize: 13, color: '#999' },
  analysisContent: { lineHeight: 1.8 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginTop: 20, marginBottom: 8 },
  line: { fontSize: 14, color: '#444', paddingLeft: 8 },
  refreshBtn: { marginTop: 24, padding: '10px 20px', background: '#f8f9ff', border: '1px solid #667eea', color: '#667eea', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 },
}