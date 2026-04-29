import AsyncStorage from "@react-native-async-storage/async-storage";

export type UserRole = "Admin" | "DevOps" | "Operator" | "Viewer";

export interface Session {
  username: string;
  displayName: string;
  role: UserRole;
  token: string;
  loginTime: number;
  rememberMe: boolean;
  expiresAt: number;
}

export interface AuthService {
  login(
    username: string,
    password: string,
    rememberMe: boolean,
  ): Promise<Session>;
  logout(): Promise<void>;
  getSession(): Promise<Session | null>;
  validateSession(session: Session | null): boolean;
}

export const SESSION_KEY = "poulina.session";

const titleCase = (s: string): string =>
  s
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ") || s;

const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
const SHORT_MS = 8 * 60 * 60 * 1000;

export class MockAuthService implements AuthService {
  async login(
    username: string,
    password: string,
    rememberMe: boolean,
  ): Promise<Session> {
    const u = username.trim();
    const p = password;
    await new Promise((r) => setTimeout(r, 1500));
    if (!u || !p) {
      throw new Error("Invalid credentials");
    }
    const now = Date.now();
    const session: Session = {
      username: u,
      displayName: titleCase(u),
      role: "Admin",
      token: `mock-token-${now}`,
      loginTime: now,
      rememberMe,
      expiresAt: now + (rememberMe ? REMEMBER_MS : SHORT_MS),
    };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  async logout(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
  }

  async getSession(): Promise<Session | null> {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Session;
      return parsed;
    } catch {
      return null;
    }
  }

  validateSession(session: Session | null): boolean {
    if (!session) return false;
    return session.expiresAt > Date.now();
  }
}

/**
 * ZabbixAuthService — drop-in replacement for MockAuthService.
 *
 * Wire-up reference (not active):
 *   POST {ZABBIX_API_BASE}/api_jsonrpc.php
 *   Headers: { "Content-Type": "application/json-rpc" }
 *   Body: {
 *     jsonrpc: "2.0",
 *     method: "user.login",
 *     params: { username, password },
 *     id: 1
 *   }
 *
 * Switching from mock to real = change one line in the AuthProvider DI.
 */
export class ZabbixAuthService implements AuthService {
  async login(): Promise<Session> {
    throw new Error("ZabbixAuthService is not configured");
  }
  async logout(): Promise<void> {
    throw new Error("ZabbixAuthService is not configured");
  }
  async getSession(): Promise<Session | null> {
    return null;
  }
  validateSession(): boolean {
    return false;
  }
}

export const authService: AuthService = new MockAuthService();
