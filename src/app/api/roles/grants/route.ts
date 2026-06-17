import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { pgErrorResponse } from "@/lib/api-error";

/**
 * GET /api/roles/grants
 *
 * Returns the LIVE RBAC matrix straight from PostgreSQL: for every RBAC role ×
 * every resource we ask `has_table_privilege(role, relation, priv)`. That is
 * the real source of truth (the GRANTs in db_scripts/07_roles_grants.sql) — no
 * hardcoded permission list. Works for base tables and for the anonymised views
 * (script 06) that auditeur / controleur_cnil are restricted to.
 *
 * `has_table_privilege` needs no privilege on the relation itself, so the call
 * is safe under the least-privilege connection role (same technique as
 * /api/permissions). Every relation listed must exist or the query throws — the
 * list below is kept in sync with scripts 02 (tables) and 06 (views).
 */

// Display order + label for each relation probed. `view: true` marks the
// anonymised relations so the UI can flag "données anonymisées".
const RESOURCES: { key: string; label: string; view?: boolean }[] = [
  { key: "personnes", label: "Personnes" },
  { key: "affaires", label: "Affaires" },
  { key: "signalements", label: "Signalements" },
  { key: "biometrie", label: "Biométrie" },
  { key: "decisions_justice", label: "Décisions de justice" },
  { key: "agents", label: "Agents" },
  { key: "services", label: "Services" },
  { key: "roles", label: "Rôles" },
  { key: "audit_log", label: "Journal d'audit" },
  { key: "personnes_anonymisees", label: "Personnes", view: true },
  { key: "signalements_anonymises", label: "Signalements", view: true },
  { key: "statistiques_cnil", label: "Statistiques CNIL", view: true },
];

const ROLE_NAMES = [
  "agent_saisie",
  "opj",
  "magistrat",
  "analyste_renseignement",
  "admin_systeme",
  "auditeur",
  "controleur_cnil",
];

export interface ResourceAccess {
  key: string;
  label: string;
  view: boolean;
  select: boolean;
  insert: boolean;
  update: boolean;
  delete: boolean;
}

/** roleName → list of resources it can touch (only relations with ≥1 priv). */
export type GrantMatrix = Record<string, ResourceAccess[]>;

export async function GET() {
  try {
    // One cross-join: (role × resource) → 4 privilege booleans. Role and
    // relation names come from the fixed arrays above — no injection surface.
    const roleValues = ROLE_NAMES.map((r) => `('${r}')`).join(", ");
    const resValues = RESOURCES.map((t) => `('${t.key}')`).join(", ");

    const rows = await query<{
      role: string;
      relname: string;
      sel: boolean;
      ins: boolean;
      upd: boolean;
      del: boolean;
    }>(
      `SELECT r.role, t.relname,
              has_table_privilege(r.role, t.relname, 'SELECT') AS sel,
              has_table_privilege(r.role, t.relname, 'INSERT') AS ins,
              has_table_privilege(r.role, t.relname, 'UPDATE') AS upd,
              has_table_privilege(r.role, t.relname, 'DELETE') AS del
       FROM (VALUES ${roleValues}) AS r(role)
       CROSS JOIN (VALUES ${resValues}) AS t(relname)`
    );

    const labelOf = new Map(RESOURCES.map((r) => [r.key, r]));
    const matrix: GrantMatrix = Object.fromEntries(
      ROLE_NAMES.map((r) => [r, [] as ResourceAccess[]])
    );

    for (const row of rows) {
      if (!row.sel && !row.ins && !row.upd && !row.del) continue;
      const meta = labelOf.get(row.relname);
      if (!meta) continue;
      matrix[row.role].push({
        key: row.relname,
        label: meta.label,
        view: !!meta.view,
        select: row.sel,
        insert: row.ins,
        update: row.upd,
        delete: row.del,
      });
    }

    // Preserve RESOURCES order within each role.
    const order = new Map(RESOURCES.map((r, i) => [r.key, i]));
    for (const role of ROLE_NAMES) {
      matrix[role].sort(
        (a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0)
      );
    }

    return NextResponse.json(matrix, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la lecture des GRANTs");
  }
}
