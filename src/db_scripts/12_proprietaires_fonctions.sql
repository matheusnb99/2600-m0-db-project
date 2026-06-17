-- ============================================================================
-- OPÉRATION BLACKVAULT — TAJ
-- Script 12 : PROPRIÉTÉ DES FONCTIONS « SECURITY DEFINER »
-- ----------------------------------------------------------------------------
-- À exécuter EN SUPERUSER (postgres), APRÈS le script 09 (qui crée les fonctions)
-- et après 10 (qui crée le rôle postgres comme cible). Idempotent.
--
-- POURQUOI ?
-- Les fonctions SECURITY DEFINER (helpers RLS, trigger BLP, audit, session)
-- doivent s'exécuter avec une identité qui CONTOURNE la Row-Level Security,
-- sinon deux pannes apparaissent :
--   • fn_service_agent / fn_niveau_* relisent LEUR PROPRE table sous
--     FORCE ROW LEVEL SECURITY → la policy se ré-applique → récursion infinie
--     (ERROR 54001 « stack depth limit exceeded » sur /admin/agents, etc.).
--   • fn_log_audit (appelée par le trigger BLP) écrit dans audit_log, sur
--     laquelle AUCUN rôle métier n'a d'INSERT → l'écriture échoue et masque le
--     refus Bell-LaPadula en erreur 500.
--
-- SECURITY DEFINER ne contourne la RLS QUE si le PROPRIÉTAIRE de la fonction la
-- contourne lui-même. Si les fonctions sont chargées par un rôle NOSUPERUSER
-- (taj_owner / taj_admin via setup_scripts.sh), ce n'est pas le cas → on rétablit
-- postgres (superuser, qui ignore toujours la RLS, même FORCE) comme propriétaire.
--
-- NB : si la base est provisionnée par reset_db.py (DB_USER=postgres), les
-- fonctions appartiennent déjà à postgres → ce script est un no-op inoffensif.
-- ============================================================================

\set ON_ERROR_STOP on

DO $$
DECLARE
    fn  TEXT;
    -- Signatures complètes (nom + types d'arguments) — requises pour identifier
    -- chaque fonction de façon non ambiguë.
    fns TEXT[] := ARRAY[
        -- Helpers RLS : lisent agents/personnes/affaires sans re-déclencher la RLS
        'fn_service_agent(uuid)',
        'fn_habilitation_agent(uuid)',
        'fn_niveau_personne(uuid)',
        'fn_niveau_affaire(uuid)',
        -- Trigger BLP « No Write Down » + journalisation des violations dans audit_log
        'trg_fn_blp_no_write_down()',
        'fn_log_audit(varchar, varchar, uuid, jsonb, boolean, text, integer)',
        -- Ouverture de session BLP (écrit les GUC, lit agents) — SECURITY DEFINER
        'fn_open_session(uuid, integer)',
        -- Lecture du contexte de session (non SECURITY DEFINER, mais réownées par
        -- cohérence ; elles sont référencées par les policies/triggers)
        'fn_session_level()',
        'fn_session_agent_id()'
    ];
BEGIN
    FOREACH fn IN ARRAY fns LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION %s OWNER TO postgres', fn);
            RAISE NOTICE 'OWNER → postgres : %', fn;
        EXCEPTION
            WHEN undefined_function THEN
                RAISE NOTICE 'Fonction absente, ignorée : %', fn;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
\echo ''
\echo '=== Propriétaires des fonctions sensibles ==='
SELECT proname            AS fonction,
       pg_get_userbyid(proowner) AS proprietaire,
       prosecdef          AS security_definer
FROM pg_proc
WHERE proname IN (
    'fn_service_agent', 'fn_habilitation_agent', 'fn_niveau_personne',
    'fn_niveau_affaire', 'trg_fn_blp_no_write_down', 'fn_log_audit',
    'fn_open_session', 'fn_session_level', 'fn_session_agent_id'
)
ORDER BY 1;

\echo ''
\echo '✅ Script 12_proprietaires_fonctions.sql appliqué avec succès'
