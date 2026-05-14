import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/index.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      navigate('/dashboard')
    } catch {
      setError('Невірний email або пароль')
    }
    setLoading(false)
  }

  return (
    <div style={s.container}>
      <div style={s.left}>
        <div style={s.leftContent}>
          <div style={s.logoRow}>
            <img src="/Aperio.png" alt="Aperio" style={s.logoImg} />
            <span style={s.logoText}>Aperio</span>
          </div>
          <h2 style={s.leftTitle}>Контролюй свої фінанси разом з AI</h2>
          <p style={s.leftSub}>Відстежуй доходи та витрати, аналізуй графіки і отримуй персональні поради від Claude AI.</p>
          <div style={s.features}>
            {[
              { icon: 'ti-chart-bar', text: 'Графіки і статистика' },
              { icon: 'ti-robot', text: 'AI аналіз витрат' },
              { icon: 'ti-shield-lock', text: 'Безпечне зберігання' },
              { icon: 'ti-device-mobile', text: 'Доступно з будь-якого пристрою' },
            ].map((f, i) => (
              <div key={i} style={s.featureRow}>
                <div style={s.featureIcon}><i className={`ti ${f.icon}`} style={{ fontSize: 16 }} /></div>
                <span style={s.featureText}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={s.right}>
        <div style={s.card}>
          <div style={s.cardLogoRow}>
            <img src="/Aperio.png" alt="Aperio" style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover' }} />
            <span style={s.cardLogoText}>Aperio</span>
          </div>
          <h1 style={s.title}>Вхід в акаунт</h1>
          <p style={s.subtitle}>Раді бачити вас знову!</p>

          {error && (
            <div style={s.errorBox}>
              <i className="ti ti-alert-circle" style={{ fontSize: 15 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Email</label>
              <input style={s.input} type="email" placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Пароль</label>
              <input style={s.input} type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button style={{ ...s.button, opacity: loading ? 0.75 : 1 }} type="submit" disabled={loading}>
              {loading ? 'Вхід...' : 'Увійти'}
            </button>
          </form>

          <p style={s.link}>
            Немає акаунту?{' '}
            <Link to="/register" style={s.linkA}>Зареєструватись</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const s = {
  container: { minHeight: '100vh', display: 'flex' },
  left: { flex: 1, background: 'linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)', padding: '48px 56px', display: 'flex', alignItems: 'center', '@media (max-width: 768px)': { display: 'none' } },
  leftContent: { maxWidth: 420 },
  logoRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 },
  logoImg: { width: 42, height: 42, borderRadius: 10, objectFit: 'cover' },
  logoText: { fontSize: 22, fontWeight: 500, color: '#fff' },
  leftTitle: { fontSize: 32, fontWeight: 500, color: '#fff', lineHeight: 1.3, marginBottom: 16 },
  leftSub: { fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 40 },
  features: { display: 'flex', flexDirection: 'column', gap: 14 },
  featureRow: { display: 'flex', alignItems: 'center', gap: 12 },
  featureIcon: { width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 },
  featureText: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  right: { width: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 40px', background: '#f4f5f7' },
  card: { background: '#fff', borderRadius: 16, padding: '36px 32px', width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '0.5px solid #e8e8e8' },
  cardLogoRow: { display: 'none' },
  title: { fontSize: 22, fontWeight: 500, color: '#1a1a2e', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 28 },
  errorBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#FAECE7', color: '#993C1D', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 500, color: '#555' },
  input: { padding: '11px 14px', border: '0.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fafafa', color: '#1a1a2e', transition: 'border-color 0.2s' },
  button: { padding: '13px', background: 'linear-gradient(135deg, #7F77DD, #534AB7)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', fontWeight: 500, marginTop: 4 },
  link: { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#888' },
  linkA: { color: '#7F77DD', textDecoration: 'none', fontWeight: 500 },
}