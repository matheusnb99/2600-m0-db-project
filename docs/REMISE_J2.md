# 📦 Remise Jalon J2 — Checklist et Guide

**Deadline** : Semaine 4 du projet
**Format review** : 10 min par groupe en cours
**⚠️ Point de non-retour** : si le MCD n'est pas validé, vous ne pouvez pas avancer

---

## ✅ Ce qu'il faut remettre au formateur

### 📄 Par email au formateur (Hakim Loumi)

**Objet du mail** :
```
[B3 DB-Security] Jalon J2 — Groupe [NOMS] — Cahier des charges + MLD TAJ
```

**Corps du mail** :
```
Bonjour M. Loumi,

Veuillez trouver ci-joint les livrables du Jalon J2 pour notre projet
"Opération BLACKVAULT — Refonte de l'Infrastructure du TAJ".

Groupe : [Nom1], [Nom2], [Nom3], [Nom4]
Sujet : TAJ (Traitement des Antécédents Judiciaires)
SGBD : PostgreSQL 16+
Infrastructure : Proxmox VE (3 VM)

Livrables joints :
1. Cahier des charges (PDF)
2. MCD — diagramme entité-association (PDF + draw.io source)
3. MLD — scripts SQL PostgreSQL (ZIP)
4. Matrice d'accès RBAC (PDF)
5. Documentation Bell-LaPadula / Biba (PDF)

Nous restons disponibles pour la review de 10 minutes en cours.

Cordialement,
Le groupe
```

### 📁 Fichiers à joindre

| # | Fichier | Source | À convertir en |
|---|---|---|---|
| 1 | **Cahier des charges** | `cahier_des_charges.md` | PDF |
| 2 | **MCD (diagramme)** | `mcd/mcd_taj.drawio` | PDF exporté depuis draw.io |
| 3 | **MCD (source éditable)** | `mcd/mcd_taj.drawio` | Envoyer tel quel |
| 4 | **MLD (scripts SQL)** | `mld/*.sql` | ZIP de tout le dossier mld/ |
| 5 | **Matrice d'accès** | `docs/matrice_acces.md` | PDF |
| 6 | **Bell-LaPadula** | `docs/classification_bell_lapadula.md` | PDF |

### 🛠️ Conversion Markdown → PDF

Plusieurs options :
- **VS Code** : extension "Markdown PDF"
- **En ligne** : https://md-to-pdf.fly.dev/
- **Pandoc** (si installé) : `pandoc fichier.md -o fichier.pdf`
- **Typora** : export direct en PDF

### 🎨 Export du draw.io en PDF

1. Ouvrir https://app.diagrams.net/
2. File → Open from → Device → sélectionner `mcd_taj.drawio`
3. File → Export as → PDF
4. Cocher "Fit to page", "Include a copy of the diagram"

---

## 📂 Structure finale du dossier à envoyer

```
BLACKVAULT_TAJ_J2_[NomsGroupe]/
├── 01_cahier_des_charges.pdf
├── 02_mcd_diagramme.pdf
├── 03_mcd_source.drawio
├── 04_mld_scripts/
│   ├── 01_types_et_extensions.sql
│   ├── 02_tables_principales.sql
│   ├── 03_tables_leurres.sql
│   └── 04_donnees_reference.sql
├── 05_matrice_acces.pdf
└── 06_classification_bell_lapadula.pdf
```

Compresser le tout en `BLACKVAULT_TAJ_J2_[Noms].zip` avant envoi.

---

## ⏱️ Structure de la review 10 min

### Plan de présentation (à répartir entre les 4 membres)

