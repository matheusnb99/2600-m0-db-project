"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { centralLoginUrl } from "@/lib/auth-url";
import {
  ROLE_NAMES,
  roleById,
  navItemsForRole,
  canAccessPath,
  NAV_ITEMS,
} from "@/lib/roles";
import { Forbidden } from "@/components/Forbidden";
import { NotAuthorized } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";

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
  // Chosen Bell-LaPadula working level (null until read from the cookie).
  const [workLevel, setWorkLevel] = useState<number | null>(null);
  const { agent, isLoading, logout } = useAuth();
  const pathname = usePathname();

  // Initialise the working-level selector from the `taj_level` cookie, clamped
  // to the agent's clearance. No cookie ⇒ default to full clearance.
  useEffect(() => {
    if (!agent) return;
    const max = agent.habilitation_niveau ?? 0;
    const m = document.cookie.match(/(?:^|; )taj_level=(\d+)/);
    const v = m ? parseInt(m[1], 10) : max;
    setWorkLevel(Math.max(0, Math.min(v, max)));
  }, [agent]);

  // Set the cookie and reload so every request + on-screen data uses the new
  // level (the server re-clamps it to ≤ habilitation regardless).
  const changeWorkLevel = (v: number) => {
    document.cookie = `taj_level=${v}; path=/; max-age=${8 * 60 * 60}; samesite=lax`;
    window.location.reload();
  };

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

  const isActive = (href: string) => pathname === href;

  const niveau = whoami?.session_level ?? null;
  const niveauLabel =
    niveau && NIVEAU_LABELS[niveau] ? NIVEAU_LABELS[niveau] : null;

  // Don't flash protected content before auth + DB context resolve / during a
  // redirect.
  if (isLoading || !whoamiReady || !agent) {
    return (
      <div className="app-bg flex h-screen items-center justify-center">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-sky-500/15" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-400 animate-spin" />
        </div>
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

  // Page-level RBAC: even on the correct microservice, a role only sees the
  // sections its GRANTs justify (db_scripts/07). Filter the nav AND gate the
  // page body, so a direct URL is refused — not merely hidden from the menu.
  const navItems = navItemsForRole(agentRole?.nom);
  const allowedHere = canAccessPath(agentRole?.nom, pathname);

  const currentNav = NAV_ITEMS.find((i) => isActive(i.href));

  return (
    <div className="app-bg flex h-screen text-zinc-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } shrink-0 bg-[#0a0d13]/80 backdrop-blur-xl text-white transition-all duration-300 flex flex-col border-r border-white/[0.06]`}
      >
        {/* Logo */}
        <div className="h-[73px] px-5 flex items-center border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_8px_24px_-8px_rgba(56,189,248,0.7)]">
              <Icon name="vault" className="w-5 h-5" strokeWidth={2} />
            </div>
            {sidebarOpen && (
              <div className="leading-tight">
                <div className="font-bold text-sm tracking-wide">TAJ</div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-sky-400/80">
                  Blackvault
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sidebarOpen && (
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
              Navigation
            </p>
          )}
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-sky-500/10 text-white ring-1 ring-inset ring-sky-500/25"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
                } ${sidebarOpen ? "" : "justify-center"}`}
                title={item.label}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-sky-400" />
                )}
                <Icon
                  name={item.icon as IconName}
                  className={`w-5 h-5 shrink-0 ${
                    active ? "text-sky-300" : "text-zinc-500 group-hover:text-zinc-300"
                  }`}
                />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Toggle button */}
        <div className="border-t border-white/[0.06] p-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
            title={sidebarOpen ? "Réduire le menu" : "Étendre le menu"}
          >
            <Icon
              name="chevronsLeft"
              className={`w-4 h-4 transition-transform ${sidebarOpen ? "" : "rotate-180"}`}
            />
            {sidebarOpen && <span className="text-xs">Réduire</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="shrink-0 h-[73px] bg-[#0a0d13]/70 backdrop-blur-xl border-b border-white/[0.06] px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentNav && (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300 ring-1 ring-inset ring-sky-500/20">
                <Icon name={currentNav.icon as IconName} className="w-5 h-5" />
              </span>
            )}
            <h1 className="text-xl font-semibold text-white">
              {currentNav?.label || "Tableau de bord"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Niveau de session Bell-LaPadula (≤ habilitation, abaissable) */}
            {agent && workLevel !== null && (
              <label
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 cursor-pointer"
                title="Niveau de session de travail (Bell-LaPadula). Abaissez-le sous votre habilitation pour écrire à un niveau de classification inférieur (No Write Down)."
              >
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Session
                </span>
                <select
                  value={workLevel}
                  onChange={(e) => changeWorkLevel(Number(e.target.value))}
                  className="bg-transparent text-xs font-mono font-semibold text-sky-300 focus:outline-none cursor-pointer"
                >
                  {Array.from(
                    { length: (agent.habilitation_niveau ?? 0) + 1 },
                    (_, i) => i
                  ).map((l) => (
                    <option key={l} value={l} className="bg-[#10141c] text-zinc-100">
                      {NIVEAU_LABELS[String(l)]} ({l})
                    </option>
                  ))}
                </select>
              </label>
            )}
            {/* Identité de connexion BDD (rôle taj_* basculable pour la démo) */}
            {whoami?.db_role && (
              <div
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10"
                title="Rôle PostgreSQL de connexion (DATA pool) — change avec la chaîne de connexion .env"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                  BDD
                </span>
                <span className="text-xs font-mono font-semibold text-zinc-100">
                  {whoami.db_role}
                </span>
                {niveauLabel && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 ring-1 ring-inset ring-sky-500/30">
                    {niveauLabel}
                  </span>
                )}
              </div>
            )}
            {agent && (
              <div className="flex items-center gap-3 pl-1">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white leading-tight">
                    {agent.prenom} {agent.nom}
                  </p>
                  <p className="text-xs font-mono text-zinc-500">
                    {agent.matricule}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white text-sm font-bold ring-2 ring-white/10">
                  {agent.prenom[0]}
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors cursor-pointer"
              title="Déconnexion"
            >
              <Icon name="logout" className="w-4 h-4" />
              <span className="hidden md:inline">Déconnexion</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-8">
          <div className="mx-auto max-w-7xl vault-fade-up">
            {allowedHere ? children : <NotAuthorized roleLabel={agentRole?.label} />}
          </div>
        </main>
      </div>
    </div>
  );
}
