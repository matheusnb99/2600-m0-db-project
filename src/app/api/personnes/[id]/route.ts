import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSessionContext } from "@/lib/session";
import { pgErrorResponse } from "@/lib/api-error";

/**
 * GET /api/personnes/[id]
 * Fetch person details with related data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSessionContext(request);
  const { id } = await params;

  // A related table the connected role isn't granted (e.g. `biometrie` for
  // agent_saisie) must NOT blank the whole sheet — degrade that section to
  // empty. Only `permission denied` (42501) is swallowed; other errors bubble.
  const safe = async <T>(p: Promise<T[]>): Promise<T[]> => {
    try {
      return await p;
    } catch (e) {
      if ((e as { code?: string }).code === "42501") return [];
      throw e;
    }
  };

  try {
    // Main person record — essential. If the role can't read `personnes` at
    // all, this 403s the page (correct).
    const person = await queryOne(
      `SELECT
        id, nom, prenom, date_naissance, lieu_naissance, nationalite, sexe,
        niveau_classification_id, statut, numero_taj, date_creation, date_modification
       FROM personnes
       WHERE id = $1`,
      [id],
      session
    );

    if (!person) {
      return NextResponse.json(
        { message: "Personne non trouvée" },
        { status: 404 }
      );
    }

    const aliases = await safe(
      query(
        `SELECT id, alias_nom, alias_prenom, type, date_creation
         FROM aliases
         WHERE personne_id = $1
         ORDER BY date_creation DESC`,
        [id],
        session
      )
    );

    const addresses = await safe(
      query(
        `SELECT id, adresse_ligne1, adresse_ligne2, code_postal, ville, pays,
                type, date_debut, date_fin, date_creation
         FROM adresses
         WHERE personne_id = $1
         ORDER BY date_fin DESC NULLS FIRST, date_debut DESC`,
        [id],
        session
      )
    );

    const phones = await safe(
      query(
        `SELECT id, numero, type, actif, date_creation
         FROM telephones
         WHERE personne_id = $1
         ORDER BY actif DESC, date_creation DESC`,
        [id],
        session
      )
    );

    // Biometrics — restricted to opj / magistrat / analyste_renseignement.
    const biometrics = await safe(
      query(
        `SELECT type, COUNT(*) as count
         FROM biometrie
         WHERE personne_id = $1
         GROUP BY type`,
        [id],
        session
      )
    );

    const cases = await safe(
      query(
        `SELECT DISTINCT ap.affaire_id, ap.role, a.numero_pv, a.statut, a.date_ouverture
         FROM affaire_personnes ap
         JOIN affaires a ON a.id = ap.affaire_id
         WHERE ap.personne_id = $1
         ORDER BY a.date_ouverture DESC
         LIMIT 10`,
        [id],
        session
      )
    );

    const alerts = await safe(
      query(
        `SELECT id, type, motif, date_emission, date_expiration, actif, priorite
         FROM signalements
         WHERE personne_id = $1 AND actif = true
         ORDER BY priorite DESC, date_emission DESC`,
        [id],
        session
      )
    );

    return NextResponse.json(
      {
        person,
        aliases,
        addresses,
        phones,
        biometrics,
        cases,
        alerts,
      },
      { status: 200 }
    );
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la récupération de la personne");
  }
}

/**
 * PUT /api/personnes/[id]
 * Update person details
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const {
      nom,
      prenom,
      date_naissance,
      lieu_naissance,
      nationalite,
      sexe,
      niveau_classification_id,
      statut,
    } = body;

    const updated = await queryOne(
      `UPDATE personnes 
       SET nom = COALESCE($1, nom),
           prenom = COALESCE($2, prenom),
           date_naissance = COALESCE($3, date_naissance),
           lieu_naissance = COALESCE($4, lieu_naissance),
           nationalite = COALESCE($5, nationalite),
           sexe = COALESCE($6, sexe),
           niveau_classification_id = COALESCE($7, niveau_classification_id),
           statut = COALESCE($8, statut),
           date_modification = NOW()
       WHERE id = $9
       RETURNING id, nom, prenom, date_naissance, lieu_naissance, nationalite, sexe,
                 niveau_classification_id, statut, numero_taj, date_creation, date_modification`,
      [
        nom,
        prenom,
        date_naissance,
        lieu_naissance,
        nationalite,
        sexe,
        niveau_classification_id,
        statut,
        (await params).id,
      ],
      getSessionContext(request)
    );

    if (!updated) {
      return NextResponse.json(
        { message: "Personne non trouvée" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la mise à jour de la personne");
  }
}

/**
 * DELETE /api/personnes/[id]
 * Soft delete person (archive)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const deleted = await queryOne(
      `UPDATE personnes 
       SET statut = 'archive', date_modification = NOW()
       WHERE id = $1
       RETURNING id, nom, prenom, date_naissance, lieu_naissance, nationalite, sexe,
                 niveau_classification_id, statut, numero_taj, date_creation, date_modification`,
      [(await params).id],
      getSessionContext(request)
    );

    if (!deleted) {
      return NextResponse.json(
        { message: "Personne non trouvée" },
        { status: 404 }
      );
    }

    return NextResponse.json(deleted, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la suppression de la personne");
  }
}
