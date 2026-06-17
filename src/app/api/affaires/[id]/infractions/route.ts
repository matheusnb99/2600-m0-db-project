import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getSessionContext } from "@/lib/session";
import { pgErrorResponse } from "@/lib/api-error";

/**
 * POST /api/affaires/[id]/infractions
 *
 * Qualifie une affaire en lui rattachant une infraction du catalogue NATINF.
 * Rôles avec INSERT sur `affaire_infractions` : agent_saisie, opj, magistrat
 * (script 07). La ligne hérite de la classification de l'affaire → règle
 * Bell-LaPadula No-Write-Down (niveau de session = niveau de l'affaire).
 * Contrainte UNIQUE(affaire_id, infraction_id) → un doublon renvoie 409.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionContext(request);
    const affaireId = (await params).id;
    const { infraction_id } = await request.json();

    if (!infraction_id) {
      return NextResponse.json(
        { message: "Infraction requise" },
        { status: 400 }
      );
    }

    const created = await queryOne(
      `INSERT INTO affaire_infractions (affaire_id, infraction_id, date_creation)
       VALUES ($1, $2, NOW())
       RETURNING id, infraction_id`,
      [affaireId, Number(infraction_id)],
      session
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de l'ajout de l'infraction");
  }
}
