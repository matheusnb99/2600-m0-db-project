"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Select } from "@/components/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";

export default function CreatePersonnePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classifications, setClassifications] = useState<any[]>([]);

  useEffect(() => {
    apiClient
      .fetchClassifications()
      .then((data) => setClassifications(data as any[]))
      .catch(() => setClassifications([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      nom: formData.get("nom"),
      prenom: formData.get("prenom"),
      date_naissance: formData.get("date_naissance") || null,
      lieu_naissance: formData.get("lieu_naissance") || null,
      nationalite: formData.get("nationalite") || "Française",
      sexe: formData.get("sexe") || null,
      niveau_classification_id: parseInt(formData.get("niveau_classification_id") as string),
    };

    try {
      const newPerson = (await apiClient.createPersonne(data)) as { id: string };
      router.push(`/personnes/${newPerson.id}`);
    } catch (err) {
      setError((err as ApiError).message || "Erreur lors de la création");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Nouvelle personne
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Ajouter une nouvelle personne au TAJ
          </p>
        </div>

        <Card className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <p className="text-red-700 dark:text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identité */}
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
                Identité
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Prénom *
                  </label>
                  <Input
                    name="prenom"
                    placeholder="Jean"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Nom *
                  </label>
                  <Input
                    name="nom"
                    placeholder="Dupont"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Détails */}
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
                Détails civils
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Date de naissance
                  </label>
                  <Input
                    type="date"
                    name="date_naissance"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Lieu de naissance
                  </label>
                  <Input
                    name="lieu_naissance"
                    placeholder="Paris"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Sexe
                  </label>
                  <Select name="sexe">
                    <option value="">Non spécifié</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                    <option value="I">Indéterminé</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Nationalité
                  </label>
                  <Input
                    name="nationalite"
                    placeholder="Française"
                    defaultValue="Française"
                  />
                </div>
              </div>
            </div>

            {/* Classification */}
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
                Sécurité
              </h3>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Classification *
                </label>
                <Select
                  name="niveau_classification_id"
                  required
                >
                  <option value="">Sélectionner une classification</option>
                  {classifications.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.libelle}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                  Niveau minimal de classification pour accéder aux données
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
              >
                {isLoading ? "Création en cours..." : "Créer"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
              >
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AdminLayout>
  );
}
