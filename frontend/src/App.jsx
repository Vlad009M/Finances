import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DonateButton from './components/DonateButton.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import TermsOfService from './pages/TermsOfService.jsx'
import About from './pages/About.jsx'
import api from './api/index.js'

function App() {
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuth, setIsAuth] = useState(false)

  useEffect(() => {
  const user = localStorage.getItem('user')
  if (user) {
    // Є збережена сесія — довіряємо їй, не перевіряємо бекенд
    setIsAuth(true)
    setAuthChecked(true)
    return
  }
  // Немає сесії — перевіряємо бекенд (для cookie-based auth)
  api.get('/auth/me')
    .then(res => {
      localStorage.setItem('user', JSON.stringify(res.data.user))
      setIsAuth(true)
      setAuthChecked(true)
    })
    .catch(() => {
      localStorage.removeItem('user')
      setIsAuth(false)
      setAuthChecked(true)
    })
}, [])

  // Поки йде перевірка, нічого не рендеримо (можна замінити на спінер)
  if (!authChecked) return null 

  return (
    <>
      <Routes>
        {/* Чіткий роут для кореневого шляху */}
        <Route path="/" element={<Navigate to={isAuth ? "/dashboard" : "/login"} replace />} />
        
        {/* Якщо юзер ВЖЕ авторизований, не пускаємо його на сторінки входу */}
        <Route path="/login" element={!isAuth ? <Login /> : <Navigate to="/dashboard" replace />} />
        <Route path="/register" element={!isAuth ? <Register /> : <Navigate to="/dashboard" replace />} />
        
        {/* Захищений роут */}
        <Route path="/dashboard" element={isAuth ? <Dashboard /> : <Navigate to="/login" replace />} />
        
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/about" element={<About />} />
        
        {/* Ловилка всіх неіснуючих сторінок */}
        <Route path="*" element={<Navigate to={isAuth ? "/dashboard" : "/login"} replace />} />
      </Routes>
      <DonateButton />
    </>
  )
}

export default App