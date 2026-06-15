"use client";

import { roleById, roleByName } from "@/lib/roles";
import { roleServiceUrl, centralLoginUrl } from "@/lib/auth-url";

/**
 * Shown when an authenticated agent opens a microservice that is NOT their
 * role's — role-bound access. Offers a one-click jump to their own service.
 */
export function Forbidden({
  serviceRole,
  agentRoleId,
  agentName,
}: {
  serviceRole: string; // current_user / role this microservice serves
  agentRoleId: number;
  agentName?: string;
}) {
  const here = roleByName(serviceRole);
  const mine = roleById(agentRoleId);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <div className="w-full max-w-lg text-center">
        <div className="text-6xl mb-4">⛔</div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
          Accès interdit à ce microservice
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Ce service est réservé au rôle{" "}
          <span className="font-mono font-semibold text-zinc-900 dark:text-white">
            {here?.label ?? serviceRole}
          </span>
          {agentName ? <> — vous êtes connecté en tant que <strong>{agentName}</strong></> : null}
          {mine ? (
            <>
              , dont le rôle est{" "}
              <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                {mine.label}
              </span>
              .
            </>
          ) : (
            "."
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {mine && (
            <a
              href={roleServiceUrl(mine.port)}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              Aller à mon service ({mine.label}) →
            </a>
          )}
          <button
            onClick={() => {
              window.location.href = centralLoginUrl();
            }}
            className="px-5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
          >
            Changer de compte
          </button>
        </div>

        <p className="mt-8 text-xs text-zinc-500 dark:text-zinc-400">
          Sécurité défense en profondeur : même si la couche applicative était
          contournée, la base refuserait l&apos;accès (le rôle de connexion de ce
          service n&apos;a pas vos droits).
        </p>
      </div>
    </div>
  );
}
