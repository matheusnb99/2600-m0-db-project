"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, Badge, Button, Input, Select, SectionTitle, ApiErrorView } from "@/components/ui";
import { Icon } from "@/components/icons";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";
import { usePermissions } from "@/lib/use-permissions";

interface SignalementDetail {
  id: number;
  personne_id: string;
  type: string;
  priorite: number;
  actif: boolean;
  prenom: string;
  nom: string;
  date_naissance: string | null;
  motif: string;
  date_emission: string;
  date_expiration: string | null;
  service_nom: string | null;
  agent_nom: string | null;
  agent_prenom: string | null;
}

export default function SignalementDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [signalement, setSignalement] = useState<SignalementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);
  const perms = usePermissions();

  useEffect(() => {
    const fetchSignalement = async () => {
      try {
        setLoading(true);
        const data = await apiClient.fetchSignalement(id);
        setSignalement(data as SignalementDetail);
      } catch (err) {
        setError(err as ApiError);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchSignalement();
  }, [id]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setEditErr(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      motif: form.get("motif") || null,
      date_expiration: form.get("date_expiration") || null,
      priorite: Number(form.get("priorite")),
    };
    try {
      const updated = await apiClient.updateSignalement(id, payload);
      setSignalement((prev) => (prev ? { ...prev, ...(updated as Partial<SignalementDetail>) } : prev));
      setEditing(false);
    } catch (err) {
      setEditErr((err as ApiError).message || "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm("Désactiver ce signalement ?")) return;

    setIsUpdating(true);
    try {
      const updated = await apiClient.deleteSignalement(id);
      setSignalement(updated as SignalementDetail);
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
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full border-2 border-sky-500/15" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-400 animate-spin" />
          </div>
        </div>
      </AdminLayout>
    );

  if (error)
    return (
      <AdminLayout>
        <ApiErrorView error={error} onRetry={() => location.reload()} />
      </AdminLayout>
    );

  if (!signalement)
    return (
      <AdminLayout>
        <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-6 flex items-center gap-3">
          <Icon name="alertTriangle" className="w-5 h-5 text-red-400" />
          <p className="text-red-200">Signalement introuvable</p>
        </div>
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
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-300 ring-1 ring-inset ring-red-500/20">
              <Icon name="siren" className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {typeLabels[signalement.type] || signalement.type}
              </h1>
              <p className="text-sm font-mono text-zinc-400 mt-0.5">
                Signalement #{signalement.id}
              </p>
            </div>
          </div>
          {perms?.update?.signalements && (
            <div className="flex gap-2">
              <Button
                variant={editing ? "secondary" : "primary"}
                onClick={() => { setEditErr(null); setEditing((v) => !v); }}
              >
                {editing ? "Fermer" : (<><Icon name="document" className="w-4 h-4" />Éditer</>)}
              </Button>
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
          )}
        </div>

        {/* Inline edit panel */}
        {editing && perms?.update?.signalements && (
          <Card className="p-6">
            <SectionTitle icon={<Icon name="document" className="w-4 h-4" />}>
              Modifier le signalement
            </SectionTitle>
            {editErr && (
              <div className="mb-4 p-3.5 rounded-lg bg-red-500/[0.08] border border-red-500/30 flex items-start gap-2.5">
                <Icon name="alertTriangle" className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                <p className="text-red-300 text-sm">{editErr}</p>
              </div>
            )}
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Priorité</label>
                <Select name="priorite" defaultValue={signalement.priorite}>
                  <option value={0}>P0 — Basse</option>
                  <option value={1}>P1 — Normale</option>
                  <option value={2}>P2 — Haute</option>
                  <option value={3}>P3 — Critique</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Date d&apos;expiration</label>
                <Input
                  type="date"
                  name="date_expiration"
                  defaultValue={signalement.date_expiration ? signalement.date_expiration.slice(0, 10) : ""}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Motif</label>
                <textarea
                  name="motif"
                  rows={3}
                  defaultValue={signalement.motif}
                  className="w-full px-3.5 py-2 rounded-lg border border-white/10 bg-[#0b0e14] text-zinc-100 placeholder:text-zinc-500 transition-colors focus:outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
              <div className="md:col-span-2 flex gap-3 pt-2">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Status Alert */}
        {!signalement.actif && (
          <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
            <Icon name="info" className="w-4 h-4 text-zinc-400" />
            <p className="text-zinc-300 text-sm">Ce signalement a été désactivé</p>
          </div>
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
          <SectionTitle icon={<Icon name="user" className="w-4 h-4" />}>
            Personne signalée
          </SectionTitle>
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
            <Link href={`/personnes/${signalement.personne_id}`}>
              <Button variant="secondary">Voir fiche</Button>
            </Link>
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
