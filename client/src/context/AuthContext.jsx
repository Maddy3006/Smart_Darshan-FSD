import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, storage, TEMPLE_SCOPE_KEY, TOKEN_KEY } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => storage.get(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  const logout = useCallback(() => {
    storage.remove(TOKEN_KEY);
    storage.remove(TEMPLE_SCOPE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const saveSession = useCallback((data) => {
    storage.set(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    return data.user;
  }, []);

  useEffect(() => {
    if (!storage.get(TOKEN_KEY)) return undefined;
    let cancelled = false;
    let retryTimer;

    const restoreSession = async (attempt = 0) => {
      try {
        await refreshUser();
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (cancelled) return;
        // An invalid token is handled by the api interceptor (it logs out).
        // Anything else (API restarting, network blip) is retried a few times.
        const invalid = err.response?.data?.error?.code === 'AUTH_INVALID';
        if (invalid || attempt >= 4) setLoading(false);
        else retryTimer = setTimeout(() => restoreSession(attempt + 1), 2000);
      }
    };
    restoreSession();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, [refreshUser]);

  useEffect(() => {
    window.addEventListener('sd:unauthorized', logout);
    return () => window.removeEventListener('sd:unauthorized', logout);
  }, [logout]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      setUser,
      logout,
      refreshUser,
      login: async (email, password) => saveSession((await api.post('/auth/login', { email, password })).data),
      register: async (payload) => saveSession((await api.post('/auth/register', payload)).data),
    }),
    [token, user, loading, logout, refreshUser, saveSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
