-- ============================================================================
-- 00_setup_db.sql
-- Run as PostgreSQL superuser:
-- psql -U postgres -f 00_setup_db.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Roles
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'taj_owner'
    ) THEN
        CREATE ROLE taj_owner
            LOGIN
            PASSWORD 'CHANGE_ME_OWNER_PASSWORD'
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            NOREPLICATION;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'taj_app'
    ) THEN
        CREATE ROLE taj_app
            LOGIN
            PASSWORD 'CHANGE_ME_APP_PASSWORD'
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            NOREPLICATION;
    END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- Database
-- ----------------------------------------------------------------------------

SELECT format('CREATE DATABASE taj OWNER taj_owner')
WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = 'taj'
)
\gexec

-- ----------------------------------------------------------------------------
-- Security hardening
-- ----------------------------------------------------------------------------

REVOKE ALL ON DATABASE taj FROM PUBLIC;

GRANT CONNECT ON DATABASE taj TO taj_app;
GRANT CONNECT ON DATABASE taj TO taj_owner;

ALTER ROLE taj_owner SET search_path = public;
ALTER ROLE taj_app SET search_path = public;

-- Optional: prevent accidental use of postgres account
ALTER ROLE postgres NOCREATEDB;
ALTER ROLE postgres NOCREATEROLE;

COMMENT ON ROLE taj_owner IS 'Owns database objects';
COMMENT ON ROLE taj_app IS 'Application runtime account';