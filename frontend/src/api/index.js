import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  withCredentials: true
})

// Отримуємо CSRF токен при старті
let csrfToken = null
const fetchCsrfToken = async () => {
  const res = await axios.get('http://localhost:3001/api/csrf-token', { withCredentials: true })
  csrfToken = res.data.csrfToken
}
fetchCsrfToken()

api.interceptors.request.use(config => {
  if (csrfToken && ['post', 'put', 'delete', 'patch'].includes(config.method)) {
    config.headers['x-csrf-token'] = csrfToken
  }
  return config
})

api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 403 && error.response?.data?.code === 'INVALID_CSRF_TOKEN') {
      await fetchCsrfToken()
      return api.request(error.config)
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api