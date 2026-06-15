import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getSessionContext } from "@/lib/session";
import { pgErrorResponse } from "@/lib/api-error";

/**
 * GET /api/signalements/[id]
 * Fetch signalement details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const signalement = await queryOne(
      `SELECT 
        s.id, s.personne_id, s.type, s.motif, s.date_emission, s.date_expiration,
        s.emis_par_service_id, s.emis_par_agent_id, s.niveau_classification_id,
        s.actif, s.priorite, s.date_creation, s.date_modification,
        p.nom, p.prenom, p.date_naissance, p.numero_taj,
        sv.nom as service_nom, a.nom as agent_nom, a.prenom as agent_prenom
       FROM signalements s
       JOIN personnes p ON p.id = s.personne_id
       LEFT JOIN services sv ON sv.id = s.emis_par_service_id
       LEFT JOIN agents a ON a.id = s.emis_par_agent_id
       WHERE s.id = $1`,
      [(await params).id],
      getSessionContext(request)
    );

    if (!signalement) {
      return NextResponse.json(
        { message: "Signalement non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(signalement, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la récupération du signalement");
  }
}

/**
 * PUT /api/signalements/[id]
 * Update signalement
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { motif, date_expiration, actif, priorite } = body;

    const updated = await queryOne(
      `UPDATE signalements 
       SET motif = COALESCE($1, motif),
           date_expiration = COALESCE($2, date_expiration),
           actif = COALESCE($3, actif),
           priorite = COALESCE($4, priorite),
           date_modification = NOW()
       WHERE id = $5
       RETURNING id, personne_id, type, motif, date_emission, date_expiration,
                 emis_par_service_id, niveau_classification_id, actif, priorite,
                 date_creation, date_modification`,
      [motif, date_expiration, actif, priorite, (await params).id],
      getSessionContext(request)
    );

    if (!updated) {
      return NextResponse.json(
        { message: "Signalement non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la mise à jour du signalement");
  }
}

/**
 * DELETE /api/signalements/[id]
 * Deactivate signalement
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const deleted = await queryOne(
      `UPDATE signalements 
       SET actif = false, date_modification = NOW()
       WHERE id = $1
       RETURNING id, personne_id, type, motif, date_emission, date_expiration,
                 emis_par_service_id, niveau_classification_id, actif, priorite,
                 date_creation, date_modification`,
      [(await params).id],
      getSessionContext(request)
    );

    if (!deleted) {
      return NextResponse.json(
        { message: "Signalement non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(deleted, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la suppression du signalement");
  }
}
