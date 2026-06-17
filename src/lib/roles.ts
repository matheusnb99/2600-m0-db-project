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

/**
 * Navigation entry + the page-level RBAC allowlist.
 *
 * Each deployment serves the WHOLE app to its one role, so "one microservice
 * per role" decides *which* role reaches a deployment — not *which pages* that
 * role may open inside it. Without this list every role saw every page (e.g.
 * agent_saisie could open /admin/roles). `roles` restricts a page to the roles
 * whose GRANTs justify it (db_scripts/07_roles_grants.sql); omit it for pages
 * open to every authenticated role (the dashboard).
 */
export interface NavItem {
  href: string;
  label: string;
  /** Icon key resolved against the SVG set in components/icons.tsx. */
  icon: string;
  /** Role names allowed here. Omit = every authenticated role. */
  roles?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: "dashboard" },
  // Données métier : rôles avec GRANT sur personnes/affaires/signalements.
  { href: "/personnes", label: "Personnes", icon: "users", roles: ["agent_saisie", "opj", "magistrat", "analyste_renseignement"] },
  { href: "/affaires", label: "Affaires", icon: "folder", roles: ["agent_saisie", "opj", "magistrat", "analyste_renseignement"] },
  { href: "/signalements", label: "Signalements", icon: "siren", roles: ["agent_saisie", "opj", "magistrat", "analyste_renseignement"] },
  // Administration : admin_systeme gère agents/services/rôles ; magistrat lit
  // les agents de son service (SELECT, filtré RLS) ; auditeur lit l'audit.
  { href: "/admin/agents", label: "Agents", icon: "user", roles: ["admin_systeme", "magistrat"] },
  { href: "/admin/services", label: "Services", icon: "building", roles: ["admin_systeme"] },
  { href: "/admin/roles", label: "Rôles", icon: "shieldKey", roles: ["admin_systeme"] },
  { href: "/admin/audit", label: "Audit", icon: "clipboard", roles: ["admin_systeme", "auditeur"] },
  // Vues anonymisées : contrôle de conformité (jamais la donnée brute).
  { href: "/conformite", label: "Vues anonymisées", icon: "shieldCheck", roles: ["auditeur", "controleur_cnil"] },
];

/** Nav entries a role may see: unrestricted ones, plus those listing the role. */
export function navItemsForRole(roleName: string | undefined | null): NavItem[] {
  return NAV_ITEMS.filter(
    (i) => !i.roles || (roleName != null && i.roles.includes(roleName))
  );
}

/**
 * Whether `roleName` may view `pathname`. Matches the longest NAV_ITEMS href
 * that prefixes the path, so sub-routes inherit their section's rule
 * (/personnes/123 and /personnes/create follow /personnes). Paths under no
 * known section (e.g. /login) are not part of the gated surface → allowed.
 */
export function canAccessPath(
  roleName: string | undefined | null,
  pathname: string
): boolean {
  const match = NAV_ITEMS.filter(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/")
  ).sort((a, b) => b.href.length - a.href.length)[0];
  if (!match || !match.roles) return true;
  return roleName != null && match.roles.includes(roleName);
}
