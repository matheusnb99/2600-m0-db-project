-- ============================================================================
-- OPÉRATION BLACKVAULT — TAJ — Pôle 2 (Sécurité)
-- Script 08 : Row-Level Security (RLS)
-- ----------------------------------------------------------------------------
-- Implémente :
--   - BLP "No Read Up" via policy SELECT sur 4 tables avec classification
--     (personnes, affaires, biometrie, signalements)
--   - BLP "No Write Down" en complément du trigger (script 09) via policies
--     INSERT/UPDATE avec WITH CHECK
--   - RLS "owner" sur audit_log et consultations (chaque agent voit ses lignes,
--     admin/auditeur voient tout)
--
-- Dépendances : fonctions du script 09 (fn_session_level, fn_session_agent_id)
-- Idempotent : DROP POLICY IF EXISTS avant chaque CREATE.
-- À exécuter en superuser.
-- ============================================================================

\set ON_ERROR_STOP on

-- ============================================================================
-- SECTION 1 — ACTIVATION DU RLS
-- ============================================================================
-- ENABLE : active les policies
-- FORCE  : même les owners des tables (sauf superuser) sont soumis aux policies
--          → évite le bypass classique "je suis owner donc je vois tout"
-- ============================================================================

ALTER TABLE personnes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnes      FORCE  ROW LEVEL SECURITY;

ALTER TABLE affaires       ENABLE ROW LEVEL SECURITY;
ALTER TABLE affaires       FORCE  ROW LEVEL SECURITY;

ALTER TABLE biometrie      ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometrie      FORCE  ROW LEVEL SECURITY;

ALTER TABLE signalements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE signalements   FORCE  ROW LEVEL SECURITY;

ALTER TABLE audit_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log      FORCE  ROW LEVEL SECURITY;

ALTER TABLE consultations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations  FORCE  ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 2 — TABLES BLP (niveau_classification_id)
-- ============================================================================
-- Pattern commun (BLP) :
--   - SELECT : niveau_classif <= fn_session_level()  (No Read Up)
--   - INSERT/UPDATE : niveau_classif = fn_session_level()  (No Write Down strict)
--   - Bypass : superuser ('postgres') voit tout pour maintenance
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 personnes
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS blp_select_personnes ON personnes;
CREATE POLICY blp_select_personnes ON personnes
    FOR SELECT
    USING (
        current_user = 'postgres'
        OR (
            SELECT cn.niveau
            FROM classification_niveaux cn
            WHERE cn.id = personnes.niveau_classification_id
        ) <= fn_session_level()
    );

DROP POLICY IF EXISTS blp_insert_personnes ON personnes;
CREATE POLICY blp_insert_personnes ON personnes
    FOR INSERT
    WITH CHECK (
        current_user = 'postgres'
        OR (
            SELECT cn.niveau
            FROM classification_niveaux cn
            WHERE cn.id = personnes.niveau_classification_id
        ) = fn_session_level()
    );

DROP POLICY IF EXISTS blp_update_personnes ON personnes;
CREATE POLICY blp_update_personnes ON personnes
    FOR UPDATE
    USING (
        current_user = 'postgres'
        OR (
            SELECT cn.niveau
            FROM classification_niveaux cn
            WHERE cn.id = personnes.niveau_classification_id
        ) = fn_session_level()
    )
    WITH CHECK (
        current_user = 'postgres'
        OR (
            SELECT cn.niveau
            FROM classification_niveaux cn
            WHERE cn.id = personnes.niveau_classification_id
        ) = fn_session_level()
    );

-- ----------------------------------------------------------------------------
-- 2.2 affaires
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS blp_select_affaires ON affaires;
CREATE POLICY blp_select_affaires ON affaires
    FOR SELECT
    USING (
        current_user = 'postgres'
        OR (SELECT cn.niveau FROM classification_niveaux cn
            WHERE cn.id = affaires.niveau_classification_id) <= fn_session_level()
    );

DROP POLICY IF EXISTS blp_insert_affaires ON affaires;
CREATE POLICY blp_insert_affaires ON affaires
    FOR INSERT
    WITH CHECK (
        current_user = 'postgres'
        OR (SELECT cn.niveau FROM classification_niveaux cn
            WHERE cn.id = affaires.niveau_classification_id) = fn_session_level()
    );

