"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, Badge, Button, Input, Select, Spinner, ApiErrorView, ClassificationTag, SectionTitle } from "@/components/ui";
import { Icon } from "@/components/icons";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";
import { usePermissions } from "@/lib/use-permissions";

interface PersonInfo {
  prenom: string;
  nom: string;
  numero_taj: string;
  statut: string;
  date_naissance: string | null;
  sexe: string;
  lieu_naissance: string | null;
  nationalite: string;
  niveau_classification_id: number;
}
interface PersonAlias {
  id: number;
  alias_prenom: string;
  alias_nom: string;
}
interface PersonAddress {
  id: number;
  adresse_ligne1: string;
  adresse_ligne2: string | null;
  code_postal: string;
  ville: string;
  pays: string;
  type: string;
}
interface PersonPhone {
  id: number;
  numero: string;
  type: string;
  actif: boolean;
}
interface PersonBiometric {
  type: string;
  count: string;
}
interface PersonCase {
  affaire_id: number;
  numero_pv: string;
  role: string;
  statut: string;
}
interface PersonAlert {
  id: number;
  type: string;
  motif: string;
  priorite: number;
}
interface PersonneDetail {
  person: PersonInfo | null;
  aliases: PersonAlias[];
  addresses: PersonAddress[];
  phones: PersonPhone[];
  biometrics: PersonBiometric[];
  cases: PersonCase[];
  alerts: PersonAlert[];
}

