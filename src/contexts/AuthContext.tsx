import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ token: string; user: User }>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<{ token: string; user: User }>;
  phoneLogin: (phone: string) => Promise<{ token: string; user: User; needs_cell?: boolean }>;
  phoneRegister: (name: string, phone: string, cell_id?: number) => Promise<{ token: string; user: User }>;
  selectCell: (cell_id: number) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.login({ email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const data = await api.register({ name, email, password, phone });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const phoneLogin = async (phone: string) => {
    const data = await api.phoneLogin(phone);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    // Só seta o user se não precisar escolher célula (senão a tela de login redireciona)
    if (!data.needs_cell) {
      setUser(data.user);
    }
    return data;
  };

  const phoneRegister = async (name: string, phone: string, cell_id?: number) => {
    const data = await api.phoneRegister(name, phone, cell_id);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const selectCell = async (cell_id: number) => {
    const data = await api.selectCell(cell_id);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, register, phoneLogin, phoneRegister, selectCell, logout, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
