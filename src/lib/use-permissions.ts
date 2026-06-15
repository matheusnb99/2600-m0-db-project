"use client";

import { useState, useEffect } from "react";

/** Per-table boolean capability. */
export interface TablePerms {
  personnes: boolean;
  affaires: boolean;
  signalements: boolean;
  agents: boolean;
  services: boolean;
  roles: boolean;
}

/** INSERT / UPDATE / DELETE capability of the connected role, per table. */
export interface Perms {
  insert: TablePerms;
  update: TablePerms;
  delete: TablePerms;
}

/**
 * Reads /api/permissions once. Returns null until loaded, then the per-table
 * INSERT/UPDATE/DELETE booleans (from has_table_privilege). Use to show/hide
 * create / edit / delete actions.
 */
export function usePermissions(): Perms | null {
  const [perms, setPerms] = useState<Perms | null>(null);

  useEffect(() => {
    fetch("/api/permissions", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPerms(d ?? null))
      .catch(() => setPerms(null));
  }, []);

  return perms;
}
