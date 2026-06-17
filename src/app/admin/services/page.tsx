"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Badge, Button, Input, Select, Spinner, AccessDenied } from "@/components/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";
import { usePermissions } from "@/lib/use-permissions";
import type { Service, ServiceType } from "@/types";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const perms = usePermissions();

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await apiClient.fetchServices()) as Service[];
      setServices(data);
    } catch (err) {
      setError((err as ApiError).message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Wrap so loadServices() (which sets state) isn't called synchronously here.
    const run = async () => {
      await loadServices();
    };
    run();
  }, [loadServices]);

  const serviceTypes: ServiceType[] = [
    "commissariat",
    "brigade_gendarmerie",
    "parquet",
    "dgsi",
    "dgse",
    "douanes",
    "autre",
  ];

  const typeLabels: Record<ServiceType, string> = {
    commissariat: "Commissariat",
    brigade_gendarmerie: "Brigade Gendarmerie",
    parquet: "Parquet",
    dgsi: "DGSI",
    dgse: "DGSE",
    douanes: "Douanes",
    autre: "Autre",
  };

  const typeColors: Record<ServiceType, string> = {
    commissariat: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    brigade_gendarmerie: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    parquet: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    dgsi: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    dgse: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    douanes: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    autre: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  const handleAddService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await apiClient.createService({
        nom: form.get("nom"),
        type: form.get("type"),
        code_unite: form.get("code_unite"),
        telephone: form.get("telephone"),
        adresse: form.get("adresse"),
        email: form.get("email"),
      });
      setShowForm(false);
      await loadServices();
    } catch (err) {
      setError((err as ApiError).message || "Erreur lors de la création");
    }
  };

  const handleToggleService = async (service: Service) => {
    try {
      await apiClient.updateService(service.id, { actif: !service.actif });
      await loadServices();
    } catch (err) {
      setError((err as ApiError).message || "Erreur lors de la mise à jour");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Gestion des Services
          </h1>
          {perms?.insert?.services && (
            <Button
              variant="primary"
              onClick={() => {
                setEditingService(null);
                setShowForm(true);
              }}
            >
              ➕ Nouveau service
            </Button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              {editingService ? "Modifier le service" : "Ajouter un service"}
            </h3>
            <form onSubmit={handleAddService} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Nom
                  </label>
                  <Input name="nom" placeholder="Commissariat Central" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Type
                  </label>
                  <Select name="type" required>
                    <option value="">Sélectionner un type</option>
                    {serviceTypes.map((type) => (
                      <option key={type} value={type}>
                        {typeLabels[type]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Code Unité
                  </label>
                  <Input name="code_unite" placeholder="CC-75-001" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Téléphone
                  </label>
                  <Input name="telephone" type="tel" placeholder="01 42 34 56 78" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Adresse
                  </label>
                  <Input name="adresse" placeholder="123 Rue de la Paix, 75000 Paris" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Email
                  </label>
                  <Input name="email" type="email" placeholder="contact@service.gouv.fr" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary">
                  {editingService ? "Mettre à jour" : "Créer"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowForm(false)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Data states */}
        {loading ? (
          <Spinner label="Chargement des services…" />
        ) : error ? (
          <AccessDenied message={error} />
        ) : services.length === 0 ? (
          <Card className="p-8 text-center text-zinc-500">
            Aucun service visible pour ce rôle.
          </Card>
        ) : (
        /* Services Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {service.nom}
                  </h3>
                  <Badge className={typeColors[service.type]}>
                    {typeLabels[service.type]}
                  </Badge>
                </div>
                <Badge variant={service.actif ? "success" : "default"}>
                  {service.actif ? "Actif" : "Inactif"}
                </Badge>
              </div>

              <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <span>{service.adresse}</span>
                </div>
                {service.telephone && (
                  <div className="flex items-center gap-2">
                    <span>📞</span>
                    <span>{service.telephone}</span>
                  </div>
                )}
                {service.email && (
                  <div className="flex items-center gap-2">
                    <span>📧</span>
                    <span>{service.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span>🏷️</span>
                  <span className="font-mono">{service.code_unite}</span>
                </div>
              </div>

              {perms?.update?.services && (
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
                  <button
                    onClick={() => handleToggleService(service)}
                    className="flex-1 px-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded transition-colors font-medium"
                  >
                    {service.actif ? "Désactiver" : "Activer"}
                  </button>
                  <button className="flex-1 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-200 rounded transition-colors font-medium">
                    Éditer
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
        )}
      </div>
    </AdminLayout>
  );
}
