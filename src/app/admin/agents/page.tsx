"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Badge, Button, Input, Select, Spinner, AccessDenied, ClassificationTag } from "@/components/ui";
import { Icon } from "@/components/icons";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";
import { usePermissions } from "@/lib/use-permissions";
import type { Agent, RoleType } from "@/types";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [services, setServices] = useState<{ id: number; nom: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const perms = usePermissions();

  const roles: RoleType[] = [
    "agent_saisie",
    "opj",
    "magistrat",
    "analyste_renseignement",
    "admin_systeme",
    "auditeur",
    "controleur_cnil",
  ];

  // Real classification_niveaux SERIAL ids (NC=1, CD=2, SD=3, TSD=4).
  const classifications = [
    { id: 1, code: "NC", libelle: "Non Classifié" },
    { id: 2, code: "CD", libelle: "Confidentiel Défense" },
    { id: 3, code: "SD", libelle: "Secret Défense" },
    { id: 4, code: "TSD", libelle: "Très Secret Défense" },
  ];

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await apiClient.fetchAgents()) as Agent[];
      setAgents(data);
    } catch (err) {
      setError((err as ApiError).message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Wrap so loadAgents() (which sets state) isn't called synchronously here.
    const run = async () => {
      await loadAgents();
    };
    run();
  }, [loadAgents]);

  // agents.service_id is NOT NULL, so the create form needs a service to pick.
  // Loaded separately; failure leaves the list empty (the form then blocks).
  useEffect(() => {
    apiClient
      .fetchServices()
      .then((data) => setServices(data as { id: number; nom: string }[]))
      .catch(() => setServices([]));
  }, []);

  const handleAddAgent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await apiClient.createAgent({
        prenom: form.get("prenom"),
        nom: form.get("nom"),
        email: form.get("email"),
        matricule: form.get("matricule"),
        role_id: Number(form.get("role_id")) || null,
        service_id: Number(form.get("service_id")) || null,
        habilitation_niveau_id: Number(form.get("habilitation_niveau_id")),
      });
      setShowForm(false);
      await loadAgents();
    } catch (err) {
      setError((err as ApiError).message || "Erreur lors de la création");
    }
  };

  const handleToggleAgent = async (agent: Agent) => {
    try {
      await apiClient.updateAgent(agent.id, { actif: !agent.actif });
      await loadAgents();
    } catch (err) {
      setError((err as ApiError).message || "Erreur lors de la mise à jour");
    }
  };

  const handleUnlock = async (id: string) => {
    try {
      await apiClient.unlockAgent(id);
      await loadAgents();
    } catch (err) {
      setError((err as ApiError).message || "Erreur lors du déverrouillage");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-400">
            Comptes agents et habilitations — gérés par <code className="font-mono text-zinc-300">admin_systeme</code>.
          </p>
          {perms?.insert?.agents && (
            <Button
              variant="primary"
              onClick={() => {
                setEditingAgent(null);
                setShowForm(true);
              }}
            >
              <Icon name="plus" className="w-4 h-4" />
              Nouvel agent
            </Button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              {editingAgent ? "Modifier l'agent" : "Ajouter un agent"}
            </h3>
            <form onSubmit={handleAddAgent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Prénom
                  </label>
                  <Input name="prenom" placeholder="Jean" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Nom
                  </label>
                  <Input name="nom" placeholder="Dupont" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Email
                  </label>
                  <Input name="email" type="email" placeholder="jean.dupont@police.gouv.fr" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Matricule
                  </label>
                  <Input name="matricule" placeholder="MAT001" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Rôle
                  </label>
                  <Select name="role_id" required>
                    <option value="">Sélectionner un rôle</option>
                    {roles.map((role, idx) => (
                      <option key={role} value={idx + 1}>
                        {role}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Service
                  </label>
                  <Select name="service_id" required>
                    <option value="">Sélectionner un service</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nom}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Classification max
                  </label>
                  <Select name="habilitation_niveau_id" required>
                    <option value="">Sélectionner</option>
                    {classifications.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.libelle}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary">
                  {editingAgent ? "Mettre à jour" : "Créer"}
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
          <Spinner label="Chargement des agents…" />
        ) : error ? (
          <AccessDenied message={error} />
        ) : (
        /* Table */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/[0.02] border-b border-white/10">
                <tr>
                  {["Agent", "Email", "Matricule", "Classification", "Statut", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {agents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                      Aucun agent visible pour ce rôle.
                    </td>
                  </tr>
                ) : (
                  agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white text-xs font-bold ring-1 ring-white/10">
                          {agent.prenom[0]}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {agent.prenom} {agent.nom}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {agent.matricule}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {agent.email}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-zinc-200">
                      {agent.matricule}
                    </td>
                    <td className="px-6 py-4">
                      <ClassificationTag
                        code={
                          classifications.find((c) => c.id === agent.habilitation_niveau_id)
                            ?.code ?? "NC"
                        }
                      />
                    </td>
                    <td className="px-6 py-4">
                      {agent.verrouille ? (
                        <Badge variant="danger">Verrouillé</Badge>
                      ) : agent.actif ? (
                        <Badge variant="success">Actif</Badge>
                      ) : (
                        <Badge>Inactif</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {perms?.update?.agents ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleAgent(agent)}
                            className="text-xs px-3 py-1 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 rounded transition-colors"
                          >
                            {agent.actif ? "Désactiver" : "Activer"}
                          </button>
                          {agent.verrouille && (
                            <button
                              onClick={() => handleUnlock(agent.id)}
                              className="text-xs px-3 py-1 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-200 rounded transition-colors"
                            >
                              Déverrouiller
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
        )}
      </div>
    </AdminLayout>
  );
}
