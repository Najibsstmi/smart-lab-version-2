import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Role } from '../types';
import { registerPushForUser } from '../lib/pushNotifications';

type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type AuthContextType = {
  user: StoredUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, password: string, role: Role) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_KEY = 'smartlab_user';

const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwSnIL8EVPYdyFcH8RLR-KB7olxDBsq5TVJ3y4muYkYrErf9oTCL5aA8w8cRuj15Zu-xg/exec';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(LOCAL_USER_KEY);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        void registerPushForUser(parsedUser, GOOGLE_SCRIPT_URL);
      }
    } catch (err) {
      console.error('Auth restore failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'loginUser',
          email,
          password,
        }),
      });

      const data = await response.json();

      if (data.ok && data.user) {
        setUser(data.user);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(data.user));
        void registerPushForUser(data.user, GOOGLE_SCRIPT_URL);
        return true;
      }

      if (data.error === 'Wrong password') {
        alert('Kata laluan salah.');
      } else if (data.error === 'Email not found') {
        alert('Emel tidak dijumpai. Sila daftar dahulu.');
      } else {
        alert('Login gagal.');
      }

      return false;
    } catch (err) {
      console.error('Login error:', err);
      alert('Login gagal. Semak sambungan internet atau Apps Script.');
      return false;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: Role
  ): Promise<boolean> => {
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'registerUser',
          name,
          email,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (data.ok && data.user) {
        setUser(data.user);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(data.user));
        void registerPushForUser(data.user, GOOGLE_SCRIPT_URL);
        return true;
      }

      if (data.error === 'Email already registered') {
        alert('Emel ini telah didaftarkan.');
      } else if (data.error === 'Password too short') {
        alert('Kata laluan terlalu pendek. Minimum 4 aksara.');
      } else {
        alert('Pendaftaran gagal.');
      }

      return false;
    } catch (err) {
      console.error('Register error:', err);
      alert('Daftar gagal. Semak sambungan internet atau Apps Script.');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(LOCAL_USER_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      register,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
