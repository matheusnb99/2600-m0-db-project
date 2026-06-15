-- ============================================================================
-- OPÉRATION BLACKVAULT — TAJ
-- Script 04 : Données de référence (classification, rôles, services, infractions)
-- ============================================================================

-- ============================================================================
-- Niveaux de classification Bell-LaPadula
-- ============================================================================
INSERT INTO classification_niveaux (code, libelle, niveau) VALUES
    ('NC',  'Non Classifié',            0),
    ('CD',  'Confidentiel Défense',     1),
    ('SD',  'Secret Défense',           2),
    ('TSD', 'Très Secret Défense',      3);

-- ============================================================================
-- Rôles RBAC
-- ============================================================================
INSERT INTO roles (nom, description, niveau_max_classification_id) VALUES
    ('agent_saisie',          'Agent de saisie — saisie des PV et données de base',
        (SELECT id FROM classification_niveaux WHERE code = 'CD')),
    ('opj',                   'Officier de Police Judiciaire — enquêteur principal',
        (SELECT id FROM classification_niveaux WHERE code = 'SD')),
    ('magistrat',             'Magistrat — supervision judiciaire',
        (SELECT id FROM classification_niveaux WHERE code = 'TSD')),
    ('analyste_renseignement','Analyste renseignement — analyse signalements et fiches S',
        (SELECT id FROM classification_niveaux WHERE code = 'TSD')),
    ('admin_systeme',         'Administrateur système — maintenance technique uniquement',
        (SELECT id FROM classification_niveaux WHERE code = 'NC')),
    ('auditeur',              'Auditeur — contrôle des accès et conformité',
        (SELECT id FROM classification_niveaux WHERE code = 'TSD')),
    ('controleur_cnil',       'Contrôleur CNIL — vérification réglementaire',
        (SELECT id FROM classification_niveaux WHERE code = 'SD'));

-- ============================================================================
-- Services (commissariats, brigades, parquets, DGSI...)
-- ============================================================================
INSERT INTO services (nom, type, adresse, code_unite, telephone, email) VALUES
    ('Commissariat Central de Paris 1er',           'commissariat',        '4 Rue de Lutèce, 75004 Paris',           'CP-75-001', '01 53 71 53 71', 'cp1@police.gouv.fr'),
    ('Commissariat de Marseille Centre',            'commissariat',        '2 Rue Antoine Becker, 13002 Marseille',  'CP-13-001', '04 91 39 80 00', 'cp.marseille@police.gouv.fr'),
    ('Commissariat de Lyon 3ème',                   'commissariat',        '47 Rue de la Part-Dieu, 69003 Lyon',     'CP-69-003', '04 78 78 40 40', 'cp.lyon3@police.gouv.fr'),
    ('Brigade de Gendarmerie de Versailles',        'brigade_gendarmerie', '8 Rue Carnot, 78000 Versailles',         'BG-78-001', '01 39 49 44 44', 'bg.versailles@gendarmerie.gouv.fr'),
    ('Brigade de Gendarmerie de Toulouse',          'brigade_gendarmerie', '12 Allée Jean Jaurès, 31000 Toulouse',   'BG-31-001', '05 61 12 77 77', 'bg.toulouse@gendarmerie.gouv.fr'),
    ('Parquet du TGI de Paris',                     'parquet',             '4 Boulevard du Palais, 75001 Paris',      'PQ-75-001', '01 44 32 51 51', 'parquet.paris@justice.gouv.fr'),
    ('Parquet du TGI de Marseille',                 'parquet',             '6 Place Montyon, 13006 Marseille',        'PQ-13-001', '04 91 15 50 50', 'parquet.marseille@justice.gouv.fr'),
    ('DGSI — Sous-direction Antiterrorisme',        'dgsi',               'Levallois-Perret (classifié)',            'DGSI-AT',   NULL,              NULL),
    ('DGSI — Sous-direction Contre-espionnage',     'dgsi',               'Levallois-Perret (classifié)',            'DGSI-CE',   NULL,              NULL),
    ('Douanes — Service National de Renseignement', 'douanes',            '11 Rue des Deux-Communes, 93558 Montreuil','DN-SR-001','01 57 53 45 00', 'snrd@douane.finances.gouv.fr');

-- ============================================================================
-- Infractions (nomenclature NATINF — échantillon représentatif)
-- ============================================================================
INSERT INTO infractions (code_natinf, libelle, categorie, article_code_penal, peine_max) VALUES
    ('10001', 'Meurtre',                                           'crime',          '221-1',    '30 ans de réclusion'),
    ('10002', 'Assassinat',                                        'crime',          '221-3',    'Réclusion à perpétuité'),
    ('10010', 'Violences volontaires avec ITT > 8 jours',         'delit',          '222-11',   '3 ans + 45000€'),
    ('10020', 'Vol simple',                                        'delit',          '311-1',    '3 ans + 45000€'),
    ('10021', 'Vol aggravé (en réunion)',                          'delit',          '311-4',    '5 ans + 75000€'),
    ('10022', 'Vol avec arme',                                     'crime',          '311-8',    '20 ans de réclusion'),
    ('10030', 'Escroquerie',                                       'delit',          '313-1',    '5 ans + 375000€'),
    ('10040', 'Trafic de stupéfiants',                            'crime',          '222-34',   '10 ans + 7 500 000€'),
    ('10041', 'Usage de stupéfiants',                              'delit',          '222-37',   '1 an + 3750€'),
    ('10050', 'Association de malfaiteurs',                        'delit',          '450-1',    '10 ans + 150000€'),
    ('10060', 'Blanchiment',                                       'delit',          '324-1',    '5 ans + 375000€'),
    ('10070', 'Faux et usage de faux',                            'delit',          '441-1',    '3 ans + 45000€'),
    ('10080', 'Abus de confiance',                                 'delit',          '314-1',    '3 ans + 375000€'),
    ('10090', 'Recel',                                             'delit',          '321-1',    '5 ans + 375000€'),
    ('10100', 'Terrorisme — association de malfaiteurs',           'crime',          '421-2-1',  '20 ans de réclusion'),
    ('10101', 'Terrorisme — financement',                          'crime',          '421-2-2',  '10 ans + 225000€'),
    ('10110', 'Cybercriminalité — accès frauduleux à un STAD',   'delit',          '323-1',    '3 ans + 100000€'),
    ('10111', 'Cybercriminalité — maintien frauduleux',           'delit',          '323-1',    '3 ans + 100000€'),
    ('10120', 'Menaces de mort',                                   'delit',          '222-17',   '3 ans + 45000€'),
    ('10130', 'Harcèlement moral',                                'delit',          '222-33-2', '2 ans + 30000€');
