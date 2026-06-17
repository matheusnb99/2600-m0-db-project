"use client";

import { useState, useEffect } from "react";
import { Card, Badge, Spinner, AccessDenied } from "@/components/ui";
import { Icon } from "@/components/icons";
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
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
            <Icon name="shieldCheck" className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">
              Vues anonymisées — Conformité RGPD / CNIL
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Surface accessible aux rôles{" "}
              <code className="font-mono text-zinc-300">auditeur</code> et{" "}
              <code className="font-mono text-zinc-300">controleur_cnil</code> :
              données pseudonymisées et statistiques agrégées uniquement — jamais
              la donnée brute.
            </p>
          </div>
        </div>

        {loading ? (
          <Spinner label="Chargement des vues de conformité…" />
        ) : error ? (
          <AccessDenied message={error} />
        ) : (
          <>
            {/* Statistiques CNIL */}
            <Card className="overflow-hidden">
              <div className="border-b border-white/[0.07] px-6 py-4">
                <h3 className="text-base font-semibold text-white">
                  Statistiques agrégées (<code>statistiques_cnil</code>)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/[0.02] border-b border-white/10">
                    <tr>
                      {["Catégorie", "Total", "Actifs", "Supprimés", "Archivés", "Alertes"].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {stats.map((s) => (
                      <tr key={s.categorie} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-zinc-900 dark:text-white">
                          {s.categorie}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-300">{s.total}</td>
                        <td className="px-6 py-4 text-sm text-zinc-300">{s.actifs}</td>
                        <td className="px-6 py-4 text-sm text-zinc-300">{s.supprimes}</td>
                        <td className="px-6 py-4 text-sm text-zinc-300">{s.archives}</td>
                        <td className="px-6 py-4 text-sm text-zinc-300">
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
              <div className="border-b border-white/[0.07] px-6 py-4">
                <h3 className="text-base font-semibold text-white">
                  Personnes pseudonymisées (<code>personnes_anonymisees</code>)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/[0.02] border-b border-white/10">
                    <tr>
                      {["Code individu", "Année naiss.", "Origine", "Sexe", "Classification", "Statut", "Mois création"].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {personnes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                          Aucune donnée.
                        </td>
                      </tr>
                    ) : (
                      personnes.map((p) => (
                        <tr key={p.id_pseudonyme} className="hover:bg-white/[0.03] transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                            {p.code_individu}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-300">
                            {p.annee_naissance ?? "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-300">{p.origine}</td>
                          <td className="px-6 py-4 text-sm text-zinc-300">{p.sexe ?? "—"}</td>
                          <td className="px-6 py-4">
                            <Badge>{p.niveau_classification}</Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-300">{p.statut}</td>
                          <td className="px-6 py-4 text-sm text-zinc-300">
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
