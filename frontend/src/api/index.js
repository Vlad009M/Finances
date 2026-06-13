import axios from 'axios'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const isNative = Capacitor.isNativePlatform()

// Адреса бекенду:
// - застосунок (Capacitor) → завжди прямий бойовий/staging API
// - веб → бере VITE_API_URL (як було), фолбек на localhost для локалки
const NATIVE_API_URL = 'https://aperio-staging.onrender.com/api'
const baseURL = isNative
  ? NATIVE_API_URL
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api')

const api = axios.create({
  baseURL,
  withCredentials: true,
})

// На КОЖЕН запит у застосунку додаємо Bearer-токен і позначку клієнта.
// На вебі цей блок не робить нічого (isNative === false).
api.interceptors.request.use(async (config) => {
  if (isNative) {
    config.headers['X-Client'] = 'capacitor'
    const { value } = await Preferences.get({ key: 'auth_token' })
    if (value) config.headers['Authorization'] = `Bearer ${value}`
  }
  return config
})

api.interceptors.response.use(
  async (response) => {
    // Застосунок: якщо бекенд повернув токен (логін/реєстрація) — зберігаємо його.
    if (isNative && response.data?.token) {
      await Preferences.set({ key: 'auth_token', value: response.data.token })
    }
    // Застосунок: на логауті — стираємо токен.
    if (isNative && response.config?.url?.includes('/auth/logout')) {
      await Preferences.remove({ key: 'auth_token' })
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname
      if (error.config?.url?.includes('/auth/me') &&
          currentPath !== '/login' &&
          currentPath !== '/register') {
        localStorage.removeItem('user')
        if (isNative) Preferences.remove({ key: 'auth_token' })
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api