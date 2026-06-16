import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSessionContext } from "@/lib/session";
import { pgErrorResponse } from "@/lib/api-error";

/**
 * GET /api/affaires
 * List all cases with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const statut = searchParams.get("statut");
    const service_id = searchParams.get("service_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let sql = `
      SELECT
        id, numero_pv, date_faits, date_ouverture, date_cloture, service_responsable_id,
        statut, niveau_classification_id, description, lieu_faits, date_creation, date_modification,
        COUNT(*) OVER()::int AS total_count
      FROM affaires
      WHERE 1=1
    `;

    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (numero_pv ILIKE $${params.length} OR description ILIKE $${params.length} OR lieu_faits ILIKE $${params.length})`;
    }

    if (statut) {
      params.push(statut);
      sql += ` AND statut = $${params.length}`;
    }

    if (service_id) {
      params.push(parseInt(service_id));
      sql += ` AND service_responsable_id = $${params.length}`;
    }

    sql += ` ORDER BY date_ouverture DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const affaires = await query(sql, params, getSessionContext(request));

    return NextResponse.json(affaires, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la récupération des affaires");
  }
}

/**
 * POST /api/affaires
 * Create a new case
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      numero_pv,
      date_faits,
      date_ouverture,
      service_responsable_id,
      niveau_classification_id,
      description,
      lieu_faits,
    } = body;

    // Validation
    if (!numero_pv || !service_responsable_id || !niveau_classification_id) {
      return NextResponse.json(
        { message: "Numéro PV, service et classification requis" },
        { status: 400 }
      );
    }

    const session = getSessionContext(request);

    // Check if PV number already exists
    const existing = await queryOne(
      `SELECT id FROM affaires WHERE numero_pv = $1`,
      [numero_pv],
      session
    );

    if (existing) {
      return NextResponse.json(
        { message: "Numéro PV déjà utilisé" },
        { status: 400 }
      );
    }

    const newAffaire = await queryOne(
      `INSERT INTO affaires (
        numero_pv, date_faits, date_ouverture, service_responsable_id,
        niveau_classification_id, description, lieu_faits, statut,
        date_creation, date_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING id, numero_pv, date_faits, date_ouverture, date_cloture, service_responsable_id,
                 statut, niveau_classification_id, description, lieu_faits, date_creation, date_modification`,
      [
        numero_pv,
        date_faits || null,
        date_ouverture || new Date().toISOString().split("T")[0],
        service_responsable_id,
        niveau_classification_id,
        description || null,
        lieu_faits || null,
        "en_cours",
      ],
      session
    );

    return NextResponse.json(newAffaire, { status: 201 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la création de l'affaire");
  }
}
