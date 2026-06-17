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
  niveau: number;
}
interface ServiceOption {
  id: number;
  nom: string;
}

/** Current Bell-LaPadula working level from the `taj_level` cookie, if any. */
function workingLevelFromCookie(): number | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )taj_level=(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export default function CreateAffairePage() {
  const router = useRouter();
  const { agent } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classifications, setClassifications] = useState<ClassificationOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [classifId, setClassifId] = useState<string>("");
  // The list page hides the "Nouvelle affaire" link for roles without INSERT,
  // but this form is also reachable by direct URL — guard it here too.
  const perms = usePermissions();

  useEffect(() => {
    apiClient
      .fetchClassifications()
      .then((data) => {
        const cls = data as ClassificationOption[];
        setClassifications(cls);
        const lvl = workingLevelFromCookie() ?? agent?.habilitation_niveau ?? null;
        const match = lvl != null ? cls.find((c) => c.niveau === lvl) : undefined;
        if (match) setClassifId(String(match.id));
      })
      .catch(() => setClassifications([]));
    apiClient
      .fetchServices()
      .then((data) => setServices(data as ServiceOption[]))
      .catch(() => setServices([]));
  }, [agent]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const data = {
      numero_pv: form.get("numero_pv"),
      service_responsable_id: Number(form.get("service_responsable_id")) || null,
      niveau_classification_id: Number(form.get("niveau_classification_id")) || null,
      date_faits: form.get("date_faits") || null,
      date_ouverture: form.get("date_ouverture") || null,
      lieu_faits: form.get("lieu_faits") || null,
      description: form.get("description") || null,
    };

    try {
      const created = (await apiClient.createAffaire(data)) as { id: string };
      router.push(`/affaires/${created.id}`);
    } catch (err) {
      setError((err as ApiError).message || "Erreur lors de la création");
    } finally {
      setIsLoading(false);
    }
  };

  if (perms && !perms.insert.affaires) {
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
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/20">
            <Icon name="folder" className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Nouvelle affaire</h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              Ouvrir une nouvelle procédure au TAJ
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
            {/* Identification */}
            <div>
              <h3 className="font-semibold text-white mb-4">Identification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Numéro PV *
                  </label>
                  <Input name="numero_pv" placeholder="PV-2026-00123" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Service responsable *
                  </label>
                  <Select name="service_responsable_id" required>
                    <option value="">Sélectionner un service</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nom}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            {/* Faits */}
            <div>
              <h3 className="font-semibold text-white mb-4">Faits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Date des faits
                  </label>
                  <Input type="date" name="date_faits" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Date d&apos;ouverture
                  </label>
                  <Input
                    type="date"
                    name="date_ouverture"
                    defaultValue={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Lieu des faits
                  </label>
                  <Input name="lieu_faits" placeholder="Paris 12e — 75012" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={4}
                    placeholder="Résumé des faits constatés…"
                    className="w-full px-3.5 py-2 rounded-lg border border-white/10 bg-[#0b0e14] text-zinc-100 placeholder:text-zinc-500 transition-colors focus:outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Sécurité */}
            <div>
              <h3 className="font-semibold text-white mb-4">Sécurité</h3>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Classification *
                </label>
                <Select
                  name="niveau_classification_id"
                  required
                  value={classifId}
                  onChange={(e) => setClassifId(e.target.value)}
                >
                  <option value="">Sélectionner une classification</option>
                  {classifications.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.libelle}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-zinc-500 mt-2">
                  Niveau Bell-LaPadula minimal requis pour accéder au dossier.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/[0.07]">
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? "Création en cours…" : "Créer l'affaire"}
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
