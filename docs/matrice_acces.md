# Matrice d'Accès RBAC — TAJ (Opération BLACKVAULT)

**Projet** : Refonte de l'infrastructure du TAJ
**Modèle** : RBAC (Role-Based Access Control) couplé à Bell-LaPadula / Biba
**Principe** : **Moindre privilège** — chaque rôle n'a que les droits strictement nécessaires à sa mission

---

## 1. Rôles RBAC

| Rôle | Code | Description | Niveau max (BLP) |
|---|---|---|---|
| Agent de saisie | `agent_saisie` | Saisie des PV, données de base | Confidentiel Défense (CD) |
| OPJ | `opj` | Officier de Police Judiciaire — enquêteur | Secret Défense (SD) |
| Magistrat | `magistrat` | Supervision judiciaire | Très Secret Défense (TSD) |
| Analyste renseignement | `analyste_renseignement` | Analyse signalements / fiches S | Très Secret Défense (TSD) |
| Administrateur système | `admin_systeme` | Maintenance technique | N/A (pas de données métier) |
| Auditeur | `auditeur` | Contrôle accès et conformité | Très Secret Défense (TSD) |
| Contrôleur CNIL | `controleur_cnil` | Contrôle réglementaire externe | Secret Défense (SD) |

---

## 2. Matrice détaillée — Rôles × Tables

**Légende** :
- `R` = SELECT (lecture)
- `W` = INSERT / UPDATE (écriture)
- `D` = DELETE
- `A` = lecture anonymisée (vue masquée)
- `—` = aucun accès
- `[BLP]` = filtré automatiquement par Row-Level Security selon le niveau de classification

| Table | agent_saisie | opj | magistrat | analyste_renseignement | admin_systeme | auditeur | controleur_cnil |
|---|---|---|---|---|---|---|---|
| `personnes` | R / W [BLP] | R / W [BLP] | R [BLP] | R [BLP] | — | A | A |
| `aliases` | R / W [BLP] | R / W [BLP] | R [BLP] | R [BLP] | — | A | A |
| `adresses` | R / W [BLP] | R / W [BLP] | R [BLP] | R [BLP] | — | A | A |
| `telephones` | R / W [BLP] | R / W [BLP] | R [BLP] | R [BLP] | — | A | A |
| `biometrie` | — | R [BLP] | R [BLP] | R [BLP] | — | — | — |
| `infractions` | R | R | R | R | — | R | R |
| `affaires` | R / W [BLP] | R / W [BLP] | R / W [BLP] | R [BLP] | — | A | A |
| `affaire_personnes` | R / W [BLP] | R / W [BLP] | R / W [BLP] | R [BLP] | — | A | A |
| `affaire_infractions` | R / W | R / W | R / W | R | — | R | R |
| `signalements` | R [BLP] | R / W [BLP] | R [BLP] | R / W [BLP] | — | A | — |
| `decisions_justice` | R | R | R / W | R | — | R | R |
| `scelles` | R | R / W | R | R | — | R | — |
| `vehicules` | R / W | R / W | R | R | — | R | — |
| `affaire_vehicules` | R / W | R / W | R | R | — | R | — |
| `consultations` | R (propres) | R (propres) | R (propres) | R (propres) | — | R | R |
| `audit_log` | — | — | — | — | R | R | R |
| `agents` | — | — | R (service) | — | R / W | R | — |
| `services` | R | R | R | R | R / W | R | R |
| `roles` | — | — | — | — | R / W | R | R |
| `classification_niveaux` | R | R | R | R | R | R | R |
| **Tables leurres** | — | — | — | — | — | — | — |
| `credentials` | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap |
| `passwords` | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap |
| `keys_master` | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap |
| `agents_secrets` | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap |
| `backup_export` | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap | ⚠️ honeytrap |

> **⚠️ honeytrap** : aucun rôle légitime n'a besoin d'accéder à ces tables. Tout SELECT/INSERT/UPDATE/DELETE déclenche une **alerte critique** dans `audit_log` avec sévérité maximale.

---

## 3. Justifications par rôle

### 3.1 Agent de saisie (`agent_saisie`)
**Mission** : saisir les procès-verbaux et les données de base.
- **Accès** : personnes, affaires, infractions, véhicules — données de classification ≤ Confidentiel Défense
- **Restriction biométrie** : aucun accès (collecte effectuée par techniciens spécialisés)
- **Restriction fiches S** : lecture seule, pas d'écriture
- **Pas d'accès à l'audit** : moindre privilège

### 3.2 OPJ (`opj`)
**Mission** : mener les enquêtes judiciaires.
- **Accès étendu** : toutes les données métier jusqu'à Secret Défense
- **Biométrie** : lecture autorisée pour identifier des suspects
- **Signalements** : peut créer des fiches de recherche et mandats
- **Scellés** : gestion des pièces à conviction

### 3.3 Magistrat (`magistrat`)
**Mission** : superviser la procédure judiciaire.
- **Accès maximal** : toutes les données jusqu'à Très Secret Défense
- **Décisions de justice** : seul rôle à pouvoir écrire (condamnations, non-lieux)
- **Affaires** : peut modifier le statut des dossiers
- **Lecture uniquement** des données personnelles (les OPJ font la saisie)

