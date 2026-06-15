"use client";

import { useState } from "react";
import { Card, Badge, Button, Input, Select } from "@/components/ui";
import { AdminLayout } from "@/components/AdminLayout";
import { usePermissions } from "@/lib/use-permissions";
import type { Role, RoleType, Classification } from "@/types";

export default function RolesPage() {
  const perms = usePermissions();
  const [roles, setRoles] = useState<Role[]>([
    {
      id: 1,
      nom: "agent_saisie",
      description: "Agent de saisie des données judiciaires",
      niveau_max_classification_id: 1,
    },
    {
      id: 2,
      nom: "opj",
      description: "Officier de Police Judiciaire",
      niveau_max_classification_id: 2,
    },
    {
      id: 3,
      nom: "magistrat",
      description: "Magistrat — accès complet",
      niveau_max_classification_id: 3,
    },
    {
      id: 4,
      nom: "analyste_renseignement",
      description: "Analyste de renseignement",
      niveau_max_classification_id: 2,
    },
    {
      id: 5,
      nom: "admin_systeme",
      description: "Administrateur système — gestion complète",
      niveau_max_classification_id: 3,
    },
    {
      id: 6,
      nom: "auditeur",
      description: "Auditeur — accès en lecture aux logs",
      niveau_max_classification_id: 2,
    },
    {
      id: 7,
      nom: "controleur_cnil",
      description: "Contrôleur CNIL — accès anonymisé uniquement",
      niveau_max_classification_id: 1,
    },
  ]);

  const [classifications] = useState<Classification[]>([
    { id: 0, code: "NC", libelle: "Non Classifié", niveau: 0 },
    { id: 1, code: "CD", libelle: "Confidentiel Défense", niveau: 1 },
    { id: 2, code: "SD", libelle: "Secret Défense", niveau: 2 },
    { id: 3, code: "TSD", libelle: "Très Secret Défense", niveau: 3 },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const roleLabels: Record<RoleType, string> = {
    agent_saisie: "Agent de saisie",
    opj: "OPJ (Officier Police Judiciaire)",
    magistrat: "Magistrat",
    analyste_renseignement: "Analyste de renseignement",
    admin_systeme: "Admin système",
    auditeur: "Auditeur",
    controleur_cnil: "Contrôleur CNIL",
  };

  const permissions: Record<RoleType, string[]> = {
    agent_saisie: [
      "✓ Consulter personnes (NC, CD)",
      "✓ Saisir données affaires",
      "✗ Modifier classification",
    ],
    opj: [
      "✓ Consulter personnes (NC, CD, SD)",
      "✓ Créer affaires",
      "✓ Ajouter signalements",
      "✗ Modifier droits agents",
    ],
    magistrat: [
      "✓ Accès complet (NC à TSD)",
      "✓ Modifier décisions",
      "✓ Valider signalements",
      "✓ Consulter rapports",
    ],
    analyste_renseignement: [
      "✓ Consulter personnes (NC, CD, SD)",
      "✓ Croiser données",
      "✓ Générer rapports",
      "✗ Modifier données",
    ],
    admin_systeme: [
      "✓ Gestion agents",
      "✓ Gestion droits",
      "✓ Maintenance système",
      "✓ Accès logs complets",
    ],
    auditeur: [
      "✓ Consultation read-only",
      "✓ Accès audit log",
      "✓ Export rapports",
      "✗ Modification données",
    ],
    controleur_cnil: [
      "✓ Données anonymisées",
      "✓ Vérification conformité RGPD",
      "✓ Export anonyme",
      "✗ Accès données sensibles",
    ],
  };

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    setShowForm(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Gestion des Rôles RBAC
          </h1>
          {perms?.roles && (
            <Button
              variant="primary"
              onClick={() => {
                setEditingRole(null);
                setShowForm(true);
              }}
            >
              ➕ Nouveau rôle
            </Button>
          )}
        </div>

        {/* Classification Levels Reference */}
        <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Niveaux de classification (Bell-LaPadula)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {classifications.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-lg bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-700"
              >
                <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {c.code}
                </div>
                <div className="text-sm text-zinc-900 dark:text-zinc-100">
                  {c.libelle}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Niveau {c.niveau}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Form */}
        {showForm && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              {editingRole ? "Modifier le rôle" : "Ajouter un rôle"}
            </h3>
            <form onSubmit={handleAddRole} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Nom du rôle
                  </label>
                  <Input placeholder="nom_du_role" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Classification maximale
                  </label>
                  <Select>
                    <option value="">Sélectionner</option>
                    {classifications.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.libelle}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Description
                  </label>
                  <Input placeholder="Description du rôle et ses responsabilités" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary">
                  {editingRole ? "Mettre à jour" : "Créer"}
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

        {/* Roles Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {roles.map((role) => (
            <Card key={role.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {roleLabels[role.nom]}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    {role.description}
                  </p>
                </div>
                <Badge variant="default">
                  {classifications.find((c) => c.id === role.niveau_max_classification_id)?.code}
                </Badge>
              </div>

              {/* Permissions */}
              <div className="space-y-2 mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Permissions
                </p>
                {permissions[role.nom].map((perm, idx) => (
                  <div key={idx} className="text-sm text-zinc-600 dark:text-zinc-400">
                    {perm}
                  </div>
                ))}
              </div>

              {/* Max Classification */}
              <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-800 rounded">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Classification maximale autorisée
                </p>
                <p className="font-mono font-bold text-zinc-900 dark:text-white">
                  {classifications.find((c) => c.id === role.niveau_max_classification_id)?.libelle}
                </p>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-200 rounded transition-colors font-medium">
                  Éditer
                </button>
                <button className="flex-1 px-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded transition-colors font-medium">
                  Voir agents
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
