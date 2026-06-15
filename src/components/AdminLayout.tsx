"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { centralLoginUrl } from "@/lib/auth-url";
import { ROLE_NAMES, roleById } from "@/lib/roles";
import { Forbidden } from "@/components/Forbidden";

/** Map a Bell-LaPadula level (0..3) to its classification code. */
const NIVEAU_LABELS: Record<string, string> = {
  "0": "NC",
  "1": "CD",
  "2": "SD",
  "3": "TSD",
};

interface WhoAmI {
  db_role: string;
  session_level: string | null;
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [whoami, setWhoami] = useState<WhoAmI | null>(null);
  const [whoamiReady, setWhoamiReady] = useState(false);
  const { agent, isLoading, logout } = useAuth();
  const pathname = usePathname();

  // Auth gate: once /api/auth/me has resolved, an unauthenticated visitor is
  // bounced to the central auth service (:3000), carrying a return URL.
  useEffect(() => {
    if (!isLoading && !agent && typeof window !== "undefined") {
      window.location.href = centralLoginUrl();
    }
  }, [isLoading, agent]);

  // Show which DB role the data pool is connected as. The session cookie is
  // sent automatically (same-origin). Also used to enforce role-bound access.
  useEffect(() => {
    fetch("/api/whoami", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setWhoami(data))
      .catch(() => setWhoami(null))
      .finally(() => setWhoamiReady(true));
  }, []);

  const handleLogout = () => {
    logout();
  };

  const navigationItems = [
    { href: "/dashboard", label: "Tableau de bord", icon: "📊" },
    { href: "/personnes", label: "Personnes", icon: "🧑" },
    { href: "/affaires", label: "Affaires", icon: "📂" },
    { href: "/signalements", label: "Signalements", icon: "🚨" },
    { href: "/admin/agents", label: "Agents", icon: "👤" },
    { href: "/admin/services", label: "Services", icon: "🏢" },
    { href: "/admin/roles", label: "Rôles", icon: "🔐" },
    { href: "/admin/audit", label: "Audit", icon: "📋" },
    { href: "/conformite", label: "Vues anonymisées", icon: "🛡️" },
  ];

  const isActive = (href: string) => pathname === href;

  const niveau = whoami?.session_level ?? null;
  const niveauLabel =
    niveau && NIVEAU_LABELS[niveau] ? NIVEAU_LABELS[niveau] : null;

  // Don't flash protected content before auth + DB context resolve / during a
  // redirect.
  if (isLoading || !whoamiReady || !agent) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Role-bound access: this microservice serves exactly one role (its DB
  // connection role = current_user). If the logged-in agent's role differs,
  // show the Forbidden page. (Skipped on non-business services like auth.)
  const serviceRole = whoami?.db_role ?? "";
  const agentRole = roleById(agent.role_id);
  if (ROLE_NAMES.includes(serviceRole) && agentRole?.nom !== serviceRole) {
    return (
      <Forbidden
        serviceRole={serviceRole}
        agentRoleId={agent.role_id}
        agentName={`${agent.prenom} ${agent.nom}`}
      />
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-black">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-zinc-900 dark:bg-zinc-950 text-white transition-all duration-300 flex flex-col border-r border-zinc-800`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold">
              T
            </div>
            {sidebarOpen && (
              <div>
                <div className="font-bold text-sm">TAJ</div>
                <div className="text-xs text-zinc-400">Blackvault</div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                isActive(item.href)
                  ? "bg-blue-600 text-white"
                  : "text-zinc-300 hover:bg-zinc-800"
              }`}
              title={item.label}
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span className="text-sm">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Toggle button */}
        <div className="border-t border-zinc-800 p-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Toggle sidebar"
          >
            <span className="text-lg">{sidebarOpen ? "◀" : "▶"}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              {navigationItems.find((i) => isActive(i.href))?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Identité de connexion BDD (rôle taj_* basculable pour la démo) */}
            {whoami?.db_role && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                title="Rôle PostgreSQL de connexion (DATA pool) — change avec la chaîne de connexion .env"
              >
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  BDD&nbsp;:
                </span>
                <span className="text-xs font-mono font-semibold text-zinc-900 dark:text-white">
                  {whoami.db_role}
                </span>
                {niveauLabel && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">
                    {niveauLabel}
                  </span>
                )}
              </div>
            )}
            {agent && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {agent.prenom} {agent.nom}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {agent.matricule}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                  {agent.prenom[0]}
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
