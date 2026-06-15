-- ============================================================================
-- OPÉRATION BLACKVAULT — TAJ — Pôle 2 (Sécurité)
-- Script 09 : Fonctions et triggers Bell-LaPadula / Biba
-- ----------------------------------------------------------------------------
-- Implémente :
--   - Fonctions helper : habilitation, niveau de session, agent courant
--   - Fonction d'audit centralisée
--   - Trigger No Write Down (BLP) attaché aux 4 tables sensibles
--   - Procédure d'ouverture de session (set agent_id + session_level)
--
-- Idempotent (CREATE OR REPLACE + DROP TRIGGER IF EXISTS).
-- À exécuter en superuser.
-- ============================================================================

\set ON_ERROR_STOP on

-- ============================================================================
-- SECTION 1 — FONCTIONS HELPER
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 fn_habilitation_agent(uuid) : retourne le niveau d'habilitation
-- ----------------------------------------------------------------------------
-- Retour : 0 (NC), 1 (CD), 2 (SD), 3 (TSD), ou -1 si agent inexistant/inactif
--
-- SECURITY DEFINER : on doit pouvoir lire la table 'agents' même quand un
-- rôle non-admin invoque la fonction (sinon RLS bloquerait).
-- STABLE : pas d'effet de bord, même résultat dans une même transaction.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_habilitation_agent(p_agent_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_niveau INT;
BEGIN
    SELECT cn.niveau INTO v_niveau
    FROM agents a
    JOIN classification_niveaux cn ON cn.id = a.habilitation_niveau_id
    WHERE a.id = p_agent_id
      AND a.actif = TRUE
      AND a.verrouille = FALSE;

    RETURN COALESCE(v_niveau, -1);
END;
$$;

COMMENT ON FUNCTION fn_habilitation_agent(UUID) IS
'Retourne le niveau Bell-LaPadula (0-3) d''un agent actif, -1 sinon. Base des contrôles RLS.';

-- ----------------------------------------------------------------------------
-- 1.2 fn_session_agent_id() : récupère l'UUID de l'agent en cours de session
-- ----------------------------------------------------------------------------
-- Lit le GUC custom 'app.agent_id' positionné par fn_open_session().
-- Le second paramètre `true` de current_setting évite l'erreur si non set
-- (retourne NULL → on convertit en UUID NULL).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_session_agent_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(current_setting('app.agent_id', TRUE), '')::UUID;
$$;

COMMENT ON FUNCTION fn_session_agent_id() IS
'Retourne l''UUID de l''agent connecté (GUC app.agent_id), NULL si aucune session ouverte.';

-- ----------------------------------------------------------------------------
-- 1.3 fn_session_level() : niveau de session courant
-- ----------------------------------------------------------------------------
-- Lit le GUC 'app.session_level' positionné à la connexion.
-- Si non défini → -1 (= aucune session active, tout est bloqué).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_session_level()
RETURNS INT
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(NULLIF(current_setting('app.session_level', TRUE), '')::INT, -1);
$$;

COMMENT ON FUNCTION fn_session_level() IS
'Retourne le niveau BLP de la session courante (0-3), -1 si aucune session.';

