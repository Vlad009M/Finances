import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import ReCAPTCHA from 'react-google-recaptcha'
import api from '../api/index.js'
import posthog from 'posthog-js'
import { useIsMobile } from '../hooks/useResponsive.js'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [captchaToken, setCaptchaToken] = useState(null)
  const isMobile = useIsMobile()
  const [showPassword, setShowPassword] = useState(false)

  const getPasswordStrength = (pwd) => {
  const checks = {
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
  }
  const passed = Object.values(checks).filter(Boolean).length
  return { checks, passed }
}

  const handleSubmit = async (e) => {
  e.preventDefault()
  if (!captchaToken) {
    setError('Будь ласка, підтвердіть, що ви не робот')
    return
  }
  const { passed } = getPasswordStrength(password)
  if (passed < 4) {
    setError('Пароль не відповідає вимогам безпеки')
    return
  }
  setLoading(true)  
  setError('')     
  try {
    const res = await api.post('/auth/register', { name, email, password, captchaToken })
    localStorage.setItem('user', JSON.stringify(res.data.user))
    posthog.identify(res.data.user.id, { email: res.data.user.email, name: res.data.user.name })
    posthog.capture('user_registered', { method: 'email' })
    window.location.href = '/dashboard'
  } catch (e) {
    setError(e.response?.data?.error || 'Помилка реєстрації')
  }
  setLoading(false)
}

