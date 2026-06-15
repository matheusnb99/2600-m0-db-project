"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Badge, Button, Input, Select, Spinner, AccessDenied } from "@/components/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";
import { usePermissions } from "@/lib/use-permissions";
import type { Agent, RoleType } from "@/types";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
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
    loadAgents();
  }, [loadAgents]);

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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Gestion des Agents
          </h1>
          {perms?.agents && (
            <Button
              variant="primary"
              onClick={() => {
                setEditingAgent(null);
                setShowForm(true);
              }}
            >
              ➕ Nouvel agent
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
              <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    Matricule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    Classification
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {agents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                      Aucun agent visible pour ce rôle.
                    </td>
                  </tr>
                ) : (
                  agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                          {agent.prenom[0]}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white">
                            {agent.prenom} {agent.nom}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {agent.matricule}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {agent.email}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                      {agent.matricule}
                    </td>
                    <td className="px-6 py-4">
                      <Badge>
                        {
                          classifications.find((c) => c.id === agent.habilitation_niveau_id)
                            ?.code
                        }
                      </Badge>
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
