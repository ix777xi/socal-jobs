import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiRequest } from "./queryClient";

interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  authProvider?: string;
  subscriptionStatus: string;
  subscriptionEnd?: string | null;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isPro: boolean;
  isAdmin: boolean;
  paywallEnabled: boolean;
  googleEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [paywallEnabled, setPaywallEnabled] = useState(true);

  const isAdmin = !!user?.isAdmin;
  const isPro = !paywallEnabled || user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";

  const refresh = useCallback(async () => {
    try {
      const res = await apiRequest("GET", "/api/auth/me");
      const data = await res.json();
      setUser(data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // Check auth providers
    apiRequest("GET", "/api/auth/providers")
      .then((res) => res.json())
      .then((data) => setGoogleEnabled(!!data.google))
      .catch(() => {});

    // Check site settings
    apiRequest("GET", "/api/site-settings/public")
      .then((res) => res.json())
      .then((data) => setPaywallEnabled(data.paywallEnabled !== false))
      .catch(() => {});

    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function login(email: string, password: string) {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await res.json();
    setUser(data);
  }

  async function register(email: string, password: string, name?: string) {
    const res = await apiRequest("POST", "/api/auth/register", { email, password, name });
    const data = await res.json();
    setUser(data);
  }

  async function logout() {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
  }

  // Allow admin to toggle paywall locally
  const updatePaywallEnabled = useCallback((enabled: boolean) => {
    setPaywallEnabled(enabled);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isPro, isAdmin, paywallEnabled, googleEnabled, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
