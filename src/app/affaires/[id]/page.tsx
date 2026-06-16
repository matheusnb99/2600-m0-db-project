"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, Badge, Button } from "@/components/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";

interface AffaireInfo {
  numero_pv: string;
  date_ouverture: string;
  date_faits: string | null;
  statut: string;
  lieu_faits: string | null;
  description: string | null;
}
interface AffairePerson {
  id: number;
  prenom: string;
  nom: string;
  numero_taj: string;
  role: string;
}
interface AffaireInfraction {
  id: number;
  code_natinf: string;
  libelle: string;
  categorie: string;
}
interface AffaireDecision {
  id: number;
  type: string;
  date_decision: string;
  juridiction: string;
  peine: string | null;
}
interface AffaireEvidence {
  id: number;
  numero_scelle: string;
  description: string;
  statut: string;
}
interface AffaireDetail {
  affaire: AffaireInfo;
  people: AffairePerson[];
  infractions: AffaireInfraction[];
  decisions: AffaireDecision[];
  evidence: AffaireEvidence[];
}

export default function AffaireDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<AffaireDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAffaire = async () => {
      try {
        setLoading(true);
        const affaire = await apiClient.fetchAffaire(id);
        setData(affaire as AffaireDetail);
      } catch (err) {
        setError((err as ApiError).message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchAffaire();
  }, [id]);

  if (loading)
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </AdminLayout>
    );

  if (error || !data)
    return (
      <AdminLayout>
        <Card className="p-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
          <p className="text-red-700 dark:text-red-200">{error || "Affaire not found"}</p>
        </Card>
      </AdminLayout>
    );

  const { affaire, people, infractions, decisions, evidence } = data;

  const roleLabels: Record<string, string> = {
    victime: "Victime",
    mis_en_cause: "Mis en cause",
    temoin: "Témoin",
    plaignant: "Plaignant",
    autre: "Autre",
  };

  const statutLabels: Record<string, string> = {
    en_cours: "En cours",
    cloturee: "Clôturée",
    classee_sans_suite: "Classée sans suite",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
              {affaire.numero_pv}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Ouvert le {new Date(affaire.date_ouverture).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <Button variant="secondary">Éditer</Button>
        </div>

        {/* Main Info */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Statut</p>
              <Badge>{statutLabels[affaire.statut] || affaire.statut}</Badge>
            </div>
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Lieu des faits</p>
              <p className="font-medium text-zinc-900 dark:text-white">
                {affaire.lieu_faits || "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Date des faits</p>
              <p className="font-medium text-zinc-900 dark:text-white">
                {affaire.date_faits
                  ? new Date(affaire.date_faits).toLocaleDateString("fr-FR")
                  : "—"}
              </p>
            </div>
          </div>
          {affaire.description && (
            <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">Description</p>
              <p className="text-zinc-900 dark:text-white">{affaire.description}</p>
            </div>
          )}
        </Card>

        {/* People Involved */}
        {people.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              👥 Personnes impliquées ({people.length})
            </h3>
            <div className="space-y-3">
              {people.map((person) => (
                <div key={person.id} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded flex items-start justify-between">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">
                      {person.prenom} {person.nom}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {person.numero_taj}
                    </p>
                  </div>
                  <Badge>{roleLabels[person.role] || person.role}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Infractions */}
        {infractions.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              ⚖️ Infractions ({infractions.length})
            </h3>
            <div className="space-y-2">
              {infractions.map((inf) => (
                <div key={inf.id} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded">
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {inf.code_natinf} — {inf.libelle}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {inf.categorie}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Decisions */}
        {decisions.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              📋 Décisions de justice ({decisions.length})
            </h3>
            <div className="space-y-3">
              {decisions.map((dec) => (
                <div key={dec.id} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded">
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {dec.type}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    {new Date(dec.date_decision).toLocaleDateString("fr-FR")} — {dec.juridiction}
                  </p>
                  {dec.peine && (
                    <p className="text-sm text-zinc-900 dark:text-white mt-2">{dec.peine}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Evidence */}
        {evidence.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              🔒 Pièces à conviction ({evidence.length})
            </h3>
            <div className="space-y-2">
              {evidence.map((e) => (
                <div key={e.id} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {e.numero_scelle}
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {e.description}
                      </p>
                    </div>
                    <Badge>{e.statut.replace(/_/g, " ")}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
