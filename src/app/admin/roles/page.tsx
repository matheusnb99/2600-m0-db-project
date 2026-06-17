"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, Button, Input, Select, Spinner, AccessDenied } from "@/components/ui";
import { Icon } from "@/components/icons";
import { AdminLayout } from "@/components/AdminLayout";
import { apiClient, type ApiError } from "@/lib/api-client";
import { usePermissions } from "@/lib/use-permissions";
import type { Role, Classification } from "@/types";

/** One relation a role can touch, with its real privilege booleans. */
interface ResourceAccess {
  key: string;
  label: string;
  view: boolean;
  select: boolean;
  insert: boolean;
  update: boolean;
  delete: boolean;
}
type GrantMatrix = Record<string, ResourceAccess[]>;

/** Visual theme per Bell-LaPadula level (0=NC … 3=TSD). */
const LEVEL_THEME = [
  { bar: "bg-zinc-400", chip: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700" },
  { bar: "bg-sky-500", chip: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-800" },
  { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800" },
  { bar: "bg-red-500", chip: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-300 dark:border-red-800" },
];
const themeFor = (niveau: number) => LEVEL_THEME[niveau] ?? LEVEL_THEME[0];

/** Friendly role titles (display only; the role name stays the SQL identity). */
const ROLE_TITLES: Record<string, string> = {
  agent_saisie: "Agent de saisie",
  opj: "Officier de police judiciaire",
  magistrat: "Magistrat",
  analyste_renseignement: "Analyste de renseignement",
  admin_systeme: "Administrateur système",
  auditeur: "Auditeur",
  controleur_cnil: "Contrôleur CNIL",
};

export default function RolesPage() {
  const perms = usePermissions();

  const [roles, setRoles] = useState<Role[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [grants, setGrants] = useState<GrantMatrix>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, c, g] = await Promise.all([
        apiClient.fetchRoles() as Promise<Role[]>,
        apiClient.fetchClassifications() as Promise<Classification[]>,
        apiClient.fetchRoleGrants() as Promise<GrantMatrix>,
      ]);
      setRoles(r);
      setClassifications(c);
      setGrants(g);
    } catch (err) {
      setError((err as ApiError).message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadAll();
    };
    run();
  }, [loadAll]);

  const classById = useCallback(
    (id: number) => classifications.find((c) => c.id === id),
    [classifications]
  );

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    const form = new FormData(e.currentTarget);
    try {
      await apiClient.createRole({
        nom: form.get("nom"),
        description: form.get("description") || null,
        niveau_max_classification_id:
          Number(form.get("niveau_max_classification_id")) || null,
      });
      setShowForm(false);
      await loadAll();
    } catch (err) {
      setFormError((err as ApiError).message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Rôles &amp; permissions
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Matrice RBAC lue en direct depuis les{" "}
              <code className="font-mono text-xs px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                GRANT
              </code>{" "}
              PostgreSQL — aucune donnée codée en dur.
            </p>
          </div>
          {perms?.insert?.roles && (
            <Button
              variant="primary"
              onClick={() => {
                setFormError(null);
                setShowForm((v) => !v);
              }}
            >
              {showForm ? (
                <>
                  <Icon name="chevronLeft" className="w-4 h-4" />
                  Fermer
                </>
              ) : (
                <>
                  <Icon name="plus" className="w-4 h-4" />
                  Nouveau rôle
                </>
              )}
            </Button>
          )}
        </div>

        {/* Classification scale */}
        {!loading && classifications.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Échelle de classification — Bell-LaPadula
            </p>
            <div className="flex flex-wrap items-stretch gap-2">
              {[...classifications]
                .sort((a, b) => a.niveau - b.niveau)
                .map((c) => {
                  const t = themeFor(c.niveau);
                  return (
                    <div
                      key={c.id}
                      className="flex-1 min-w-[140px] rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900"
                    >
                      <div className={`h-1.5 ${t.bar}`} />
                      <div className="px-3 py-2">
                        <div className="flex items-baseline justify-between">
                          <span className="font-mono font-bold text-zinc-900 dark:text-white">
                            {c.code}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            niv. {c.niveau}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {c.libelle}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Create form */}
        {showForm && perms?.insert?.roles && (
          <Card className="p-6">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">
              Nouveau rôle RBAC
            </h3>
            {formError && (
              <div className="mb-4 p-3 rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-200">
                {formError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Nom du rôle (identifiant SQL)
                  </label>
                  <Input name="nom" placeholder="nom_du_role" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Classification maximale
                  </label>
                  <Select name="niveau_max_classification_id" required>
                    <option value="">Sélectionner</option>
                    {[...classifications]
                      .sort((a, b) => a.niveau - b.niveau)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.libelle}
                        </option>
                      ))}
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Description
                  </label>
                  <Input
                    name="description"
                    placeholder="Responsabilités du rôle"
                  />
                </div>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Crée la ligne dans <code className="font-mono">roles</code>. Les{" "}
                <code className="font-mono">GRANT</code> de table associés se
                définissent côté SQL (script 07).
              </p>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? "Création…" : "Créer le rôle"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowForm(false)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Body */}
        {loading ? (
          <Spinner label="Lecture des rôles et des GRANTs…" />
        ) : error ? (
          <AccessDenied message={error} />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {roles.map((role) => {
              const cls = classById(role.niveau_max_classification_id);
              const theme = themeFor(cls?.niveau ?? 0);
              const access = grants[role.nom] ?? [];
              const writable = access.filter((a) => a.insert || a.update);
              const readOnly = access.filter(
                (a) => a.select && !a.insert && !a.update
              );
              return (
                <Card key={role.id} className="p-0 overflow-hidden">
                  <div className={`h-1.5 ${theme.bar}`} />
                  <div className="p-5 space-y-4">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white leading-tight">
                          {ROLE_TITLES[role.nom] ?? role.nom}
                        </h3>
                        <code className="text-xs font-mono text-zinc-400">
                          {role.nom}
                        </code>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-mono font-semibold ${theme.chip}`}
                      >
                        {cls?.code ?? "—"}
                        <span className="opacity-60 font-sans font-normal">
                          max
                        </span>
                      </span>
                    </div>

                    {role.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {role.description}
                      </p>
                    )}

                    {/* Real access from has_table_privilege */}
                    {access.length === 0 ? (
                      <p className="text-sm text-zinc-400 italic">
                        Aucun accès sur les ressources suivies (rôle restreint à
                        des relations spécifiques).
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {writable.length > 0 && (
                          <AccessGroup
                            title="Écriture"
                            tone="write"
                            items={writable}
                          />
                        )}
                        {readOnly.length > 0 && (
                          <AccessGroup
                            title="Lecture seule"
                            tone="read"
                            items={readOnly}
                          />
                        )}
                      </div>
                    )}

                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <Link
                        href={`/admin/agents?role_id=${role.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors"
                      >
                        Voir les agents de ce rôle
                        <Icon name="arrowRight" className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/** A labelled group of resource chips (write vs read), with privilege tags. */
function AccessGroup({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "write" | "read";
  items: ResourceAccess[];
}) {
  const dot = tone === "write" ? "bg-emerald-500" : "bg-zinc-400";
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {title}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((a) => (
          <span
            key={a.key}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-xs text-zinc-700 dark:text-zinc-200"
            title={a.key}
          >
            {a.view && (
              <span title="Vue anonymisée" className="inline-flex">
                <Icon name="lock" className="w-3 h-3 text-zinc-400" />
              </span>
            )}
            {a.label}
            <span className="flex gap-0.5">
              {a.select && <Priv letter="S" />}
              {a.insert && <Priv letter="I" tone="write" />}
              {a.update && <Priv letter="U" tone="write" />}
              {a.delete && <Priv letter="D" tone="danger" />}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Tiny monospace privilege tag: S(elect) / I(nsert) / U(pdate) / D(elete). */
function Priv({
  letter,
  tone = "read",
}: {
  letter: string;
  tone?: "read" | "write" | "danger";
}) {
  const cls =
    tone === "write"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
      : tone === "danger"
        ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
        : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300";
  return (
    <span
      className={`w-4 h-4 inline-flex items-center justify-center rounded text-[9px] font-mono font-bold ${cls}`}
    >
      {letter}
    </span>
  );
}
