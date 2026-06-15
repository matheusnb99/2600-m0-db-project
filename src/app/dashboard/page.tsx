"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Badge, Spinner } from "@/components/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";
import type { AuditLog } from "@/types";

/** Result of probing one resource for the connected role. */
interface StatState {
  label: string;
  href: string;
  color: string;
  /** null = loading, number = visible count, "denied" = RBAC/RLS refusal. */
  value: number | "denied" | null;
}

const STAT_DEFS: {
  label: string;
  href: string;
  color: string;
  fetch: () => Promise<unknown>;
}[] = [
  {
    label: "Personnes",
    href: "/personnes",
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200",
    fetch: () => apiClient.fetchPersonnes({ limit: 1000 }),
  },
  {
    label: "Affaires",
    href: "/affaires",
    color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200",
    fetch: () => apiClient.fetchAffaires({ limit: 1000 }),
  },
  {
    label: "Signalements",
    href: "/signalements",
    color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200",
    fetch: () => apiClient.fetchSignalements({ limit: 1000 }),
  },
  {
    label: "Agents",
    href: "/admin/agents",
    color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200",
    fetch: () => apiClient.fetchAgents(),
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<StatState[]>(
    STAT_DEFS.map((d) => ({ label: d.label, href: d.href, color: d.color, value: null }))
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
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Les chiffres ci-dessous reflètent ce que le rôle de connexion
          PostgreSQL courant est autorisé à voir (RBAC + Bell-LaPadula). Un
          cadenas 🔒 signifie que la base refuse l&apos;accès pour ce rôle.
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                  {stat.label}
                </p>
                <p
                  className={`text-3xl font-bold ${stat.color} rounded-lg py-2 px-3 text-center`}
                >
                  {stat.value === null
                    ? "…"
                    : stat.value === "denied"
                    ? "🔒"
                    : stat.value}
                </p>
              </Card>
            </Link>
          ))}
        </div>

        {/* Recent audit activity */}
        <Card className="overflow-hidden">
          <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Activité récente — journal d&apos;audit
            </h3>
            <Link
              href="/admin/audit"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Tout voir
            </Link>
          </div>

          {activityLoading ? (
            <Spinner label="Chargement de l'activité…" />
          ) : activityDenied ? (
            <div className="px-6 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
              🔒 Ce rôle n&apos;a pas accès au journal d&apos;audit
              (<code>audit_log</code>). Réservé à <code>admin_systeme</code>,{" "}
              <code>auditeur</code> et <code>controleur_cnil</code>.
            </div>
          ) : !activity || activity.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-zinc-500">
              Aucune entrée d&apos;audit.
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {activity.map((log) => (
                <div
                  key={log.id}
                  className={`px-6 py-4 ${
                    log.alerte ? "bg-red-50 dark:bg-red-900/10" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={log.alerte ? "danger" : "default"}>
                        {log.action}
                      </Badge>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        sur{" "}
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {log.table_cible || "—"}
                        </span>
                      </span>
                      {log.alerte && (
                        <span className="text-xs text-red-600 dark:text-red-400">
                          🚨 {log.type_alerte || "Alerte"}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap ml-4">
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
