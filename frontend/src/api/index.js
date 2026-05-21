import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  withCredentials: true
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Якщо бекенд каже, що ми не авторизовані
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('user'); // Очищаємо мертвий токен з пам'яті
      
      const currentPath = window.location.pathname;
      
      // Робимо жорсткий редірект ТІЛЬКИ якщо ми не на сторінках авторизації
      if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
        window.location.href = '/login'; 
      }
    }
    return Promise.reject(error);
  }
);

export default api