### 3.4 Analyste renseignement (`analyste_renseignement`)
**Mission** : analyser les fiches S et signalements.
- **Accès TSD** : données classifiées de renseignement
- **Signalements** : rôle principal pour créer/modifier les fiches S
- **Pas d'accès aux scellés** : hors périmètre opérationnel

### 3.5 Administrateur système (`admin_systeme`)
**Mission** : maintenance technique de la base.
- **Aucun accès aux données métier** — principe de séparation stricte
- **Accès gestion** : agents, services, rôles, configuration
- **Audit** : lecture (pour superviser la santé du système)
- Les opérations DDL nécessitent une double validation

### 3.6 Auditeur (`auditeur`)
**Mission** : contrôler la conformité et détecter les abus.
- **Lecture anonymisée** sur toutes les tables métier
- **Accès complet à l'audit** : consultations + audit_log
- Peut identifier un agent anormal mais ne voit pas les détails personnels

### 3.7 Contrôleur CNIL (`controleur_cnil`)
**Mission** : vérifier le respect du RGPD et de la Directive Police-Justice.
- **Accès externe très restreint** — vues anonymisées uniquement
- Ne voit pas les signalements (trop sensibles)
- Ne voit pas les données biométriques (hors périmètre CNIL)
- Peut contrôler qui a consulté quoi (audit)

---

## 4. Règles d'agrégation Bell-LaPadula

En plus de la matrice RBAC, le **Row-Level Security (RLS)** applique automatiquement les règles Bell-LaPadula :

### Règle 1 — No Read Up (Simple Security Property)
Un agent ne peut pas lire un enregistrement de niveau > son habilitation.

```sql
-- Politique RLS sur la table personnes
CREATE POLICY lecture_selon_habilitation ON personnes
    FOR SELECT
    USING (
        niveau_classification_id <= (
            SELECT habilitation_niveau_id
            FROM agents
            WHERE id = current_setting('app.agent_id')::uuid
        )
    );
```

