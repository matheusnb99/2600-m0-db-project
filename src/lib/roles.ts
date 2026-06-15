/**
 * Canonical mapping role ⇄ microservice, shared by client and server.
 *
 * Each agent's role (agents.role_id → roles.nom) binds them to exactly one
 * microservice. The service's DB connection role IS that role name, so the port
 * is simply 3000 + role_id (agent_saisie=1→3001 … controleur_cnil=7→3007).
 */
export interface RoleInfo {
  id: number;
  nom: string;
  port: number;
  label: string;
  niveau: string; // badge Bell-LaPadula (ou "vues")
}

export const ROLES: RoleInfo[] = [
  { id: 1, nom: "agent_saisie",            port: 3001, label: "Agent de saisie",              niveau: "CD" },
  { id: 2, nom: "opj",                     port: 3002, label: "Officier de police judiciaire", niveau: "SD" },
  { id: 3, nom: "magistrat",               port: 3003, label: "Magistrat",                    niveau: "TSD" },
  { id: 4, nom: "analyste_renseignement",  port: 3004, label: "Analyste renseignement",       niveau: "TSD" },
  { id: 5, nom: "admin_systeme",           port: 3005, label: "Administrateur système",       niveau: "NC" },
  { id: 6, nom: "auditeur",                port: 3006, label: "Auditeur",                      niveau: "vues" },
  { id: 7, nom: "controleur_cnil",         port: 3007, label: "Contrôleur CNIL",              niveau: "vues" },
];

export const ROLE_NAMES = ROLES.map((r) => r.nom);

export function roleById(id: number | undefined | null): RoleInfo | undefined {
  return ROLES.find((r) => r.id === id);
}

export function roleByName(nom: string | undefined | null): RoleInfo | undefined {
  return ROLES.find((r) => r.nom === nom);
}
