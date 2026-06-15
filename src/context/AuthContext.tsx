"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { Agent, AuthSession } from "@/types";

interface AuthContextType {
  session: AuthSession | null;
  agent: Agent | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Authentification échouée");
      }

      const data: AuthSession = await response.json();
      setSession(data);
      // Store token in localStorage for persistence
      localStorage.setItem("taj_token", data.token);
      localStorage.setItem("taj_session", JSON.stringify(data));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur d'authentification";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    localStorage.removeItem("taj_token");
    localStorage.removeItem("taj_session");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        agent: session?.agent || null,
        isLoading,
        error,
        login,
        logout,
      }}
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
