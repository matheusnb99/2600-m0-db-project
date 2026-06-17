"use client";

import { useState, useEffect } from "react";
import { Card, Badge, Button, Input, Select, Spinner, AccessDenied, Pagination } from "@/components/ui";
import { Icon } from "@/components/icons";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";
import type { AuditLog } from "@/types";

const PAGE_SIZE = 50;

export default function AuditPage() {
  const [logs, setLogs] = useState<(AuditLog & { total_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const [filterAction, setFilterAction] = useState<string>("");
  const [filterTable, setFilterTable] = useState<string>("");
  const [filterAlerts, setFilterAlerts] = useState<boolean>(false);
  const [searchAgent, setSearchAgent] = useState<string>("");
  const [exporting, setExporting] = useState(false);

  // action / table / alerte are filtered server-side (paginated); the agent-id
  // search stays client-side on the current page.
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.fetchAudit({
          action: filterAction || undefined,
          table: filterTable || undefined,
          alerte: filterAlerts ? "true" : undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        if (!active) return;
        const rows = data as (AuditLog & { total_count?: number })[];
        setLogs(rows);
        setTotal(rows[0]?.total_count ?? 0);
      } catch (err) {
        if (active) setError((err as ApiError).message || "Erreur de chargement");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [filterAction, filterTable, filterAlerts, page]);

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

  // action/table/alerte are applied server-side; only the agent-id search is
  // client-side, on the current page.
  const filteredLogs = logs.filter(
    (log) => !searchAgent || log.agent_id?.includes(searchAgent)
  );

  // Export the WHOLE filtered result set (not just the current page) to CSV.
  // Re-fetches with the active server-side filters and a high limit, applies the
  // client-side agent search, then triggers a browser download. The audit_log
  // is REVOKE'd from UPDATE/DELETE, so this read-only export is the only egress.
  const handleExport = async () => {
    setExporting(true);
    try {
      const rows = (await apiClient.fetchAudit({
        action: filterAction || undefined,
        table: filterTable || undefined,
        alerte: filterAlerts ? "true" : undefined,
        limit: 10000,
        offset: 0,
      })) as (AuditLog & { total_count?: number })[];

      const data = rows.filter(
        (log) => !searchAgent || log.agent_id?.includes(searchAgent)
      );

      const columns = [
        "horodatage",
        "agent_id",
        "action",
        "table_cible",
        "severite",
        "alerte",
        "type_alerte",
        "details",
      ] as const;

      const escape = (v: unknown) => {
        const s =
          v == null
            ? ""
            : typeof v === "object"
              ? JSON.stringify(v)
              : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      };

      const csv = [
        columns.join(","),
        ...data.map((row) =>
          columns
            .map((c) => escape((row as unknown as Record<string, unknown>)[c]))
            .join(",")
        ),
      ].join("\r\n");

      // BOM so Excel reads UTF-8 accents correctly.
      const blob = new Blob(["﻿" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as ApiError).message || "Échec de l'export");
    } finally {
      setExporting(false);
    }
  };

  // Page-local counts (this page of results).
  const alertCount = logs.filter((l) => l.alerte).length;
  const criticalCount = logs.filter((l) => l.severite >= 4).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-400">
            Traçabilité immuable des accès (<code className="font-mono text-zinc-300">audit_log</code> — REVOKE UPDATE/DELETE).
          </p>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={exporting || loading}
          >
            <Icon name="download" className="w-4 h-4" />
            {exporting ? "Export…" : "Exporter logs"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
              <Icon name="clipboard" className="w-4 h-4 text-zinc-500" />
              Total d&apos;entrées
            </div>
            <p className="text-3xl font-bold tabular-nums text-white">{total}</p>
          </Card>
          <Card className="p-5 border-amber-500/30! bg-amber-500/[0.05]!">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-300 mb-2">
              <Icon name="alertTriangle" className="w-4 h-4" />
              Alertes
            </div>
            <p className="text-3xl font-bold tabular-nums text-amber-300">{alertCount}</p>
          </Card>
          <Card className="p-5 border-red-500/30! bg-red-500/[0.05]!">
            <div className="flex items-center gap-2 text-sm font-medium text-red-300 mb-2">
              <Icon name="siren" className="w-4 h-4" />
              Critiques
            </div>
            <p className="text-3xl font-bold tabular-nums text-red-300">{criticalCount}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <h3 className="flex items-center gap-2 text-base font-semibold text-white mb-4">
            <Icon name="filter" className="w-4 h-4 text-sky-300" />
            Filtres
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Action
              </label>
              <Select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setPage(0);
                }}
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
                onChange={(e) => {
                  setFilterTable(e.target.value);
                  setPage(0);
                }}
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
                  onChange={(e) => {
                    setFilterAlerts(e.target.checked);
                    setPage(0);
                  }}
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
              <thead className="bg-white/[0.02] border-b border-white/10">
                <tr>
                  {["Date/Heure", "Agent", "Action", "Table", "Sévérité", "Détails"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className={`${
                      log.alerte
                        ? "bg-red-500/[0.06] hover:bg-red-500/[0.1]"
                        : "hover:bg-white/[0.03]"
                    } transition-colors`}
                  >
                    <td className="px-6 py-4 text-sm font-mono text-zinc-200">
                      {log.horodatage}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-zinc-400">
                      {log.agent_id || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="default">{log.action}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono font-medium text-zinc-200">
                      {log.table_cible || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={severityColors[log.severite as keyof typeof severityColors]}>
                        {severityLabels[log.severite as keyof typeof severityLabels]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {log.alerte ? (
                        <div className="flex items-center gap-2 text-red-300">
                          <Icon name="alertTriangle" className="w-4 h-4 shrink-0" />
                          <span>{log.type_alerte || "Alerte"}</span>
                        </div>
                      ) : (
                        log.details && (
                          <details className="cursor-pointer">
                            <summary className="text-sky-400 hover:text-sky-300">
                              Voir
                            </summary>
                            <pre className="mt-2 p-2 bg-black/40 rounded-lg text-xs overflow-auto ring-1 ring-inset ring-white/10">
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

        {!error && !loading && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPage={setPage}
          />
        )}
      </div>
    </AdminLayout>
  );
}
