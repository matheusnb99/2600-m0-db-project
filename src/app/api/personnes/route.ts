import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSessionContext } from "@/lib/session";
import { pgErrorResponse } from "@/lib/api-error";

/**
 * GET /api/personnes
 * List all persons with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const statut = searchParams.get("statut");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let sql = `
      SELECT
        id, nom, prenom, date_naissance, lieu_naissance, nationalite, sexe,
        niveau_classification_id, statut, numero_taj, date_creation, date_modification,
        COUNT(*) OVER()::int AS total_count
      FROM personnes
      WHERE 1=1
    `;

    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (nom ILIKE $${params.length} OR prenom ILIKE $${params.length})`;
    }

    if (statut) {
      params.push(statut);
      sql += ` AND statut = $${params.length}`;
    }

    sql += ` ORDER BY nom, prenom LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const personnes = await query(sql, params, getSessionContext(request));

    return NextResponse.json(personnes, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la récupération des personnes");
  }
}

/**
 * POST /api/personnes
 * Create a new person
 */
export async function POST(request: NextRequest) {
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
    } = body;

    // Validation
    if (!nom || !prenom || !niveau_classification_id) {
      return NextResponse.json(
        { message: "Nom, prénom et classification requis" },
        { status: 400 }
      );
    }

    // Generate TAJ number. Must fit numero_taj VARCHAR(20): base36-encode the
    // timestamp so it stays short — e.g. "TAJ-LXR4K2P-9F3A" (~17 chars).
    const tajNumber = `TAJ-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;

    const newPerson = await queryOne(
      `INSERT INTO personnes (
        nom, prenom, date_naissance, lieu_naissance, nationalite, sexe,
        niveau_classification_id, statut, numero_taj, date_creation, date_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id, nom, prenom, date_naissance, lieu_naissance, nationalite, sexe,
                 niveau_classification_id, statut, numero_taj, date_creation, date_modification`,
      [
        nom,
        prenom,
        date_naissance || null,
        lieu_naissance || null,
        nationalite || "Française",
        sexe || null,
        niveau_classification_id,
        "actif",
        tajNumber,
      ],
      getSessionContext(request)
    );

    return NextResponse.json(newPerson, { status: 201 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la création de la personne");
  }
}
