"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Badge, Button, Input, Select, ApiErrorView, Pagination } from "@/components/ui";
import { Icon } from "@/components/icons";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";
import { usePermissions } from "@/lib/use-permissions";

const PAGE_SIZE = 25;

interface PersonneRow {
  id: number;
  prenom: string;
  nom: string;
  lieu_naissance: string | null;
  date_naissance: string | null;
  numero_taj: string;
  statut: string;
  total_count?: number;
}

export default function PersonnesPage() {
  const [personnes, setPersonnes] = useState<PersonneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("actif");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const perms = usePermissions();

  useEffect(() => {
    const fetchPersonnes = async () => {
      setLoading(true);
      setError(null);
      try {
        // apiClient forwards the session cookie so the API can open the RLS /
        // Bell-LaPadula session — without it every classified row is hidden.
        const data = (await apiClient.fetchPersonnes({
          search,
          statut,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        })) as PersonneRow[];
        setPersonnes(data);
        setTotal(data[0]?.total_count ?? 0);
      } catch (err) {
        setError(err as ApiError);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchPersonnes, 300);
    return () => clearTimeout(timer);
  }, [search, statut, page]);

  const statutLabels: Record<string, string> = {
    actif: "Actif",
    archive: "Archivé",
    supprime: "Supprimé",
    en_cours_verification: "En vérification",
  };

  const statutColors: Record<string, string> = {
    actif: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    archive: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    supprime: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    en_cours_verification:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-400">
            Fichier des personnes — accès filtré par RLS / Bell-LaPadula.
          </p>
          {perms?.insert?.personnes && (
            <Link href="/personnes/create">
              <Button variant="primary">
                <Icon name="plus" className="w-4 h-4" />
                Nouvelle personne
              </Button>
            </Link>
          )}
        </div>

        {/* Filters */}
        <Card className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Recherche
              </label>
              <div className="relative">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
                />
                <Input
                  className="pl-9"
                  placeholder="Nom ou prénom..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Statut
              </label>
              <Select
                value={statut}
                onChange={(e) => {
                  setStatut(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">Tous</option>
                <option value="actif">Actif</option>
                <option value="archive">Archivé</option>
                <option value="en_cours_verification">En vérification</option>
              </Select>
            </div>
            <div className="flex items-end">
              <span className="text-sm text-zinc-500">
                <span className="font-semibold text-zinc-200 tabular-nums">{total}</span>{" "}
                résultat{total !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </Card>

        {/* Results */}
        {error ? (
          <ApiErrorView error={error} onRetry={() => location.reload()} />
        ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/[0.02] border-b border-white/10">
                <tr>
                  {["Identité", "Date de naissance", "TAJ", "Statut", "Actions"].map((h) => (
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
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      <div className="flex justify-center">
                        <div className="relative h-8 w-8">
                          <div className="absolute inset-0 rounded-full border-2 border-sky-500/15" />
                          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-400 animate-spin" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : personnes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">
                      Aucune personne trouvée
                    </td>
                  </tr>
                ) : (
                  personnes.map((personne) => (
                    <tr key={personne.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-white">
                            {personne.prenom} {personne.nom}
                          </p>
                          {personne.lieu_naissance && (
                            <p className="text-xs text-zinc-500">
                              {personne.lieu_naissance}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-400">
                        {personne.date_naissance
                          ? new Date(personne.date_naissance).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-sky-300">
                        {personne.numero_taj}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={statutColors[personne.statut] || ""}
                        >
                          {statutLabels[personne.statut] || personne.statut}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/personnes/${personne.id}`}>
                          <Button size="sm" variant="secondary">
                            <Icon name="eye" className="w-4 h-4" />
                            Voir
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
