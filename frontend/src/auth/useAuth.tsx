import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';

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

function decodeToken(token: string): { sub: string; roles: string[] } {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const { sub, roles } = decodeToken(token);
      const role = roles.some((r: string) => r.includes('ADMIN')) ? 'admin' : 'user';
      return { id: sub, username: sub, email: '', role };
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!user?.username) return;
    
    api.get(`/api/usuarios/by-username/${user.username}`)
      .then(res => {
        setUser({
          id: res.data.id,
          username: res.data.username,
          email: res.data.email,
          role: user.role
        });
      })
      .catch(error => console.error('Failed to fetch user:', error));
  }, []);



  const loginWithToken = async (token: string) => {

    try {
  localStorage.setItem('token', token);
  const { sub, roles } = decodeToken(token);
  // Determine role
  const role = roles.some((r: string) => r.includes('ADMIN')) ? 'admin' : 'user';
  
  // Fetch full user data
  const response = await api.get(`/api/usuarios/by-username/${sub}`);
  setUser({
    id: response.data.id,
    username: response.data.username,
    email: response.data.email,
    role: role
  });
  } catch (error) {
    console.error('Failed to load user:', error);
    // Optionally redirect to login
  }

};

 

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (data: Partial<Pick<User, 'username' | 'email' | 'avatar'>>) => {
    setUser(prev => (prev ? { ...prev, ...data } : prev));
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, loginWithToken, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
