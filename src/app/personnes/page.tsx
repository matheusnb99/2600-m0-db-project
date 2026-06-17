"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Badge, Button, Input, Select, AccessDenied, Pagination } from "@/components/ui";
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
  const [error, setError] = useState<string | null>(null);
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
        setError((err as ApiError).message || "Erreur de chargement");
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Personnes
          </h1>
          {perms?.insert?.personnes && (
            <Link href="/personnes/create">
              <Button variant="primary">➕ Nouvelle personne</Button>
            </Link>
          )}
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Recherche
              </label>
              <Input
                placeholder="Nom ou prénom..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
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
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {total} résultat{total !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </Card>

        {/* Results */}
        {error ? (
          <AccessDenied message={error} />
        ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    Identité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    Date de naissance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    TAJ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                      </div>
                    </td>
                  </tr>
                ) : personnes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                      Aucune personne trouvée
                    </td>
                  </tr>
                ) : (
                  personnes.map((personne) => (
                    <tr key={personne.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white">
                            {personne.prenom} {personne.nom}
                          </p>
                          {personne.lieu_naissance && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {personne.lieu_naissance}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                        {personne.date_naissance
                          ? new Date(personne.date_naissance).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-zinc-900 dark:text-zinc-100">
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
