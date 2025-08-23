import { createContext, useContext, useEffect, useState } from 'react';
import { login, register, refresh, getMe, logout } from '../api/auth';
import { setAccessToken } from '../api/http';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try { await refresh(); const me = await getMe(); setUser(me); }
      catch { setAccessToken(null); setUser(null); }
      finally { setReady(true); }
    })();
  }, []);

  const doLogin = async (email, password) => { await login({ email, password }); setUser(await getMe()); };
  const doRegister = async (name, email, password) => { await register({ name, email, password }); setUser(await getMe()); };
  const doLogout = async () => { await logout(); setUser(null); };

  return <AuthCtx.Provider value={{ user, ready, doLogin, doRegister, doLogout }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
