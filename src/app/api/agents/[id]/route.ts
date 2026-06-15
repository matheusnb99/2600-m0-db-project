import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { pgErrorResponse } from "@/lib/api-error";
import type { Agent } from "@/types";

/**
 * GET /api/agents/[id]
 * Fetch a single agent by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agent = await queryOne<Agent>(
      `SELECT 
        id, matricule, nom, prenom, email, role_id, service_id,
        habilitation_niveau_id, actif, tentatives_echouees, verrouille,
        date_creation, date_modification
      FROM agents
      WHERE id = $1`,
      [(await params).id]
    );

    if (!agent) {
      return NextResponse.json(
        { message: "Agent non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(agent, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la récupération de l'agent");
  }
}

/**
 * PUT /api/agents/[id]
 * Update an agent
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { role_id, service_id, habilitation_niveau_id, actif } = body;

    // Check if agent exists
    const existing = await queryOne(
      `SELECT id FROM agents WHERE id = $1`,
      [(await params).id]
    );

    if (!existing) {
      return NextResponse.json(
        { message: "Agent non trouvé" },
        { status: 404 }
      );
    }

    // Update agent
    const updated = await queryOne<Agent>(
      `UPDATE agents 
       SET role_id = COALESCE($1, role_id),
           service_id = COALESCE($2, service_id),
           habilitation_niveau_id = COALESCE($3, habilitation_niveau_id),
           actif = COALESCE($4, actif),
           date_modification = NOW()
       WHERE id = $5
       RETURNING id, matricule, nom, prenom, email, role_id, service_id,
                 habilitation_niveau_id, actif, tentatives_echouees, verrouille,
                 date_creation, date_modification`,
      [role_id, service_id, habilitation_niveau_id, actif, (await params).id]
    );

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la mise à jour de l'agent");
  }
}

/**
 * PATCH /api/agents/[id]/unlock
 * Unlock an agent
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "unlock") {
      const updated = await queryOne<Agent>(
        `UPDATE agents 
         SET verrouille = false, tentatives_echouees = 0, date_modification = NOW()
         WHERE id = $1
         RETURNING id, matricule, nom, prenom, email, role_id, service_id,
                   habilitation_niveau_id, actif, tentatives_echouees, verrouille,
                   date_creation, date_modification`,
        [(await params).id]
      );

      return NextResponse.json(updated, { status: 200 });
    }

    return NextResponse.json(
      { message: "Action invalide" },
      { status: 400 }
    );
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors du déverrouillage de l'agent");
  }
}

/**
 * DELETE /api/agents/[id]
 * Delete an agent (soft delete by setting actif = false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const deleted = await queryOne<Agent>(
      `UPDATE agents 
       SET actif = false, date_modification = NOW()
       WHERE id = $1
       RETURNING id, matricule, nom, prenom, email, role_id, service_id,
                 habilitation_niveau_id, actif, tentatives_echouees, verrouille,
                 date_creation, date_modification`,
      [(await params).id]
    );

    if (!deleted) {
      return NextResponse.json(
        { message: "Agent non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(deleted, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la suppression de l'agent");
  }
}
