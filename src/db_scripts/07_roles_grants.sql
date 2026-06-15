-- ============================================================================
-- OPÉRATION BLACKVAULT — TAJ — Pôle 2 (Sécurité)
-- Script 07 : Rôles PostgreSQL + GRANT (RBAC)
-- ----------------------------------------------------------------------------
-- Implémente la matrice d'accès docs/matrice_acces.md (7 rôles × 25 tables).
-- Idempotent : peut être rejoué sans erreur.
-- À exécuter en superuser.
-- ============================================================================

\set ON_ERROR_STOP on

-- ============================================================================
-- 1. CRÉATION DES 7 RÔLES (NOLOGIN : rôles de groupe, hérités par les users)
-- ============================================================================

DO $$
DECLARE
    r TEXT;
BEGIN
    FOREACH r IN ARRAY ARRAY[
        'agent_saisie',
        'opj',
        'magistrat',
        'analyste_renseignement',
        'admin_systeme',
        'auditeur',
        'controleur_cnil'
    ]
    LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
            EXECUTE format('CREATE ROLE %I NOLOGIN', r);
            RAISE NOTICE 'Rôle créé : %', r;
        ELSE
            RAISE NOTICE 'Rôle déjà existant : %', r;
        END IF;

    END LOOP;
END $$;

-- ============================================================================
-- 2. CLEAN SLATE : REVOKE ALL — on repart d'une page blanche
-- ============================================================================

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM agent_saisie, opj, magistrat,
                                                  analyste_renseignement, admin_systeme,
                                                  auditeur, controleur_cnil;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM agent_saisie, opj, magistrat,
                                                  analyste_renseignement, admin_systeme,
                                                  auditeur, controleur_cnil;
REVOKE ALL ON SCHEMA public FROM agent_saisie, opj, magistrat,
                                 analyste_renseignement, admin_systeme,
                                 auditeur, controleur_cnil;

