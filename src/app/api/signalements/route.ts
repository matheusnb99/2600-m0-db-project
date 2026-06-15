import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSessionContext } from "@/lib/session";
import { pgErrorResponse } from "@/lib/api-error";

/**
 * GET /api/signalements
 * List all signalements/alerts with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const actif = searchParams.get("actif");
    const priorite = searchParams.get("priorite");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let sql = `
      SELECT 
        s.id, s.personne_id, s.type, s.motif, s.date_emission, s.date_expiration,
        s.emis_par_service_id, s.niveau_classification_id, s.actif, s.priorite,
        s.date_creation, s.date_modification,
        p.nom, p.prenom, p.date_naissance
      FROM signalements s
      JOIN personnes p ON p.id = s.personne_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (type) {
      params.push(type);
      sql += ` AND s.type = $${params.length}`;
    }

    if (actif !== null) {
      params.push(actif === "true");
      sql += ` AND s.actif = $${params.length}`;
    }

    if (priorite) {
      params.push(parseInt(priorite));
      sql += ` AND s.priorite >= $${params.length}`;
    }

    sql += ` ORDER BY s.priorite DESC, s.date_emission DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const signalements = await query(sql, params, getSessionContext(request));

    return NextResponse.json(signalements, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la récupération des signalements");
  }
}

/**
 * POST /api/signalements
 * Create a new signalement/alert
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      personne_id,
      type,
      motif,
      date_emission,
      date_expiration,
      emis_par_service_id,
      emis_par_agent_id,
      niveau_classification_id,
      priorite,
    } = body;

    // Validation
    if (
      !personne_id ||
      !type ||
      !motif ||
      !emis_par_service_id ||
      !niveau_classification_id
    ) {
      return NextResponse.json(
        { message: "Champs requis manquants" },
        { status: 400 }
      );
    }

    const newSignalement = await queryOne(
      `INSERT INTO signalements (
        personne_id, type, motif, date_emission, date_expiration,
        emis_par_service_id, emis_par_agent_id, niveau_classification_id,
        actif, priorite, date_creation, date_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, NOW(), NOW())
       RETURNING id, personne_id, type, motif, date_emission, date_expiration,
                 emis_par_service_id, niveau_classification_id, actif, priorite,
                 date_creation, date_modification`,
      [
        personne_id,
        type,
        motif,
        date_emission || new Date().toISOString().split("T")[0],
        date_expiration || null,
        emis_par_service_id,
        emis_par_agent_id || null,
        niveau_classification_id,
        priorite || 1,
      ],
      getSessionContext(request)
    );

    return NextResponse.json(newSignalement, { status: 201 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la création du signalement");
  }
}
