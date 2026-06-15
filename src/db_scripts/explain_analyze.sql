-- ============================================================================
-- OPÉRATION BLACKVAULT — TAJ
-- Script : explain_analyze.sql
-- 10 requêtes de performance avec EXPLAIN ANALYZE
-- À exécuter sur PostgreSQL 16 avec les données du seed
-- ============================================================================

-- ============================================================================
-- REQUÊTE 1 : Recherche floue sur le nom d'une personne (index GIN trigramme)
-- Cas d'usage : un agent tape un nom approximatif dans le TAJ
-- Index utilisé : idx_personnes_trgm_nom (GIN pg_trgm)
-- ============================================================================
\echo '=== REQUÊTE 1 : Recherche floue sur nom (GIN trigramme) ==='
EXPLAIN ANALYZE
SELECT id, nom, prenom, date_naissance, statut
FROM personnes
WHERE nom % 'DUPONT'
ORDER BY similarity(nom, 'DUPONT') DESC
LIMIT 10;

-- ============================================================================
-- REQUÊTE 2 : Recherche exacte par nom + prénom (index B-tree)
-- Cas d'usage : vérification d'identité rapide
-- Index utilisé : idx_personnes_nom
-- ============================================================================
\echo ''
\echo '=== REQUÊTE 2 : Recherche exacte nom + prénom ==='
EXPLAIN ANALYZE
SELECT id, nom, prenom, date_naissance, nationalite, statut
FROM personnes
WHERE nom = 'MARTIN'
  AND prenom = 'Pierre';

-- ============================================================================
-- REQUÊTE 3 : Signalements actifs d'une personne (index partiel)
-- Cas d'usage : contrôle routier — l'agent cherche les fiches actives
-- Index utilisé : idx_signalements_actif (WHERE actif = TRUE)
-- ============================================================================
\echo ''
\echo '=== REQUÊTE 3 : Signalements actifs avec priorité haute ==='
EXPLAIN ANALYZE
SELECT s.type, s.motif, s.date_emission, s.priorite, srv.nom AS service
FROM signalements s
JOIN services srv ON srv.id = s.emis_par_service_id
WHERE s.actif = TRUE
  AND s.priorite >= 4
ORDER BY s.priorite DESC, s.date_emission DESC;

-- ============================================================================
-- REQUÊTE 4 : Toutes les affaires d'une personne avec son rôle
-- Cas d'usage : consultation du dossier complet d'un individu
-- Index utilisé : idx_affaire_personnes_personne
-- ============================================================================
\echo ''
\echo '=== REQUÊTE 4 : Affaires liées à une personne ==='
EXPLAIN ANALYZE
SELECT
    a.numero_pv,
    a.date_faits,
    a.statut          AS statut_affaire,
    ap.role           AS role_dans_affaire,
    a.lieu_faits
FROM affaire_personnes ap
JOIN affaires a ON a.id = ap.affaire_id
WHERE ap.personne_id = (SELECT id FROM personnes ORDER BY random() LIMIT 1)
ORDER BY a.date_faits DESC;

-- ============================================================================
-- REQUÊTE 5 : Affaires par statut et classification (index combiné)
-- Cas d'usage : tableau de bord d'un service judiciaire
-- Index utilisé : idx_affaires_statut + idx_affaires_classification
-- ============================================================================
\echo ''
\echo '=== REQUÊTE 5 : Affaires en cours par niveau de classification ==='
EXPLAIN ANALYZE
SELECT
    cn.code           AS classification,
    COUNT(*)          AS nb_affaires,
    MIN(a.date_ouverture) AS plus_ancienne,
    MAX(a.date_ouverture) AS plus_recente
FROM affaires a
JOIN classification_niveaux cn ON cn.id = a.niveau_classification_id
WHERE a.statut = 'en_cours'
GROUP BY cn.code, cn.niveau
ORDER BY cn.niveau DESC;

-- ============================================================================
-- REQUÊTE 6 : Historique des consultations d'un agent (index B-tree)
-- Cas d'usage : audit de traçabilité — qui a consulté quoi ?
-- Index utilisé : idx_consultations_agent + idx_consultations_date
-- ============================================================================
\echo ''
\echo '=== REQUÊTE 6 : Consultations récentes par agent ==='
EXPLAIN ANALYZE
SELECT
    c.table_consultee,
    c.type_requete,
    c.date_consultation,
    c.ip_source,
    c.motif
