import AsyncStorage from "@react-native-async-storage/async-storage";

import { ZABBIX_STORAGE, zabbixClient } from "@/services/zabbix/ZabbixClient";

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
  login(username: string, password: string, rememberMe: boolean): Promise<Session>;
  logout(): Promise<void>;
  getSession(): Promise<Session | null>;
  validateSession(session: Session | null): boolean;
}

export const SESSION_KEY = "poulina.session";

const titleCase = (s: string): string =>
  s.trim().split(/[\s._-]+/).filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ") || s;

const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
const SHORT_MS = 8 * 60 * 60 * 1000;

// ─── Mock (demo mode) ────────────────────────────────────────────────────────

export class MockAuthService implements AuthService {
  async login(username: string, password: string, rememberMe: boolean): Promise<Session> {
    await new Promise((r) => setTimeout(r, 1200));
    if (!username.trim() || !password) throw new Error("Invalid credentials");
    const now = Date.now();
    const session: Session = {
      username: username.trim(),
      displayName: titleCase(username.trim()),
      role: "Admin",
      token: `mock-${now}`,
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
    try { return JSON.parse(raw) as Session; } catch { return null; }
  }

  validateSession(session: Session | null): boolean {
    if (!session) return false;
    return session.expiresAt > Date.now();
  }
}

// ─── Zabbix (production) ─────────────────────────────────────────────────────

export class ZabbixAuthService implements AuthService {
  async login(username: string, password: string, rememberMe: boolean): Promise<Session> {
    const serverUrl = await AsyncStorage.getItem(ZABBIX_STORAGE.serverUrl);
    if (!serverUrl?.trim()) throw new Error("ZABBIX_NOT_CONFIGURED");

    // Step 1 — authenticate
    let sessionToken: string;
    try {
      sessionToken = await zabbixClient.userLogin(serverUrl.trim(), username.trim(), password);
    } catch (e) {
      const err = e as Error & { code?: number };
      if (err.code === -32602 || err.message?.includes("incorrect")) {
        throw new Error("Invalid username or password");
      }
      if (err.message === "TIMEOUT") {
        throw new Error("Cannot reach Zabbix server. Check your network.");
      }
      throw new Error("Authentication failed. Please try again.");
    }

    // Step 2 — fetch profile + role
    let displayName = titleCase(username.trim());
    let role: UserRole = "Operator";
    try {
      const profile = await zabbixClient.getUserProfile(serverUrl.trim(), username.trim(), sessionToken);
      const name = `${profile.name ?? ""} ${profile.surname ?? ""}`.trim();
      if (name) displayName = name;
      role = profile.roleid === "3" ? "Admin" : profile.roleid === "2" ? "DevOps" : "Operator";
    } catch {
      // profile fetch best-effort — carry on with defaults
    }

    const now = Date.now();
    const session: Session = {
      username: username.trim(),
      displayName,
      role,
      token: sessionToken,
      loginTime: now,
      rememberMe,
      expiresAt: now + (rememberMe ? REMEMBER_MS : SHORT_MS),
    };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  async logout(): Promise<void> {
    const [raw, serverUrl] = await Promise.all([
      AsyncStorage.getItem(SESSION_KEY),
      AsyncStorage.getItem(ZABBIX_STORAGE.serverUrl),
    ]);
    if (raw && serverUrl) {
      try {
        const session = JSON.parse(raw) as Session;
        await zabbixClient.userLogout(serverUrl, session.token);
      } catch { /* best-effort */ }
    }
    await AsyncStorage.removeItem(SESSION_KEY);
  }

  async getSession(): Promise<Session | null> {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as Session; } catch { return null; }
  }

  validateSession(session: Session | null): boolean {
    if (!session) return false;
    return session.expiresAt > Date.now();
  }
}

// ─── Smart selector: Zabbix if configured, mock otherwise ────────────────────

class SmartAuthService implements AuthService {
  private mock = new MockAuthService();
  private zabbix = new ZabbixAuthService();

  private async useZabbix(): Promise<boolean> {
    const url = await AsyncStorage.getItem(ZABBIX_STORAGE.serverUrl);
    return !!(url?.trim());
  }

  async login(username: string, password: string, rememberMe: boolean): Promise<Session> {
    if (await this.useZabbix()) return this.zabbix.login(username, password, rememberMe);
    return this.mock.login(username, password, rememberMe);
  }

  async logout(): Promise<void> {
    if (await this.useZabbix()) return this.zabbix.logout();
    return this.mock.logout();
  }

  async getSession(): Promise<Session | null> {
    return this.mock.getSession();
  }

  validateSession(session: Session | null): boolean {
    return this.mock.validateSession(session);
  }
}

export const authService: AuthService = new SmartAuthService();