-- ============================================================================
-- SECTION 2 — FONCTION D'AUDIT CENTRALISÉE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 fn_log_audit(...) : insertion dans audit_log
-- ----------------------------------------------------------------------------
-- Utilisée par les triggers et par l'application.
-- SECURITY DEFINER pour pouvoir écrire dans audit_log depuis n'importe quel
-- rôle (audit_log n'a pas de GRANT INSERT pour les rôles métier).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_log_audit(
    p_action       VARCHAR(50),
    p_table_cible  VARCHAR(50) DEFAULT NULL,
    p_record_id    UUID         DEFAULT NULL,
    p_details      JSONB        DEFAULT '{}'::jsonb,
    p_alerte       BOOLEAN      DEFAULT FALSE,
    p_type_alerte  TEXT         DEFAULT NULL,
    p_severite     INT          DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO audit_log (
        agent_id, action, table_cible, enregistrement_id,
        details, alerte, type_alerte, severite
    )
    VALUES (
        fn_session_agent_id(), p_action, p_table_cible, p_record_id,
        p_details, p_alerte, p_type_alerte, p_severite
    );
END;
$$;

COMMENT ON FUNCTION fn_log_audit IS
'Insère une entrée dans audit_log. Agent_id auto-rempli depuis la session courante.';

-- ============================================================================
-- SECTION 3 — TRIGGER BLP "NO WRITE DOWN" + BIBA "NO WRITE UP"
-- ============================================================================
-- ⚠️ Ce trigger implémente DEUX modèles à la fois :
--
--   1. Bell-LaPadula *-Property (confidentialité) :
--      No Write Down → un agent en session niveau N ne peut PAS écrire
--      une ligne avec niveau_classification < N (évite le downgrade).
--
--   2. Biba *-Property (intégrité) :
--      No Write Up → un agent en session niveau N ne peut PAS écrire
--      une ligne avec niveau_classification > N (évite la contamination
--      d'une source de haute intégrité par une source de basse intégrité).
--
-- Implémentation : la condition `niveau_cible <> niveau_session` couvre les
-- DEUX cas en une seule règle (écriture strictement au niveau de session).
-- C'est plus strict que BLP seul ou Biba seul, et c'est le bon design pour
-- un système de classification militaire/judiciaire comme le TAJ.
--
-- Le contrôle se fait dans le trigger BEFORE INSERT/UPDATE.
--
-- ⚠️ LIMITATION CONNUE :
-- Le PERFORM fn_log_audit est dans la même transaction que l'INSERT bloqué.
-- Quand RAISE EXCEPTION est levée, la transaction ROLLBACK, donc le log
-- audit_log custom est aussi annulé. C'est le comportement standard PG.
--
-- → Stratégie de traçabilité combinée :
--   1. audit_log custom (cette table) : capture les ACTIONS RÉUSSIES suspectes
--      (consultations honeytraps, élévations de session refusées en amont).
--   2. pgaudit (Pôle 4 infra) : capture TOUTES les requêtes y compris échouées
--      au niveau moteur PostgreSQL, dans les logs système.
--   3. RAISE EXCEPTION : message explicite qui apparaît côté client (pas perdu).
--
-- Extension future possible : dblink pour autonomous transaction qui persiste
-- le log même en cas de rollback. Hors scope J3.
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_fn_blp_no_write_down()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_niveau_cible  INT;
    v_niveau_sess   INT;
    v_agent_id      UUID;
BEGIN
    v_niveau_sess := fn_session_level();
    v_agent_id    := fn_session_agent_id();

    -- Bypass total pour superuser / postgres (admin technique)
    IF current_user = 'postgres' AND v_niveau_sess = -1 THEN
        RETURN NEW;
    END IF;

    -- Récupération du niveau cible (toutes nos tables BLP ont niveau_classification_id)
    SELECT cn.niveau INTO v_niveau_cible
    FROM classification_niveaux cn
    WHERE cn.id = NEW.niveau_classification_id;

    IF v_niveau_cible IS NULL THEN
        RAISE EXCEPTION 'BLP : niveau_classification_id invalide (%, NULL)', NEW.niveau_classification_id
            USING ERRCODE = 'check_violation';
    END IF;

    -- ⚠️ La règle stricte : on n'écrit qu'à son niveau de session exact
    --    (No Write Down + No Write Up "soft" via le mode session)
    IF v_niveau_cible <> v_niveau_sess THEN
        -- Log de la violation (TG_TABLE_NAME est de type 'name', cast en text)
        PERFORM fn_log_audit(
            p_action       => TG_OP::VARCHAR(50),
            p_table_cible  => TG_TABLE_NAME::VARCHAR(50),
            p_record_id    => CASE WHEN TG_OP = 'UPDATE' THEN OLD.id ELSE NULL END,
            p_details      => jsonb_build_object(
                'tentative',           'no_write_down_violation',
                'niveau_session',      v_niveau_sess,
                'niveau_cible',        v_niveau_cible,
                'agent_id',            v_agent_id
            ),
            p_alerte       => TRUE,
            p_type_alerte  => 'BLP_NO_WRITE_DOWN'::TEXT,
            p_severite     => 4
        );

        RAISE EXCEPTION
          'Bell-LaPadula : écriture refusée. Session niveau %, cible niveau % (table %).',
          v_niveau_sess, v_niveau_cible, TG_TABLE_NAME
          USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trg_fn_blp_no_write_down() IS
'Trigger générique BLP : interdit l''écriture à un niveau ≠ niveau de session.';

-- ----------------------------------------------------------------------------
-- 3.1 Attachement du trigger aux 4 tables BLP
-- ----------------------------------------------------------------------------
-- DROP IF EXISTS pour idempotence
-- BEFORE INSERT OR UPDATE → contrôle avant que la modif ne soit persistée
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['personnes', 'affaires', 'biometrie', 'signalements']
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_blp_no_write_down ON %I', t);
        EXECUTE format(
            'CREATE TRIGGER trg_blp_no_write_down
             BEFORE INSERT OR UPDATE ON %I
             FOR EACH ROW
             EXECUTE FUNCTION trg_fn_blp_no_write_down()', t
        );
        RAISE NOTICE 'Trigger BLP attaché à : %', t;
    END LOOP;
END $$;

-- ============================================================================
-- SECTION 4 — OUVERTURE DE SESSION (HELPER APPLICATIF)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 fn_open_session(agent_id, niveau) : ouvre une session de travail
-- ----------------------------------------------------------------------------
-- Vérifications :
--   - agent existe + actif + non verrouillé
--   - niveau demandé ≤ habilitation max de l'agent
-- Effet :
--   - SET app.agent_id, app.session_level (GUC custom, scope session)
--   - INSERT dans audit_log (action = LOGIN_SESSION)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_open_session(
    p_agent_id UUID,
    p_niveau   INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_habilitation INT;
BEGIN
    v_habilitation := fn_habilitation_agent(p_agent_id);

    IF v_habilitation = -1 THEN
        RAISE EXCEPTION 'Agent % introuvable, inactif ou verrouillé', p_agent_id
            USING ERRCODE = 'invalid_authorization_specification';
    END IF;

    IF p_niveau < 0 OR p_niveau > 3 THEN
        RAISE EXCEPTION 'Niveau de session invalide : % (attendu 0..3)', p_niveau
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF p_niveau > v_habilitation THEN
        -- Tentative d'élévation de privilège → alerte
        PERFORM fn_log_audit(
            p_action       => 'LOGIN_SESSION_DENIED',
            p_details      => jsonb_build_object(
                'agent_id',        p_agent_id,
                'niveau_demande',  p_niveau,
                'habilitation',    v_habilitation
            ),
            p_alerte       => TRUE,
            p_type_alerte  => 'ELEVATION_TENTATIVE',
            p_severite     => 5
        );
        RAISE EXCEPTION
          'Niveau de session demandé (%) > habilitation max (%) pour l''agent %',
          p_niveau, v_habilitation, p_agent_id
          USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- OK, on positionne les GUC pour la session courante
    PERFORM set_config('app.agent_id',     p_agent_id::TEXT, FALSE);
    PERFORM set_config('app.session_level', p_niveau::TEXT,   FALSE);

    -- Log de l'ouverture de session
    PERFORM fn_log_audit(
        p_action       => 'LOGIN_SESSION',
        p_details      => jsonb_build_object(
            'agent_id',        p_agent_id,
            'session_level',   p_niveau,
            'habilitation',    v_habilitation
        ),
        p_alerte       => FALSE,
        p_severite     => 1
    );
END;
$$;

COMMENT ON FUNCTION fn_open_session(UUID, INT) IS
'Ouvre une session de travail : vérifie l''habilitation et positionne app.agent_id + app.session_level.';

-- ----------------------------------------------------------------------------
-- 4.2 fn_close_session() : ferme la session courante
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_close_session()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM fn_log_audit(
        p_action  => 'LOGOUT_SESSION',
        p_details => jsonb_build_object('agent_id', fn_session_agent_id())
    );
    PERFORM set_config('app.agent_id',     '', FALSE);
    PERFORM set_config('app.session_level', '', FALSE);
END;
$$;

-- ============================================================================
-- SECTION 4.3 — FONCTIONS DE NIVEAU HÉRITÉ (pour RLS sur tables liées)
-- ============================================================================
-- Beaucoup de tables n'ont pas leur propre niveau_classification_id mais
-- héritent du niveau d'une table parente (personnes, affaires).
-- Ces fonctions abstraient la lookup et sont utilisées dans les policies RLS.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_niveau_personne(p_personne_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(
        (SELECT cn.niveau
         FROM personnes p
         JOIN classification_niveaux cn ON cn.id = p.niveau_classification_id
         WHERE p.id = p_personne_id),
        -1
    );
$$;

CREATE OR REPLACE FUNCTION fn_niveau_affaire(p_affaire_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(
        (SELECT cn.niveau
         FROM affaires a
         JOIN classification_niveaux cn ON cn.id = a.niveau_classification_id
         WHERE a.id = p_affaire_id),
        -1
    );
$$;

COMMENT ON FUNCTION fn_niveau_personne(UUID) IS
'Retourne le niveau BLP hérité d''une personne. Utilisé par les RLS sur aliases, adresses, telephones.';
COMMENT ON FUNCTION fn_niveau_affaire(UUID) IS
'Retourne le niveau BLP hérité d''une affaire. Utilisé par les RLS sur affaire_personnes, affaire_infractions, decisions_justice, scelles, affaire_vehicules.';

-- ----------------------------------------------------------------------------
-- fn_service_agent(uuid) — utilisé par la RLS sur agents (évite la récursion)
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER pour bypass la policy de agents quand on regarde son
-- propre service_id depuis une policy de agents (sinon récursion infinie).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_service_agent(p_agent_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT service_id FROM agents WHERE id = p_agent_id;
$$;

COMMENT ON FUNCTION fn_service_agent(UUID) IS
'Retourne le service_id d''un agent — SECURITY DEFINER pour éviter récursion RLS sur agents.';

-- ============================================================================
-- SECTION 5 — PERMISSIONS D'EXÉCUTION SUR LES FONCTIONS
-- ============================================================================
-- Toutes les fonctions doivent être appelables par les 7 rôles RBAC
-- (sinon les RLS du script 08 plantent quand elles appellent fn_session_level).
-- ============================================================================

GRANT EXECUTE ON FUNCTION
    fn_habilitation_agent(UUID),
    fn_session_agent_id(),
    fn_session_level(),
    fn_open_session(UUID, INT),
    fn_close_session(),
    fn_niveau_personne(UUID),
    fn_niveau_affaire(UUID),
    fn_service_agent(UUID)
TO agent_saisie, opj, magistrat, analyste_renseignement,
   admin_systeme, auditeur, controleur_cnil;

-- fn_log_audit reste réservé aux triggers (SECURITY DEFINER permet l'écriture
-- mais on évite que l'application l'appelle directement)
REVOKE EXECUTE ON FUNCTION fn_log_audit FROM PUBLIC;

-- ============================================================================
-- SECTION 6 — VÉRIFICATIONS RAPIDES
-- ============================================================================

\echo ''
\echo '=== Fonctions installées ==='
SELECT proname AS fonction,
       pg_get_function_arguments(oid) AS args
FROM pg_proc
WHERE proname LIKE 'fn_%' OR proname LIKE 'trg_fn_%'
ORDER BY proname;

\echo ''
\echo '=== Triggers BLP attachés ==='
SELECT event_object_table AS table_name,
       trigger_name,
       event_manipulation AS event,
       action_timing AS timing
FROM information_schema.triggers
WHERE trigger_name = 'trg_blp_no_write_down'
ORDER BY event_object_table;

\echo ''
\echo '✅ Script 09_fonctions_triggers_blp.sql appliqué avec succès'
