import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { pgErrorResponse } from "@/lib/api-error";

/**
 * GET /api/permissions
 *
 * Asks PostgreSQL directly whether the connected role (current_user) may
 * INSERT / UPDATE / DELETE each business table — `has_table_privilege` reflects
 * the real GRANTs (script 07), so the UI can show/hide create + edit/delete
 * actions truthfully without hardcoding the RBAC matrix. Privilege is per
 * connection role, independent of the app session.
 */
const TABLES = [
  "personnes",
  "affaires",
  "affaire_infractions",
  "signalements",
  "decisions_justice",
  "scelles",
  "agents",
  "services",
  "roles",
] as const;

export async function GET() {
  try {
    // Table names come from the fixed list above — no injection surface.
    const cols = TABLES.flatMap((t) => [
      `has_table_privilege('${t}', 'INSERT') AS ins_${t}`,
      `has_table_privilege('${t}', 'UPDATE') AS upd_${t}`,
      `has_table_privilege('${t}', 'DELETE') AS del_${t}`,
    ]).join(", ");

    const rows = await query<Record<string, boolean>>(`SELECT ${cols}`);
    const r = rows[0] ?? {};
    const group = (prefix: string) =>
      Object.fromEntries(TABLES.map((t) => [t, !!r[`${prefix}_${t}`]]));

    return NextResponse.json(
      {
        insert: group("ins"),
        update: group("upd"),
        delete: group("del"),
      },
      { status: 200 }
    );
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la lecture des permissions");
  }
}
