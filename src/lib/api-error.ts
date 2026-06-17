/**
 * Centralised mapping from a thrown error (usually a Postgres error raised by
 * the `pg` driver) to a clean JSON HTTP response.
 *
 * The headline case for the BLACKVAULT demo is SQLSTATE 42501
 * (`insufficient_privilege`). Two very different security mechanisms surface
 * with that exact code:
 *
 *   1. A missing table GRANT for the connected role (RBAC layer) —
 *      e.g. "permission denied for table personnes" when the site is connected
 *      as `taj_admin`, which has no rights on `personnes`.
 *   2. The Bell-LaPadula "No Write Down" trigger (script 09) which does
 *      `RAISE EXCEPTION ... USING ERRCODE = 'insufficient_privilege'`.
 *
 * In both cases the rejection is exactly what the role-swap demo is meant to
 * show, so we return a clear 403 (not a generic 500) and pass through the
 * database's own explanation when it is informative.
 */
import { NextResponse } from "next/server";

interface PgError {
  code?: string;
  message?: string;
  detail?: string;
  table?: string;
  constraint?: string;
}

function isPgError(error: unknown): error is PgError {
  return typeof error === "object" && error !== null && "code" in error;
}

export function pgErrorResponse(
  error: unknown,
  fallbackMessage: string
): NextResponse {
  if (isPgError(error) && typeof error.code === "string") {
    const raw = error.message ?? "";

    switch (error.code) {
      case "42501": {
        // A WITH CHECK row-level-security rejection on INSERT/UPDATE — i.e. the
        // No-Write-Down rule: the row's classification must equal the current
        // session level. Point the user at the session-level selector.
        if (/row.?level security/i.test(raw)) {
          return NextResponse.json(
            {
              message:
                "Écriture refusée par la classification (Bell-LaPadula) : la classification de la donnée doit correspondre à votre niveau de session de travail. Ajustez « Session » dans la barre du haut.",
              code: error.code,
            },
            { status: 403 }
          );
        }
        // RBAC table denial OR Bell-LaPadula / Biba trigger refusal.
        const denied = raw.match(
          /permission denied for (?:table|relation|view|sequence) (\w+)/i
        );
        const message = denied
          ? `Accès refusé par la politique de sécurité (RBAC) : le rôle de connexion n'a aucun droit sur « ${denied[1]} ».`
          : raw ||
            "Accès refusé par la politique de sécurité (RBAC / Bell-LaPadula).";
        return NextResponse.json(
          { message, code: error.code },
          { status: 403 }
        );
      }

      case "28000": // invalid_authorization_specification (fn_open_session)
        return NextResponse.json(
          { message: raw || "Authentification refusée.", code: error.code },
          { status: 403 }
        );

      case "22001": // string_data_right_truncation
        return NextResponse.json(
          {
            message: "Une valeur dépasse la longueur maximale autorisée.",
            code: error.code,
          },
          { status: 400 }
        );

      case "22023": // invalid_parameter_value
        return NextResponse.json(
          { message: raw || "Paramètre invalide.", code: error.code },
          { status: 400 }
        );

      case "23505": // unique_violation
        return NextResponse.json(
          {
            message: "Cet enregistrement existe déjà (contrainte d'unicité).",
            code: error.code,
          },
          { status: 409 }
        );

      case "23503": // foreign_key_violation
        return NextResponse.json(
          { message: "Référence invalide (clé étrangère).", code: error.code },
          { status: 400 }
        );

      case "23502": // not_null_violation
        return NextResponse.json(
          { message: "Champ obligatoire manquant.", code: error.code },
          { status: 400 }
        );

      case "23514": // check_violation
        return NextResponse.json(
          {
            message: raw || "Contrainte de validation non respectée.",
            code: error.code,
          },
          { status: 400 }
        );

      case "P0001": // raise_exception (RAISE without explicit ERRCODE)
        return NextResponse.json(
          { message: raw || "Opération refusée.", code: error.code },
          { status: 403 }
        );
    }
  }

  // Unknown / non-Postgres error: log server-side and stay generic.
  console.error(fallbackMessage, error);
  return NextResponse.json({ message: fallbackMessage }, { status: 500 });
}
