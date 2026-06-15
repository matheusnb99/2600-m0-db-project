import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { pgErrorResponse } from "@/lib/api-error";
import type { Service } from "@/types";

/**
 * GET /api/services/[id]
 * Fetch a single service by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const service = await queryOne<Service>(
      `SELECT id, nom, type, adresse, code_unite, telephone, email, actif, date_creation
       FROM services
       WHERE id = $1`,
      [parseInt((await params).id)]
    );

    if (!service) {
      return NextResponse.json(
        { message: "Service non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(service, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la récupération du service");
  }
}

/**
 * PUT /api/services/[id]
 * Update a service
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { nom, adresse, telephone, email, actif } = body;

    // Check if service exists
    const existing = await queryOne(
      `SELECT id FROM services WHERE id = $1`,
      [parseInt((await params).id)]
    );

    if (!existing) {
      return NextResponse.json(
        { message: "Service non trouvé" },
        { status: 404 }
      );
    }

    // Update service
    const updated = await queryOne<Service>(
      `UPDATE services 
       SET nom = COALESCE($1, nom),
           adresse = COALESCE($2, adresse),
           telephone = COALESCE($3, telephone),
           email = COALESCE($4, email),
           actif = COALESCE($5, actif)
       WHERE id = $6
       RETURNING id, nom, type, adresse, code_unite, telephone, email, actif, date_creation`,
      [nom, adresse, telephone, email, actif, parseInt((await params).id)]
    );

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la mise à jour du service");
  }
}

/**
 * DELETE /api/services/[id]
 * Delete a service (soft delete by setting actif = false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const deleted = await queryOne<Service>(
      `UPDATE services 
       SET actif = false
       WHERE id = $1
       RETURNING id, nom, type, adresse, code_unite, telephone, email, actif, date_creation`,
      [parseInt((await params).id)]
    );

    if (!deleted) {
      return NextResponse.json(
        { message: "Service non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(deleted, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la suppression du service");
  }
}
