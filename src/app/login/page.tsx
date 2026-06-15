"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button, Input } from "@/components/ui";
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-zinc-900 dark:to-zinc-800 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
            TAJ
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Traitement des Antécédents Judiciaires
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-8 border border-zinc-200 dark:border-zinc-700">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-6">
            Connexion
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
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
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
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
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Connexion en cours..." : "Se connecter"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
              Pour accéder au système TAJ, vous devez être un agent autorisé.
            </p>
          </div>
        </div>

        {/* Demo info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Système sécurisé — Accès réservé aux autorités
          </p>
        </div>
      </div>
    </div>
  );
}
