import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getSessionContext } from "@/lib/session";
import { pgErrorResponse } from "@/lib/api-error";

/**
 * POST /api/affaires/[id]/decisions
 *
 * Records a judicial decision on a case. Only the `magistrat` role holds the
 * INSERT grant on `decisions_justice` (script 07), and the row inherits the
 * affaire's classification, so the Bell-LaPadula No-Write-Down rule applies:
 * the magistrat's working level must equal the affaire's level. The DB enforces
 * both — the session is passed so RLS + audit attribution work.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionContext(request);
    const affaireId = (await params).id;
    const body = await request.json();
    const { type, date_decision, juridiction, peine, description } = body;

    if (!type || !date_decision) {
      return NextResponse.json(
        { message: "Type et date de décision requis" },
        { status: 400 }
      );
    }

    const created = await queryOne(
      `INSERT INTO decisions_justice
        (affaire_id, type, date_decision, juridiction, peine, description, magistrat_id, date_creation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, type, date_decision, juridiction, peine, description`,
      [
        affaireId,
        type,
        date_decision,
        juridiction || null,
        peine || null,
        description || null,
        session?.agentId ?? null,
      ],
      session
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de l'enregistrement de la décision");
  }
}
