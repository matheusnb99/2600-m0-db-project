"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Badge, Button } from "@/components/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";

export default function SignalementDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [signalement, setSignalement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchSignalement = async () => {
      try {
        setLoading(true);
        const data = await apiClient.fetchSignalement(id);
        setSignalement(data);
      } catch (err) {
        setError((err as ApiError).message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchSignalement();
  }, [id]);

  const handleDeactivate = async () => {
    if (!window.confirm("Désactiver ce signalement ?")) return;

    setIsUpdating(true);
    try {
      const updated = await apiClient.deleteSignalement(id);
      setSignalement(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error updating signalement");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading)
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </AdminLayout>
    );

  if (error || !signalement)
    return (
      <AdminLayout>
        <Card className="p-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
          <p className="text-red-700 dark:text-red-200">{error || "Signalement not found"}</p>
        </Card>
      </AdminLayout>
    );

  const typeLabels: Record<string, string> = {
    fiche_s: "Fiche S",
    oqtf: "OQTF",
    avis_recherche: "Avis de recherche",
    mandat_arret: "Mandat d'arrêt",
    autre: "Autre",
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
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
              {typeLabels[signalement.type] || signalement.type}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Signalement #{signalement.id}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary">Éditer</Button>
            {signalement.actif && (
              <Button
                variant="danger"
                onClick={handleDeactivate}
                disabled={isUpdating}
              >
                {isUpdating ? "Désactivation..." : "Désactiver"}
              </Button>
            )}
          </div>
        </div>

        {/* Status Alert */}
        {!signalement.actif && (
          <Card className="p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800">
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              ℹ️ Ce signalement a été désactivé
            </p>
          </Card>
        )}

        {/* Main Info */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Informations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Type</p>
              <Badge>{typeLabels[signalement.type] || signalement.type}</Badge>
            </div>
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Priorité</p>
              <div className="space-y-1">
                <Badge
                  className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                >
                  P{signalement.priorite} - {priorityLabels[signalement.priorite]}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Statut</p>
              <Badge>{signalement.actif ? "Actif" : "Désactivé"}</Badge>
            </div>
          </div>
        </Card>

        {/* Person Info */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            👤 Personne signalée
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">
                {signalement.prenom} {signalement.nom}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {signalement.date_naissance
                  ? `Né(e) le ${new Date(signalement.date_naissance).toLocaleDateString("fr-FR")}`
                  : ""}
              </p>
            </div>
            <Button variant="secondary">Voir fiche</Button>
          </div>
        </Card>

        {/* Details */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Détails du signalement
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">Motif</p>
              <p className="text-zinc-900 dark:text-white">{signalement.motif}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                  Émis le
                </p>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {new Date(signalement.date_emission).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                  Expire le
                </p>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {signalement.date_expiration
                    ? new Date(signalement.date_expiration).toLocaleDateString("fr-FR")
                    : "Pas de limite"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Émetteur */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Émetteur
          </h3>
          <div className="text-sm">
            <p className="text-zinc-600 dark:text-zinc-400 mb-1">Service</p>
            <p className="font-medium text-zinc-900 dark:text-white">
              {signalement.service_nom || "—"}
            </p>
            {signalement.agent_nom && (
              <div className="mt-3">
                <p className="text-zinc-600 dark:text-zinc-400 mb-1">Agent responsable</p>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {signalement.agent_prenom} {signalement.agent_nom}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
