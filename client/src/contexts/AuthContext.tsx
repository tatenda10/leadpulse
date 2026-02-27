import React, { createContext, useContext, useMemo, useState } from 'react';
import { apiRequest } from './Api';

type AuthUser = {
  id: number;
  username: string;
  created_at?: string;
  updated_at?: string;
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AUTH_TOKEN_KEY = 'leadpulse_auth_token';
const AUTH_USER_KEY = 'leadpulse_auth_user';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  const login = async (username: string, password: string): Promise<void> => {
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { username, password },
    });

    setToken(response.token);
    setUser(response.user);
    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
  };

  const logout = (): void => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
