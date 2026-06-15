-- ============================================================================
-- OPÉRATION BLACKVAULT — TAJ
-- Script 11 : comptes de démonstration (1 agent par rôle, mot de passe connu)
-- ----------------------------------------------------------------------------
-- Pose le mot de passe 'Blackvault2026!' sur un agent existant de CHAQUE rôle,
-- pour la démo « accès lié au rôle » (chaque compte est routé vers son
-- microservice ; les autres renvoient « accès interdit »).
-- Idempotent. À exécuter sur la base métier (taj / blackvault).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE agents
   SET mot_de_passe_hash   = crypt('Blackvault2026!', gen_salt('bf', 12)),
       tentatives_echouees = 0,
       verrouille          = FALSE,
       actif               = TRUE
 WHERE email IN (
   'nicole.laurent@interieur.gouv.fr',      -- agent_saisie           → :3001
   'matthieu.humbert@interieur.gouv.fr',    -- opj                    → :3002
   'alexandria.denis@interieur.gouv.fr',    -- magistrat              → :3003
   'maryse.olivier@interieur.gouv.fr',      -- analyste_renseignement → :3004
   'isaac.marchal@interieur.gouv.fr',       -- admin_systeme          → :3005
   'marguerite.lacroix@interieur.gouv.fr',  -- auditeur               → :3006
   'jean.bousquet@interieur.gouv.fr'        -- controleur_cnil        → :3007
 );

-- Vérification : email, rôle, port attendu (3000 + role_id), mot de passe OK
\echo ''
\echo '=== Comptes de démo (mot de passe = Blackvault2026!) ==='
SELECT a.email,
       r.nom                                                    AS role,
       (3000 + a.role_id)                                       AS port,
       (a.mot_de_passe_hash = crypt('Blackvault2026!', a.mot_de_passe_hash)) AS pw_ok,
       a.actif, a.verrouille
FROM agents a
JOIN roles r ON r.id = a.role_id
WHERE a.email IN (
   'nicole.laurent@interieur.gouv.fr',
   'matthieu.humbert@interieur.gouv.fr',
   'alexandria.denis@interieur.gouv.fr',
   'maryse.olivier@interieur.gouv.fr',
   'isaac.marchal@interieur.gouv.fr',
   'marguerite.lacroix@interieur.gouv.fr',
   'jean.bousquet@interieur.gouv.fr'
)
ORDER BY a.role_id;
