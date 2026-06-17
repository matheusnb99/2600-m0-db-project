"use client";

import { Icon } from "@/components/icons";

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning";
  className?: string;
}) {
  const variants = {
    default: "bg-sky-500/12 text-sky-300 ring-1 ring-inset ring-sky-500/25",
    success:
      "bg-emerald-500/12 text-emerald-300 ring-1 ring-inset ring-emerald-500/25",
    danger: "bg-red-500/12 text-red-300 ring-1 ring-inset ring-red-500/25",
    warning: "bg-amber-500/12 text-amber-300 ring-1 ring-inset ring-amber-500/25",
  };

  // An explicit className (full colour set from the caller) overrides the
  // variant palette; otherwise fall back to the named variant.
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
        className ?? variants[variant]
      }`}
    >
      {children}
    </span>
  );
}

/** Bell-LaPadula classification chip with its canonical defence colour. */
export function ClassificationTag({
  code,
  className = "",
}: {
  code: string;
  className?: string;
}) {
  const theme: Record<string, string> = {
    NC: "bg-zinc-500/12 text-zinc-300 ring-zinc-400/25",
    CD: "bg-sky-500/12 text-sky-300 ring-sky-400/30",
    SD: "bg-amber-500/12 text-amber-300 ring-amber-400/30",
    TSD: "bg-red-500/12 text-red-300 ring-red-400/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold ring-1 ring-inset ${
        theme[code] ?? theme.NC
      } ${className}`}
    >
      <Icon name="lock" className="w-3 h-3" strokeWidth={2} />
      {code}
    </span>
  );
}

/** Centered loading spinner for data-fetching pages. */
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="relative h-9 w-9">
        <div className="absolute inset-0 rounded-full border-2 border-sky-500/15" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-400 animate-spin" />
      </div>
      {label && <p className="text-sm text-zinc-400">{label}</p>}
    </div>
  );
}

/**
 * Shown when the database refuses a query for the connected role — the visible
 * payoff of the RBAC / Bell-LaPadula demo. Pass the message returned by the API
 * (mapped from Postgres SQLSTATE 42501 in lib/api-error.ts).
 */
export function AccessDenied({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-6 vault-fade-up">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/30">
          <Icon name="lock" className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-red-200">
            Accès refusé par la base de données
          </p>
          <p className="text-sm text-red-300/90 mt-1">{message}</p>
          <p className="text-xs text-red-300/70 mt-2 leading-relaxed">
            Le rôle PostgreSQL de connexion ne dispose pas des droits requis
            (RBAC / Bell-LaPadula). C&apos;est le SGBD lui-même qui bloque la
            requête — basculez la chaîne de connexion{" "}
            <code className="font-mono text-red-200">.env</code> vers un rôle
            habilité pour voir ces données.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Shown inside the app shell when the signed-in role is not permitted to open
 * the current page (application-level RBAC). Distinct from `AccessDenied`, which
 * reports a *database* refusal: this fires before any query, on pages a role
 * shouldn't reach at all. The sidebar stays visible so the user can navigate
 * back to a section they can access.
 */
export function NotAuthorized({ roleLabel }: { roleLabel?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/12 text-red-300 ring-1 ring-inset ring-red-500/25 mb-5">
        <Icon name="ban" className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">
        Page non autorisée pour votre rôle
      </h2>
      <p className="text-sm text-zinc-400 max-w-md">
        Votre rôle
        {roleLabel ? (
          <>
            {" "}
            (<span className="font-mono font-semibold text-zinc-200">{roleLabel}</span>)
          </>
        ) : null}{" "}
        n&apos;a pas accès à cette page. Utilisez le menu pour revenir à une
        section autorisée.
      </p>
    </div>
  );
}

/**
 * Prev/Next pagination with a page indicator. `total` comes from the API
 * (COUNT(*) OVER()), `page` is 0-based.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
      <span className="text-sm text-zinc-500">
        {total === 0 ? "Aucun résultat" : `${from}–${to} sur ${total}`}
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 0}
          onClick={() => onPage(page - 1)}
        >
          <Icon name="chevronLeft" className="w-4 h-4" />
          Précédent
        </Button>
        <span className="text-sm text-zinc-300 tabular-nums px-2">
          Page {page + 1} / {pages}
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= pages - 1}
          onClick={() => onPage(page + 1)}
        >
          Suivant
          <Icon name="chevronRight" className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-white/[0.07] bg-[#10141c]/80 backdrop-blur-md shadow-[0_18px_40px_-30px_rgba(0,0,0,0.9)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const variants = {
    primary:
      "bg-gradient-to-b from-sky-500 to-blue-600 text-white shadow-[0_8px_24px_-10px_rgba(56,189,248,0.6)] hover:from-sky-400 hover:to-blue-500 ring-1 ring-inset ring-white/10",
    secondary:
      "bg-white/[0.04] text-zinc-200 ring-1 ring-inset ring-white/10 hover:bg-white/[0.08] hover:text-white",
    danger:
      "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_8px_24px_-10px_rgba(239,68,68,0.6)] hover:from-red-400 hover:to-red-500 ring-1 ring-inset ring-white/10",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2",
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3.5 py-2 rounded-lg border border-white/10 bg-[#0b0e14] text-zinc-100 placeholder:text-zinc-500 transition-colors focus:outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20 ${className}`}
      {...props}
    />
  );
}

export function Select({
  children,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full px-3.5 py-2 rounded-lg border border-white/10 bg-[#0b0e14] text-zinc-100 transition-colors cursor-pointer focus:outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Table({
  columns,
  data,
  renderRow,
}: {
  columns: string[];
  data: unknown[];
  renderRow: (item: unknown, index: number) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr
              key={idx}
              className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
            >
              {renderRow(item, idx)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Small labelled section header with an icon — used on detail pages. */
export function SectionTitle({
  icon,
  children,
  count,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <h3 className="flex items-center gap-2.5 text-base font-semibold text-white mb-4">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/10 text-sky-300 ring-1 ring-inset ring-sky-500/20">
        {icon}
      </span>
      {children}
      {count !== undefined && (
        <span className="text-xs font-normal text-zinc-500 tabular-nums">
          ({count})
        </span>
      )}
    </h3>
  );
}