FROM consultations c
WHERE c.agent_id = (SELECT id FROM agents ORDER BY random() LIMIT 1)
  AND c.date_consultation >= NOW() - INTERVAL '1 year'
ORDER BY c.date_consultation DESC
LIMIT 20;

-- ============================================================================
-- REQUÊTE 7 : Alertes de sécurité récentes dans l'audit log (index partiel)
-- Cas d'usage : supervision sécurité — détection d'intrusion
-- Index utilisé : idx_audit_alerte (WHERE alerte = TRUE)
--                idx_audit_severite (WHERE severite >= 3)
-- ============================================================================
\echo ''
\echo '=== REQUÊTE 7 : Alertes de sécurité haute sévérité ==='
EXPLAIN ANALYZE
SELECT
    al.horodatage,
    al.action,
    al.table_cible,
    al.type_alerte,
    al.severite,
    al.ip_source
FROM audit_log al
WHERE al.alerte = TRUE
  AND al.severite >= 3
ORDER BY al.horodatage DESC
LIMIT 50;

-- ============================================================================
-- REQUÊTE 8 : Infractions les plus fréquentes dans les affaires
-- Cas d'usage : statistiques criminelles pour rapport annuel
-- Index utilisé : idx_affaire_infractions_affaire
-- ============================================================================
\echo ''
\echo '=== REQUÊTE 8 : Top 10 des infractions les plus fréquentes ==='
EXPLAIN ANALYZE
SELECT
    i.code_natinf,
    i.libelle,
    i.categorie,
    COUNT(ai.affaire_id)  AS nb_affaires
FROM affaire_infractions ai
JOIN infractions i ON i.id = ai.infraction_id
GROUP BY i.id, i.code_natinf, i.libelle, i.categorie
ORDER BY nb_affaires DESC
LIMIT 10;

-- ============================================================================
-- REQUÊTE 9 : Personnes avec signalements actifs + biométrie disponible
-- Cas d'usage : identification prioritaire lors d'une interpellation
-- Index utilisé : idx_signalements_personne + idx_biometrie_personne
-- ============================================================================
\echo ''
\echo '=== REQUÊTE 9 : Personnes avec fiche S + biométrie disponible ==='
EXPLAIN ANALYZE
SELECT
    p.numero_taj,
    p.statut,
    COUNT(DISTINCT s.id)  AS nb_signalements,
    COUNT(DISTINCT b.id)  AS nb_donnees_biometrie,
    MAX(s.priorite)       AS priorite_max
FROM personnes p
JOIN signalements s ON s.personne_id = p.id AND s.actif = TRUE
                    AND s.type = 'fiche_s'
JOIN biometrie b   ON b.personne_id = p.id
GROUP BY p.id, p.numero_taj, p.statut
ORDER BY priorite_max DESC, nb_signalements DESC
LIMIT 20;

-- ============================================================================
-- REQUÊTE 10 : Décisions de justice par juridiction et type (agrégat)
-- Cas d'usage : statistiques pour rapport NIS2 / STRIDE
-- Index utilisé : idx_decisions_type + idx_decisions_date
-- ============================================================================
\echo ''
\echo '=== REQUÊTE 10 : Décisions par juridiction et type (2 dernières années) ==='
EXPLAIN ANALYZE
SELECT
    dj.juridiction,
    dj.type,
    COUNT(*)              AS nb_decisions,
    MIN(dj.date_decision) AS premiere,
    MAX(dj.date_decision) AS derniere
FROM decisions_justice dj
WHERE dj.date_decision >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY dj.juridiction, dj.type
ORDER BY nb_decisions DESC
LIMIT 15;

-- ============================================================================
-- RÉSUMÉ : taille des tables et index
-- ============================================================================
\echo ''
\echo '=== RÉSUMÉ : Taille des tables et index ==='
SELECT
    relname                                      AS "Table / Index",
    CASE relkind
        WHEN 'r' THEN 'Table'
        WHEN 'i' THEN 'Index'
    END                                          AS "Type",
    pg_size_pretty(pg_relation_size(oid))        AS "Taille"
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind IN ('r', 'i')
  AND relname NOT LIKE 'pg_%'
ORDER BY pg_relation_size(oid) DESC
LIMIT 20;
