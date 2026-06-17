"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Select, NotAuthorized } from "@/components/ui";
import { Icon } from "@/components/icons";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";
import { usePermissions } from "@/lib/use-permissions";
import { useAuth } from "@/context/AuthContext";

interface ClassificationOption {
  id: number;
  code: string;
  libelle: string;
}
interface ServiceOption {
  id: number;
  nom: string;
}
interface PersonneHit {
  id: string;
  prenom: string;
  nom: string;
  numero_taj: string;
  date_naissance: string | null;
}

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "fiche_s", label: "Fiche S" },
  { value: "oqtf", label: "OQTF" },
  { value: "avis_recherche", label: "Avis de recherche" },
  { value: "mandat_arret", label: "Mandat d'arrêt" },
  { value: "autre", label: "Autre" },
];

const PRIORITY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "P0 — Basse" },
  { value: 1, label: "P1 — Normale" },
  { value: 2, label: "P2 — Haute" },
  { value: 3, label: "P3 — Critique" },
];

export default function CreateSignalementPage() {
  const router = useRouter();
  const { agent } = useAuth();
  const perms = usePermissions();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classifications, setClassifications] = useState<ClassificationOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);

  // Person picker state
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<PersonneHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<PersonneHit | null>(null);

  useEffect(() => {
    apiClient
      .fetchClassifications()
      .then((data) => setClassifications(data as ClassificationOption[]))
      .catch(() => setClassifications([]));
    apiClient
      .fetchServices()
      .then((data) => setServices(data as ServiceOption[]))
      .catch(() => setServices([]));
  }, []);

  // Debounced person search (RLS-filtered server-side, like the list page).
  useEffect(() => {
    if (selected || search.trim().length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      apiClient
        .fetchPersonnes({ search, limit: 8 })
        .then((data) => setHits(data as PersonneHit[]))
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selected]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selected) {
      setError("Sélectionnez la personne à signaler.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const data = {
      personne_id: selected.id,
      type: form.get("type"),
      motif: form.get("motif"),
      emis_par_service_id: Number(form.get("emis_par_service_id")) || null,
      emis_par_agent_id: agent?.id ?? null,
      niveau_classification_id: Number(form.get("niveau_classification_id")) || null,
      priorite: Number(form.get("priorite")),
      date_expiration: form.get("date_expiration") || null,
    };

    try {
      const created = (await apiClient.createSignalement(data)) as { id: string };
      router.push(`/signalements/${created.id}`);
    } catch (err) {
      setError((err as ApiError).message || "Erreur lors de la création");
    } finally {
      setIsLoading(false);
    }
  };

  if (perms && !perms.insert.signalements) {
    return (
      <AdminLayout>
        <NotAuthorized />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-300 ring-1 ring-inset ring-red-500/20">
            <Icon name="siren" className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Nouveau signalement</h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              Émettre une fiche S, OQTF, avis de recherche ou mandat
            </p>
          </div>
        </div>

        <Card className="p-6">
          {error && (
            <div className="mb-6 p-3.5 rounded-lg bg-red-500/[0.08] border border-red-500/30 flex items-start gap-2.5">
              <Icon name="alertTriangle" className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personne signalée */}
            <div>
              <h3 className="font-semibold text-white mb-4">Personne signalée *</h3>
              {selected ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div>
                    <p className="font-medium text-white">
                      {selected.prenom} {selected.nom}
                    </p>
                    <p className="text-xs font-mono text-sky-300/80">
                      {selected.numero_taj}
                      {selected.date_naissance
                        ? ` · ${new Date(selected.date_naissance).toLocaleDateString("fr-FR")}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelected(null);
                      setSearch("");
                    }}
                  >
                    Changer
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Icon
                    name="search"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
                  />
                  <Input
                    className="pl-9"
                    placeholder="Rechercher par nom ou prénom…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoComplete="off"
                  />
                  {(searching || hits.length > 0) && (
                    <div className="mt-2 rounded-lg border border-white/10 bg-[#0b0e14] divide-y divide-white/[0.05] overflow-hidden">
                      {searching && (
                        <p className="px-4 py-2.5 text-sm text-zinc-500">Recherche…</p>
                      )}
                      {!searching &&
                        hits.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelected(p)}
                            className="w-full text-left px-4 py-2.5 hover:bg-white/[0.04] transition-colors cursor-pointer"
                          >
                            <span className="text-sm font-medium text-white">
                              {p.prenom} {p.nom}
                            </span>
                            <span className="ml-2 text-xs font-mono text-zinc-500">
                              {p.numero_taj}
                            </span>
                          </button>
                        ))}
                      {!searching && hits.length === 0 && search.trim().length >= 2 && (
                        <p className="px-4 py-2.5 text-sm text-zinc-500">
                          Aucune personne trouvée (ou non visible à votre niveau).
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Signalement */}
            <div>
              <h3 className="font-semibold text-white mb-4">Signalement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Type *
                  </label>
                  <Select name="type" required defaultValue="">
                    <option value="" disabled>
                      Sélectionner un type
                    </option>
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Priorité
                  </label>
                  <Select name="priorite" defaultValue={1}>
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Motif *
                  </label>
                  <textarea
                    name="motif"
                    rows={3}
                    required
                    placeholder="Motif du signalement…"
                    className="w-full px-3.5 py-2 rounded-lg border border-white/10 bg-[#0b0e14] text-zinc-100 placeholder:text-zinc-500 transition-colors focus:outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Date d&apos;expiration
                  </label>
                  <Input type="date" name="date_expiration" />
                </div>
              </div>
            </div>

            {/* Émetteur & sécurité */}
            <div>
              <h3 className="font-semibold text-white mb-4">Émetteur &amp; sécurité</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Service émetteur *
                  </label>
                  <Select name="emis_par_service_id" required defaultValue="">
                    <option value="" disabled>
                      Sélectionner un service
                    </option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nom}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Classification *
                  </label>
                  <Select name="niveau_classification_id" required defaultValue="">
                    <option value="" disabled>
                      Sélectionner
                    </option>
                    {classifications.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.libelle}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/[0.07]">
              <Button type="submit" variant="danger" disabled={isLoading || !selected}>
                {isLoading ? "Création en cours…" : "Émettre le signalement"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AdminLayout>
  );
}
