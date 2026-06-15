"use client";

import { useState, useEffect } from "react";
import { Card, Badge, Button, Input, Select, Spinner, AccessDenied } from "@/components/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";
import type { AuditLog } from "@/types";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterAction, setFilterAction] = useState<string>("");
  const [filterTable, setFilterTable] = useState<string>("");
  const [filterAlerts, setFilterAlerts] = useState<boolean>(false);
  const [searchAgent, setSearchAgent] = useState<string>("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    apiClient
      .fetchAudit({ limit: 200 })
      .then((data) => {
        if (active) setLogs(data as AuditLog[]);
      })
      .catch((err) => {
        if (active) setError((err as ApiError).message || "Erreur de chargement");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const severityLabels = {
    0: "Info",
    1: "Info",
    2: "Attention",
    3: "Avertissement",
    4: "Critique",
    5: "Critique",
  };

  const severityColors = {
    0: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    1: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    2: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    3: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    4: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    5: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const actions = ["SELECT", "INSERT", "UPDATE", "DELETE"];
  const tables = [
    "personnes",
    "affaires",
    "agents",
    "signalements",
    "decisions_justice",
    "consultations",
    "credentials",
    "passwords",
    "keys_master",
    "agents_secrets",
  ];

  const filteredLogs = logs.filter((log) => {
    if (filterAction && log.action !== filterAction) return false;
    if (filterTable && log.table_cible !== filterTable) return false;
    if (filterAlerts && !log.alerte) return false;
    if (searchAgent && !log.agent_id?.includes(searchAgent)) return false;
    return true;
  });

  const alertCount = logs.filter((l) => l.alerte).length;
  const criticalCount = logs.filter((l) => l.severite >= 4).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Journal d'audit centralisé
          </h1>
          <Button variant="primary">📥 Exporter logs</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
              Total d'entrées
            </p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white">
              {logs.length}
            </p>
          </Card>
          <Card className="p-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-2 font-medium">
              ⚠️ Alertes
            </p>
            <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">
              {alertCount}
            </p>
          </Card>
          <Card className="p-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
            <p className="text-sm text-red-700 dark:text-red-300 mb-2 font-medium">
              🚨 Critiques
            </p>
            <p className="text-3xl font-bold text-red-700 dark:text-red-300">
              {criticalCount}
            </p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Filtres
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Action
              </label>
              <Select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              >
                <option value="">Toutes</option>
                {actions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Table
              </label>
              <Select
                value={filterTable}
                onChange={(e) => setFilterTable(e.target.value)}
              >
                <option value="">Toutes</option>
                {tables.map((table) => (
                  <option key={table} value={table}>
                    {table}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Agent (ID)
              </label>
              <Input
                placeholder="Rechercher..."
                value={searchAgent}
                onChange={(e) => setSearchAgent(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterAlerts}
                  onChange={(e) => setFilterAlerts(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Alertes seulement
                </span>
              </label>
            </div>
          </div>
        </Card>

        {/* Log Table */}
        {loading ? (
          <Spinner label="Chargement du journal d'audit…" />
        ) : error ? (
          <AccessDenied message={error} />
        ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    Date/Heure
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    Table
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    Sévérité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    Détails
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className={`${
                      log.alerte
                        ? "bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    } transition-colors`}
                  >
                    <td className="px-6 py-4 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                      {log.horodatage}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {log.agent_id || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="default">{log.action}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {log.table_cible || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={severityColors[log.severite as keyof typeof severityColors]}>
                        {severityLabels[log.severite as keyof typeof severityLabels]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {log.alerte ? (
                        <div className="flex items-center gap-2">
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            🚨
                          </span>
                          <span>{log.type_alerte || "Alerte"}</span>
                        </div>
                      ) : (
                        log.details && (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 dark:text-blue-400 hover:underline">
                              Voir
                            </summary>
                            <pre className="mt-2 p-2 bg-zinc-100 dark:bg-zinc-900 rounded text-xs overflow-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredLogs.length === 0 && (
            <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
              Aucune entrée ne correspond aux filtres appliqués
            </div>
          )}
        </Card>
        )}
      </div>
    </AdminLayout>
  );
}
