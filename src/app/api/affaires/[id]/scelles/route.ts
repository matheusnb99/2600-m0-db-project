import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getSessionContext } from "@/lib/session";
import { pgErrorResponse } from "@/lib/api-error";

/**
 * POST /api/affaires/[id]/scelles
 *
 * Place une pièce sous scellé pour une affaire. Seul l'`opj` détient l'INSERT
 * sur `scelles` (script 07). La ligne hérite de la classification de l'affaire
 * (Bell-LaPadula No-Write-Down : niveau de session = niveau de l'affaire).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionContext(request);
    const affaireId = (await params).id;
    const body = await request.json();
    const { description, date_saisie, lieu_stockage, statut, numero_scelle } = body;

    if (!description || !date_saisie) {
      return NextResponse.json(
        { message: "Description et date de saisie requises" },
        { status: 400 }
      );
    }

    const created = await queryOne(
      `INSERT INTO scelles
        (affaire_id, description, date_saisie, lieu_stockage, statut, numero_scelle, saisi_par_agent_id, date_creation)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'conserve'), $6, $7, NOW())
       RETURNING id, numero_scelle, description, statut, lieu_stockage, date_saisie`,
      [
        affaireId,
        description,
        date_saisie,
        lieu_stockage || null,
        statut || null,
        numero_scelle || null,
        session?.agentId ?? null,
      ],
      session
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la mise sous scellé");
  }
}
