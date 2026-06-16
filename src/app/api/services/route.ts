import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { pgErrorResponse } from "@/lib/api-error";
import type { Service } from "@/types";

/**
 * GET /api/services
 * List all services
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const actif = searchParams.get("actif");
    const type = searchParams.get("type");

    let sql = `
      SELECT id, nom, type, adresse, code_unite, telephone, email, actif, date_creation
      FROM services
      WHERE 1=1
    `;

    const params: unknown[] = [];

    if (actif !== null) {
      params.push(actif === "true");
      sql += ` AND actif = $${params.length}`;
    }

    if (type) {
      params.push(type);
      sql += ` AND type = $${params.length}`;
    }

    sql += ` ORDER BY nom`;

    const services = await query<Service>(sql, params);

    return NextResponse.json(services, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la récupération des services");
  }
}

/**
 * POST /api/services
 * Create a new service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      nom,
      type,
      code_unite,
      adresse,
      telephone,
      email,
    } = body;

    // Validation
    if (!nom || !type || !code_unite) {
      return NextResponse.json(
        { message: "Nom, type et code unité requis" },
        { status: 400 }
      );
    }

    // Check if code_unite already exists
    const existing = await queryOne(
      `SELECT id FROM services WHERE code_unite = $1`,
      [code_unite]
    );

    if (existing) {
      return NextResponse.json(
        { message: "Code unité déjà utilisé" },
        { status: 400 }
      );
    }

    // Create service
    const newService = await queryOne<Service>(
      `INSERT INTO services (nom, type, code_unite, adresse, telephone, email, actif, date_creation)
       VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
       RETURNING id, nom, type, adresse, code_unite, telephone, email, actif, date_creation`,
      [nom, type, code_unite, adresse, telephone, email]
    );

    return NextResponse.json(newService, { status: 201 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la création du service");
  }
}
