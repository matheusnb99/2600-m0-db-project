import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { pgErrorResponse } from "@/lib/api-error";

/**
 * GET /api/infractions
 * Catalogue NATINF (lecture seule, accessible à tous les rôles métier) — sert à
 * alimenter le sélecteur d'ajout d'infraction sur une affaire.
 */
export async function GET() {
  try {
    const rows = await query(
      `SELECT id, code_natinf, libelle, categorie
       FROM infractions
       ORDER BY code_natinf`,
      []
    );
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la récupération des infractions");
  }
}
