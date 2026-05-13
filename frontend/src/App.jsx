import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'

const isAuth = () => !!localStorage.getItem('token')

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={isAuth() ? <Dashboard /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to={isAuth() ? "/dashboard" : "/login"} />} />
    </Routes>
  )
}

export default App