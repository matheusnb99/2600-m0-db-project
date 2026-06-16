"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, Badge, Button, Spinner, AccessDenied } from "@/components/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";

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
    const [error, setError] = useState<string | null>(null);

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
                if (active) setError((err as ApiError).message || "Erreur de chargement");
            } finally {
                if (active) setLoading(false);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [id]);

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
                <AccessDenied message={error} />
            </AdminLayout>
        );
    }

    if (!data || !data.person) {
        return (
            <AdminLayout>
                <Card className="p-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
                <p className="text-red-700 dark:text-red-200">{"Personne introuvable"}</p>
                </Card>
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
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                {person.prenom} {person.nom}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {person.numero_taj}
            </p>
            </div>
            <div className="flex gap-2">
            <Button variant="secondary">Éditer</Button>
            <Button variant="secondary">Historique</Button>
            </div>
        </div>

        {/* Main Info */}
        <Card className="p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Informations
            </h3>
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
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Classification</p>
                <Badge variant="default">
                {["NC", "CD", "SD", "TSD"][person.niveau_classification_id] || "—"}
                </Badge>
            </div>
            </div>
        </Card>

        {/* Alerts */}
        {alerts.length > 0 && (
            <Card className="p-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-4">
                🚨 Signalements actifs ({alerts.length})
            </h3>
            <div className="space-y-2">
                {alerts.map((alert) => (
                <div key={alert.id} className="p-3 bg-white dark:bg-zinc-800 rounded border border-red-200 dark:border-red-800">
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
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                📍 Adresses ({addresses.length})
            </h3>
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
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                📞 Téléphones ({phones.length})
            </h3>
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
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                🏷️ Alias ({aliases.length})
            </h3>
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
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                🔐 Données biométriques ({biometrics.reduce((sum, b) => sum + parseInt(b.count), 0)})
            </h3>
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
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                📋 Affaires impliquées ({cases.length})
            </h3>
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
