-- ============================================================================
-- OPÉRATION BLACKVAULT — TAJ (Traitement des Antécédents Judiciaires)
-- Script 01 : Extensions et types ENUM
-- SGBD : PostgreSQL 16+
-- ============================================================================

-- Extensions requises
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- Génération d'UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";        -- Chiffrement AES-256, bcrypt
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- Recherche floue (trigrammes)

-- ============================================================================
-- TYPES ENUM
-- ============================================================================

-- Type de service
CREATE TYPE type_service AS ENUM (
    'commissariat',
    'brigade_gendarmerie',
    'parquet',
    'dgsi',
    'dgse',
    'douanes',
    'autre'
);

-- Statut d'une personne dans le TAJ
CREATE TYPE statut_personne AS ENUM (
    'actif',
    'archive',
    'supprime',
    'en_cours_verification'
);

-- Rôle d'une personne dans une affaire
CREATE TYPE role_affaire AS ENUM (
    'mis_en_cause',
    'victime',
    'temoin',
    'temoin_protege',
    'suspect'
);

-- Catégorie d'infraction
CREATE TYPE categorie_infraction AS ENUM (
    'crime',
    'delit',
    'contravention'
);

-- Statut d'une affaire
CREATE TYPE statut_affaire AS ENUM (
    'en_cours',
    'cloturee',
    'classee_sans_suite',
    'renvoi_correctionnel',
    'renvoi_assises',
    'instruction'
);

-- Type de signalement
CREATE TYPE type_signalement AS ENUM (
    'fiche_s',
    'fiche_recherche',
    'oqtf',
    'mandat_arret',
    'mandat_amener',
    'avis_recherche',
    'interdiction_territoire'
);

-- Type de biométrie
CREATE TYPE type_biometrie AS ENUM (
    'empreinte_digitale',
    'photo_identite',
    'adn',
    'empreinte_palmaire',
    'iris'
);

-- Type de décision de justice
CREATE TYPE type_decision AS ENUM (
    'condamnation',
    'relaxe',
    'acquittement',
    'classement_sans_suite',
    'non_lieu',
    'sursis',
    'sursis_probatoire',
    'amende'
);

-- Statut d'un scellé
CREATE TYPE statut_scelle AS ENUM (
    'conserve',
    'restitue',
    'detruit',
    'en_analyse'
);

-- Type d'adresse
CREATE TYPE type_adresse AS ENUM (
    'domicile',
    'travail',
    'derniere_connue',
    'secondaire',
    'parentale'
);

-- Type de téléphone
CREATE TYPE type_telephone AS ENUM (
    'fixe',
    'mobile',
    'professionnel',
    'prepaye'
);

-- Type d'alias
CREATE TYPE type_alias AS ENUM (
    'pseudonyme',
    'faux_papiers',
    'nom_jeune_fille',
    'nom_usage',
    'surnom',
    'autre'
);

-- Type de requête (audit)
CREATE TYPE type_requete AS ENUM (
    'select',
    'insert',
    'update',
    'delete'
);

-- Rôle d'un véhicule dans une affaire
CREATE TYPE role_vehicule AS ENUM (
    'implique',
    'saisi',
    'recherche',
    'vole',
    'abandonne'
);
