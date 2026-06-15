/**
 * Domain types for TAJ (Traitement des Antécédents Judiciaires)
 */

// Classification levels (Bell-LaPadula)
export type ClassificationLevel = "NC" | "CD" | "SD" | "TSD";
export type ClassificationLevelId = 0 | 1 | 2 | 3;

// RBAC Roles
export type RoleType =
  | "agent_saisie"
  | "opj"
  | "magistrat"
  | "analyste_renseignement"
  | "admin_systeme"
  | "auditeur"
  | "controleur_cnil";

// Service types
export type ServiceType =
  | "commissariat"
  | "brigade_gendarmerie"
  | "parquet"
  | "dgsi"
  | "dgse"
  | "douanes"
  | "autre";

// Domain Models
export interface Classification {
  id: number;
  code: ClassificationLevel;
  libelle: string;
  niveau: ClassificationLevelId;
}

export interface Role {
  id: number;
  nom: RoleType;
  description?: string;
  niveau_max_classification_id: number;
}

export interface Service {
  id: number;
  nom: string;
  type: ServiceType;
  adresse?: string;
  code_unite: string;
  telephone?: string;
  email?: string;
  actif: boolean;
  date_creation: string;
}

export interface Agent {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  email?: string;
  role_id: number;
  service_id: number;
  habilitation_niveau_id: number;
  actif: boolean;
  derniere_connexion?: string;
  tentatives_echouees: number;
  verrouille: boolean;
  date_creation: string;
  date_modification: string;
  // Joined fields
  role?: Role;
  service?: Service;
}

export interface AuthSession {
  agent: Agent;
  token: string;
  expiresAt: string;
}

export interface AuditLog {
  id: string;
  horodatage: string;
  agent_id?: string;
  action: string;
  table_cible?: string;
  enregistrement_id?: string;
  details?: Record<string, unknown>;
  ip_source?: string;
  session_id?: string;
  alerte: boolean;
  type_alerte?: string;
  severite: number;
}
