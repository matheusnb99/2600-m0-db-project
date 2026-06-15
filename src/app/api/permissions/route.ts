import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { pgErrorResponse } from "@/lib/api-error";

/**
 * GET /api/permissions
 *
 * Asks PostgreSQL directly whether the connected role (current_user) may INSERT
 * into each business table — `has_table_privilege` reflects the real GRANTs
 * (script 07), so the UI can show/hide "create" buttons truthfully without
 * hardcoding the RBAC matrix. Privilege is per connection role, independent of
 * the app session, so no session context is needed.
 */
export async function GET(_request: NextRequest) {
  try {
    const rows = await query<Record<string, boolean>>(
      `SELECT
         has_table_privilege('personnes',   'INSERT') AS personnes,
         has_table_privilege('affaires',     'INSERT') AS affaires,
         has_table_privilege('signalements', 'INSERT') AS signalements,
         has_table_privilege('agents',       'INSERT') AS agents,
         has_table_privilege('services',     'INSERT') AS services,
         has_table_privilege('roles',        'INSERT') AS roles`
    );
    return NextResponse.json({ insert: rows[0] ?? {} }, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la lecture des permissions");
  }
}
