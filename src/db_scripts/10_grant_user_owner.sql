-- ============================================================================
-- OPÉRATION BLACKVAULT — TAJ
-- Script 07c : LOGIN USERS + RBAC ASSIGNMENT
-- Idempotent — run as superuser (postgres)
-- ============================================================================

\set ON_ERROR_STOP on

-- ============================================================================
-- 1. CREATE LOGIN USERS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'taj_agent') THEN
        CREATE ROLE taj_agent LOGIN PASSWORD 'agent_pwd';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'taj_opj') THEN
        CREATE ROLE taj_opj LOGIN PASSWORD 'opj_pwd';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'taj_magistrat') THEN
        CREATE ROLE taj_magistrat LOGIN PASSWORD 'mag_pwd';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'taj_analyst') THEN
        CREATE ROLE taj_analyst LOGIN PASSWORD 'analyst_pwd';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'taj_admin') THEN
        CREATE ROLE taj_admin LOGIN PASSWORD 'admin_pwd';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'taj_auditor') THEN
        CREATE ROLE taj_auditor LOGIN PASSWORD 'auditor_pwd';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'taj_cnil') THEN
        CREATE ROLE taj_cnil LOGIN PASSWORD 'cnil_pwd';
    END IF;
END $$;

-- ============================================================================
-- 2. GRANT ONE GROUP ROLE PER LOGIN USER
-- ============================================================================

GRANT agent_saisie         TO taj_agent;
GRANT opj                  TO taj_opj;
GRANT magistrat            TO taj_magistrat;
GRANT analyste_renseignement TO taj_analyst;
GRANT admin_systeme        TO taj_admin;
GRANT auditeur             TO taj_auditor;
GRANT controleur_cnil      TO taj_cnil;

-- ============================================================================
-- 3. GRANT DATABASE ACCESS
-- ============================================================================

-- Sur la base courante (taj, blackvault, …) — pas de nom codé en dur.
DO $$
BEGIN
    EXECUTE format(
        'GRANT CONNECT ON DATABASE %I TO '
        'taj_agent, taj_opj, taj_magistrat, taj_analyst, '
        'taj_admin, taj_auditor, taj_cnil',
        current_database()
    );
END $$;

-- ============================================================================
-- 4. ENSURE INHERITANCE (group role privileges flow down to login user)
-- ============================================================================

ALTER ROLE taj_agent    INHERIT;
ALTER ROLE taj_opj      INHERIT;
ALTER ROLE taj_magistrat INHERIT;
ALTER ROLE taj_analyst  INHERIT;
ALTER ROLE taj_admin    INHERIT;
ALTER ROLE taj_auditor  INHERIT;
ALTER ROLE taj_cnil     INHERIT;

