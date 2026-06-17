import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSessionContext } from "@/lib/session";
import { pgErrorResponse } from "@/lib/api-error";
import type { Role } from "@/types";

/**
 * GET /api/roles
 * List all roles with their classification levels
 */
export async function GET() {
  try {
    const roles = await query<Role>(
      `SELECT id, nom, description, niveau_max_classification_id
       FROM roles
       ORDER BY id`,
      []
    );

    return NextResponse.json(roles, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la récupération des rôles");
  }
}

/**
 * POST /api/roles
 * Create a new role
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSessionContext(request);
    const body = await request.json();
    const { nom, description, niveau_max_classification_id } = body;

    // Validation
    if (!nom || !niveau_max_classification_id) {
      return NextResponse.json(
        { message: "Nom et classification max requis" },
        { status: 400 }
      );
    }

    // Check if role already exists
    const existing = await queryOne(
      `SELECT id FROM roles WHERE nom = $1`,
      [nom],
      session
    );

    if (existing) {
      return NextResponse.json(
        { message: "Rôle déjà existant" },
        { status: 400 }
      );
    }

    // Create role
    const newRole = await queryOne<Role>(
      `INSERT INTO roles (nom, description, niveau_max_classification_id)
       VALUES ($1, $2, $3)
       RETURNING id, nom, description, niveau_max_classification_id`,
      [nom, description, niveau_max_classification_id],
      session
    );

    return NextResponse.json(newRole, { status: 201 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la création du rôle");
  }
}

/**
 * GET /api/roles/[id]
 * Fetch a single role by ID
 */
export async function getDetail(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const role = await queryOne<Role>(
      `SELECT id, nom, description, niveau_max_classification_id
       FROM roles
       WHERE id = $1`,
      [parseInt(params.id)]
    );

    if (!role) {
      return NextResponse.json(
        { message: "Rôle non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(role, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la récupération du rôle");
  }
}
