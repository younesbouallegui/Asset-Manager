import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { authService, Session } from "@/services/auth/AuthService";

interface AuthContextValue {
  session: Session | null;
  isAuthenticated: boolean;
  ready: boolean;
  bootstrap: () => Promise<boolean>;
  login: (
    username: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<Session>;
  logout: () => Promise<void>;
  reauthenticate: (password: string) => Promise<Session>;
  needsReauth: boolean;
  clearReauth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);

  const bootstrap = useCallback(async (): Promise<boolean> => {
    const stored = await authService.getSession();
    const valid = authService.validateSession(stored);
    if (valid && stored) {
      setSession(stored);
      setReady(true);
      return true;
    }
    if (stored && !valid) {
      // Expired — clear and prompt re-auth on next guarded entry.
      await authService.logout();
    }
    setSession(null);
    setReady(true);
    return false;
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (username: string, password: string, rememberMe: boolean) => {
      const next = await authService.login(username, password, rememberMe);
      setSession(next);
      setNeedsReauth(false);
      return next;
    },
    [],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setSession(null);
    setNeedsReauth(false);
  }, []);

  const reauthenticate = useCallback(
    async (password: string): Promise<Session> => {
      if (!session) throw new Error("No session to refresh");
      const next = await authService.login(
        session.username,
        password,
        session.rememberMe,
      );
      setSession(next);
      setNeedsReauth(false);
      return next;
    },
    [session],
  );

  const clearReauth = useCallback(() => setNeedsReauth(false), []);

  // Periodic expiry check.
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => {
      if (!authService.validateSession(session)) {
        setNeedsReauth(true);
      }
    }, 30000);
    return () => clearInterval(id);
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated: !!session && authService.validateSession(session),
        ready,
        bootstrap,
        login,
        logout,
        reauthenticate,
        needsReauth,
        clearReauth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
