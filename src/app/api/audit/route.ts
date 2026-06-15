import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionContext } from "@/lib/session";
import { pgErrorResponse } from "@/lib/api-error";

/**
 * GET /api/audit
 *
 * Recent entries from the central `audit_log`. Only the roles GRANTed SELECT on
 * `audit_log` (admin_systeme, auditeur, controleur_cnil) can read it — every
 * other connected `taj_*` role gets a clean 403 (mapped from SQLSTATE 42501),
 * which is the intended RBAC demo behaviour.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    const table = searchParams.get("table");
    const alerte = searchParams.get("alerte");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    let sql = `
      SELECT
        id, horodatage, agent_id, action, table_cible, enregistrement_id,
        details, ip_source, session_id, alerte, type_alerte, severite,
        COUNT(*) OVER()::int AS total_count
      FROM audit_log
      WHERE 1=1
    `;
    const params: any[] = [];

    if (action) {
      params.push(action);
      sql += ` AND action = $${params.length}`;
    }
    if (table) {
      params.push(table);
      sql += ` AND table_cible = $${params.length}`;
    }
    if (alerte === "true") {
      sql += ` AND alerte = true`;
    }

    sql += ` ORDER BY horodatage DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const logs = await query(sql, params, getSessionContext(request));
    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    return pgErrorResponse(
      error,
      "Erreur lors de la récupération du journal d'audit"
    );
  }
}
