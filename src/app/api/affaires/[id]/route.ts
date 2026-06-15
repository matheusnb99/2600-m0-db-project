import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSessionContext } from "@/lib/session";
import { pgErrorResponse } from "@/lib/api-error";

/**
 * GET /api/affaires/[id]
 * Fetch case details with related data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSessionContext(request);
  const { id } = await params;

  // A related table the connected role isn't granted must NOT blank the whole
  // sheet — degrade that section to empty on `permission denied` (42501).
  const safe = async <T>(p: Promise<T[]>): Promise<T[]> => {
    try {
      return await p;
    } catch (e) {
      if ((e as { code?: string }).code === "42501") return [];
      throw e;
    }
  };

  try {
    // Main case record — essential (403s the page if the role can't read it).
    const affaire = await queryOne(
      `SELECT
        id, numero_pv, date_faits, date_ouverture, date_cloture, service_responsable_id,
        statut, niveau_classification_id, description, lieu_faits, date_creation, date_modification
       FROM affaires
       WHERE id = $1`,
      [id],
      session
    );

    if (!affaire) {
      return NextResponse.json(
        { message: "Affaire non trouvée" },
        { status: 404 }
      );
    }

    const people = await safe(
      query(
        `SELECT ap.id, ap.personne_id, ap.role, ap.date_implication, ap.observations,
                p.nom, p.prenom, p.date_naissance, p.numero_taj
         FROM affaire_personnes ap
         JOIN personnes p ON p.id = ap.personne_id
         WHERE ap.affaire_id = $1
         ORDER BY ap.role, p.nom`,
        [id],
        session
      )
    );

    const infractions = await safe(
      query(
        `SELECT ai.id, ai.infraction_id, i.code_natinf, i.libelle, i.categorie, i.article_code_penal
         FROM affaire_infractions ai
         JOIN infractions i ON i.id = ai.infraction_id
         WHERE ai.affaire_id = $1
         ORDER BY i.code_natinf`,
        [id],
        session
      )
    );

    // Décisions de justice — lecture restreinte (magistrat écrit ; certains
    // rôles n'y ont pas accès).
    const decisions = await safe(
      query(
        `SELECT id, type, date_decision, juridiction, peine, description
         FROM decisions_justice
         WHERE affaire_id = $1
         ORDER BY date_decision DESC`,
        [id],
        session
      )
    );

    const evidence = await safe(
      query(
        `SELECT id, description, lieu_stockage, date_saisie, statut, numero_scelle
         FROM scelles
         WHERE affaire_id = $1
         ORDER BY date_saisie DESC`,
        [id],
        session
      )
    );

    const vehicles = await safe(
      query(
        `SELECT av.id, av.vehicule_id, av.role, v.immatriculation, v.marque, v.modele
         FROM affaire_vehicules av
         JOIN vehicules v ON v.id = av.vehicule_id
         WHERE av.affaire_id = $1`,
        [id],
        session
      )
    );

    return NextResponse.json(
      {
        affaire,
        people,
        infractions,
        decisions,
        evidence,
        vehicles,
      },
      { status: 200 }
    );
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la récupération de l'affaire");
  }
}

/**
 * PUT /api/affaires/[id]
 * Update case details
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const {
      description,
      lieu_faits,
      statut,
      date_cloture,
      niveau_classification_id,
    } = body;

    const updated = await queryOne(
      `UPDATE affaires 
       SET description = COALESCE($1, description),
           lieu_faits = COALESCE($2, lieu_faits),
           statut = COALESCE($3, statut),
           date_cloture = COALESCE($4, date_cloture),
           niveau_classification_id = COALESCE($5, niveau_classification_id),
           date_modification = NOW()
       WHERE id = $6
       RETURNING id, numero_pv, date_faits, date_ouverture, date_cloture, service_responsable_id,
                 statut, niveau_classification_id, description, lieu_faits, date_creation, date_modification`,
      [
        description,
        lieu_faits,
        statut,
        date_cloture,
        niveau_classification_id,
        (await params).id,
      ],
      getSessionContext(request)
    );

    if (!updated) {
      return NextResponse.json(
        { message: "Affaire non trouvée" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la mise à jour de l'affaire");
  }
}

/**
 * DELETE /api/affaires/[id]
 * Soft delete case (archive)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const deleted = await queryOne(
      `UPDATE affaires 
       SET statut = 'classee_sans_suite', date_modification = NOW()
       WHERE id = $1
       RETURNING id, numero_pv, date_faits, date_ouverture, date_cloture, service_responsable_id,
                 statut, niveau_classification_id, description, lieu_faits, date_creation, date_modification`,
      [(await params).id],
      getSessionContext(request)
    );

    if (!deleted) {
      return NextResponse.json(
        { message: "Affaire non trouvée" },
        { status: 404 }
      );
    }

    return NextResponse.json(deleted, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la suppression de l'affaire");
  }
}
