# Cahier des Charges — Projet OPÉRATION BLACKVAULT
## Refonte de l'Infrastructure du TAJ (Traitement des Antécédents Judiciaires)

**Projet** : Sécurité des Bases de Données — B3 École 2600 (2025-2026)  
**Formateur** : Hakim Loumi — Kyrion-CS  
**Groupe** : 4 membres  
**SGBD** : PostgreSQL 16+  
**Date** : Avril 2026

---

## 1. Présentation de l'organisation fictive

### 1.1 Identité

| Champ | Valeur |
|---|---|
| **Nom** | Direction Centrale du Traitement des Antécédents Judiciaires (DCTAJ) |
| **Rattachement** | Ministère de l'Intérieur — Direction Générale de la Police Nationale |
| **Siège** | Écully (Rhône) — Site sécurisé niveau Très Secret Défense |
| **Effectif** | ~200 agents techniques + ~160 000 utilisateurs habilités (police, gendarmerie, magistrature) |
| **Création** | 2012 (fusion STIC + JUDEX dans le cadre de la LOPPSI 2) |

### 1.2 Mission

La DCTAJ a pour mission de **centraliser, sécuriser et mettre à disposition** les antécédents judiciaires de l'ensemble des personnes mises en cause, victimes et témoins dans les procédures judiciaires françaises. Le TAJ est consulté quotidiennement par les forces de l'ordre et la magistrature pour :