DROP POLICY IF EXISTS blp_update_affaires ON affaires;
CREATE POLICY blp_update_affaires ON affaires
    FOR UPDATE
    USING (
        current_user = 'postgres'
        OR (SELECT cn.niveau FROM classification_niveaux cn
            WHERE cn.id = affaires.niveau_classification_id) = fn_session_level()
    )
    WITH CHECK (
        current_user = 'postgres'
        OR (SELECT cn.niveau FROM classification_niveaux cn
            WHERE cn.id = affaires.niveau_classification_id) = fn_session_level()
    );

-- ----------------------------------------------------------------------------
-- 2.3 biometrie
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS blp_select_biometrie ON biometrie;
CREATE POLICY blp_select_biometrie ON biometrie
    FOR SELECT
    USING (
        current_user = 'postgres'
        OR (SELECT cn.niveau FROM classification_niveaux cn
            WHERE cn.id = biometrie.niveau_classification_id) <= fn_session_level()
    );

DROP POLICY IF EXISTS blp_insert_biometrie ON biometrie;
CREATE POLICY blp_insert_biometrie ON biometrie
    FOR INSERT
    WITH CHECK (
        current_user = 'postgres'
        OR (SELECT cn.niveau FROM classification_niveaux cn
            WHERE cn.id = biometrie.niveau_classification_id) = fn_session_level()
    );

DROP POLICY IF EXISTS blp_update_biometrie ON biometrie;
CREATE POLICY blp_update_biometrie ON biometrie
    FOR UPDATE
    USING (
        current_user = 'postgres'
        OR (SELECT cn.niveau FROM classification_niveaux cn
            WHERE cn.id = biometrie.niveau_classification_id) = fn_session_level()
    );

-- ----------------------------------------------------------------------------
-- 2.4 signalements (incl. fiches S — la plus sensible)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS blp_select_signalements ON signalements;
CREATE POLICY blp_select_signalements ON signalements
    FOR SELECT
    USING (
        current_user = 'postgres'
        OR (SELECT cn.niveau FROM classification_niveaux cn
            WHERE cn.id = signalements.niveau_classification_id) <= fn_session_level()
    );

DROP POLICY IF EXISTS blp_insert_signalements ON signalements;
CREATE POLICY blp_insert_signalements ON signalements
    FOR INSERT
    WITH CHECK (
        current_user = 'postgres'
        OR (SELECT cn.niveau FROM classification_niveaux cn
            WHERE cn.id = signalements.niveau_classification_id) = fn_session_level()
    );

DROP POLICY IF EXISTS blp_update_signalements ON signalements;
CREATE POLICY blp_update_signalements ON signalements
    FOR UPDATE
    USING (
        current_user = 'postgres'
        OR (SELECT cn.niveau FROM classification_niveaux cn
            WHERE cn.id = signalements.niveau_classification_id) = fn_session_level()
    );

-- ============================================================================
-- SECTION 3 — TABLES "OWNER" (audit_log, consultations)
-- ============================================================================
-- Pas de niveau_classification_id → pattern différent.
-- Règle : chaque agent voit SES propres lignes ; admin/auditeur/cnil voient tout.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 consultations : chaque agent voit ses propres consultations
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS owner_select_consultations ON consultations;
CREATE POLICY owner_select_consultations ON consultations
    FOR SELECT
    USING (
        current_user = 'postgres'
        OR current_user IN ('admin_systeme', 'auditeur', 'controleur_cnil')
        OR consultations.agent_id = fn_session_agent_id()
    );

-- INSERT autorisé pour tous (chaque opération métier doit pouvoir logger sa consultation)
DROP POLICY IF EXISTS owner_insert_consultations ON consultations;
CREATE POLICY owner_insert_consultations ON consultations
    FOR INSERT
    WITH CHECK (
        current_user = 'postgres'
        OR consultations.agent_id = fn_session_agent_id()
    );

