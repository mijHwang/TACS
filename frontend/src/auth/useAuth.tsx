import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import api, { setUnauthorizedHandler } from '../services/api';
import { decodeToken, isTokenExpired } from './token';

export interface User {
  id: string;
  username: string;
  role: string;
  email?: string;
  avatar?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loginWithToken: (token: string) => void;
  logout: () => void;
  updateUser: (data: Partial<Pick<User, 'username' | 'email' | 'avatar'>>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function userFromToken(token: string): User | null {
  const decoded = decodeToken(token);
  if (!decoded) return null;
  const role = decoded.roles.some((r) => r.includes('ADMIN')) ? 'admin' : 'user';
  // El JWT trae el username como `sub`, no el id. Dejamos `id` vacío hasta que la
  // hidratación (by-username) traiga el id real: así los `enabled: !!userId` de los
  // hooks no disparan llamadas keyed-by-id usando el username por error.
  return { id: '', username: decoded.sub, email: '', role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem('token');
    if (!token || isTokenExpired(token)) {
      localStorage.removeItem('token');
      return null;
    }
    return userFromToken(token);
  });

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const loginWithToken = useCallback(async (token: string) => {
    localStorage.setItem('token', token);
    const base = userFromToken(token);
    if (!base) { logout(); return; }
    setUser(base);
    try {
      const res = await api.get(`/api/usuarios/by-username/${base.username}`);
      setUser({ id: res.data.id, username: res.data.username, email: res.data.email, role: base.role });
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  }, [logout]);

  const updateUser = useCallback(
    (data: Partial<Pick<User, 'username' | 'email' | 'avatar'>>) =>
      setUser((prev) => (prev ? { ...prev, ...data } : prev)),
    [],
  );

  // Registrar el handler de 401: un 401 ⇒ logout ⇒ PrivateRoute redirige (sin reload).
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Hidratar datos completos del usuario una sola vez al montar si ya había sesión.
  useEffect(() => {
    const username = user?.username;
    if (!username) return;
    let cancelled = false;
    api.get(`/api/usuarios/by-username/${username}`)
      .then((res) => {
        if (cancelled) return;
        setUser((prev) => (prev ? { id: res.data.id, username: res.data.username, email: res.data.email, role: prev.role } : prev));
      })
      .catch((error) => console.error('Failed to fetch user:', error));
    return () => { cancelled = true; };
    // sólo al montar: hidrata la sesión persistida; loginWithToken ya hidrata en el login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated: !!user, user, loginWithToken, logout, updateUser }),
    [user, loginWithToken, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
