"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button, Input } from "@/components/ui";
import { Icon } from "@/components/icons";
import { isAuthService, centralLoginUrl, roleServiceUrl } from "@/lib/auth-url";
import { roleById } from "@/lib/roles";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();

  // Login is centralised on the auth service (:3000). If this page is reached
  // on a data service, bounce to the central login carrying the return URL.
  useEffect(() => {
    if (typeof window === "undefined" || isAuthService()) return;
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    window.location.href = centralLoginUrl(redirect ?? undefined);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const agent = await login(email, password);
      // Route the agent to THEIR role's microservice (role-bound access).
      const role = roleById(agent?.role_id);
      window.location.href = role
        ? roleServiceUrl(role.port)
        : `${window.location.protocol}//${window.location.hostname}/`; // portail
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentification échouée");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-bg min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md vault-fade-up">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_16px_40px_-12px_rgba(56,189,248,0.7)] mb-5">
            <Icon name="vault" className="w-8 h-8" strokeWidth={1.8} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">TAJ</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Traitement des Antécédents Judiciaires
          </p>
          <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.3em] text-sky-400/70">
            Opération Blackvault
          </p>
        </div>

        {/* Login Card */}
        <div className="vault-sheen rounded-2xl border border-white/[0.08] p-8 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Icon name="lock" className="w-4 h-4 text-sky-300" />
            Connexion sécurisée
          </h2>

          {error && (
            <div className="mb-6 p-3.5 rounded-lg bg-red-500/[0.08] border border-red-500/30 flex items-start gap-2.5">
              <Icon name="alertTriangle" className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="votre.email@police.gouv.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Mot de passe
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              disabled={isLoading}
            >
              {isLoading ? "Connexion en cours…" : "Se connecter"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-white/[0.07]">
            <p className="text-xs text-zinc-500 text-center">
              Pour accéder au système TAJ, vous devez être un agent autorisé.
            </p>
          </div>
        </div>

        {/* Demo info */}
        <div className="mt-6 flex items-center justify-center gap-2 text-center">
          <Icon name="shieldCheck" className="w-3.5 h-3.5 text-zinc-600" />
          <p className="text-xs text-zinc-500">
            Système sécurisé — Accès réservé aux autorités
          </p>
        </div>
      </div>
    </div>
  );
}
