"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Badge, Button, Input, Select, AccessDenied, Pagination } from "@/components/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";
import { usePermissions } from "@/lib/use-permissions";

const PAGE_SIZE = 25;

export default function AffairesPage() {
  const [affaires, setAffaires] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("en_cours");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const perms = usePermissions();

  useEffect(() => {
    const fetchAffaires = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = (await apiClient.fetchAffaires({
          search,
          statut,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        })) as any[];
        setAffaires(data);
        setTotal(data[0]?.total_count ?? 0);
      } catch (err) {
        setError((err as ApiError).message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchAffaires, 300);
    return () => clearTimeout(timer);
  }, [search, statut, page]);

  useEffect(() => {
    setPage(0);
  }, [search, statut]);

  const statutLabels: Record<string, string> = {
    en_cours: "En cours",
    cloturee: "Clôturée",
    classee_sans_suite: "Classée sans suite",
    renvoyee_justice: "Renvoyée en justice",
  };

  const statutColors: Record<string, string> = {
    en_cours: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    cloturee: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    classee_sans_suite: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    renvoyee_justice: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Affaires
          </h1>
          {perms?.insert?.affaires && (
            <Link href="/affaires/create">
              <Button variant="primary">➕ Nouvelle affaire</Button>
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
                placeholder="Numéro PV, lieu, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Statut
              </label>
              <Select value={statut} onChange={(e) => setStatut(e.target.value)}>
                <option value="">Tous</option>
                <option value="en_cours">En cours</option>
                <option value="cloturee">Clôturée</option>
                <option value="classee_sans_suite">Classée sans suite</option>
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
                    Numéro PV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    Lieu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    Ouverture
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
                ) : affaires.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                      Aucune affaire trouvée
                    </td>
                  </tr>
                ) : (
                  affaires.map((affaire) => (
                    <tr key={affaire.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-zinc-900 dark:text-white">
                          {affaire.numero_pv}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                        {affaire.lieu_faits || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                        {new Date(affaire.date_ouverture).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={statutColors[affaire.statut] || ""}
                        >
                          {statutLabels[affaire.statut] || affaire.statut}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/affaires/${affaire.id}`}>
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
