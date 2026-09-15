import { createContext, useContext, useMemo, useState } from 'react';
import { login } from '../services/api';
import type { AuthResult, LoginRequest } from '../types/auth';

interface AuthContextValue {
  auth: AuthResult | null;
  signIn: (request: LoginRequest) => Promise<void>;
  signOut: () => void;
}

const storageKey = 'ukstady.auth';
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthResult | null>(() => {
    const value = localStorage.getItem(storageKey);
    return value ? (JSON.parse(value) as AuthResult) : null;
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      signIn: async (request) => {
        const result = await login(request);
        localStorage.setItem(storageKey, JSON.stringify(result));
        setAuth(result);
      },
      signOut: () => {
        localStorage.removeItem(storageKey);
        setAuth(null);
      },
    }),
    [auth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}

