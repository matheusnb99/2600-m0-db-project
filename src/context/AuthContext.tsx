"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { centralLoginUrl } from "@/lib/auth-url";

/** Identity carried in the JWT (no DB lookup needed on data services). */
export interface SessionAgent {
  id: string;
  email?: string;
  matricule: string;
  prenom: string;
  nom: string;
  role_id: number;
  habilitation_niveau_id: number;
  habilitation_niveau: number;
}

interface AuthContextType {
  agent: SessionAgent | null;
  isLoading: boolean;
  error: string | null;
  /** Verify credentials against the auth service (used on :3000 only). */
  login: (email: string, password: string) => Promise<void>;
  /** Clear the cookie and bounce to the central login. */
  logout: () => Promise<void>;
  /** Re-read /api/auth/me. */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [agent, setAgent] = useState<SessionAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" });
      setAgent(res.ok ? (await res.json()).agent : null);
    } catch {
      setAgent(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.message || "Authentification échouée";
        setError(message);
        throw new Error(message);
      }
      await refresh();
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      /* ignore */
    }
    setAgent(null);
    if (typeof window !== "undefined") {
      window.location.href = centralLoginUrl(
        `${window.location.protocol}//${window.location.host}/dashboard`
      );
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ agent, isLoading, error, login, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
