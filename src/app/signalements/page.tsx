"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Badge, Button, Select, AccessDenied, Pagination } from "@/components/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";
import { usePermissions } from "@/lib/use-permissions";

const PAGE_SIZE = 24;

interface SignalementRow {
  id: number;
  type: string;
  priorite: number;
  prenom: string;
  nom: string;
  date_naissance: string | null;
  motif: string;
  date_emission: string;
  date_expiration: string | null;
  total_count?: number;
}

export default function SignalementsPage() {
  const [signalements, setSignalements] = useState<SignalementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("all");
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const perms = usePermissions();

  useEffect(() => {
    const fetchSignalements = async () => {
      setLoading(true);
      setError(null);
      try {
        const filters: Record<string, unknown> = {
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        };
        if (type !== "all") filters.type = type;
        if (activeOnly) filters.actif = "true";
        const data = (await apiClient.fetchSignalements(filters)) as SignalementRow[];
        setSignalements(data);
        setTotal(data[0]?.total_count ?? 0);
      } catch (err) {
        setError((err as ApiError).message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };

    fetchSignalements();
  }, [type, activeOnly, page]);

  const typeLabels: Record<string, string> = {
    fiche_s: "Fiche S",
    oqtf: "OQTF",
    avis_recherche: "Avis de recherche",
    mandat_arret: "Mandat d'arrêt",
    autre: "Autre",
  };

  const typeColors: Record<string, string> = {
    fiche_s: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    oqtf: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    avis_recherche: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    mandat_arret: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    autre: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  const priorityLabels: Record<number, string> = {
    0: "Basse",
    1: "Normale",
    2: "Haute",
    3: "Critique",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Signalements
          </h1>
          {perms?.insert?.signalements && (
            <Link href="/signalements/create">
              <Button variant="primary">🚨 Nouveau signalement</Button>
            </Link>
          )}
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Type
              </label>
              <Select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">Tous les types</option>
                {Object.entries(typeLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => {
                    setActiveOnly(e.target.checked);
                    setPage(0);
                  }}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Actifs seulement
                </span>
              </label>
            </div>
            <div className="flex items-end justify-end">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {signalements.length} résultat{signalements.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </Card>

        {/* Results Grid */}
        {error ? (
          <AccessDenied message={error} />
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : signalements.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-zinc-500 dark:text-zinc-400">
                Aucun signalement trouvé
              </p>
            </div>
          ) : (
            signalements.map((sig) => (
              <Card key={sig.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="space-y-3">
                  {/* Priority */}
                  <div className="flex items-start justify-between">
                    <Badge
                      className={typeColors[sig.type] || ""}
                    >
                      {typeLabels[sig.type] || sig.type}
                    </Badge>
                    <div className="text-right">
                      <div className="text-xs font-bold text-red-600 dark:text-red-400">
                        P{sig.priorite}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {priorityLabels[sig.priorite]}
                      </div>
                    </div>
                  </div>

                  {/* Person */}
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
                    <p className="font-medium text-zinc-900 dark:text-white">
                      {sig.prenom} {sig.nom}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {sig.date_naissance
                        ? new Date(sig.date_naissance).toLocaleDateString("fr-FR")
                        : ""}
                    </p>
                  </div>

                  {/* Motif */}
                  <div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                      {sig.motif}
                    </p>
                  </div>

                  {/* Dates */}
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
                    <div>
                      Émis: {new Date(sig.date_emission).toLocaleDateString("fr-FR")}
                    </div>
                    {sig.date_expiration && (
                      <div>
                        Expire: {new Date(sig.date_expiration).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <Link href={`/signalements/${sig.id}`}>
                      <Button size="sm" variant="secondary" className="w-full">
                        Voir détails
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
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
