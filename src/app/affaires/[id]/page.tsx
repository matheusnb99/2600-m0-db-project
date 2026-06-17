"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, Badge, Button, Input, Select, SectionTitle, ApiErrorView } from "@/components/ui";
import { Icon } from "@/components/icons";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";
import { usePermissions } from "@/lib/use-permissions";

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
  const [error, setError] = useState<ApiError | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);
  // Only roles that may UPDATE affaires (agent_saisie, opj, magistrat) see
  // "Éditer"; analyste_renseignement has SELECT only.
  const perms = usePermissions();

  useEffect(() => {
    const fetchAffaire = async () => {
      try {
        setLoading(true);
        const affaire = await apiClient.fetchAffaire(id);
        setData(affaire as AffaireDetail);
      } catch (err) {
        setError(err as ApiError);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchAffaire();
  }, [id]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setEditErr(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      statut: form.get("statut") || null,
      lieu_faits: form.get("lieu_faits") || null,
      description: form.get("description") || null,
      date_cloture: form.get("date_cloture") || null,
    };
    try {
      const updated = (await apiClient.updateAffaire(id, payload)) as Partial<AffaireInfo>;
      setData((prev) =>
        prev ? { ...prev, affaire: { ...prev.affaire, ...updated } } : prev
      );
      setEditing(false);
    } catch (err) {
      setEditErr((err as ApiError).message || "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
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

  if (!data)
    return (
      <AdminLayout>
        <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-6 flex items-center gap-3">
          <Icon name="alertTriangle" className="w-5 h-5 text-red-400" />
          <p className="text-red-200">Affaire introuvable</p>
        </div>
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
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/20">
              <Icon name="folder" className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold font-mono text-white">
                {affaire.numero_pv}
              </h1>
              <p className="text-sm text-zinc-400 mt-0.5">
                Ouvert le {new Date(affaire.date_ouverture).toLocaleDateString("fr-FR")}
              </p>
            </div>
          </div>
          {perms?.update?.affaires && (
            <Button
              variant={editing ? "secondary" : "primary"}
              onClick={() => { setEditErr(null); setEditing((v) => !v); }}
            >
              {editing ? "Fermer" : (<><Icon name="document" className="w-4 h-4" />Éditer</>)}
            </Button>
          )}
        </div>

        {/* Inline edit panel */}
        {editing && perms?.update?.affaires && (
          <Card className="p-6">
            <SectionTitle icon={<Icon name="document" className="w-4 h-4" />}>
              Modifier l&apos;affaire
            </SectionTitle>
            {editErr && (
              <div className="mb-4 p-3.5 rounded-lg bg-red-500/[0.08] border border-red-500/30 flex items-start gap-2.5">
                <Icon name="alertTriangle" className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                <p className="text-red-300 text-sm">{editErr}</p>
              </div>
            )}
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Statut</label>
                <Select name="statut" defaultValue={affaire.statut}>
                  <option value="en_cours">En cours</option>
                  <option value="cloturee">Clôturée</option>
                  <option value="classee_sans_suite">Classée sans suite</option>
                  <option value="renvoyee_justice">Renvoyée en justice</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Date de clôture</label>
                <Input type="date" name="date_cloture" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Lieu des faits</label>
                <Input name="lieu_faits" defaultValue={affaire.lieu_faits ?? ""} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={affaire.description ?? ""}
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
            <SectionTitle icon={<Icon name="users" className="w-4 h-4" />} count={people.length}>
              Personnes impliquées
            </SectionTitle>
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
            <SectionTitle icon={<Icon name="scale" className="w-4 h-4" />} count={infractions.length}>
              Infractions
            </SectionTitle>
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
            <SectionTitle icon={<Icon name="document" className="w-4 h-4" />} count={decisions.length}>
              Décisions de justice
            </SectionTitle>
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
            <SectionTitle icon={<Icon name="lock" className="w-4 h-4" />} count={evidence.length}>
              Pièces à conviction
            </SectionTitle>
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
