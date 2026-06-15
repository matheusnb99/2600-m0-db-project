# BLACKVAULT — Démo « un site, un rôle par connexion »

Le site applique **deux couches de sécurité indépendantes** :

- **RBAC (rôle de connexion `.env`)** → décide à quelles **tables/pages** on accède. C'est ce qu'on bascule pour la démo.
- **Bell-LaPadula / RLS (agent connecté)** → décide quelles **lignes** sont visibles (filtre par niveau d'habilitation porté par le JWT).

## Procédure de bascule de rôle

⚠️ Les pools PostgreSQL sont mis en cache au démarrage du process Node. Changer `.env` n'a **aucun effet** tant qu'on n'a pas redémarré.

```
1. éditer site/.env  → DB_USER=taj_xxx   DB_PASSWORD=xxx_pwd
2. Ctrl-C puis  pnpm dev
3. rafraîchir le navigateur (se reconnecter si besoin)
```

Ne **jamais** mettre `postgres` dans `DB_USER` : le superuser contourne RLS/GRANTs et masque la démo.

### Les 7 rôles de connexion (DATA pool)

| DB_USER (LOGIN) | Profil métier (groupe) | Mot de passe |
|---|---|---|
| `taj_agent` | agent_saisie (CD) | `agent_pwd` |
| `taj_opj` | opj (SD) | `opj_pwd` |
| `taj_magistrat` | magistrat (TSD) | `mag_pwd` |
| `taj_analyst` | analyste_renseignement (TSD) | `analyst_pwd` |
| `taj_admin` | admin_systeme (NC) | `admin_pwd` |
| `taj_auditor` | auditeur (vues anonymisées) | `auditor_pwd` |
| `taj_cnil` | controleur_cnil (vues) | `cnil_pwd` |

> `taj_agent` est l'utilisateur LOGIN ; `agent_saisie` est le rôle de groupe NOLOGIN. Mettre le **`taj_*`** dans `.env`, jamais le rôle de groupe.

## Matrice — quel rôle voit quelle page

✓ = données affichées · 🔒 = « Accès refusé par la base de données » (RBAC/RLS)

| DB_USER | Personnes | Affaires | Signalements | Agents | Audit | Conformité |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `taj_agent` | ✓ | ✓ | ✓ | 🔒 | 🔒 | 🔒 |
| `taj_opj` | ✓ | ✓ | ✓ | 🔒 | 🔒 | 🔒 |
| `taj_magistrat` | ✓ | ✓ | ✓ | ✓ | 🔒 | 🔒 |
| `taj_analyst` | ✓ | ✓ | ✓ | 🔒 | 🔒 | 🔒 |
| `taj_admin` | 🔒 | 🔒 | 🔒 | ✓ | ✓ | 🔒 |
| `taj_auditor` | 🔒 | 🔒 | 🔒 | 🔒 | ✓ | ✓ |
| `taj_cnil` | 🔒 | 🔒 | 🔒 | 🔒 | ✓ | ✓ |

Trois contrastes parlants à montrer au jury :

- **`taj_admin`** : `/personnes` → 🔒, mais `/admin/agents` et `/admin/audit` se remplissent.
- **`taj_opj`** : `/personnes` se remplit, `/admin/agents` et `/admin/audit` → 🔒.
- **`taj_cnil`** : tout l'opérationnel → 🔒, seul `/conformite` fonctionne (données **pseudonymisées**, jamais de nom réel).

## Couche Bell-LaPadula (indépendante du `.env`)

Avec `.env` fixé sur `taj_opj`, le **niveau de lignes** dépend de l'**agent connecté** :

- se connecter avec un agent **CD** → `/personnes` montre les lignes NC + CD.
- se reconnecter avec un agent **SD/TSD** → le nombre de lignes augmente (No Read Up).
- le bandeau en haut à droite affiche le rôle BDD + le niveau (`CD`/`SD`/…).

## Pré-requis base (une fois)

Ordre d'application des scripts (08 dépend des fonctions de 09) :

```
07_roles_grants → 09_fonctions_triggers_blp → 08_rls_policies → 10_grant_user_owner
```

- mot de passe de démo connu :
  `UPDATE agents SET mot_de_passe_hash = crypt('Blackvault2026!', gen_salt('bf',12));`
- `.env` → `AUTH_DB_PASSWORD` = vrai mot de passe `postgres`
- `pg_hba.conf` autorise l'auth par mot de passe pour les `taj_*`
- vérifier que `personnes` a bien des **policies** (`SELECT count(*) FROM pg_policy WHERE polrelid='personnes'::regclass;` > 0) — sinon RLS activée sans policy = **deny-all**.
