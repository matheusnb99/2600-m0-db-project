import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { pgErrorResponse } from "@/lib/api-error";
import type { Classification } from "@/types";

/**
 * GET /api/classifications
 * List all classification levels
 */
export async function GET() {
  try {
    const classifications = await query<Classification>(
      `SELECT id, code, libelle, niveau
       FROM classification_niveaux
       ORDER BY niveau`,
      []
    );

    return NextResponse.json(classifications, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la récupération des classifications");
  }
}