-- ----------------------------------------------------------------------------
-- 3.2 audit_log : lecture restreinte à admin/auditeur/cnil
-- ----------------------------------------------------------------------------
-- Les rôles métier (agent_saisie/opj/etc.) ne lisent JAMAIS l'audit
-- (déjà bloqué par REVOKE dans script 07, mais double sécurité via RLS).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS audit_select ON audit_log;
CREATE POLICY audit_select ON audit_log
    FOR SELECT
    USING (
        current_user = 'postgres'
        OR current_user IN ('admin_systeme', 'auditeur', 'controleur_cnil')
    );

-- INSERT laissé ouvert (les triggers + fn_log_audit doivent pouvoir écrire)
DROP POLICY IF EXISTS audit_insert ON audit_log;
CREATE POLICY audit_insert ON audit_log
    FOR INSERT
    WITH CHECK (TRUE);

-- ============================================================================
-- SECTION 3.3 — TABLES "AGENTS" (RLS Self + Admin)
-- ============================================================================
-- Règle : magistrat voit les agents de son service, admin/auditeur voit tout
-- ============================================================================

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_select_agents ON agents;
CREATE POLICY owner_select_agents ON agents
    FOR SELECT
    USING (
        current_user = 'postgres'
        OR current_user IN ('admin_systeme', 'auditeur')
        -- magistrat : voit les agents de son propre service
        -- (fn_service_agent est SECURITY DEFINER → évite la récursion)
        OR (
            current_user = 'magistrat'
            AND agents.service_id = fn_service_agent(fn_session_agent_id())
        )
        -- chaque agent voit sa propre fiche
        OR agents.id = fn_session_agent_id()
    );

DROP POLICY IF EXISTS owner_modify_agents ON agents;
CREATE POLICY owner_modify_agents ON agents
    FOR ALL
    USING (current_user IN ('postgres', 'admin_systeme'))
    WITH CHECK (current_user IN ('postgres', 'admin_systeme'));

-- ============================================================================
-- SECTION 4 — TABLES À RLS HÉRITÉE
-- ============================================================================
-- Ces tables n'ont pas de niveau_classification_id propre mais héritent du
-- niveau d'une table parente (personnes, affaires).
-- Pattern :
--   SELECT  USING       (fn_niveau_parent(parent_id) <= fn_session_level())
--   INSERT  WITH CHECK  (fn_niveau_parent(parent_id) =  fn_session_level())
--   UPDATE  USING+CHECK (fn_niveau_parent(parent_id) =  fn_session_level())
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 Tables qui héritent de personnes
-- ----------------------------------------------------------------------------

-- aliases
ALTER TABLE aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE aliases FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS blp_select_aliases ON aliases;
CREATE POLICY blp_select_aliases ON aliases FOR SELECT
    USING (
        current_user = 'postgres'
        OR fn_niveau_personne(aliases.personne_id) <= fn_session_level()
    );
DROP POLICY IF EXISTS blp_insert_aliases ON aliases;
CREATE POLICY blp_insert_aliases ON aliases FOR INSERT
    WITH CHECK (
        current_user = 'postgres'
        OR fn_niveau_personne(aliases.personne_id) = fn_session_level()
    );
DROP POLICY IF EXISTS blp_update_aliases ON aliases;
CREATE POLICY blp_update_aliases ON aliases FOR UPDATE
    USING (
        current_user = 'postgres'
        OR fn_niveau_personne(aliases.personne_id) = fn_session_level()
    );

-- adresses
ALTER TABLE adresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE adresses FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS blp_select_adresses ON adresses;
CREATE POLICY blp_select_adresses ON adresses FOR SELECT
    USING (
        current_user = 'postgres'
        OR fn_niveau_personne(adresses.personne_id) <= fn_session_level()
    );
DROP POLICY IF EXISTS blp_insert_adresses ON adresses;
CREATE POLICY blp_insert_adresses ON adresses FOR INSERT
    WITH CHECK (
        current_user = 'postgres'
        OR fn_niveau_personne(adresses.personne_id) = fn_session_level()
    );
