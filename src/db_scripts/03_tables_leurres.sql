-- ============================================================================
-- OPÉRATION BLACKVAULT — TAJ
-- Script 03 : Tables leurres (Deception)
-- Ces tables ont des noms volontairement attractifs pour piéger un attaquant.
-- Tout accès déclenche une alerte dans audit_log.
-- ============================================================================

-- ============================================================================
-- TABLE LEURRE 21 : CREDENTIALS
-- ============================================================================
CREATE TABLE credentials (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(100) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    service_name    VARCHAR(100),
    access_level    VARCHAR(50),
    last_rotation   DATE,
    notes           TEXT,
    date_created    TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE credentials IS '[LEURRE] Table piège — tout accès déclenche une alerte de sécurité';

INSERT INTO credentials (username, password_hash, service_name, access_level, last_rotation, notes) VALUES
('admin_taj',      '$2a$12$xK8Df3.fake.hash.aabbccdd', 'TAJ_Production', 'super_admin', '2026-01-15', 'Rotation trimestrielle'),
('backup_svc',     '$2a$12$yL9Eg4.fake.hash.eeffgghh', 'Backup_Service', 'admin', '2026-02-01', 'Compte de sauvegarde automatique'),
('root_db',        '$2a$12$zM0Fh5.fake.hash.iijjkkll', 'PostgreSQL_Root', 'superuser', '2025-12-20', 'NE PAS SUPPRIMER'),
('api_gateway',    '$2a$12$aN1Gi6.fake.hash.mmnnoopp', 'API_Gateway_TAJ', 'service', '2026-03-01', 'Token API interne'),
('ldap_bind',      '$2a$12$bO2Hj7.fake.hash.qqrrsstt', 'LDAP_Directory', 'read_only', '2026-01-30', 'Compte LDAP de liaison');

-- ============================================================================
-- TABLE LEURRE 22 : PASSWORDS
-- ============================================================================
CREATE TABLE passwords (
    id              SERIAL PRIMARY KEY,
    system_name     VARCHAR(100) NOT NULL,
    admin_password  VARCHAR(255) NOT NULL,
    root_password   VARCHAR(255),
    recovery_key    TEXT,
    expiry_date     DATE,
    notes           TEXT
);

COMMENT ON TABLE passwords IS '[LEURRE] Table piège — tout accès déclenche une alerte de sécurité';

INSERT INTO passwords (system_name, admin_password, root_password, recovery_key, expiry_date, notes) VALUES
('PostgreSQL Main',   'P@ssw0rd_TAJ_2026!',  'R00t#Db_S3cur3',     'RECOV-TAJ-XXXX-YYYY-ZZZZ', '2026-12-31', 'Serveur principal'),
('Proxmox VE',        'Prox_Adm1n_2026$',    'PvE_R00t_Access!',   'RECOV-PVE-AAAA-BBBB-CCCC', '2026-06-30', 'Hyperviseur'),
('Grafana Dashboard', 'Graf_M0nit0r!',       NULL,                  NULL, '2026-09-30', 'Monitoring'),
('VPN Gateway',       'VPN_T4J_Acc3ss#',     'VPN_R00t_2026',      'RECOV-VPN-DDDD-EEEE-FFFF', '2026-08-15', 'Accès distant'),
('SSH Bastion',       'B@sti0n_SSH_2026',    'B@sti0n_R00t!',      NULL, '2026-07-01', 'Serveur de rebond');

-- ============================================================================
-- TABLE LEURRE 23 : KEYS_MASTER
-- ============================================================================
CREATE TABLE keys_master (
    id              SERIAL PRIMARY KEY,
    key_name        VARCHAR(100) NOT NULL,
    key_value       TEXT NOT NULL,
    algorithm       VARCHAR(50),
    key_type        VARCHAR(50),
    expiry_date     DATE,
    created_by      VARCHAR(100),
    notes           TEXT
);

COMMENT ON TABLE keys_master IS '[LEURRE] Table piège — tout accès déclenche une alerte de sécurité';

INSERT INTO keys_master (key_name, key_value, algorithm, key_type, expiry_date, created_by, notes) VALUES
('TAJ_MASTER_KEY',          'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...fake_key_1', 'RSA-4096', 'master', '2027-01-01', 'admin_taj', 'Clé maître de chiffrement'),
('BACKUP_ENCRYPTION_KEY',   'AES256:fake_base64_encoded_key_data_2', 'AES-256-GCM', 'symmetric', '2026-12-31', 'backup_svc', 'Clé de chiffrement des sauvegardes'),
('TLS_PRIVATE_KEY',         '-----BEGIN PRIVATE KEY-----\nfake_private_key_3\n-----END PRIVATE KEY-----', 'ECDSA-P384', 'tls', '2026-06-30', 'admin_taj', 'Certificat TLS interne'),
('API_SIGNING_KEY',         'HS512:fake_hmac_signing_key_data_4', 'HMAC-SHA512', 'api', '2026-09-30', 'api_gateway', 'Signature des tokens API'),
('BIOMETRIC_DECRYPT_KEY',   'AES256:fake_biometric_decryption_key_5', 'AES-256-CBC', 'biometric', '2027-03-01', 'admin_taj', 'Déchiffrement des données biométriques');

-- ============================================================================
-- TABLE LEURRE 24 : AGENTS_SECRETS
-- ============================================================================
CREATE TABLE agents_secrets (
    id                  SERIAL PRIMARY KEY,
    nom_reel            VARCHAR(100) NOT NULL,
    nom_couverture      VARCHAR(100) NOT NULL,
    mission             TEXT,
    localisation        VARCHAR(100),
    statut              VARCHAR(30),
    handler             VARCHAR(100),
    derniere_communication DATE,
    notes               TEXT
);

COMMENT ON TABLE agents_secrets IS '[LEURRE] Table piège — tout accès déclenche une alerte de sécurité';

INSERT INTO agents_secrets (nom_reel, nom_couverture, mission, localisation, statut, handler, derniere_communication, notes) VALUES
('DUPONT Jean-Marc',    'MUELLER Hans',     'Infiltration réseau cybercriminel', 'Berlin, Allemagne',   'actif',    'ALPHA-7',  '2026-03-28', 'Couverture journaliste'),
('MARTIN Sophie',       'KOVACS Elena',     'Surveillance financière',           'Zurich, Suisse',      'actif',    'BRAVO-3',  '2026-04-02', 'Couverture banquière'),
('BERNARD Luc',         'AL-RASHID Omar',   'Antiterrorisme cellule dormante',   'Bruxelles, Belgique', 'actif',    'CHARLIE-9','2026-03-15', 'Couverture commerçant'),
('PETIT Claire',        'SANTOS Maria',     'Trafic stupéfiants international',  'Marseille, France',   'extraction','DELTA-1',  '2026-04-10', 'Couverture restauratrice'),
('MOREAU Thomas',       'PETROV Alexei',    'Contre-espionnage industriel',      'Lyon, France',        'en_veille','ECHO-5',   '2026-02-20', 'Couverture ingénieur');

-- ============================================================================
-- TABLE LEURRE 25 : BACKUP_EXPORT
-- ============================================================================
CREATE TABLE backup_export (
    id              SERIAL PRIMARY KEY,
    table_name      VARCHAR(100) NOT NULL,
    export_date     TIMESTAMP NOT NULL DEFAULT NOW(),
    record_count    INT,
    file_path       TEXT,
    checksum        VARCHAR(128),
    exported_by     VARCHAR(100),
    data            TEXT
);

COMMENT ON TABLE backup_export IS '[LEURRE] Table piège — tout accès déclenche une alerte de sécurité';

INSERT INTO backup_export (table_name, export_date, record_count, file_path, checksum, exported_by, data) VALUES
('personnes',       '2026-04-01 02:00:00', 45230, '/backup/taj/personnes_20260401.sql.gz.enc',    'sha256:fake_checksum_1', 'backup_svc', 'ENCRYPTED_BLOB_PLACEHOLDER'),
('signalements',    '2026-04-01 02:15:00', 8750,  '/backup/taj/signalements_20260401.sql.gz.enc', 'sha256:fake_checksum_2', 'backup_svc', 'ENCRYPTED_BLOB_PLACEHOLDER'),
('biometrie',       '2026-04-01 02:30:00', 32100, '/backup/taj/biometrie_20260401.sql.gz.enc',    'sha256:fake_checksum_3', 'backup_svc', 'ENCRYPTED_BLOB_PLACEHOLDER'),
('agents',          '2026-04-01 03:00:00', 1580,  '/backup/taj/agents_20260401.sql.gz.enc',       'sha256:fake_checksum_4', 'backup_svc', 'ENCRYPTED_BLOB_PLACEHOLDER'),
('affaires',        '2026-04-01 03:15:00', 67890, '/backup/taj/affaires_20260401.sql.gz.enc',     'sha256:fake_checksum_5', 'backup_svc', 'ENCRYPTED_BLOB_PLACEHOLDER');
