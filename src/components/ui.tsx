"use client";

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
    default: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    danger: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  };

  // An explicit className (full colour set from the caller) overrides the
  // variant palette; otherwise fall back to the named variant.
  return (
    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${className ?? variants[variant]}`}>
      {children}
    </span>
  );
}

/** Centered loading spinner for data-fetching pages. */
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      {label && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      )}
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
    <div className="p-6 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">🔒</span>
        <div>
          <p className="font-semibold text-red-800 dark:text-red-200">
            Accès refusé par la base de données
          </p>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">{message}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
            Le rôle PostgreSQL de connexion ne dispose pas des droits requis
            (RBAC / Bell-LaPadula). C&apos;est le SGBD lui-même qui bloque la
            requête — basculez la chaîne de connexion <code>.env</code> vers un
            rôle habilité pour voir ces données.
          </p>
        </div>
      </div>
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-800 ${className}`}>
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
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      className={`rounded-md font-medium transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
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
      className={`w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
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
      className={`w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
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
          <tr className="border-b-2 border-zinc-300 dark:border-zinc-700">
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={idx} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800">
              {renderRow(item, idx)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