const handleGoogleLogin = () => {
  posthog.capture('user_registered', { method: 'google' })
    // Відправляємо на наш бекенд, а він вже перенаправить на Google
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/google`
  }

  return (
    <div style={s.container}>
      <div style={{ ...s.left, display: isMobile ? 'none' : 'flex' }}>
        <div style={s.leftContent}>
          <div style={s.logoRow}>
            <img src="/Aperio.png" alt="Aperio" style={s.logoImg} />
            <span style={s.logoText}>Aperio</span>
          </div>
          <h2 style={s.leftTitle}>Почни контролювати свої фінанси вже сьогодні</h2>
          <p style={s.leftSub}>Приєднуйся до Aperio — розумного фінансового трекера з AI аналізом на базі Claude.</p>
          <div style={s.features}>
            {[
              { icon: 'ti-check', text: 'Безкоштовно для особистого використання' },
              { icon: 'ti-check', text: 'Дані зберігаються безпечно в хмарі' },
              { icon: 'ti-check', text: 'AI аналіз і поради щомісяця' },
              { icon: 'ti-check', text: 'Імпорт виписок з monobank' },
            ].map((f, i) => (
              <div key={i} style={s.featureRow}>
                <div style={s.featureIcon}><i className={`ti ${f.icon}`} style={{ fontSize: 16 }} /></div>
                <span style={s.featureText}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...s.right, ...(isMobile && { maxWidth: '100%', padding: '24px 16px', background: '#fff' }) }}>
        <div style={{ ...s.card, ...(isMobile && { padding: '28px 20px', maxWidth: '100%', boxShadow: 'none', border: 'none' }) }}>
            {isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <img src="/Aperio.png" alt="Aperio" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
                <span style={{ fontSize: 18, fontWeight: 500, color: '#1a1a2e' }}>Aperio</span>
              </div>
            )}
          <h1 style={s.title}>Створити акаунт</h1>
          <p style={s.subtitle}>Заповни форму щоб почати</p>

          {error && (
            <div style={s.errorBox}>
              <i className="ti ti-alert-circle" style={{ fontSize: 15 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Ім'я</label>
              <input style={s.input} type="text" placeholder="Name"
                value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Email</label>
              <input style={s.input} type="email" placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Пароль</label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...s.input, paddingRight: 40 }}
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Мінімум 8 символів"
                  value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 0 }}>
                  <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`} style={{ fontSize: 18 }} />
                </button>
              </div>
              {password.length > 0 && (() => {
                const { checks, passed } = getPasswordStrength(password)
                const colors = ['#993C1D', '#993C1D', '#BA7517', '#639922', '#0F6E56']
                const labels = ['', 'Слабкий', 'Слабкий', 'Середній', 'Сильний']
                return (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                      {[0,1,2,3].map(i => (
                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < passed ? colors[passed] : '#e0e0e0', transition: 'background 0.2s' }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: colors[passed], fontWeight: 500, marginBottom: 4 }}>
                      {labels[passed]}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {[
                        { key: 'length', label: 'Мінімум 8 символів' },
                        { key: 'upper', label: 'Велика літера (A-Z)' },
                        { key: 'number', label: 'Цифра (0-9)' },
                        { key: 'special', label: 'Спецсимвол (!@#$...)' },
                      ].map(({ key, label }) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: checks[key] ? '#639922' : '#888' }}>
                          <i className={`ti ${checks[key] ? 'ti-check' : 'ti-x'}`} style={{ fontSize: 11 }} />
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
              <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LfLV_AsAAAAAA3n3mEV7uXNYWm7krW3XCEkgI9m"}
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
              />
            </div>
            <button style={{ ...s.button, opacity: loading ? 0.75 : 1 }} type="submit" disabled={loading}>
              {loading ? 'Створення акаунту...' : 'Зареєструватись'}
            </button>
          </form>

            <div style={s.divider}>
            <div style={s.dividerLine} />
            <span style={s.dividerText}>або увійти через</span>
            <div style={s.dividerLine} />
          </div>

          <div style={s.socialRow}>
            <button style={s.socialBtn} type="button" onClick={handleGoogleLogin}>
              {/* Офіційна SVG-іконка Google */}
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Продовжити з Google
            </button>
          </div>

          <p style={s.link}>
            Вже є акаунт?{' '}
            <Link to="/login" style={s.linkA}>Увійти</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const s = {
  container: { minHeight: '100vh', display: 'flex' },
  left: { flex: 1, background: 'linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)', padding: '48px 56px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  leftContent: { maxWidth: 420 },
  logoRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 },
  logoImg: { width: 42, height: 42, borderRadius: 10, objectFit: 'cover' },
  logoText: { fontSize: 22, fontWeight: 500, color: '#fff' },
  leftTitle: { fontSize: 30, fontWeight: 500, color: '#fff', lineHeight: 1.3, marginBottom: 16 },
  leftSub: { fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 40 },
  features: { display: 'flex', flexDirection: 'column', gap: 14 },
  featureRow: { display: 'flex', alignItems: 'center', gap: 12 },
  featureIcon: { width: 28, height: 28, borderRadius: 50, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 },
  featureText: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  right: { flex: 1, maxWidth: 650, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 40px', background: '#f4f5f7' },
  card: { background: '#fff', borderRadius: 16, padding: '48px 40px', width: '100%', maxWidth: 480, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '0.5px solid #e8e8e8' },
  title: { fontSize: 22, fontWeight: 500, color: '#1a1a2e', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 28 },
  errorBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#FAECE7', color: '#993C1D', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 500, color: '#555' },
  input: { padding: '11px 14px', border: '0.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fafafa', color: '#1a1a2e' },
  button: { padding: '13px', background: 'linear-gradient(135deg, #7F77DD, #534AB7)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', fontWeight: 500, marginTop: 4 },
  link: { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#888' },
  linkA: { color: '#7F77DD', textDecoration: 'none', fontWeight: 500 },
  socialRow: { display: 'flex', width: '100%', marginBottom: 16 },
  socialBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px', background: '#fff', border: '1px solid #dcdfe6', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#333', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'background 0.2s' },
  divider: { display: 'flex', alignItems: 'center', margin: '24px 0', width: '100%' },
  dividerLine: { flex: 1, height: '1px', background: '#dcdfe6' },
  dividerText: { fontSize: 13, color: '#555', padding: '0 14px', fontWeight: 500 },
}