| Temps | Qui | Quoi | Support |
|---|---|---|---|
| **0:00 — 1:30** | Membre 1 | **Contexte et organisation** : DCTAJ, pourquoi ce sujet, justification de la classification | Slide intro + cahier des charges §1 |
| **1:30 — 4:00** | Membre 2 | **Présentation du MCD** : parcours des entités principales, relations N:N, isolement des données sensibles | Diagramme draw.io |
| **4:00 — 6:30** | Membre 3 | **MLD et choix techniques** : PostgreSQL 16, 25 tables, ENUM, UUID, index, pgcrypto pour la biométrie | Scripts SQL |
| **6:30 — 8:30** | Membre 4 | **Sécurité : Bell-LaPadula + RBAC + Deception** : 4 niveaux, 7 rôles, 5 tables leurres, comment ça fonctionne ensemble | Matrice + doc BLP |
| **8:30 — 10:00** | Tous | **Q/R avec le formateur** | Préparé avec le FAQ (voir `FAQ_DEFENSE_J2.md`) |

### ⚡ Conseils pour la review

- **Tout le monde parle** — la répartition doit être équilibrée
- **Pas de lecture** du document, vous connaissez votre projet
- **Avoir les fichiers ouverts** : draw.io affiché en plein écran + VS Code avec les .sql
- **Anticiper les questions** — lire `FAQ_DEFENSE_J2.md` avant la review
- **Noter ce que dit le formateur** — il peut demander des ajustements avant validation

---

## 🎯 Points forts à mettre en avant

### 1. Réalisme du sujet
> "Le TAJ est un système réel, nous avons étudié son fonctionnement et la réglementation applicable (Directive Police-Justice UE 2016/680). Nos choix de classification s'appuient sur l'Instruction Générale Interministérielle 1300."

### 2. Justification de la classification (4 niveaux)
> "Les 4 niveaux NC / CD / SD / TSD correspondent exactement à la classification défense française. Nous avons justifié chaque niveau avec des exemples concrets tirés du TAJ : témoins protégés en TSD, fiches S en SD, antécédents en CD."

### 3. Architecture Proxmox multi-VM
> "Nous avons fait le choix d'une vraie infrastructure avec 3 VM isolées sur Proxmox : cela permet une démo LIVE réaliste en soutenance, avec segmentation réseau TLS et monitoring temps réel."

### 4. Deception dès le MLD
> "Les 5 tables leurres sont déjà intégrées au schéma avec des données crédibles et des noms attractifs pour un attaquant (CREDENTIALS, PASSWORDS, KEYS_MASTER, AGENTS_SECRETS, BACKUP_EXPORT)."

### 5. Conformité triple
> "Nous couvrons RGPD + Directive Police-Justice + NIS2, avec rôle dédié 'Contrôleur CNIL' ayant accès uniquement à des vues anonymisées."

### 6. Ambition : 7/7 techniques de Deception
> "Objectif 20+/20 : nous implémenterons les 7 techniques (les 4 obligatoires + Bruit statistique + Watermarking + Polyinstanciation) pour le bonus +1."

---

## ⚠️ Points de vigilance — ce que le formateur va checker

- [ ] **20+ tables** ? → Oui, **25 tables** (20 métier + 5 leurres)
- [ ] **MCD cohérent** ? → Oui, 18 entités + tables d'association + relations explicites
- [ ] **Classification Bell-LaPadula présente** ? → Oui, 4 niveaux documentés
- [ ] **Matrice d'accès complète** ? → Oui, 7 rôles × 25 tables
- [ ] **Justification du niveau de classification élevé** ? → Oui, témoins protégés / fiches S
- [ ] **SGBD cohérent avec le sujet** ? → Oui, PostgreSQL (RLS natif, pgcrypto, pgaudit)
- [ ] **Conformité réglementaire adressée** ? → Oui, RGPD + Police-Justice + NIS2

---

## 📅 Après la review

1. **Noter tous les commentaires** du formateur
2. **Lister les ajustements** demandés (si MCD invalidé, priorité absolue)
3. **Renvoyer la version corrigée** sous 48h
4. **Passer au J3** : scripts DDL fonctionnels + 2+ techniques de Deception (semaine 8)

---

## 📞 Contact formateur

- **Nom** : Hakim Loumi
- **Rôle** : Formateur — Kyrion-CS / École 2600
- **Disponibilité** : par email pour questions techniques entre les jalons