-- ============================================================================
-- 4bis. NIVEAU DE SESSION BELL-LAPADULA PAR DÉFAUT (le vrai correctif RLS)
-- ----------------------------------------------------------------------------
-- Les policies RLS du script 08 filtrent via fn_session_level(), qui lit le
-- GUC `app.session_level`. Dans une session psql brute ce GUC n'est jamais
-- positionné → fn_session_level() renvoie -1 → AUCUNE ligne n'est visible
-- (niveau 0..3 <= -1 est toujours faux). C'est pourquoi `SELECT * FROM
-- personnes` est vide pour tous les rôles sauf postgres (qui bypass la RLS).
--
-- Correctif : on attache à chaque utilisateur de connexion un niveau de
-- session PAR DÉFAUT égal à son habilitation maximale. PostgreSQL applique ce
-- réglage automatiquement à l'ouverture de session, donc la RLS fonctionne
-- sans appel manuel à fn_open_session().
--
-- Niveaux Bell-LaPadula : NC=0, CD=1, SD=2, TSD=3 (cf. classification_niveaux).
-- Le niveau doit rester <= niveau_max_classification_id du rôle (script 04).
--
-- Note : admin_systeme / auditeur / controleur_cnil n'ont AUCUN GRANT sur
-- `personnes` (script 07) — ils reçoivent volontairement "permission denied"
-- et lisent les vues anonymisées (personnes_anonymisees, …). On leur donne
-- tout de même un niveau par défaut cohérent pour les tables qu'ils peuvent
-- consulter (audit_log, consultations, …) le cas échéant.
-- ============================================================================

ALTER ROLE taj_agent     SET app.session_level = '1';  -- agent_saisie           → CD
ALTER ROLE taj_opj       SET app.session_level = '2';  -- opj                    → SD
ALTER ROLE taj_magistrat SET app.session_level = '3';  -- magistrat              → TSD
ALTER ROLE taj_analyst   SET app.session_level = '3';  -- analyste_renseignement → TSD
ALTER ROLE taj_admin     SET app.session_level = '0';  -- admin_systeme          → NC
ALTER ROLE taj_auditor   SET app.session_level = '3';  -- auditeur               → TSD (vues)
ALTER ROLE taj_cnil      SET app.session_level = '2';  -- controleur_cnil        → SD (vues)

-- Le correctif de PROPRIÉTÉ des fonctions SECURITY DEFINER (récursion RLS +
-- écriture audit_log) a été déplacé dans le script 12_proprietaires_fonctions.sql,
-- qui couvre l'ensemble des fonctions concernées en un seul endroit.

-- ============================================================================
-- 4quater. CONNEXION DIRECTE PAR LES RÔLES DE GROUPE (option lisibilité démo)
-- ----------------------------------------------------------------------------
-- Par défaut les 7 rôles RBAC sont NOLOGIN (script 07) : ce sont des rôles de
-- groupe portés par les utilisateurs taj_* ci-dessus. Pour pouvoir aussi
-- basculer la chaîne de connexion du site directement sur le nom métier
-- (DB_USER=agent_saisie, opj, …) plutôt que sur taj_*, on leur accorde LOGIN +
-- un mot de passe. Les deux approches coexistent sans conflit.
--
-- Le mot de passe reprend le même schéma que les utilisateurs taj_*.
-- ============================================================================

ALTER ROLE agent_saisie           LOGIN PASSWORD 'agent_pwd';
ALTER ROLE opj                    LOGIN PASSWORD 'opj_pwd';
ALTER ROLE magistrat              LOGIN PASSWORD 'mag_pwd';
ALTER ROLE analyste_renseignement LOGIN PASSWORD 'analyst_pwd';
ALTER ROLE admin_systeme          LOGIN PASSWORD 'admin_pwd';
ALTER ROLE auditeur               LOGIN PASSWORD 'auditor_pwd';
ALTER ROLE controleur_cnil        LOGIN PASSWORD 'cnil_pwd';

DO $$
BEGIN
    EXECUTE format(
        'GRANT CONNECT ON DATABASE %I TO '
        'agent_saisie, opj, magistrat, analyste_renseignement, '
        'admin_systeme, auditeur, controleur_cnil',
        current_database()
    );
END $$;

-- Niveau BLP par défaut sur les rôles de groupe (cohérent avec les taj_*).
-- Sert uniquement si on navigue sans session applicative ; sinon l'app fixe
-- app.session_level via le JWT à chaque requête.
ALTER ROLE agent_saisie           SET app.session_level = '1';  -- CD
ALTER ROLE opj                    SET app.session_level = '2';  -- SD
ALTER ROLE magistrat              SET app.session_level = '3';  -- TSD
ALTER ROLE analyste_renseignement SET app.session_level = '3';  -- TSD
ALTER ROLE admin_systeme          SET app.session_level = '0';  -- NC
ALTER ROLE auditeur               SET app.session_level = '3';  -- TSD (vues)
ALTER ROLE controleur_cnil        SET app.session_level = '2';  -- SD  (vues)

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================

\echo ''
\echo '=== Login users and their assigned role ==='
SELECT
    u.rolname AS login_user,
    r.rolname AS group_role,
    u.rolcanlogin AS can_login,
    u.rolinherit  AS inherits
FROM pg_auth_members m
JOIN pg_roles u ON m.member = u.oid
JOIN pg_roles r ON m.roleid = r.oid
WHERE u.rolname LIKE 'taj_%'
ORDER BY u.rolname;

\echo ''
\echo '=== Niveau de session BLP par défaut (app.session_level) ==='
SELECT rolname AS login_user,
       (SELECT option_value
        FROM pg_options_to_table(rolconfig)
        WHERE option_name = 'app.session_level') AS session_level_defaut
FROM pg_roles
WHERE rolname LIKE 'taj_%'
ORDER BY rolname;

\echo ''
\echo '✅ Script 07c_users_rbac.sql appliqué avec succès'