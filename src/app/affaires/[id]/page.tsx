"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
  personne_id: string;
  prenom: string;
  nom: string;
  numero_taj: string;
  role: string;
}
interface AffaireInfraction {
  id: string;
  infraction_id: number;
  code_natinf: string;
  libelle: string;
  categorie: string;
}
interface CatalogInfraction {
  id: number;
  code_natinf: string;
  libelle: string;
  categorie: string;
}
interface AffaireDecision {
  id: string;
  type: string;
  date_decision: string;
  juridiction: string | null;
  peine: string | null;
  description?: string | null;
}

const DECISION_TYPES: { value: string; label: string }[] = [
  { value: "condamnation", label: "Condamnation" },
  { value: "relaxe", label: "Relaxe" },
  { value: "acquittement", label: "Acquittement" },
  { value: "classement_sans_suite", label: "Classement sans suite" },
  { value: "non_lieu", label: "Non-lieu" },
  { value: "sursis", label: "Sursis" },
  { value: "sursis_probatoire", label: "Sursis probatoire" },
  { value: "amende", label: "Amende" },
];
interface AffaireEvidence {
  id: string;
  numero_scelle: string | null;
  description: string;
  statut: string;
}

const SCELLE_STATUTS: { value: string; label: string }[] = [
  { value: "conserve", label: "Conservé" },
  { value: "en_analyse", label: "En analyse" },
  { value: "restitue", label: "Restitué" },
  { value: "detruit", label: "Détruit" },
];
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
  const [showDecForm, setShowDecForm] = useState(false);
  const [savingDec, setSavingDec] = useState(false);
  const [decErr, setDecErr] = useState<string | null>(null);
  // Infractions (catalogue NATINF + ajout)
  const [catalog, setCatalog] = useState<CatalogInfraction[]>([]);
  const [showInfForm, setShowInfForm] = useState(false);
  const [addingInf, setAddingInf] = useState(false);
  const [infErr, setInfErr] = useState<string | null>(null);
  const [selInf, setSelInf] = useState<string>("");
  // Scellés (ajout)
  const [showScelleForm, setShowScelleForm] = useState(false);
  const [savingScelle, setSavingScelle] = useState(false);
  const [scelleErr, setScelleErr] = useState<string | null>(null);
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

  // NATINF catalogue for the "add infraction" picker.
  useEffect(() => {
    apiClient
      .fetchInfractions()
      .then((d) => setCatalog(d as CatalogInfraction[]))
      .catch(() => setCatalog([]));
  }, []);

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

  const handleAddDecision = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingDec(true);
    setDecErr(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      type: form.get("type"),
      date_decision: form.get("date_decision"),
      juridiction: form.get("juridiction") || null,
      peine: form.get("peine") || null,
      description: form.get("description") || null,
    };
    try {
      const created = (await apiClient.createDecision(id, payload)) as AffaireDecision;
      setData((prev) =>
        prev ? { ...prev, decisions: [created, ...prev.decisions] } : prev
      );
      setShowDecForm(false);
    } catch (err) {
      setDecErr((err as ApiError).message || "Erreur lors de l'enregistrement");
    } finally {
      setSavingDec(false);
    }
  };

  const handleAddInfraction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selInf) {
      setInfErr("Sélectionnez une infraction.");
      return;
    }
    setAddingInf(true);
    setInfErr(null);
    try {
      const created = (await apiClient.addInfraction(id, Number(selInf))) as {
        id: string;
        infraction_id: number;
      };
      const cat = catalog.find((c) => c.id === Number(selInf));
      const row: AffaireInfraction = {
        id: created.id,
        infraction_id: created.infraction_id,
        code_natinf: cat?.code_natinf ?? "",
        libelle: cat?.libelle ?? "",
        categorie: cat?.categorie ?? "",
      };
      setData((prev) =>
        prev ? { ...prev, infractions: [...prev.infractions, row] } : prev
      );
      setShowInfForm(false);
      setSelInf("");
    } catch (err) {
      setInfErr((err as ApiError).message || "Erreur lors de l'ajout");
    } finally {
      setAddingInf(false);
    }
  };

  const handleAddScelle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingScelle(true);
    setScelleErr(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      description: form.get("description"),
      date_saisie: form.get("date_saisie"),
      lieu_stockage: form.get("lieu_stockage") || null,
      statut: form.get("statut") || null,
      numero_scelle: form.get("numero_scelle") || null,
    };
    try {
      const created = (await apiClient.addScelle(id, payload)) as AffaireEvidence;
      setData((prev) =>
        prev ? { ...prev, evidence: [created, ...prev.evidence] } : prev
      );
      setShowScelleForm(false);
    } catch (err) {
      setScelleErr((err as ApiError).message || "Erreur lors de la mise sous scellé");
    } finally {
      setSavingScelle(false);
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
            <div className="space-y-2">
              {people.map((person) => (
                <Link
                  key={person.id}
                  href={`/personnes/${person.personne_id}`}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:border-sky-500/30 hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white text-xs font-bold ring-1 ring-white/10">
                      {person.prenom[0]}
                    </span>
                    <div>
                      <p className="font-medium text-white group-hover:text-sky-200 transition-colors">
                        {person.prenom} {person.nom}
                      </p>
                      <p className="text-xs font-mono text-sky-300/70">
                        {person.numero_taj}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{roleLabels[person.role] || person.role}</Badge>
                    <Icon
                      name="arrowRight"
                      className="w-4 h-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-400"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* Infractions */}
        {(infractions.length > 0 || perms?.insert?.affaire_infractions) && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2.5 text-base font-semibold text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/10 text-sky-300 ring-1 ring-inset ring-sky-500/20">
                  <Icon name="scale" className="w-4 h-4" />
                </span>
                Infractions
                <span className="text-xs font-normal text-zinc-500 tabular-nums">
                  ({infractions.length})
                </span>
              </h3>
              {perms?.insert?.affaire_infractions && (
                <Button
                  size="sm"
                  variant={showInfForm ? "secondary" : "primary"}
                  onClick={() => { setInfErr(null); setShowInfForm((v) => !v); }}
                >
                  {showInfForm ? "Fermer" : (<><Icon name="plus" className="w-4 h-4" />Ajouter</>)}
                </Button>
              )}
            </div>

            {showInfForm && perms?.insert?.affaire_infractions && (
              <form
                onSubmit={handleAddInfraction}
                className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
              >
                {infErr && (
                  <div className="p-3.5 rounded-lg bg-red-500/[0.08] border border-red-500/30 flex items-start gap-2.5">
                    <Icon name="alertTriangle" className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                    <p className="text-red-300 text-sm">{infErr}</p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select
                    value={selInf}
                    onChange={(e) => setSelInf(e.target.value)}
                    className="flex-1"
                  >
                    <option value="">Sélectionner une infraction (NATINF)…</option>
                    {catalog.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code_natinf} — {c.libelle}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" variant="primary" disabled={addingInf || !selInf}>
                    {addingInf ? "Ajout…" : "Ajouter"}
                  </Button>
                </div>
              </form>
            )}

            {infractions.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucune infraction qualifiée.</p>
            ) : (
              <div className="space-y-2">
                {infractions.map((inf) => (
                  <div key={inf.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="font-medium text-white">
                      <span className="font-mono text-sky-300">{inf.code_natinf}</span> — {inf.libelle}
                    </p>
                    <p className="text-xs text-zinc-500 capitalize">
                      {inf.categorie.replace(/_/g, " ")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Decisions */}
        {(decisions.length > 0 || perms?.insert?.decisions_justice) && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2.5 text-base font-semibold text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/10 text-sky-300 ring-1 ring-inset ring-sky-500/20">
                  <Icon name="document" className="w-4 h-4" />
                </span>
                Décisions de justice
                <span className="text-xs font-normal text-zinc-500 tabular-nums">
                  ({decisions.length})
                </span>
              </h3>
              {perms?.insert?.decisions_justice && (
                <Button
                  size="sm"
                  variant={showDecForm ? "secondary" : "primary"}
                  onClick={() => { setDecErr(null); setShowDecForm((v) => !v); }}
                >
                  {showDecForm ? "Fermer" : (<><Icon name="plus" className="w-4 h-4" />Ajouter une décision</>)}
                </Button>
              )}
            </div>

            {showDecForm && perms?.insert?.decisions_justice && (
              <form
                onSubmit={handleAddDecision}
                className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
              >
                {decErr && (
                  <div className="md:col-span-2 p-3.5 rounded-lg bg-red-500/[0.08] border border-red-500/30 flex items-start gap-2.5">
                    <Icon name="alertTriangle" className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                    <p className="text-red-300 text-sm">{decErr}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Type *</label>
                  <Select name="type" required defaultValue="">
                    <option value="" disabled>Sélectionner</option>
                    {DECISION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Date de la décision *</label>
                  <Input
                    type="date"
                    name="date_decision"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Juridiction</label>
                  <Input name="juridiction" placeholder="Tribunal judiciaire de Paris" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Peine</label>
                  <Input name="peine" placeholder="2 ans dont 1 avec sursis…" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
                  <textarea
                    name="description"
                    rows={2}
                    placeholder="Motivation / observations…"
                    className="w-full px-3.5 py-2 rounded-lg border border-white/10 bg-[#0b0e14] text-zinc-100 placeholder:text-zinc-500 transition-colors focus:outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <Button type="submit" variant="primary" disabled={savingDec}>
                    {savingDec ? "Enregistrement…" : "Enregistrer la décision"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowDecForm(false)}>
                    Annuler
                  </Button>
                </div>
              </form>
            )}

            {decisions.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucune décision enregistrée.</p>
            ) : (
              <div className="space-y-3">
                {decisions.map((dec) => (
                  <div key={dec.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white capitalize">
                        {dec.type.replace(/_/g, " ")}
                      </p>
                      <span className="text-xs text-zinc-500 whitespace-nowrap">
                        {new Date(dec.date_decision).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    {dec.juridiction && (
                      <p className="text-xs text-zinc-400 mt-0.5">{dec.juridiction}</p>
                    )}
                    {dec.peine && (
                      <p className="text-sm text-zinc-200 mt-2">{dec.peine}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Evidence / scellés */}
        {(evidence.length > 0 || perms?.insert?.scelles) && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2.5 text-base font-semibold text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/10 text-sky-300 ring-1 ring-inset ring-sky-500/20">
                  <Icon name="lock" className="w-4 h-4" />
                </span>
                Pièces à conviction
                <span className="text-xs font-normal text-zinc-500 tabular-nums">
                  ({evidence.length})
                </span>
              </h3>
              {perms?.insert?.scelles && (
                <Button
                  size="sm"
                  variant={showScelleForm ? "secondary" : "primary"}
                  onClick={() => { setScelleErr(null); setShowScelleForm((v) => !v); }}
                >
                  {showScelleForm ? "Fermer" : (<><Icon name="plus" className="w-4 h-4" />Mettre sous scellé</>)}
                </Button>
              )}
            </div>

            {showScelleForm && perms?.insert?.scelles && (
              <form
                onSubmit={handleAddScelle}
                className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
              >
                {scelleErr && (
                  <div className="md:col-span-2 p-3.5 rounded-lg bg-red-500/[0.08] border border-red-500/30 flex items-start gap-2.5">
                    <Icon name="alertTriangle" className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                    <p className="text-red-300 text-sm">{scelleErr}</p>
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description *</label>
                  <Input name="description" required placeholder="Couteau de cuisine, 20 cm…" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Date de saisie *</label>
                  <Input
                    type="date"
                    name="date_saisie"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Statut</label>
                  <Select name="statut" defaultValue="conserve">
                    {SCELLE_STATUTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">N° de scellé</label>
                  <Input name="numero_scelle" placeholder="SC-2026-0001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Lieu de stockage</label>
                  <Input name="lieu_stockage" placeholder="Salle des scellés — étagère B" />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <Button type="submit" variant="primary" disabled={savingScelle}>
                    {savingScelle ? "Enregistrement…" : "Mettre sous scellé"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowScelleForm(false)}>
                    Annuler
                  </Button>
                </div>
              </form>
            )}

            {evidence.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucune pièce sous scellé.</p>
            ) : (
              <div className="space-y-2">
                {evidence.map((e) => (
                  <div key={e.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium font-mono text-white">
                          {e.numero_scelle || "— sans n°"}
                        </p>
                        <p className="text-sm text-zinc-400">{e.description}</p>
                      </div>
                      <Badge>{e.statut.replace(/_/g, " ")}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
