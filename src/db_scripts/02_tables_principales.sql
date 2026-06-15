-- ============================================================================
-- OPÉRATION BLACKVAULT — TAJ
-- Script 02 : Tables principales
-- ============================================================================

-- ============================================================================
-- TABLE 1 : Niveaux de classification (Bell-LaPadula)
-- ============================================================================
CREATE TABLE classification_niveaux (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(5)  NOT NULL UNIQUE,
    libelle     VARCHAR(50) NOT NULL,
    niveau      INT         NOT NULL UNIQUE CHECK (niveau >= 0 AND niveau <= 3)
);

COMMENT ON TABLE classification_niveaux IS 'Niveaux de classification Bell-LaPadula (0=NC, 1=CD, 2=SD, 3=TSD)';

-- ============================================================================
-- TABLE 2 : Rôles RBAC
-- ============================================================================
CREATE TABLE roles (
    id                          SERIAL PRIMARY KEY,
    nom                         VARCHAR(50)  NOT NULL UNIQUE,
    description                 TEXT,
    niveau_max_classification_id INT NOT NULL REFERENCES classification_niveaux(id)
);

COMMENT ON TABLE roles IS 'Rôles RBAC avec niveau de classification maximum autorisé';

-- ============================================================================
-- TABLE 3 : Services (commissariats, brigades, parquets...)
-- ============================================================================
CREATE TABLE services (
    id          SERIAL PRIMARY KEY,
    nom         VARCHAR(150) NOT NULL,
    type        type_service NOT NULL,
    adresse     VARCHAR(255),
    code_unite  VARCHAR(20)  NOT NULL UNIQUE,
    telephone   VARCHAR(20),
    email       VARCHAR(150),
    actif       BOOLEAN      NOT NULL DEFAULT TRUE,
    date_creation TIMESTAMP  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE services IS 'Unités opérationnelles (commissariats, brigades, parquets, DGSI...)';

-- ============================================================================
-- TABLE 4 : Agents (utilisateurs du TAJ)
-- ============================================================================
CREATE TABLE agents (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matricule               VARCHAR(20)  NOT NULL UNIQUE,
    nom                     VARCHAR(100) NOT NULL,
    prenom                  VARCHAR(100) NOT NULL,
    email                   VARCHAR(150),
    mot_de_passe_hash       TEXT         NOT NULL,
    role_id                 INT          NOT NULL REFERENCES roles(id),
    service_id              INT          NOT NULL REFERENCES services(id),
    habilitation_niveau_id  INT          NOT NULL REFERENCES classification_niveaux(id),
    actif                   BOOLEAN      NOT NULL DEFAULT TRUE,
    derniere_connexion      TIMESTAMP,
    tentatives_echouees     INT          NOT NULL DEFAULT 0,
    verrouille              BOOLEAN      NOT NULL DEFAULT FALSE,
    date_creation           TIMESTAMP    NOT NULL DEFAULT NOW(),
    date_modification       TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE agents IS 'Agents habilités à consulter le TAJ (police, gendarmerie, magistrature)';

CREATE INDEX idx_agents_matricule ON agents(matricule);
CREATE INDEX idx_agents_service ON agents(service_id);
CREATE INDEX idx_agents_role ON agents(role_id);

-- ============================================================================
-- TABLE 5 : Personnes (individus connus du TAJ)
-- ============================================================================
CREATE TABLE personnes (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom                     VARCHAR(100) NOT NULL,
    prenom                  VARCHAR(100) NOT NULL,
    date_naissance          DATE,
    lieu_naissance          VARCHAR(100),
    nationalite             VARCHAR(50)  DEFAULT 'Française',
    sexe                    CHAR(1)      CHECK (sexe IN ('M', 'F', 'I')),
    niveau_classification_id INT         NOT NULL REFERENCES classification_niveaux(id),
    statut                  statut_personne NOT NULL DEFAULT 'actif',
    numero_taj              VARCHAR(20)  UNIQUE,
    date_creation           TIMESTAMP    NOT NULL DEFAULT NOW(),
    date_modification       TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE personnes IS 'Personnes connues du TAJ (mis en cause, victimes, témoins)';

CREATE INDEX idx_personnes_nom ON personnes(nom, prenom);
CREATE INDEX idx_personnes_naissance ON personnes(date_naissance);
CREATE INDEX idx_personnes_classification ON personnes(niveau_classification_id);
CREATE INDEX idx_personnes_trgm_nom ON personnes USING gin (nom gin_trgm_ops);

-- ============================================================================
-- TABLE 6 : Alias (noms d'emprunt)
-- ============================================================================
CREATE TABLE aliases (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personne_id UUID        NOT NULL REFERENCES personnes(id) ON DELETE CASCADE,
    alias_nom   VARCHAR(100) NOT NULL,
    alias_prenom VARCHAR(100),
    type        type_alias  NOT NULL DEFAULT 'pseudonyme',
    date_creation TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE aliases IS 'Alias et noms d''emprunt des personnes connues du TAJ';

CREATE INDEX idx_aliases_personne ON aliases(personne_id);
CREATE INDEX idx_aliases_nom ON aliases(alias_nom);

-- ============================================================================
-- TABLE 7 : Adresses
-- ============================================================================
CREATE TABLE adresses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personne_id     UUID         NOT NULL REFERENCES personnes(id) ON DELETE CASCADE,
    adresse_ligne1  VARCHAR(255) NOT NULL,
    adresse_ligne2  VARCHAR(255),
    code_postal     VARCHAR(10),
    ville           VARCHAR(100) NOT NULL,
    pays            VARCHAR(50)  NOT NULL DEFAULT 'France',
    type            type_adresse NOT NULL DEFAULT 'domicile',
    date_debut      DATE,
    date_fin        DATE,
    date_creation   TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE adresses IS 'Adresses connues des personnes du TAJ';

CREATE INDEX idx_adresses_personne ON adresses(personne_id);
CREATE INDEX idx_adresses_ville ON adresses(ville);

-- ============================================================================
-- TABLE 8 : Téléphones
-- ============================================================================
CREATE TABLE telephones (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personne_id UUID         NOT NULL REFERENCES personnes(id) ON DELETE CASCADE,
    numero      VARCHAR(20)  NOT NULL,
    type        type_telephone NOT NULL DEFAULT 'mobile',
    actif       BOOLEAN      NOT NULL DEFAULT TRUE,
    date_creation TIMESTAMP  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE telephones IS 'Numéros de téléphone des personnes connues du TAJ';

CREATE INDEX idx_telephones_personne ON telephones(personne_id);
CREATE INDEX idx_telephones_numero ON telephones(numero);

-- ============================================================================
-- TABLE 9 : Biométrie (CHIFFRÉ avec pgcrypto)
-- ============================================================================
CREATE TABLE biometrie (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personne_id             UUID           NOT NULL REFERENCES personnes(id) ON DELETE CASCADE,
    type                    type_biometrie NOT NULL,
    donnees_chiffrees       BYTEA          NOT NULL,
    hash_verification       TEXT           NOT NULL,
    niveau_classification_id INT           NOT NULL REFERENCES classification_niveaux(id),
    date_collecte           DATE           NOT NULL,
    collecte_par_agent_id   UUID           REFERENCES agents(id),
    lieu_collecte           VARCHAR(150),
    date_creation           TIMESTAMP      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE biometrie IS 'Données biométriques chiffrées (empreintes, photos, ADN) — pgcrypto AES-256';

CREATE INDEX idx_biometrie_personne ON biometrie(personne_id);
CREATE INDEX idx_biometrie_type ON biometrie(type);

-- ============================================================================
-- TABLE 10 : Infractions (nomenclature NATINF)
-- ============================================================================
CREATE TABLE infractions (
    id                  SERIAL PRIMARY KEY,
    code_natinf         VARCHAR(10)  NOT NULL UNIQUE,
    libelle             VARCHAR(255) NOT NULL,
    categorie           categorie_infraction NOT NULL,
    article_code_penal  VARCHAR(20),
    peine_max           VARCHAR(100),
    date_creation       TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE infractions IS 'Nomenclature NATINF des infractions du code pénal';

CREATE INDEX idx_infractions_natinf ON infractions(code_natinf);
CREATE INDEX idx_infractions_categorie ON infractions(categorie);

-- ============================================================================
-- TABLE 11 : Affaires (dossiers judiciaires)
-- ============================================================================
CREATE TABLE affaires (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_pv               VARCHAR(50) NOT NULL UNIQUE,
    date_faits              DATE,
    date_ouverture          DATE        NOT NULL,
    date_cloture            DATE,
    service_responsable_id  INT         NOT NULL REFERENCES services(id),
    statut                  statut_affaire NOT NULL DEFAULT 'en_cours',
    niveau_classification_id INT        NOT NULL REFERENCES classification_niveaux(id),
    description             TEXT,
    lieu_faits              VARCHAR(255),
    date_creation           TIMESTAMP   NOT NULL DEFAULT NOW(),
    date_modification       TIMESTAMP   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE affaires IS 'Dossiers judiciaires du TAJ';

CREATE INDEX idx_affaires_pv ON affaires(numero_pv);
CREATE INDEX idx_affaires_service ON affaires(service_responsable_id);
CREATE INDEX idx_affaires_statut ON affaires(statut);
CREATE INDEX idx_affaires_classification ON affaires(niveau_classification_id);
CREATE INDEX idx_affaires_date_faits ON affaires(date_faits);

-- ============================================================================
-- TABLE 12 : Lien Affaire ↔ Personne
-- ============================================================================
CREATE TABLE affaire_personnes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affaire_id      UUID         NOT NULL REFERENCES affaires(id) ON DELETE CASCADE,
    personne_id     UUID         NOT NULL REFERENCES personnes(id) ON DELETE CASCADE,
    role            role_affaire NOT NULL,
    date_implication DATE,
    observations    TEXT,
    date_creation   TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE(affaire_id, personne_id, role)
);

COMMENT ON TABLE affaire_personnes IS 'Association entre affaires et personnes avec leur rôle';

CREATE INDEX idx_affaire_personnes_affaire ON affaire_personnes(affaire_id);
CREATE INDEX idx_affaire_personnes_personne ON affaire_personnes(personne_id);

-- ============================================================================
-- TABLE 13 : Lien Affaire ↔ Infraction
-- ============================================================================
CREATE TABLE affaire_infractions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affaire_id      UUID NOT NULL REFERENCES affaires(id) ON DELETE CASCADE,
    infraction_id   INT  NOT NULL REFERENCES infractions(id),
    date_creation   TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(affaire_id, infraction_id)
);

COMMENT ON TABLE affaire_infractions IS 'Infractions reprochées dans une affaire';

CREATE INDEX idx_affaire_infractions_affaire ON affaire_infractions(affaire_id);

-- ============================================================================
-- TABLE 14 : Signalements (fiches S, mandats, OQTF...)
-- ============================================================================
CREATE TABLE signalements (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personne_id             UUID             NOT NULL REFERENCES personnes(id) ON DELETE CASCADE,
    type                    type_signalement NOT NULL,
    motif                   TEXT             NOT NULL,
    date_emission           DATE             NOT NULL,
    date_expiration         DATE,
    emis_par_service_id     INT              NOT NULL REFERENCES services(id),
    emis_par_agent_id       UUID             REFERENCES agents(id),
    niveau_classification_id INT             NOT NULL REFERENCES classification_niveaux(id),
    actif                   BOOLEAN          NOT NULL DEFAULT TRUE,
    priorite                INT              DEFAULT 1 CHECK (priorite BETWEEN 1 AND 5),
    date_creation           TIMESTAMP        NOT NULL DEFAULT NOW(),
    date_modification       TIMESTAMP        NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE signalements IS 'Signalements : fiches S, mandats d''arrêt, OQTF, fiches de recherche';

CREATE INDEX idx_signalements_personne ON signalements(personne_id);
CREATE INDEX idx_signalements_type ON signalements(type);
CREATE INDEX idx_signalements_actif ON signalements(actif) WHERE actif = TRUE;
CREATE INDEX idx_signalements_classification ON signalements(niveau_classification_id);

-- ============================================================================
-- TABLE 15 : Décisions de justice
-- ============================================================================
CREATE TABLE decisions_justice (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affaire_id      UUID          NOT NULL REFERENCES affaires(id) ON DELETE CASCADE,
    type            type_decision NOT NULL,
    date_decision   DATE          NOT NULL,
    juridiction     VARCHAR(150),
    peine           TEXT,
    description     TEXT,
    magistrat_id    UUID          REFERENCES agents(id),
    date_creation   TIMESTAMP     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE decisions_justice IS 'Décisions de justice liées aux affaires';

CREATE INDEX idx_decisions_affaire ON decisions_justice(affaire_id);
CREATE INDEX idx_decisions_type ON decisions_justice(type);
CREATE INDEX idx_decisions_date ON decisions_justice(date_decision);

-- ============================================================================
-- TABLE 16 : Scellés (pièces à conviction)
-- ============================================================================
CREATE TABLE scelles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affaire_id      UUID          NOT NULL REFERENCES affaires(id) ON DELETE CASCADE,
    description     TEXT          NOT NULL,
    lieu_stockage   VARCHAR(150),
    date_saisie     DATE          NOT NULL,
    statut          statut_scelle NOT NULL DEFAULT 'conserve',
    numero_scelle   VARCHAR(30)   UNIQUE,
    saisi_par_agent_id UUID       REFERENCES agents(id),
    date_creation   TIMESTAMP     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE scelles IS 'Pièces à conviction saisies dans le cadre d''affaires';

CREATE INDEX idx_scelles_affaire ON scelles(affaire_id);
CREATE INDEX idx_scelles_statut ON scelles(statut);

-- ============================================================================
-- TABLE 17 : Véhicules
-- ============================================================================
CREATE TABLE vehicules (
    id              SERIAL PRIMARY KEY,
    immatriculation VARCHAR(15),
    marque          VARCHAR(50),
    modele          VARCHAR(50),
    couleur         VARCHAR(30),
    type            VARCHAR(30),
    numero_serie    VARCHAR(50),
    date_creation   TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE vehicules IS 'Véhicules impliqués dans des affaires judiciaires';

CREATE INDEX idx_vehicules_immat ON vehicules(immatriculation);

-- ============================================================================
-- TABLE 18 : Lien Affaire ↔ Véhicule
-- ============================================================================
CREATE TABLE affaire_vehicules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affaire_id      UUID           NOT NULL REFERENCES affaires(id) ON DELETE CASCADE,
    vehicule_id     INT            NOT NULL REFERENCES vehicules(id),
    role            role_vehicule  NOT NULL DEFAULT 'implique',
    date_creation   TIMESTAMP      NOT NULL DEFAULT NOW(),
    UNIQUE(affaire_id, vehicule_id)
);

COMMENT ON TABLE affaire_vehicules IS 'Véhicules liés à des affaires judiciaires';

CREATE INDEX idx_affaire_vehicules_affaire ON affaire_vehicules(affaire_id);

-- ============================================================================
-- TABLE 19 : Consultations (traçabilité des accès)
-- ============================================================================
CREATE TABLE consultations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id            UUID         NOT NULL REFERENCES agents(id),
    table_consultee     VARCHAR(50)  NOT NULL,
    enregistrement_id   UUID,
    date_consultation   TIMESTAMP    NOT NULL DEFAULT NOW(),
    ip_source           INET,
    motif               TEXT,
    type_requete        type_requete NOT NULL DEFAULT 'select'
);

COMMENT ON TABLE consultations IS 'Journal de toutes les consultations du TAJ par les agents';

CREATE INDEX idx_consultations_agent ON consultations(agent_id);
CREATE INDEX idx_consultations_date ON consultations(date_consultation);
CREATE INDEX idx_consultations_table ON consultations(table_consultee);

-- ============================================================================
-- TABLE 20 : Audit Log centralisé
-- ============================================================================
CREATE TABLE audit_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    horodatage          TIMESTAMP    NOT NULL DEFAULT NOW(),
    agent_id            UUID         REFERENCES agents(id),
    action              VARCHAR(50)  NOT NULL,
    table_cible         VARCHAR(50),
    enregistrement_id   UUID,
    details             JSONB,
    ip_source           INET,
    session_id          TEXT,
    alerte              BOOLEAN      NOT NULL DEFAULT FALSE,
    type_alerte         TEXT,
    severite            INT          DEFAULT 0 CHECK (severite BETWEEN 0 AND 5)
);

COMMENT ON TABLE audit_log IS 'Journal d''audit centralisé — toutes les opérations sensibles et alertes';

CREATE INDEX idx_audit_date ON audit_log(horodatage);
CREATE INDEX idx_audit_agent ON audit_log(agent_id);
CREATE INDEX idx_audit_alerte ON audit_log(alerte) WHERE alerte = TRUE;
CREATE INDEX idx_audit_severite ON audit_log(severite) WHERE severite >= 3;