DROP POLICY IF EXISTS blp_update_adresses ON adresses;
CREATE POLICY blp_update_adresses ON adresses FOR UPDATE
    USING (
        current_user = 'postgres'
        OR fn_niveau_personne(adresses.personne_id) = fn_session_level()
    );

-- telephones
ALTER TABLE telephones ENABLE ROW LEVEL SECURITY;
ALTER TABLE telephones FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS blp_select_telephones ON telephones;
CREATE POLICY blp_select_telephones ON telephones FOR SELECT
    USING (
        current_user = 'postgres'
        OR fn_niveau_personne(telephones.personne_id) <= fn_session_level()
    );
DROP POLICY IF EXISTS blp_insert_telephones ON telephones;
CREATE POLICY blp_insert_telephones ON telephones FOR INSERT
    WITH CHECK (
        current_user = 'postgres'
        OR fn_niveau_personne(telephones.personne_id) = fn_session_level()
    );
DROP POLICY IF EXISTS blp_update_telephones ON telephones;
CREATE POLICY blp_update_telephones ON telephones FOR UPDATE
    USING (
        current_user = 'postgres'
        OR fn_niveau_personne(telephones.personne_id) = fn_session_level()
    );

-- ----------------------------------------------------------------------------
-- 4.2 Tables qui héritent d'affaires (sauf affaire_personnes : double héritage)
-- ----------------------------------------------------------------------------

-- affaire_infractions
ALTER TABLE affaire_infractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affaire_infractions FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS blp_select_affaire_infractions ON affaire_infractions;
CREATE POLICY blp_select_affaire_infractions ON affaire_infractions FOR SELECT
    USING (
        current_user = 'postgres'
        OR fn_niveau_affaire(affaire_infractions.affaire_id) <= fn_session_level()
    );
DROP POLICY IF EXISTS blp_insert_affaire_infractions ON affaire_infractions;
CREATE POLICY blp_insert_affaire_infractions ON affaire_infractions FOR INSERT
    WITH CHECK (
        current_user = 'postgres'
        OR fn_niveau_affaire(affaire_infractions.affaire_id) = fn_session_level()
    );
DROP POLICY IF EXISTS blp_update_affaire_infractions ON affaire_infractions;
CREATE POLICY blp_update_affaire_infractions ON affaire_infractions FOR UPDATE
    USING (
        current_user = 'postgres'
        OR fn_niveau_affaire(affaire_infractions.affaire_id) = fn_session_level()
    );

-- affaire_vehicules
ALTER TABLE affaire_vehicules ENABLE ROW LEVEL SECURITY;
ALTER TABLE affaire_vehicules FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS blp_select_affaire_vehicules ON affaire_vehicules;
CREATE POLICY blp_select_affaire_vehicules ON affaire_vehicules FOR SELECT
    USING (
        current_user = 'postgres'
        OR fn_niveau_affaire(affaire_vehicules.affaire_id) <= fn_session_level()
    );
DROP POLICY IF EXISTS blp_insert_affaire_vehicules ON affaire_vehicules;
CREATE POLICY blp_insert_affaire_vehicules ON affaire_vehicules FOR INSERT
    WITH CHECK (
        current_user = 'postgres'
        OR fn_niveau_affaire(affaire_vehicules.affaire_id) = fn_session_level()
    );
DROP POLICY IF EXISTS blp_update_affaire_vehicules ON affaire_vehicules;
CREATE POLICY blp_update_affaire_vehicules ON affaire_vehicules FOR UPDATE
    USING (
        current_user = 'postgres'
        OR fn_niveau_affaire(affaire_vehicules.affaire_id) = fn_session_level()
    );

-- decisions_justice
ALTER TABLE decisions_justice ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions_justice FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS blp_select_decisions_justice ON decisions_justice;
CREATE POLICY blp_select_decisions_justice ON decisions_justice FOR SELECT
    USING (
        current_user = 'postgres'
        OR fn_niveau_affaire(decisions_justice.affaire_id) <= fn_session_level()
    );
DROP POLICY IF EXISTS blp_insert_decisions_justice ON decisions_justice;
CREATE POLICY blp_insert_decisions_justice ON decisions_justice FOR INSERT
    WITH CHECK (
        current_user = 'postgres'
        OR fn_niveau_affaire(decisions_justice.affaire_id) = fn_session_level()
    );
