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
      // Тепер ловимо БУДЬ-ЯКИЙ 401 запит (через фічу tokenVersion)
      // і викидаємо на сторінку логіну
      if (currentPath !== '/login' && currentPath !== '/register') {
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api