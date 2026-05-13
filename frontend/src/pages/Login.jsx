import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/index.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      navigate('/dashboard')
    } catch {
      setError('Невірний email або пароль')
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>💰 Finances</h1>
        <p style={styles.subtitle}>Увійдіть у свій акаунт</p>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <input style={styles.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={styles.input} type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required />
          <button style={styles.button} type="submit">Увійти</button>
        </form>
        <p style={styles.link}>Немає акаунту? <Link to="/register">Зареєструватись</Link></p>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  card: { background: '#fff', borderRadius: 16, padding: 40, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' },
  title: { fontSize: 32, textAlign: 'center', marginBottom: 8 },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { padding: '12px 16px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 15, outline: 'none' },
  button: { padding: '13px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', fontWeight: 600 },
  error: { color: '#e53e3e', textAlign: 'center', marginBottom: 12, fontSize: 14 },
  link: { textAlign: 'center', marginTop: 16, fontSize: 14, color: '#666' }
}