- Identifier des suspects lors d'enquêtes
- Vérifier les antécédents judiciaires d'un individu
- Gérer les signalements (fiches S, mandats d'arrêt, OQTF)
- Exploiter les données biométriques (empreintes, photos, ADN)
- Assurer la traçabilité des consultations conformément à la loi

### 1.3 Justification du niveau de classification

Le TAJ contient des données **extrêmement sensibles** justifiant un niveau de classification élevé :

| Type de données | Niveau de sensibilité | Risque en cas de compromission |
|---|---|---|
| Identités des témoins protégés | **Très Secret Défense** | Mise en danger de vies humaines |
| Fiches S (sûreté de l'État) | **Secret Défense** | Compromission d'enquêtes antiterroristes |
| Données biométriques (ADN, empreintes) | **Secret Défense** | Usurpation d'identité, atteinte irréversible à la vie privée |
| Antécédents judiciaires | **Confidentiel Défense** | Atteinte à la présomption d'innocence, chantage |
| Affaires en cours | **Confidentiel Défense** | Obstruction à la justice |

---

## 2. Périmètre fonctionnel

### 2.1 Fonctionnalités principales

Le système TAJ couvre les domaines fonctionnels suivants :

#### F1 — Gestion des personnes
- Enregistrement des personnes connues du TAJ (mis en cause, victimes, témoins, témoins protégés)
- Gestion des alias et noms d'emprunt
- Gestion des adresses et numéros de téléphone
- Historique des modifications

#### F2 — Gestion des affaires judiciaires
- Création et suivi des dossiers judiciaires
- Association des personnes aux affaires (avec rôle : mis en cause, victime, témoin)
- Lien avec les infractions du code pénal (nomenclature NATINF)
- Gestion des scellés et pièces à conviction
- Véhicules impliqués

#### F3 — Signalements
- Fiches S (sûreté de l'État)
- Fiches de recherche
- Mandats d'arrêt
- Obligations de quitter le territoire français (OQTF)
- Gestion des dates d'émission et d'expiration

#### F4 — Biométrie
- Empreintes digitales (chiffrées)
- Photographies d'identité judiciaire (chiffrées)
- Profils ADN (chiffrés)
- Stockage sécurisé avec chiffrement at-rest (pgcrypto)

#### F5 — Décisions de justice
- Jugements, condamnations, relaxes
- Classements sans suite, non-lieux
- Peines et sursis

#### F6 — Traçabilité et audit
- Journalisation de toutes les consultations (qui, quoi, quand, depuis quelle IP)
- Audit centralisé des opérations sensibles
- Alertes en temps réel sur les accès suspects

#### F7 — Habilitations et contrôle d'accès
- Gestion des niveaux d'habilitation par agent
- Contrôle d'accès basé sur les rôles (RBAC)
- Classification des données selon Bell-LaPadula et Biba

### 2.2 Hors périmètre

Les éléments suivants sont **exclus** du périmètre de ce projet :
- Interface utilisateur web/desktop (seul l'accès via pgAdmin/psql est prévu)
- Interconnexion avec les systèmes européens (SIS II, Europol)
- Module de reconnaissance faciale automatique
- Archivage légal et purge automatique (mentionné mais non implémenté)

---

## 3. Exigences de sécurité

### 3.1 Modèle de classification — Bell-LaPadula (confidentialité)

Le modèle Bell-LaPadula assure la **confidentialité** des données selon 4 niveaux :

| Niveau | Code | Valeur | Description |
|---|---|---|---|
| Non Classifié | `NC` | 0 | Données publiques ou internes sans sensibilité |
| Confidentiel Défense | `CD` | 1 | Antécédents, affaires courantes |
| Secret Défense | `SD` | 2 | Biométrie, fiches S, enquêtes sensibles |
| Très Secret Défense | `TSD` | 3 | Témoins protégés, données opérationnelles classifiées |

**Règles :**
- **No Read Up** : un agent ne peut pas lire des données d'un niveau supérieur à son habilitation
- **No Write Down** : un agent ne peut pas écrire des données dans un niveau inférieur à son habilitation (prévention de la fuite d'information)

### 3.2 Modèle d'intégrité — Biba

Le modèle Biba assure l'**intégrité** des données :
- **No Read Down** : un agent de haut niveau ne lit pas des données de basse intégrité (prévention de la contamination)
- **No Write Up** : un agent de bas niveau ne peut pas modifier des données de haute intégrité

### 3.3 Contrôle d'accès — RBAC

7 rôles définis avec le principe du **moindre privilège** :

| Rôle | Description | Niveau max |
|---|---|---|
| Agent de saisie | Saisie des PV et données de base | Confidentiel Défense |
| OPJ (Officier de Police Judiciaire) | Enquêteur principal, accès étendu | Secret Défense |
| Magistrat | Supervision judiciaire | Très Secret Défense |
| Analyste renseignement | Analyse des signalements et fiches S | Très Secret Défense |
| Administrateur système | Maintenance technique, pas d'accès aux données métier | N/A |
| Auditeur | Contrôle des accès et conformité | Très Secret Défense |
| Contrôleur CNIL | Vérification du respect de la réglementation | Secret Défense |

### 3.4 Chiffrement

| Couche | Technologie | Objectif |
|---|---|---|
| **Réseau (in-transit)** | TLS 1.3 | Protection des échanges entre le poste agent et PostgreSQL |
| **Stockage (at-rest)** | pgcrypto (AES-256) | Chiffrement des colonnes sensibles (biométrie, adresses témoins protégés) |
| **Mots de passe** | bcrypt (pgcrypto) | Hachage irréversible des mots de passe agents |

### 3.5 Audit

- **pgaudit** activé sur toutes les tables contenant des données personnelles
- Table `audit_log` centralisée avec : timestamp, agent, action, table cible, détails (JSONB), IP source
- Table `consultations` dédiée au suivi des lectures
- Alertes automatiques via triggers sur les accès suspects

### 3.6 Techniques de Deception (7 techniques)

| # | Technique | Description | Obligatoire |
|---|---|---|---|
| 1 | **Honeytokens** | Faux enregistrements dans les tables réelles, déclenchent une alerte à la consultation | OUI |
| 2 | **Tables leurres** | Tables aux noms attractifs (CREDENTIALS, PASSWORDS) piégeant les attaquants | OUI |
| 3 | **RLS (Row-Level Security)** | Filtrage automatique des lignes selon le niveau d'habilitation de l'agent | OUI |
| 4 | **Synonymes / Vues Deception** | Vues redirigeant vers des données leurres selon le profil | OUI |
| 5 | **Bruit statistique** | Faux enregistrements mêlés aux vrais avec marqueur invisible | NON (bonus) |
| 6 | **Watermarking** | Export personnalisé par utilisateur avec micro-variations traçables | NON (bonus) |
| 7 | **Polyinstanciation** | Même requête → résultats différents selon le rôle (vraies vs fausses valeurs) | NON (bonus) |

---

## 4. Exigences réglementaires

### 4.1 RGPD (Règlement Général sur la Protection des Données)

Le TAJ traite des données personnelles à grande échelle. Mesures de conformité :
- **Minimisation** : seules les données strictement nécessaires sont collectées
- **Limitation de conservation** : dates d'expiration sur les signalements
- **Droit d'accès** : le contrôleur CNIL peut vérifier les données via des vues anonymisées
- **Sécurité** : chiffrement, audit, contrôle d'accès (articles 25 et 32 du RGPD)
- **Analyse d'impact (AIPD)** : mentionnée dans le rapport de sécurité

> **Note** : Le TAJ bénéficie de dérogations au droit à l'effacement pour les besoins de la justice (article 23 RGPD).

### 4.2 Directive Police-Justice (UE 2016/680)

Cadre spécifique au traitement de données par les autorités judiciaires :
- **Distinction des catégories** : mis en cause ≠ victimes ≠ témoins (article 6)
- **Journalisation obligatoire** : toutes les consultations sont tracées (article 25)
- **Contrôle par une autorité indépendante** : rôle du contrôleur CNIL (article 41)
- **Sécurité appropriée** : mesures techniques et organisationnelles adaptées au risque (article 29)

### 4.3 NIS2 (Directive Network and Information Security 2)

En tant qu'infrastructure critique du Ministère de l'Intérieur :
- **Gestion des risques** : analyse STRIDE dans le rapport de sécurité
- **Notification d'incidents** : alertes en temps réel sur le dashboard monitoring
- **Mesures techniques** : chiffrement, segmentation réseau, audit, contrôle d'accès
- **Gouvernance** : rôles clairement définis, matrice de responsabilités

---

## 5. Architecture technique

### 5.1 Infrastructure Proxmox

Le système est déployé sur un serveur **Proxmox VE** avec 3 machines virtuelles isolées :

```
┌─────────────────────────────────────────────────────┐
│                   PROXMOX VE                         │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   VM1        │  │   VM2        │  │   VM3      │ │
│  │  PostgreSQL  │  │  Monitoring  │  │  Poste     │ │
│  │  16+         │  │  & Audit     │  │  Agent     │ │
│  │              │  │              │  │            │ │
│  │ - pgcrypto   │  │ - Grafana    │  │ - pgAdmin  │ │
│  │ - pgaudit    │  │ - Prometheus │  │ - psql     │ │
│  │ - RLS        │  │ - Loki/      │  │ - Scripts  │ │
│  │ - Triggers   │  │   rsyslog    │  │   d'attaque│ │
│  │              │  │ - Alertes    │  │            │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
│         │     TLS 1.3     │                 │        │
│         └────────┬────────┘                 │        │
│                  │         TLS 1.3          │        │
│                  └──────────────────────────┘        │
│                                                      │
│         VLAN isolé — pas d'accès Internet            │
└─────────────────────────────────────────────────────┘
```

### 5.2 VM1 — Serveur PostgreSQL

| Composant | Détail |
|---|---|
| **OS** | Debian 12 / Ubuntu Server 24.04 |
| **SGBD** | PostgreSQL 16+ |
| **Extensions** | pgcrypto, pgaudit, pg_trgm |
| **Chiffrement réseau** | TLS 1.3 (ssl = on) |
| **Chiffrement at-rest** | pgcrypto AES-256 sur colonnes sensibles |
| **Firewall** | iptables/nftables — port 5432 uniquement depuis le VLAN |

### 5.3 VM2 — Monitoring & Audit

| Composant | Détail |
|---|---|
| **Métriques** | Prometheus + postgres_exporter |
| **Dashboard** | Grafana (alertes visuelles temps réel) |
| **Logs** | Loki ou rsyslog centralisé |
| **Alertes** | Webhook / notifications sur accès honeytokens et tables leurres |

### 5.4 VM3 — Poste Agent (simulation)

| Composant | Détail |
|---|---|
| **Interface** | pgAdmin 4 + psql en ligne de commande |
| **Simulation** | Connexion avec différents rôles pour la démo |
| **Attaque** | Scripts SQL simulant un agent corrompu |

### 5.5 Réseau

- **VLAN dédié** entre les 3 VM
- **TLS 1.3 obligatoire** pour toute connexion à PostgreSQL
- **Pas d'accès direct** de la VM3 vers la VM2 (monitoring)
- **Logs réseau** centralisés sur la VM2

---

## 6. Contraintes techniques

| Contrainte | Valeur |
|---|---|
| Nombre minimum de tables | 20+ (25 prévues) |
| Jeu de données minimum | 1000 lignes dans les tables principales |
| Fonctions minimum | 3 (hachage, vérification habilitation, calcul niveau accès) |
| Triggers minimum | 3 (audit automatique, contrôle classification, blocage opérations) |
| Techniques de Deception | 7 / 7 |

---

## 7. Livrables attendus

| Livrable | Contenu | Échéance |
|---|---|---|
| **A — Modélisation** | MCD/MLD/MPD, Bell-LaPadula/Biba, matrice d'accès, DFD, ce cahier des charges | J2 (Semaine 4) |
| **B — Implémentation** | Scripts DDL, données, fonctions, triggers, RBAC, chiffrement, audit, Deception | J3-J4 |
| **C — Rapport sécurité** | Analyse STRIDE, chemins d'attaque, limites, conformité | J4 (Semaine 11) |
| **D — Soutenance** | Présentation 25 min + démo LIVE + Q/R 5 min | Semaine 12 |

---

## 8. Glossaire

| Terme | Définition |
|---|---|
| **TAJ** | Traitement des Antécédents Judiciaires — fichier national de police |
| **OPJ** | Officier de Police Judiciaire |
| **NATINF** | Nature de l'Infraction — nomenclature du Ministère de la Justice |
| **Fiche S** | Fiche de Sûreté de l'État — signalement pour atteinte à la sécurité nationale |
| **OQTF** | Obligation de Quitter le Territoire Français |
| **RLS** | Row-Level Security — filtrage automatique des lignes par PostgreSQL |
| **RBAC** | Role-Based Access Control — contrôle d'accès basé sur les rôles |
| **Bell-LaPadula** | Modèle de sécurité pour la confidentialité (no read up, no write down) |
| **Biba** | Modèle de sécurité pour l'intégrité (no read down, no write up) |
| **STRIDE** | Modèle de menaces : Spoofing, Tampering, Repudiation, Information disclosure, DoS, Elevation of privilege |
| **pgcrypto** | Extension PostgreSQL pour le chiffrement |
| **pgaudit** | Extension PostgreSQL pour l'audit |
| **TDE** | Transparent Data Encryption |
| **Honeytoken** | Donnée piège déclenchant une alerte à la consultation |
| **Polyinstanciation** | Même requête retournant des résultats différents selon l'utilisateur |
