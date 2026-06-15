import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getSessionContext } from "@/lib/session";
import { pgErrorResponse } from "@/lib/api-error";

/**
 * GET /api/whoami
 *
 * Returns the *database* identity the data pool is currently connected as
 * (`current_user`, i.e. the swappable `taj_*` role) plus the Bell-LaPadula
 * session level applied for this request. This is what the UI banner reads so
 * the audience always knows which role's perspective is on screen during the
 * connection-string-swap demo.
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSessionContext(request);
    const row = await queryOne<{
      db_role: string;
      session_level: string | null;
    }>(
      `SELECT current_user AS db_role,
              current_setting('app.session_level', true) AS session_level`,
      [],
      session
    );

    return NextResponse.json(row, { status: 200 });
  } catch (error) {
    return pgErrorResponse(
      error,
      "Erreur lors de la récupération du contexte de session"
    );
  }
}
