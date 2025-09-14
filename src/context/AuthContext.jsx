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

  const doLogin = async (email, password) => {
    const data = await login({ email, password });
    if (data?.accessToken) setAccessToken(data.accessToken);
    const me = await getMe();
    setUser(me?.user ?? me ?? null);
    return data;
  };

  const doRegister = async (name, email, password) => {
    const data = await register({ name, email, password });
    if (data?.accessToken) setAccessToken(data.accessToken);
    const me = await getMe();
    setUser(me?.user ?? me ?? null);
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
