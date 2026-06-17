# Documentation Pôle 1

**Projet** : OPÉRATION BLACKVAULT — TAJ  
**Rédigé par** : Pôle 1 (DBA)  
**Date** : 27 avril 2026  

---

## 1. Accès à la base de données

| Info | Détail |
|---|---|
| **Hôte** | `10.4.1.200` |
| **Port** | `5432` |
| **Base** | `blackvault` |
| **Utilisateur** | `taj_admin` |
| **Mot de passe** | `ProjetTaj2600` |

> **Prérequis** : être connecté au VPN (`10.4.x.x`)

**Connexion en ligne de commande :**
```bash
psql -h 10.4.1.200 -U taj_admin -d blackvault
```

**Connexion via pgAdmin :**
Renseigner Host, Port, Database, Username, Password avec les infos du tableau.

---

## 2. État actuel de la base

La base est opérationnelle et peuplée. Voici ce qui est en place :

### Tables disponibles (25)

```
adresses              affaire_infractions    affaire_personnes
affaire_vehicules     affaires               agents
agents_secrets        aliases                audit_log
backup_export         biometrie              classification_niveaux
consultations         credentials            decisions_justice
infractions           keys_master            passwords
personnes             roles                  scelles
services              signalements           telephones
vehicules
```

### Volumes de données

| Table | Lignes |
|---|---|
| `personnes` | 1 200 |
| `adresses` | 1 500 |
| `telephones` | 1 000 |
| `affaires` | 600 |
| `affaire_personnes` | 1 500 |
| `affaire_infractions` | 800 |
| `signalements` | 300 |
| `biometrie` | 500 |
| `decisions_justice` | 302 |
| `scelles` | 350 |
| `vehicules` | 200 |
| `affaire_vehicules` | 250 |
| `consultations` | 2 000 |
| `audit_log` | 500 |
| `agents` | 50 |
| `aliases` | 400 |

### Vues CNIL disponibles (6)

| Vue | Table(s) source | Description |
|---|---|---|
| `personnes_anonymisees` | `personnes` | Nom/prénom hashés, DOB tronquée à l'année |
| `signalements_anonymises` | `signalements` + `services` | Motif tronqué, identité pseudonymisée |
| `agents_anonymises` | `agents` + `roles` + `services` | Matricule masqué |
| `audit_log_anonymise` | `audit_log` | IPs masquées au /24 |
| `statistiques_cnil` | Plusieurs tables | Agrégats uniquement |
| `durees_conservation` | `personnes` | Alertes dépassement durée légale |

---

## 3. Structure des tables importantes pour ta partie

### `classification_niveaux` — niveaux Bell-LaPadula

```sql
SELECT * FROM classification_niveaux;
```

| id | code | libelle | niveau |
|---|---|---|---|
| 1 | NC | Non Classifié | 0 |
| 2 | CD | Confidentiel Défense | 1 |
| 3 | SD | Secret Défense | 2 |
| 4 | TSD | Très Secret Défense | 3 |

### `roles` — rôles RBAC déjà définis

```sql
SELECT * FROM roles;
```

| id | nom | niveau_max_classification_id |
|---|---|---|
| 1 | agent_saisie | 2 (CD) |
| 2 | opj | 3 (SD) |
| 3 | magistrat | 4 (TSD) |
| 4 | analyste_renseignement | 4 (TSD) |
| 5 | admin_systeme | 1 (NC) |
| 6 | auditeur | 4 (TSD) |
| 7 | controleur_cnil | 3 (SD) |

### `agents` — utilisateurs du système

```sql
-- Structure de la table agents
\d agents
```

Colonnes importantes :
- `id` — UUID
- `matricule` — identifiant unique (ex: `AG00001`)
- `role_id` — FK vers `roles`
- `service_id` — FK vers `services`
- `habilitation_niveau_id` — FK vers `classification_niveaux`
- `actif` — booléen
- `verrouille` — booléen

### `personnes` — table principale (sensible)

Colonnes importantes pour les RLS :
- `niveau_classification_id` — FK vers `classification_niveaux`
- `statut` — ENUM (`actif`, `archive`, `supprime`, `en_cours_verification`)

### `signalements` — table très sensible

Colonnes importantes pour les RLS :
- `type` — ENUM (`fiche_s`, `fiche_recherche`, `oqtf`, `mandat_arret`...)
- `niveau_classification_id` — FK vers `classification_niveaux`
- `actif` — booléen
- `priorite` — entier 1-5

### `audit_log` — table de traçabilité

Colonnes importantes :
- `agent_id` — qui a fait l'action
- `action` — type d'action (LOGIN, SELECT, INSERT...)
- `table_cible` — sur quelle table
- `alerte` — booléen
- `type_alerte` — NRU_VIOLATION, NWD_VIOLATION, HONEYTOKEN_ACCESS...
- `severite` — entier 0-5

---

## 4. Ce que tu dois faire avec les vues CNIL

Dans `06_vues.sql`, les GRANT pour le rôle `controleur_cnil` sont **commentés** en attente de ta partie. Une fois que tu auras créé le rôle PostgreSQL `controleur_cnil` dans ton `07_roles_grants.sql`, décommente ces lignes :

```sql
-- À décommenter dans 06_vues.sql une fois le rôle créé :
GRANT SELECT ON personnes_anonymisees   TO controleur_cnil;
GRANT SELECT ON signalements_anonymises TO controleur_cnil;
GRANT SELECT ON agents_anonymises       TO controleur_cnil;
GRANT SELECT ON audit_log_anonymise     TO controleur_cnil;
GRANT SELECT ON statistiques_cnil       TO controleur_cnil;
GRANT SELECT ON durees_conservation     TO controleur_cnil;
```

---

## 5. Fichiers à ta disposition dans `~/blackvault/`

| Fichier | Rôle |
|---|---|
| `01_types_et_extensions.sql` | Extensions + types ENUM |
| `02_tables_principales.sql` | Toutes les tables (schéma complet) |
| `03_tables_leurres.sql` | Tables leurres pour le Pôle 3 |
| `04_donnees_reference.sql` | Données de référence (niveaux, rôles, services, infractions) |
| `05_seed_data.sql` | 11 000+ lignes de données réalistes |
| `06_vues.sql` | 6 vues anonymisées CNIL |
| `reset_db.py` | Script de reset complet en une commande |

---

## 6. Reset de la base si besoin

Si tu as besoin de repartir de zéro (après des tests qui ont abîmé la base) :

```bash
python3 ~/blackvault/reset_db.py
# Taper "oui" à la confirmation
# La base est rechargée en ~1 seconde
```

---

## 7. Commandes utiles pour explorer la base

```sql
-- Lister toutes les tables
\dt

-- Voir la structure d'une table
\d personnes
\d agents
\d signalements

-- Vérifier les niveaux de classification
SELECT * FROM classification_niveaux;

-- Vérifier les rôles existants
SELECT * FROM roles;

-- Vérifier les agents et leurs habilitations
SELECT a.matricule, r.nom AS role, cn.code AS habilitation
FROM agents a
JOIN roles r ON r.id = a.role_id
JOIN classification_niveaux cn ON cn.id = a.habilitation_niveau_id
LIMIT 10;

-- Vérifier la répartition des classifications dans personnes
SELECT cn.code, COUNT(*) AS nb_personnes
FROM personnes p
JOIN classification_niveaux cn ON cn.id = p.niveau_classification_id
GROUP BY cn.code, cn.niveau
ORDER BY cn.niveau;

-- Quitter psql
\q