DROP POLICY IF EXISTS blp_update_decisions_justice ON decisions_justice;
CREATE POLICY blp_update_decisions_justice ON decisions_justice FOR UPDATE
    USING (
        current_user = 'postgres'
        OR fn_niveau_affaire(decisions_justice.affaire_id) = fn_session_level()
    );

-- scelles
ALTER TABLE scelles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scelles FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS blp_select_scelles ON scelles;
CREATE POLICY blp_select_scelles ON scelles FOR SELECT
    USING (
        current_user = 'postgres'
        OR fn_niveau_affaire(scelles.affaire_id) <= fn_session_level()
    );
DROP POLICY IF EXISTS blp_insert_scelles ON scelles;
CREATE POLICY blp_insert_scelles ON scelles FOR INSERT
    WITH CHECK (
        current_user = 'postgres'
        OR fn_niveau_affaire(scelles.affaire_id) = fn_session_level()
    );
DROP POLICY IF EXISTS blp_update_scelles ON scelles;
CREATE POLICY blp_update_scelles ON scelles FOR UPDATE
    USING (
        current_user = 'postgres'
        OR fn_niveau_affaire(scelles.affaire_id) = fn_session_level()
    );

-- ----------------------------------------------------------------------------
-- 4.3 affaire_personnes : DOUBLE héritage (max des 2 niveaux)
-- ----------------------------------------------------------------------------
-- Si une personne en SD apparait dans une affaire CD, le lien reste SD :
-- on prend GREATEST() pour la lecture.
-- Pour l'écriture, on exige égalité avec le niveau de session ET avec les
-- niveaux des deux parents (ce qui revient à insister que les deux parents
-- soient au niveau de session).
-- ----------------------------------------------------------------------------

ALTER TABLE affaire_personnes ENABLE ROW LEVEL SECURITY;
ALTER TABLE affaire_personnes FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS blp_select_affaire_personnes ON affaire_personnes;
CREATE POLICY blp_select_affaire_personnes ON affaire_personnes FOR SELECT
    USING (
        current_user = 'postgres'
        OR GREATEST(
            fn_niveau_personne(affaire_personnes.personne_id),
            fn_niveau_affaire(affaire_personnes.affaire_id)
        ) <= fn_session_level()
    );

DROP POLICY IF EXISTS blp_insert_affaire_personnes ON affaire_personnes;
CREATE POLICY blp_insert_affaire_personnes ON affaire_personnes FOR INSERT
    WITH CHECK (
        current_user = 'postgres'
        OR (
            fn_niveau_personne(affaire_personnes.personne_id) = fn_session_level()
            AND fn_niveau_affaire(affaire_personnes.affaire_id) = fn_session_level()
        )
    );

DROP POLICY IF EXISTS blp_update_affaire_personnes ON affaire_personnes;
CREATE POLICY blp_update_affaire_personnes ON affaire_personnes FOR UPDATE
    USING (
        current_user = 'postgres'
        OR GREATEST(
            fn_niveau_personne(affaire_personnes.personne_id),
            fn_niveau_affaire(affaire_personnes.affaire_id)
        ) = fn_session_level()
    );

-- ============================================================================
-- SECTION 5 — VÉRIFICATIONS
-- ============================================================================

\echo ''
\echo '=== Tables avec RLS activé ==='
SELECT relname AS table_name,
       relrowsecurity   AS rls_enabled,
       relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname IN ('personnes', 'affaires', 'biometrie', 'signalements',
                  'audit_log', 'consultations', 'agents',
                  'aliases', 'adresses', 'telephones',
                  'affaire_personnes', 'affaire_infractions', 'affaire_vehicules',
                  'decisions_justice', 'scelles')
  AND relkind = 'r'
ORDER BY relname;

\echo ''
\echo '=== Policies installées ==='
SELECT tablename, policyname, cmd, qual IS NOT NULL AS has_using, with_check IS NOT NULL AS has_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

\echo ''
\echo '✅ Script 08_rls_policies.sql appliqué avec succès'