### Règle 2 — No Write Down (*-Property / Star Property)
Un agent ne peut pas écrire un enregistrement de niveau < son habilitation (évite la fuite d'info).

```sql
-- Politique RLS en écriture
CREATE POLICY ecriture_meme_niveau ON personnes
    FOR INSERT
    WITH CHECK (
        niveau_classification_id >= (
            SELECT habilitation_niveau_id
            FROM agents
            WHERE id = current_setting('app.agent_id')::uuid
        )
    );
```

### Règle 3 — Intégrité Biba (No Write Up)
Un agent de bas niveau ne peut pas modifier des données de haute intégrité.

Exemple : un agent de saisie (CD) ne peut pas modifier une fiche S classifiée Secret Défense même en UPDATE.

---

## 5. Exceptions et élévations de privilège

### 5.1 Consultation motivée (Break-glass)
Un OPJ peut demander un accès exceptionnel à une donnée de niveau supérieur en :
1. Fournissant un **motif** obligatoire
2. L'opération est **tracée avec sévérité 4** dans `audit_log`
3. Une **alerte** est envoyée au magistrat superviseur

### 5.2 Urgence opérationnelle
En cas d'opération d'urgence (enlèvement, attentat en cours) :
- Le chef de service peut activer le mode "Alerte Attentat" ou "Alerte Enlèvement"
- Temporairement, les OPJ concernés ont accès au niveau TSD
- L'activation est elle-même journalisée avec sévérité 5

---

## 6. Implémentation PostgreSQL

### 6.1 Création des rôles
```sql
-- Rôles au niveau PostgreSQL (en plus du RBAC applicatif)
CREATE ROLE role_agent_saisie NOLOGIN;
CREATE ROLE role_opj NOLOGIN;
CREATE ROLE role_magistrat NOLOGIN;
CREATE ROLE role_analyste_renseignement NOLOGIN;
CREATE ROLE role_admin_systeme NOLOGIN;
CREATE ROLE role_auditeur NOLOGIN;
CREATE ROLE role_controleur_cnil NOLOGIN;
```

### 6.2 GRANT minimalistes
```sql
-- Agent de saisie : R/W sur personnes, adresses, téléphones, infractions, véhicules
GRANT SELECT, INSERT, UPDATE ON personnes, aliases, adresses, telephones,
                                  affaires, affaire_personnes, affaire_infractions,
                                  vehicules, affaire_vehicules TO role_agent_saisie;
GRANT SELECT ON signalements, infractions TO role_agent_saisie;

-- OPJ : étend agent_saisie + biométrie (lecture) + scellés + signalements (W)
GRANT role_agent_saisie TO role_opj;
GRANT SELECT ON biometrie TO role_opj;
GRANT SELECT, INSERT, UPDATE ON signalements, scelles TO role_opj;

-- Magistrat : supervision + décisions de justice
GRANT SELECT ON personnes, aliases, adresses, telephones, biometrie,
                signalements, affaire_personnes TO role_magistrat;
GRANT SELECT, INSERT, UPDATE ON decisions_justice, affaires TO role_magistrat;

-- Analyste renseignement : signalements (W) + consultation données
GRANT SELECT ON personnes, aliases, adresses, telephones, biometrie,
                affaires, affaire_personnes TO role_analyste_renseignement;
GRANT SELECT, INSERT, UPDATE ON signalements TO role_analyste_renseignement;

-- Admin système : gestion technique, pas de données métier
GRANT SELECT, INSERT, UPDATE, DELETE ON agents, services, roles,
                                        classification_niveaux TO role_admin_systeme;
GRANT SELECT ON audit_log, consultations TO role_admin_systeme;

-- Auditeur : lecture complète sur audit + vues anonymisées
GRANT SELECT ON audit_log, consultations TO role_auditeur;
GRANT SELECT ON v_personnes_anon, v_affaires_anon, v_signalements_anon TO role_auditeur;

-- Contrôleur CNIL : vues anonymisées uniquement
GRANT SELECT ON v_personnes_anon, v_affaires_anon TO role_controleur_cnil;
GRANT SELECT ON audit_log, consultations TO role_controleur_cnil;
```

### 6.3 Activation du RLS
```sql
-- Sur chaque table sensible
ALTER TABLE personnes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE signalements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometrie        ENABLE ROW LEVEL SECURITY;
ALTER TABLE affaires         ENABLE ROW LEVEL SECURITY;
ALTER TABLE affaire_personnes ENABLE ROW LEVEL SECURITY;
```

---

## 7. Récapitulatif — Principes clés

| Principe | Application |
|---|---|
| **Moindre privilège** | Chaque rôle a le minimum de droits pour sa mission |
| **Séparation des tâches** | L'admin système n'accède pas aux données métier |
| **Audit systématique** | Toutes les opérations sensibles sont tracées |
| **Anonymisation** | Les rôles de contrôle voient des données anonymisées |
| **Deception** | Les tables leurres déclenchent des alertes à tout accès |
| **Bell-LaPadula** | RLS automatique selon le niveau de classification |
| **Biba** | Contrôle d'intégrité selon le niveau d'habilitation |

---

## 8. État réel — Comportement testé (Pôle 2 — J3)

> Mise à jour 2026-05-28 : la matrice théorique ci-dessus a été **implémentée et validée** par 20 tests d'acceptance. Détails complets dans `doc_pole2.md` et `pole2_workspace/tests/test_matrix.sql`.

### 8.1 Scripts d'implémentation
- `mld/07_roles_grants.sql` — création des 7 rôles + GRANT
- `mld/09_fonctions_triggers_blp.sql` — fonctions BLP + triggers
- `mld/08_rls_policies.sql` — 16 policies RLS

### 8.2 Comportement réel par rôle (résumé)

| Rôle | SELECT GRANT | INSERT GRANT | UPDATE GRANT | DELETE GRANT | Vues anon |
|---|:-:|:-:|:-:|:-:|:-:|
| `agent_saisie` | 21 tables | 9 tables | 9 tables | ❌ | ❌ |
| `opj` | 22 tables | 11 tables | 11 tables | ❌ | ❌ |
| `magistrat` | 23 tables | 4 tables | 4 tables | ❌ | ❌ |
| `analyste_renseignement` | 21 tables | 1 (`signalements`) | 1 | ❌ | ❌ |
| `admin_systeme` | 11 tables | 3 (agents/services/roles) | 3 | ❌ | ❌ |
| `auditeur` | 21 tables (dont vues) | ❌ | ❌ | ❌ | ✅ 6 vues |
| `controleur_cnil` | 19 (vues uniquement) | ❌ | ❌ | ❌ | ✅ 6 vues |

> **DELETE volontairement REVOKE pour tous les rôles métier** : conformité Police-Justice (UE 2016/680) — on archive (`statut`), on ne supprime pas physiquement. Seul `postgres` (admin technique) peut DELETE.

### 8.3 Tests d'acceptance — 20/20

| Bloc | Tests | Validé |
|---|---|:-:|
| RBAC (GRANT/REVOKE) | T01-T06 | 6/6 ✅ |
| BLP No Read Up | T07-T10 | 4/4 ✅ |
| BLP No Write Down | T11-T14 | 4/4 ✅ |
| Élévation refusée | T15-T16 | 2/2 ✅ |
| RLS Owner (audit_log/consultations) | T17-T18 | 2/2 ✅ |
| Démonstration finale | T19-T20 | 2/2 ✅ |

**Reproductibilité** : `docker exec -i blackvault-local psql -U postgres -d blackvault < pole2_workspace/tests/test_matrix.sql`

### 8.4 Mode "session de travail" — innovation pratique

Pour rendre Bell-LaPadula strict utilisable, on a introduit le concept de **niveau de session déclaré à la connexion** :

```sql
-- Connexion d'un magistrat (habilité TSD=3) qui veut travailler en CD pour saisir un PV
SELECT fn_open_session('<uuid-magistrat>', 1);  -- niveau CD
-- → toutes les écritures sont contraintes à niveau CD pour cette session
-- → changement de niveau = nouvelle ouverture = trace dans audit_log
```

Voir `doc_pole2.md` § 4 pour les détails.
