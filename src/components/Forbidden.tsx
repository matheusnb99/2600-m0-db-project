"use client";

import { roleById, roleByName } from "@/lib/roles";
import { roleServiceUrl, centralLoginUrl } from "@/lib/auth-url";
import { Icon } from "@/components/icons";

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
    <div className="app-bg min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center vault-fade-up">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/12 text-red-300 ring-1 ring-inset ring-red-500/25">
          <Icon name="ban" className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">
          Accès interdit à ce microservice
        </h1>
        <p className="text-zinc-400 mb-7 leading-relaxed">
          Ce service est réservé au rôle{" "}
          <span className="font-mono font-semibold text-zinc-100">
            {here?.label ?? serviceRole}
          </span>
          {agentName ? (
            <>
              {" "}
              — vous êtes connecté en tant que{" "}
              <strong className="text-zinc-200">{agentName}</strong>
            </>
          ) : null}
          {mine ? (
            <>
              , dont le rôle est{" "}
              <span className="font-mono font-semibold text-zinc-100">
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
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-b from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-medium shadow-[0_8px_24px_-10px_rgba(56,189,248,0.6)] ring-1 ring-inset ring-white/10 transition-all"
            >
              Aller à mon service ({mine.label})
              <Icon name="arrowRight" className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={() => {
              window.location.href = centralLoginUrl();
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-white/10 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08] font-medium transition-colors cursor-pointer"
          >
            Changer de compte
          </button>
        </div>

        <p className="mt-8 inline-flex items-start gap-2 text-xs text-zinc-500 max-w-md mx-auto text-left">
          <Icon name="shieldCheck" className="w-4 h-4 mt-px shrink-0 text-zinc-600" />
          <span>
            Sécurité défense en profondeur : même si la couche applicative était
            contournée, la base refuserait l&apos;accès (le rôle de connexion de
            ce service n&apos;a pas vos droits).
          </span>
        </p>
      </div>
    </div>
  );
}
