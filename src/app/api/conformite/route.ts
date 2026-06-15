import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionContext } from "@/lib/session";
import { pgErrorResponse } from "@/lib/api-error";

/**
 * GET /api/conformite
 *
 * Returns the anonymized / aggregated views that the `auditeur` and
 * `controleur_cnil` roles are restricted to (script 06 + GRANTs in script 07):
 * statistiques_cnil + a sample of personnes_anonymisees. Every other connected
 * role lacks SELECT on these views and receives a 403 — which is precisely the
 * point: the CNIL controller can only ever see pseudonymized data.
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSessionContext(request);

    const statistiques = await query(
      `SELECT categorie, total, actifs, supprimes, archives, alertes_securite
       FROM statistiques_cnil`,
      [],
      session
    );

    const personnes = await query(
      `SELECT id_pseudonyme, code_individu, annee_naissance, origine, sexe,
              niveau_classification, statut, mois_creation
       FROM personnes_anonymisees
       ORDER BY mois_creation DESC NULLS LAST
       LIMIT 50`,
      [],
      session
    );

    return NextResponse.json({ statistiques, personnes }, { status: 200 });
  } catch (error) {
    return pgErrorResponse(
      error,
      "Erreur lors de la récupération des vues de conformité"
    );
  }
}