-- USAGE sur le schéma public (sinon impossible d'accéder à quoi que ce soit)
GRANT USAGE ON SCHEMA public TO agent_saisie, opj, magistrat,
                                analyste_renseignement, admin_systeme,
                                auditeur, controleur_cnil;

-- ============================================================================
-- 3. GRANTS PAR RÔLE — d'après docs/matrice_acces.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 agent_saisie : saisie PV, données de base (niveau max = CD)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON
    personnes, aliases, adresses, telephones,
    affaires, affaire_personnes, affaire_infractions,
    vehicules, affaire_vehicules
TO agent_saisie;

GRANT SELECT ON
    infractions, signalements, decisions_justice, scelles,
    services, classification_niveaux, consultations
TO agent_saisie;

-- ----------------------------------------------------------------------------
-- 3.2 opj : enquêteur (niveau max = SD)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON
    personnes, aliases, adresses, telephones,
    affaires, affaire_personnes, affaire_infractions,
    signalements,            -- création fiches recherche / mandats
    scelles,                 -- gestion pièces à conviction
    vehicules, affaire_vehicules
TO opj;

GRANT SELECT ON
    biometrie,               -- lecture pour identifier suspects
    infractions, decisions_justice,
    services, classification_niveaux, consultations
TO opj;

-- ----------------------------------------------------------------------------
-- 3.3 magistrat : supervision judiciaire (niveau max = TSD)
-- ----------------------------------------------------------------------------
GRANT SELECT ON
    personnes, aliases, adresses, telephones,
    biometrie,
    infractions,
    signalements,
    scelles,
    vehicules, affaire_vehicules,
    services, classification_niveaux, consultations
TO magistrat;

GRANT SELECT, INSERT, UPDATE ON
    affaires, affaire_personnes, affaire_infractions,
    decisions_justice        -- seul rôle à pouvoir écrire les jugements
TO magistrat;

-- Magistrat voit les agents de son service (filtré par RLS dans 08)
GRANT SELECT ON agents TO magistrat;

-- ----------------------------------------------------------------------------
-- 3.4 analyste_renseignement : analyse fiches S (niveau max = TSD)
-- ----------------------------------------------------------------------------
GRANT SELECT ON
    personnes, aliases, adresses, telephones,
    biometrie,
    affaires, affaire_personnes, affaire_infractions,
    infractions, decisions_justice,
    vehicules, affaire_vehicules,
    services, classification_niveaux, consultations
TO analyste_renseignement;

GRANT SELECT, INSERT, UPDATE ON
    signalements             -- rôle principal pour créer/modifier fiches S
TO analyste_renseignement;

-- ----------------------------------------------------------------------------
-- 3.5 admin_systeme : maintenance technique (AUCUN accès données métier)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON
    agents, services, roles
TO admin_systeme;

GRANT SELECT ON
    audit_log, consultations, classification_niveaux
TO admin_systeme;
-- Volontairement : RIEN sur personnes / affaires / signalements / biometrie

-- ----------------------------------------------------------------------------
-- 3.6 auditeur : contrôle conformité (lecture seule)
-- ----------------------------------------------------------------------------
-- Auditeur ne lit JAMAIS la donnée brute : uniquement les vues anonymisées
GRANT SELECT ON
    personnes_anonymisees,
    signalements_anonymises,
    agents_anonymises,
    audit_log_anonymise,
    statistiques_cnil,
    durees_conservation
TO auditeur;

-- Auditeur lit aussi les méta-données et journaux non sensibles
GRANT SELECT ON
    infractions, decisions_justice,
    scelles, vehicules, affaire_vehicules,
    services, classification_niveaux, roles,
    audit_log, consultations
TO auditeur;

-- ----------------------------------------------------------------------------
-- 3.7 controleur_cnil : contrôle externe (UNIQUEMENT vues anonymisées)
-- ----------------------------------------------------------------------------
GRANT SELECT ON
    personnes_anonymisees,
    signalements_anonymises,
    agents_anonymises,
    audit_log_anonymise,
    statistiques_cnil,
    durees_conservation
TO controleur_cnil;

-- + métadonnées génériques sans données personnelles
GRANT SELECT ON
    infractions, decisions_justice,
    affaire_infractions,     -- liens infractions (sans détails personnes)
    services, classification_niveaux, roles,
    audit_log, consultations
TO controleur_cnil;

-- ============================================================================
-- 4. TABLES LEURRES — accès volontairement OUVERT à tous les rôles
-- ============================================================================
-- Raison : la honeytrap doit être *consultable* pour tromper l'attaquant.
-- L'alerte sera levée par les TRIGGERS du Pôle 3, pas par REVOKE.
-- ============================================================================

GRANT SELECT ON
    credentials, passwords, keys_master, agents_secrets, backup_export
TO agent_saisie, opj, magistrat, analyste_renseignement,
   admin_systeme, auditeur, controleur_cnil;

-- ============================================================================
-- 5. SEQUENCES — nécessaire pour les INSERT sur tables avec SERIAL
-- ============================================================================
-- classification_niveaux / roles / services / infractions utilisent SERIAL.
-- Sans USAGE sur la sequence, les INSERT échouent avec "permission denied".
-- ============================================================================

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
TO agent_saisie, opj, magistrat, analyste_renseignement, admin_systeme;

-- ============================================================================
-- 6. VÉRIFICATIONS (à exécuter après pour valider)
-- ============================================================================

-- Liste des rôles créés
\echo ''
\echo '=== Rôles créés ==='
SELECT rolname, rolcanlogin, rolinherit
FROM pg_roles
WHERE rolname IN (
    'agent_saisie','opj','magistrat','analyste_renseignement',
    'admin_systeme','auditeur','controleur_cnil'
)
ORDER BY rolname;

-- Récap des privilèges accordés par rôle (count rapide)
\echo ''
\echo '=== Récap des privilèges par rôle ==='
SELECT grantee AS role,
       count(*) FILTER (WHERE privilege_type='SELECT') AS selects,
       count(*) FILTER (WHERE privilege_type='INSERT') AS inserts,
       count(*) FILTER (WHERE privilege_type='UPDATE') AS updates,
       count(*) FILTER (WHERE privilege_type='DELETE') AS deletes
FROM information_schema.role_table_grants
WHERE grantee IN (
    'agent_saisie','opj','magistrat','analyste_renseignement',
    'admin_systeme','auditeur','controleur_cnil'
)
GROUP BY grantee
ORDER BY grantee;

\echo ''
\echo '✅ Script 07_roles_grants.sql appliqué avec succès'
