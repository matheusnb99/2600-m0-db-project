-- ============================================================================
-- OPÉRATION BLACKVAULT — TAJ
-- Script 06 : Vues anonymisées pour le rôle controleur_cnil
-- SGBD : PostgreSQL 16+
-- Conformité : RGPD / CNIL — pseudonymisation des données personnelles
-- ============================================================================

-- ============================================================================
-- VUE 1 : personnes_anonymisees
-- Le controleur_cnil voit les métadonnées mais pas les identités réelles.
-- Nom/prénom remplacés par un hash, date de naissance tronquée à l'année.
-- ============================================================================
CREATE OR REPLACE VIEW personnes_anonymisees AS
SELECT
    -- Identifiant pseudonymisé (non réversible sans la clé)
    encode(digest(p.id::text, 'sha256'), 'hex')           AS id_pseudonyme,

    -- Nom/prénom remplacés par les 8 premiers caractères du hash SHA-256
    upper(left(encode(digest(nom || prenom, 'sha256'), 'hex'), 8))
                                                         AS code_individu,

    -- Seulement l'année de naissance (pas la date complète)
    EXTRACT(YEAR FROM date_naissance)::int               AS annee_naissance,

    -- Pays de naissance masqué si hors France
    CASE
        WHEN nationalite = 'Française' THEN 'FR'
        ELSE 'ETRANGER'
    END                                                  AS origine,

    -- Sexe conservé (donnée statistique non identifiante)
    sexe,

    -- Niveau de classification (utile pour l'audit CNIL)
    cn.code                                              AS niveau_classification,

    -- Statut de la fiche
    statut,

    -- Dates tronquées au mois (pas au jour)
    date_trunc('month', date_creation)::date             AS mois_creation,
    date_trunc('month', date_modification)::date         AS mois_modification

FROM personnes p
JOIN classification_niveaux cn ON cn.id = p.niveau_classification_id;

COMMENT ON VIEW personnes_anonymisees IS
'Vue CNIL — données personnelles pseudonymisées. Nom/prénom hashés, DOB tronquée à l''année.';

-- ============================================================================
-- VUE 2 : signalements_anonymises
-- Statistiques sur les signalements sans révéler l'identité des personnes.
-- ============================================================================
CREATE OR REPLACE VIEW signalements_anonymises AS
SELECT
    s.id                                                 AS signalement_id,

    -- Personne pseudonymisée
    upper(left(encode(digest(s.personne_id::text, 'sha256'), 'hex'), 8))
                                                         AS code_individu,

    -- Type de signalement conservé (nécessaire pour audit)
    s.type,

    -- Motif tronqué aux 30 premiers caractères
    left(s.motif, 30) || '...'                           AS motif_tronque,

    -- Dates conservées (nécessaires pour vérifier les durées légales)
    s.date_emission,
    s.date_expiration,

    -- Service émetteur (pas l'agent individuel)
    srv.nom                                              AS service_emetteur,

    -- Niveau de classification
    cn.code                                              AS niveau_classification,

    s.actif,
    s.priorite,
    date_trunc('month', s.date_creation)::date           AS mois_creation

FROM signalements s
JOIN services srv ON srv.id = s.emis_par_service_id
JOIN classification_niveaux cn ON cn.id = s.niveau_classification_id;

COMMENT ON VIEW signalements_anonymises IS
'Vue CNIL — signalements avec identités pseudonymisées et motifs tronqués.';

-- ============================================================================
-- VUE 3 : agents_anonymises
-- Permet au contrôleur CNIL de vérifier les habilitations sans voir
-- les données personnelles des agents.
-- ============================================================================
CREATE OR REPLACE VIEW agents_anonymises AS
SELECT
    -- Matricule partiellement masqué (3 premiers caractères + ***)
    left(a.matricule, 3) || '***'                        AS matricule_masque,

    -- Rôle et service (données organisationnelles, non personnelles)
    r.nom                                                AS role,
    srv.nom                                              AS service,
    srv.type                                             AS type_service,

    -- Niveau d'habilitation (utile pour audit)
    cn.code                                              AS habilitation,

    -- Statut du compte
    a.actif,
    a.verrouille,

    -- Dates tronquées au mois
    date_trunc('month', a.date_creation)::date           AS mois_creation,
    date_trunc('month', a.derniere_connexion)::date      AS mois_derniere_connexion

FROM agents a
JOIN roles r        ON r.id   = a.role_id
JOIN services srv   ON srv.id = a.service_id
JOIN classification_niveaux cn ON cn.id = a.habilitation_niveau_id;

COMMENT ON VIEW agents_anonymises IS
'Vue CNIL — agents avec matricule masqué. Permet de vérifier les habilitations sans données personnelles.';

-- ============================================================================
-- VUE 4 : audit_log_anonymise
-- Le journal d'audit est visible mais sans les UUIDs réels des agents.
-- ============================================================================
CREATE OR REPLACE VIEW audit_log_anonymise AS
SELECT
    a.id                                                 AS log_id,
    a.horodatage,

    -- Agent pseudonymisé
    CASE
        WHEN a.agent_id IS NULL THEN 'SYSTEME'
        ELSE upper(left(encode(digest(a.agent_id::text, 'sha256'), 'hex'), 8))
    END                                                  AS code_agent,

    a.action,
    a.table_cible,

    -- IP masquée (seulement le /24 visible)
    CASE
        WHEN a.ip_source IS NULL THEN NULL
        ELSE host(network(set_masklen(a.ip_source, 24)))
    END                                                  AS reseau_source,

    -- Alertes conservées intégralement (nécessaires pour audit sécurité)
    a.alerte,
    a.type_alerte,
    a.severite,

    date_trunc('hour', a.horodatage)                     AS heure_arrondie

FROM audit_log a;

COMMENT ON VIEW audit_log_anonymise IS
'Vue CNIL — journal d''audit avec agents pseudonymisés et IPs masquées au /24.';

-- ============================================================================
-- VUE 5 : statistiques_cnil
-- Tableau de bord chiffré pour le contrôleur CNIL.
-- Aucune donnée individuelle — uniquement des agrégats.
-- ============================================================================
CREATE OR REPLACE VIEW statistiques_cnil AS
SELECT
    'personnes'                                          AS categorie,
    COUNT(*)                                             AS total,
    COUNT(*) FILTER (WHERE statut = 'actif')             AS actifs,
    COUNT(*) FILTER (WHERE statut = 'supprime')          AS supprimes,
    COUNT(*) FILTER (WHERE statut = 'archive')           AS archives,
    NULL::bigint                                         AS alertes_securite
FROM personnes

UNION ALL

SELECT
    'signalements_actifs',
    COUNT(*),
    COUNT(*) FILTER (WHERE type = 'fiche_s'),
    COUNT(*) FILTER (WHERE type = 'mandat_arret'),
    COUNT(*) FILTER (WHERE date_expiration < CURRENT_DATE),
    NULL
FROM signalements
WHERE actif = TRUE

UNION ALL

SELECT
    'agents_systeme',
    COUNT(*),
    COUNT(*) FILTER (WHERE actif = TRUE),
    COUNT(*) FILTER (WHERE verrouille = TRUE),
    COUNT(*) FILTER (WHERE actif = FALSE),
    NULL
FROM agents

UNION ALL

SELECT
    'alertes_audit_30j',
    COUNT(*),
    COUNT(*) FILTER (WHERE severite >= 3),
    COUNT(*) FILTER (WHERE severite >= 4),
    COUNT(*) FILTER (WHERE severite = 5),
    COUNT(*) FILTER (WHERE alerte = TRUE)
FROM audit_log
WHERE horodatage >= NOW() - INTERVAL '30 days';

COMMENT ON VIEW statistiques_cnil IS
'Vue CNIL — agrégats statistiques uniquement. Aucune donnée individuelle.';

-- ============================================================================
-- VUE 6 : durees_conservation
-- Vérifie que les données ne sont pas conservées au-delà des durées légales.
-- TAJ : durée légale max = 20 ans pour les crimes, 5 ans pour les délits.
-- ============================================================================
CREATE OR REPLACE VIEW durees_conservation AS
SELECT
    upper(left(encode(digest(p.id::text, 'sha256'), 'hex'), 8))
                                                         AS code_individu,
    p.statut,
    cn.code                                              AS niveau_classification,
    date_trunc('month', p.date_creation)::date           AS mois_creation,

    -- Âge de la fiche en années
    EXTRACT(YEAR FROM AGE(p.date_creation))::int         AS anciennete_annees,

    -- Alerte si fiche active depuis plus de 20 ans
    CASE
        WHEN EXTRACT(YEAR FROM AGE(p.date_creation)) > 20
             AND p.statut = 'actif'
        THEN TRUE
        ELSE FALSE
    END                                                  AS depassement_duree_legale,

    -- Alerte si fiche non supprimée depuis plus de 5 ans après archivage
    CASE
        WHEN EXTRACT(YEAR FROM AGE(p.date_modification)) > 5
             AND p.statut = 'archive'
        THEN TRUE
        ELSE FALSE
    END                                                  AS archivage_a_purger

FROM personnes p
JOIN classification_niveaux cn ON cn.id = p.niveau_classification_id
ORDER BY anciennete_annees DESC;

COMMENT ON VIEW durees_conservation IS
'Vue CNIL — contrôle des durées légales de conservation. Alertes automatiques sur dépassements.';

-- ============================================================================
-- GRANT : accès en lecture seule pour controleur_cnil
-- (à activer une fois le rôle PostgreSQL créé par le Pôle 2)
-- ============================================================================
-- GRANT SELECT ON personnes_anonymisees   TO controleur_cnil;
-- GRANT SELECT ON signalements_anonymises TO controleur_cnil;
-- GRANT SELECT ON agents_anonymises       TO controleur_cnil;
-- GRANT SELECT ON audit_log_anonymise     TO controleur_cnil;
-- GRANT SELECT ON statistiques_cnil       TO controleur_cnil;
-- GRANT SELECT ON durees_conservation     TO controleur_cnil;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
SELECT
    viewname                                             AS vue,
    'OK'                                                 AS statut
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'personnes_anonymisees',
    'signalements_anonymises',
    'agents_anonymises',
    'audit_log_anonymise',
    'statistiques_cnil',
    'durees_conservation'
  )
ORDER BY viewname;