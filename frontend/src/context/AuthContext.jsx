import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/index.js';

const AuthContext = createContext();

// Безпечна функція для діставання юзера з кешу
const getStoredUser = () => {
  try {
    const item = localStorage.getItem('user');
    // Перевіряємо, щоб item не був порожнім і не дорівнював рядку "undefined"
    if (item && item !== "undefined") {
      return JSON.parse(item);
    }
    return null;
  } catch (error) {
    console.error("Помилка парсингу user з localStorage:", error);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Перевіряємо сесію при старті
    api.get('/auth/me')
      .then(res => {
        const userData = res.data.user;
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      })
      .catch(() => {
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Функція для оновлення профілю з будь-якого місця
  const updateUser = (updatedFields) => {
    const newUser = { ...user, ...updatedFields };
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, setUser: updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);