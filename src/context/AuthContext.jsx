// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { login, register, refresh, getMe, logout } from '../api/auth';
import { setAccessToken } from '../api/http';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const hasAT = !!localStorage.getItem('accessToken');
        if (!hasAT) {
          setUser(null);
          setReady(true);
          return;
        }
        const me = await getMe();
        setUser(me?.user ?? me ?? null);
      } catch {
        setUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Login normal: guarda accessToken y obtiene perfil
  const doLogin = async (email, password) => {
    const data = await login({ email, password });
    if (data?.accessToken) setAccessToken(data.accessToken);
    const me = await getMe();
    setUser(me?.user ?? me ?? null);
    return data;
  };

  /**
   * Registro:
   * - Por defecto NO inicia sesión (pensado para redirigir a /login).
   * - Si algún día quieres login automático tras registro, llama doRegister(..., true)
   */
  const doRegister = async (name, email, password, autoLogin = false) => {
    const data = await register({ name, email, password });

    if (autoLogin && data?.accessToken) {
      // 🔐 Camino alternativo: login automático
      setAccessToken(data.accessToken);
      const me = await getMe();
      setUser(me?.user ?? me ?? null);
    } else {
      // 🧹 Asegúrate de no dejar tokens colgados
      setAccessToken(null);
      setUser(null);
    }

    return data;
  };

  const doLogout = async () => {
    try { await logout(); } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const isAuth = !!user;

  return (
    <AuthCtx.Provider value={{ user, ready, isAuth, doLogin, doRegister, doLogout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
