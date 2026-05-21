import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  withCredentials: true
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname
      // Редіректимо ТІЛЬКИ якщо запит був до /auth/me
      // Інші 401 ігноруємо — це нормально для cross-domain staging
      if (error.config?.url?.includes('/auth/me') && 
          currentPath !== '/login' && 
          currentPath !== '/register') {
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api