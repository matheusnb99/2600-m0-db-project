"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Badge, Spinner } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";
import type { AuditLog } from "@/types";

/** Result of probing one resource for the connected role. */
interface StatState {
  label: string;
  href: string;
  icon: IconName;
  accent: string;
  /** null = loading, number = visible count, "denied" = RBAC/RLS refusal. */
  value: number | "denied" | null;
}

const STAT_DEFS: {
  label: string;
  href: string;
  icon: IconName;
  accent: string;
  fetch: () => Promise<unknown>;
}[] = [
  {
    label: "Personnes",
    href: "/personnes",
    icon: "users",
    accent: "text-sky-300 bg-sky-500/10 ring-sky-500/20",
    fetch: () => apiClient.fetchPersonnes({ limit: 1000 }),
  },
  {
    label: "Affaires",
    href: "/affaires",
    icon: "folder",
    accent: "text-amber-300 bg-amber-500/10 ring-amber-500/20",
    fetch: () => apiClient.fetchAffaires({ limit: 1000 }),
  },
  {
    label: "Signalements",
    href: "/signalements",
    icon: "siren",
    accent: "text-red-300 bg-red-500/10 ring-red-500/20",
    fetch: () => apiClient.fetchSignalements({ limit: 1000 }),
  },
  {
    label: "Agents",
    href: "/admin/agents",
    icon: "user",
    accent: "text-emerald-300 bg-emerald-500/10 ring-emerald-500/20",
    fetch: () => apiClient.fetchAgents(),
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<StatState[]>(
    STAT_DEFS.map((d) => ({
      label: d.label,
      href: d.href,
      icon: d.icon,
      accent: d.accent,
      value: null,
    }))
  );
  const [activity, setActivity] = useState<AuditLog[] | null>(null);
  const [activityDenied, setActivityDenied] = useState(false);
  const [activityLoading, setActivityLoading] = useState(true);

  // Probe each resource independently so the dashboard visualises exactly what
  // the connected role can and cannot see (count vs. 🔒).
  useEffect(() => {
    STAT_DEFS.forEach((def, idx) => {
      def
        .fetch()
        .then((rows) => {
          const arr = Array.isArray(rows) ? rows : [];
          // Prefer the exact total (COUNT(*) OVER()) when the endpoint provides
          // it; otherwise fall back to the number of rows returned.
          const count =
            (arr[0] as { total_count?: number } | undefined)?.total_count ??
            arr.length;
          setStats((prev) =>
            prev.map((s, i) => (i === idx ? { ...s, value: count } : s))
          );
        })
        .catch((err) => {
          const denied = (err as ApiError).status === 403;
          setStats((prev) =>
            prev.map((s, i) =>
              i === idx ? { ...s, value: denied ? "denied" : 0 } : s
            )
          );
        });
    });
  }, []);

  // Recent audit activity — only privileged roles may read audit_log.
  useEffect(() => {
    apiClient
      .fetchAudit({ limit: 8 })
      .then((rows) => setActivity(rows as AuditLog[]))
      .catch((err) => {
        if ((err as ApiError).status === 403) setActivityDenied(true);
      })
      .finally(() => setActivityLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <Icon name="info" className="w-5 h-5 mt-0.5 shrink-0 text-sky-400" />
          <p className="text-sm text-zinc-400 leading-relaxed">
            Les chiffres ci-dessous reflètent ce que le rôle de connexion
            PostgreSQL courant est autorisé à voir (RBAC + Bell-LaPadula). Un
            verrou signifie que la base refuse l&apos;accès pour ce rôle.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href} className="group">
              <Card className="p-5 vault-panel-hover h-full">
                <div className="flex items-start justify-between">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ring-1 ring-inset ${stat.accent}`}
                  >
                    <Icon name={stat.icon} className="w-5 h-5" />
                  </span>
                  <Icon
                    name="arrowRight"
                    className="w-4 h-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-400"
                  />
                </div>
                <p className="mt-4 text-sm text-zinc-400">{stat.label}</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-white">
                  {stat.value === null ? (
                    <span className="text-zinc-600">…</span>
                  ) : stat.value === "denied" ? (
                    <span className="inline-flex items-center gap-1.5 text-base font-medium text-red-300">
                      <Icon name="lock" className="w-4 h-4" /> Refusé
                    </span>
                  ) : (
                    stat.value.toLocaleString("fr-FR")
                  )}
                </p>
              </Card>
            </Link>
          ))}
        </div>

        {/* Recent audit activity */}
        <Card className="overflow-hidden">
          <div className="border-b border-white/[0.07] px-6 py-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2.5 text-base font-semibold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/10 text-sky-300 ring-1 ring-inset ring-sky-500/20">
                <Icon name="clipboard" className="w-4 h-4" />
              </span>
              Activité récente — journal d&apos;audit
            </h3>
            <Link
              href="/admin/audit"
              className="inline-flex items-center gap-1 text-sm text-sky-400 hover:text-sky-300 transition-colors"
            >
              Tout voir
              <Icon name="arrowRight" className="w-3.5 h-3.5" />
            </Link>
          </div>

          {activityLoading ? (
            <Spinner label="Chargement de l'activité…" />
          ) : activityDenied ? (
            <div className="px-6 py-10 flex flex-col items-center text-center gap-2">
              <Icon name="lock" className="w-6 h-6 text-zinc-600" />
              <p className="text-sm text-zinc-400 max-w-md">
                Ce rôle n&apos;a pas accès au journal d&apos;audit
                (<code className="font-mono text-zinc-300">audit_log</code>). Réservé à{" "}
                <code className="font-mono text-zinc-300">admin_systeme</code>,{" "}
                <code className="font-mono text-zinc-300">auditeur</code> et{" "}
                <code className="font-mono text-zinc-300">controleur_cnil</code>.
              </p>
            </div>
          ) : !activity || activity.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              Aucune entrée d&apos;audit.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {activity.map((log) => (
                <div
                  key={log.id}
                  className={`px-6 py-3.5 transition-colors hover:bg-white/[0.02] ${
                    log.alerte ? "bg-red-500/[0.05]" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={log.alerte ? "danger" : "default"}>
                        {log.action}
                      </Badge>
                      <span className="text-sm text-zinc-400">
                        sur{" "}
                        <span className="font-medium text-zinc-100 font-mono">
                          {log.table_cible || "—"}
                        </span>
                      </span>
                      {log.alerte && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-300">
                          <Icon name="alertTriangle" className="w-3.5 h-3.5" />
                          {log.type_alerte || "Alerte"}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-zinc-500 whitespace-nowrap">
                      {new Date(log.horodatage).toLocaleString("fr-FR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
