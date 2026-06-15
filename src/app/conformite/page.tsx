"use client";

import { useState, useEffect } from "react";
import { Card, Badge, Spinner, AccessDenied } from "@/components/ui";
import { AdminLayout } from "@/components/AdminLayout";

interface StatCnil {
  categorie: string;
  total: number;
  actifs: number;
  supprimes: number;
  archives: number;
  alertes_securite: number | null;
}

interface PersonneAnonymisee {
  id_pseudonyme: string;
  code_individu: string;
  annee_naissance: number | null;
  origine: string;
  sexe: string | null;
  niveau_classification: string;
  statut: string;
  mois_creation: string | null;
}

export default function ConformitePage() {
  const [stats, setStats] = useState<StatCnil[]>([]);
  const [personnes, setPersonnes] = useState<PersonneAnonymisee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Session cookie is sent automatically (same-origin).
    fetch("/api/conformite", { credentials: "same-origin" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || "Erreur de chargement");
        return data;
      })
      .then((data) => {
        setStats(data.statistiques || []);
        setPersonnes(data.personnes || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Vues anonymisées — Conformité RGPD / CNIL
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Surface accessible aux rôles <code>auditeur</code> et{" "}
            <code>controleur_cnil</code> : données pseudonymisées et statistiques
            agrégées uniquement — jamais la donnée brute.
          </p>
        </div>

        {loading ? (
          <Spinner label="Chargement des vues de conformité…" />
        ) : error ? (
          <AccessDenied message={error} />
        ) : (
          <>
            {/* Statistiques CNIL */}
            <Card className="overflow-hidden">
              <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Statistiques agrégées (<code>statistiques_cnil</code>)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                    <tr>
                      {["Catégorie", "Total", "Actifs", "Supprimés", "Archivés", "Alertes"].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {stats.map((s) => (
                      <tr key={s.categorie} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="px-6 py-4 text-sm font-medium text-zinc-900 dark:text-white">
                          {s.categorie}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">{s.total}</td>
                        <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">{s.actifs}</td>
                        <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">{s.supprimes}</td>
                        <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">{s.archives}</td>
                        <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                          {s.alertes_securite ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Personnes anonymisées */}
            <Card className="overflow-hidden">
              <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Personnes pseudonymisées (<code>personnes_anonymisees</code>)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                    <tr>
                      {["Code individu", "Année naiss.", "Origine", "Sexe", "Classification", "Statut", "Mois création"].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {personnes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                          Aucune donnée.
                        </td>
                      </tr>
                    ) : (
                      personnes.map((p) => (
                        <tr key={p.id_pseudonyme} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                          <td className="px-6 py-4 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                            {p.code_individu}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                            {p.annee_naissance ?? "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">{p.origine}</td>
                          <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">{p.sexe ?? "—"}</td>
                          <td className="px-6 py-4">
                            <Badge>{p.niveau_classification}</Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">{p.statut}</td>
                          <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                            {p.mois_creation
                              ? new Date(p.mois_creation).toLocaleDateString("fr-FR", {
                                  year: "numeric",
                                  month: "2-digit",
                                })
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