export default function Page() {
    const params = useParams();
    const id = params.id as string;

    const [data, setData] = useState<PersonneDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<ApiError | null>(null);
    // Inline edit (gated by the DB UPDATE grant — see perms below).
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editErr, setEditErr] = useState<string | null>(null);
    const [classifications, setClassifications] = useState<{ id: number; code: string; libelle: string }[]>([]);
    // Real GRANTs of the connected role (has_table_privilege). Only show
    // "Éditer" to roles that may UPDATE personnes (agent_saisie, opj) — the DB
    // would reject the others anyway, so we never offer the action.
    const perms = usePermissions();

    useEffect(() => {
        apiClient
            .fetchClassifications()
            .then((d) => setClassifications(d as { id: number; code: string; libelle: string }[]))
            .catch(() => setClassifications([]));
    }, []);

    useEffect(() => {
        if (!id) return;
        let active = true;
        // apiClient forwards the Bearer token so the RLS / Bell-LaPadula session
        // is opened — a server component could never read the localStorage token.
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const d = await apiClient.fetchPersonne(id);
                if (active) setData(d as PersonneDetail);
            } catch (err) {
                if (active) setError(err as ApiError);
            } finally {
                if (active) setLoading(false);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [id]);

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        setEditErr(null);
        const form = new FormData(e.currentTarget);
        const payload = {
            nom: form.get("nom"),
            prenom: form.get("prenom"),
            date_naissance: form.get("date_naissance") || null,
            lieu_naissance: form.get("lieu_naissance") || null,
            nationalite: form.get("nationalite") || null,
            sexe: form.get("sexe") || null,
            niveau_classification_id: Number(form.get("niveau_classification_id")) || null,
            statut: form.get("statut") || null,
        };
        try {
            const updated = (await apiClient.updatePersonne(id, payload)) as Partial<PersonInfo>;
            setData((prev) =>
                prev && prev.person ? { ...prev, person: { ...prev.person, ...updated } } : prev
            );
            setEditing(false);
        } catch (err) {
            setEditErr((err as ApiError).message || "Erreur lors de la mise à jour");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <Spinner label="Chargement de la fiche…" />
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout>
                <ApiErrorView error={error} onRetry={() => location.reload()} />
            </AdminLayout>
        );
    }

    if (!data || !data.person) {
        return (
            <AdminLayout>
                <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-6 flex items-center gap-3">
                    <Icon name="alertTriangle" className="w-5 h-5 text-red-400" />
                    <p className="text-red-200">Personne introuvable</p>
                </div>
            </AdminLayout>
        );
    }

    const person = data.person;
    const { aliases, addresses, phones, biometrics, cases, alerts } = data;
    const sexLabels: Record<string, string> = { M: "Masculin", F: "Féminin", I: "Indéterminé" };
    const statusLabels: Record<string, string> = {
        actif: "Actif",
        archive: "Archivé",
        supprime: "Supprimé",
    };

    return (
    <AdminLayout>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white text-xl font-bold ring-2 ring-white/10">
                {person.prenom[0]}
            </div>
            <div>
            <h1 className="text-2xl font-bold text-white">
                {person.prenom} {person.nom}
            </h1>
            <p className="text-sm font-mono text-sky-300/80 mt-0.5">
                {person.numero_taj}
            </p>
            </div>
            </div>
            <div className="flex gap-2">
            {perms?.update?.personnes && (
                <Button variant={editing ? "secondary" : "primary"} onClick={() => { setEditErr(null); setEditing((v) => !v); }}>
                    {editing ? "Fermer" : (<><Icon name="document" className="w-4 h-4" />Éditer</>)}
                </Button>
            )}
            </div>
        </div>

        {/* Inline edit panel */}
        {editing && perms?.update?.personnes && (
            <Card className="p-6">
            <SectionTitle icon={<Icon name="document" className="w-4 h-4" />}>
                Modifier la fiche
            </SectionTitle>
            {editErr && (
                <div className="mb-4 p-3.5 rounded-lg bg-red-500/[0.08] border border-red-500/30 flex items-start gap-2.5">
                <Icon name="alertTriangle" className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                <p className="text-red-300 text-sm">{editErr}</p>
                </div>
            )}
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Prénom</label>
                <Input name="prenom" defaultValue={person.prenom} required />
                </div>
                <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nom</label>
                <Input name="nom" defaultValue={person.nom} required />
                </div>
                <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Date de naissance</label>
                <Input type="date" name="date_naissance" defaultValue={person.date_naissance ? person.date_naissance.slice(0, 10) : ""} />
                </div>
                <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Lieu de naissance</label>
                <Input name="lieu_naissance" defaultValue={person.lieu_naissance ?? ""} />
                </div>
                <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Sexe</label>
                <Select name="sexe" defaultValue={person.sexe ?? ""}>
                    <option value="">Non spécifié</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                    <option value="I">Indéterminé</option>
                </Select>
                </div>
                <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nationalité</label>
                <Input name="nationalite" defaultValue={person.nationalite ?? ""} />
                </div>
                <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Statut</label>
                <Select name="statut" defaultValue={person.statut}>
                    <option value="actif">Actif</option>
                    <option value="archive">Archivé</option>
                    <option value="en_cours_verification">En vérification</option>
                    <option value="supprime">Supprimé</option>
                </Select>
                </div>
                <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Classification</label>
                <Select name="niveau_classification_id" defaultValue={person.niveau_classification_id}>
                    {classifications.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} — {c.libelle}</option>
                    ))}
                </Select>
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
            <SectionTitle icon={<Icon name="user" className="w-4 h-4" />}>
            Informations
            </SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Statut</p>
                <Badge>{statusLabels[person.statut] || person.statut}</Badge>
            </div>
            <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Date de naissance</p>
                <p className="font-medium text-zinc-900 dark:text-white">
                {person.date_naissance
                    ? new Date(person.date_naissance).toLocaleDateString("fr-FR")
                    : "—"}
                </p>
            </div>
            <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Sexe</p>
                <p className="font-medium text-zinc-900 dark:text-white">
                {sexLabels[person.sexe] || "—"}
                </p>
            </div>
            <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Lieu de naissance</p>
                <p className="font-medium text-zinc-900 dark:text-white">
                {person.lieu_naissance || "—"}
                </p>
            </div>
            <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Nationalité</p>
                <p className="font-medium text-zinc-900 dark:text-white">
                {person.nationalite}
                </p>
            </div>
            <div>
                <p className="text-sm text-zinc-400 mb-1.5">Classification</p>
                <ClassificationTag
                code={classifications.find((c) => c.id === person.niveau_classification_id)?.code ?? "—"}
                />
            </div>
            </div>
        </Card>

        {/* Alerts */}
        {alerts.length > 0 && (
            <Card className="p-6 border-red-500/30! bg-red-500/[0.05]!">
            <h3 className="flex items-center gap-2.5 text-base font-semibold text-red-300 mb-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/25">
                    <Icon name="siren" className="w-4 h-4" />
                </span>
                Signalements actifs
                <span className="text-xs font-normal text-red-400/70">({alerts.length})</span>
            </h3>
            <div className="space-y-2">
                {alerts.map((alert) => (
                <div key={alert.id} className="p-3 bg-black/20 rounded-lg border border-red-500/20">
                    <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <p className="font-medium text-zinc-900 dark:text-white">
                        {alert.type.replace(/_/g, " ").toUpperCase()}
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        {alert.motif}
                        </p>
                    </div>
                    <Badge variant="danger">P{alert.priorite}</Badge>
                    </div>
                </div>
                ))}
            </div>
            </Card>
        )}

        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Addresses */}
            <Card className="p-6">
            <SectionTitle icon={<Icon name="mapPin" className="w-4 h-4" />} count={addresses.length}>
                Adresses
            </SectionTitle>
            {addresses.length === 0 ? (
                <p className="text-sm text-zinc-500">Aucune adresse</p>
            ) : (
                <div className="space-y-3">
                {addresses.map((addr) => (
                    <div key={addr.id} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded">
                    <p className="font-medium text-zinc-900 dark:text-white text-sm">
                        {addr.adresse_ligne1}
                    </p>
                    {addr.adresse_ligne2 && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {addr.adresse_ligne2}
                        </p>
                    )}
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {addr.code_postal} {addr.ville}, {addr.pays}
                    </p>
                    <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                        {addr.type}
                        </span>
                    </div>
                    </div>
                ))}
                </div>
            )}
            </Card>

            {/* Phones */}
            <Card className="p-6">
            <SectionTitle icon={<Icon name="phone" className="w-4 h-4" />} count={phones.length}>
                Téléphones
            </SectionTitle>
            {phones.length === 0 ? (
                <p className="text-sm text-zinc-500">Aucun téléphone</p>
            ) : (
                <div className="space-y-2">
                {phones.map((phone) => (
                    <div
                    key={phone.id}
                    className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800 rounded"
                    >
                    <div>
                        <p className="font-mono text-sm text-zinc-900 dark:text-white">
                        {phone.numero}
                        </p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {phone.type}
                        </p>
                    </div>
                    {!phone.actif && (
                        <Badge>Inactif</Badge>
                    )}
                    </div>
                ))}
                </div>
            )}
            </Card>
        </div>

        {/* Other Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Aliases */}
            <Card className="p-6">
            <SectionTitle icon={<Icon name="tag" className="w-4 h-4" />} count={aliases.length}>
                Alias
            </SectionTitle>
            {aliases.length === 0 ? (
                <p className="text-sm text-zinc-500">Aucun alias</p>
            ) : (
                <div className="space-y-2">
                {aliases.map((alias) => (
                    <p key={alias.id} className="text-sm text-zinc-600 dark:text-zinc-400">
                    {alias.alias_prenom} {alias.alias_nom}
                    </p>
                ))}
                </div>
            )}
            </Card>

            {/* Biometrics */}
            <Card className="p-6">
            <SectionTitle
                icon={<Icon name="fingerprint" className="w-4 h-4" />}
                count={biometrics.reduce((sum, b) => sum + parseInt(b.count), 0)}
            >
                Données biométriques
            </SectionTitle>
            {biometrics.length === 0 ? (
                <p className="text-sm text-zinc-500">Aucune donnée biométrique</p>
            ) : (
                <div className="space-y-2">
                {biometrics.map((bio) => (
                    <p key={bio.type} className="text-sm text-zinc-600 dark:text-zinc-400">
                    {bio.type.replace(/_/g, " ")}: <strong>{bio.count}</strong>
                    </p>
                ))}
                </div>
            )}
            </Card>
        </div>

        {/* Cases */}
        {cases.length > 0 && (
            <Card className="p-6">
            <SectionTitle icon={<Icon name="folder" className="w-4 h-4" />} count={cases.length}>
                Affaires impliquées
            </SectionTitle>
            <div className="space-y-2">
                {cases.map((c) => (
                <div key={c.affaire_id} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded">
                    <p className="font-medium text-zinc-900 dark:text-white">
                    {c.numero_pv}
                    </p>
                    <div className="flex gap-2 mt-1">
                    <Badge>{c.role}</Badge>
                    <Badge variant="default">
                        {c.statut.replace(/_/g, " ")}
                    </Badge>
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
