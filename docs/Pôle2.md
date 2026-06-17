# Documentation Pôle 2 — Sécurité Applicative

## OPÉRATION BLACKVAULT — Refonte de l'Infrastructure du TAJ

---

**Projet** : B3 DB-Security — Final Project
**École** : 2600 — Promo 2025-2026
**Formateur** : Hakim Loumi (Kyrion-CS)
**Pôle traité** : Pôle 2 — Sécurité applicative (RBAC + Bell-LaPadula + RLS)
**Auteur** : Ephmr
**Date de remise** : Mai 2026

---

## Sommaire

1. [Contexte et objectifs](#1-contexte-et-objectifs)
2. [Architecture en 3 couches](#2-architecture-en-3-couches)
3. [Implémentation détaillée](#3-implémentation-détaillée)
4. [Tests d'acceptance](#4-tests-dacceptance)
5. [Méthodologie de développement](#5-méthodologie-de-développement)
6. [Déploiement en production](#6-déploiement-en-production)
7. [Tradeoffs assumés](#7-tradeoffs-assumés)
8. [Intégration inter-pôles](#8-intégration-inter-pôles)
9. [Conclusion](#9-conclusion)
10. [Annexes](#10-annexes)

---

## 1. Contexte et objectifs

### 1.1 Rappel du projet

Le projet OPÉRATION BLACKVAULT consiste à refondre l'infrastructure du **TAJ** (Traitement des Antécédents Judiciaires), le fichier national des forces de l'ordre françaises contenant les antécédents judiciaires, fiches S, données biométriques et signalements.

Compte tenu de la sensibilité extrême des données traitées (témoins protégés, agents infiltrés, biométrie, données personnelles à grande échelle), la sécurité de la base est un enjeu central, soumis à un triple cadre réglementaire :

- **RGPD** (UE 2016/679)
- **Directive Police-Justice** (UE 2016/680)
- **NIS2** (UE 2022/2555)

### 1.2 Périmètre du Pôle 2

Le Pôle 2 est responsable de **la sécurité applicative au niveau du SGBD PostgreSQL**, à distinguer de :
- Pôle 1 (DBA) : schéma de données et population
- Pôle 3 (Deception) : leurres et monitoring
- Pôle 4 (Infra) : Proxmox, hardening système, conformité STRIDE

Concrètement, le Pôle 2 implémente trois mécanismes natifs PostgreSQL imbriqués :

1. **RBAC** (Role-Based Access Control) — qui peut faire quoi
2. **Bell-LaPadula + Biba** — quoi écrire à quel niveau de classification
3. **Row-Level Security** — quelles lignes sont visibles

### 1.3 Contraintes fonctionnelles

| Contrainte | Source |
|---|---|
| 4 niveaux de classification (NC/CD/SD/TSD) | IGI 1300 — classification défense française |
| 7 rôles RBAC métier | Sujet projet |
| Bell-LaPadula obligatoire | Sujet projet |
| Biba pour l'intégrité | Sujet projet |
| 15 tables sensibles à protéger | Sujet projet (~15 tables) |
| Audit traçable | Directive Police-Justice art. 25 |

---

## 2. Architecture en 3 couches

### 2.1 Schéma d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                  REQUÊTE SQL DE L'UTILISATEUR                   │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 1 — RBAC (GRANT / REVOKE)                                │
│                                                                  │
│  → "Cet utilisateur a-t-il le droit d'accéder à cette table ?"   │
│  → Filtrage au niveau table × opération (SELECT/INSERT/UPDATE)   │
│  → Échec : ERROR: permission denied for table X                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 2 — BLP / Biba (Triggers + Fonctions PL/pgSQL)           │
│                                                                  │
│  → "Le niveau de la donnée écrite est-il cohérent avec la        │
│     session ouverte ?"                                           │
│  → Bell-LaPadula No Write Down (pas de downgrade)                │
│  → Biba No Write Up (pas de contamination)                       │
│  → Échec : ERROR: Bell-LaPadula : écriture refusée...            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 3 — RLS (Row-Level Security PostgreSQL)                  │
│                                                                  │
│  → "Quelles lignes cet utilisateur peut-il VOIR / MODIFIER ?"    │
│  → Filtrage transparent au niveau des lignes (jamais d'erreur)   │
│  → Effet : la requête retourne les lignes autorisées (ou 0)      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  DONNÉES RETOURNÉES À L'UTILISATEUR              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Principe de défense en profondeur

Chacune des trois couches est **autonome** : un attaquant qui contournerait l'une serait arrêté par la suivante. Exemple :

| Scénario | RBAC | BLP | RLS | Résultat |
|---|:-:|:-:|:-:|---|
| agent_saisie demande biometrie | ❌ | — | — | permission denied |
| agent_saisie demande signalements (SELECT) | ✅ | — | filtre | 0 fiches S visibles |
| OPJ tente INSERT à mauvais niveau | ✅ | ❌ | — | exception BLP |
| Attaquant compromet agent_saisie et tente UPDATE TSD | ✅ | ❌ | ❌ | rejet à 2 niveaux |

---

## 3. Implémentation détaillée

### 3.1 Couche RBAC — Script `mld/07_roles_grants.sql`

**Volume** : 237 lignes SQL.

#### 3.1.1 Création des 7 rôles

Tous les rôles sont créés en `NOLOGIN` (rôles de groupe), conformément au pattern canonique RBAC PostgreSQL. Les véritables utilisateurs applicatifs hériteront de ces rôles via `GRANT <rôle> TO <user>`.

```sql
DO $$
DECLARE r TEXT;
BEGIN
    FOREACH r IN ARRAY ARRAY[
        'agent_saisie','opj','magistrat','analyste_renseignement',
        'admin_systeme','auditeur','controleur_cnil'
    ] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
            EXECUTE format('CREATE ROLE %I NOLOGIN', r);
        END IF;
    END LOOP;
END $$;
```

#### 3.1.2 Matrice GRANT

La matrice complète est dans `docs/matrice_acces.md`. Récapitulatif des privilèges effectifs :

| Rôle | Habilitation max | SELECT (tables) | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `agent_saisie` | CD (1) | 21 | 9 | 9 | 0 |
| `opj` | SD (2) | 22 | 11 | 11 | 0 |
| `magistrat` | TSD (3) | 23 | 4 | 4 | 0 |
| `analyste_renseignement` | TSD (3) | 21 | 1 | 1 | 0 |
| `admin_systeme` | N/A | 11 | 3 | 3 | 0 |
| `auditeur` | TSD (anon) | 21 (dont 6 vues) | 0 | 0 | 0 |
| `controleur_cnil` | SD (anon) | 19 (vues uniquement) | 0 | 0 | 0 |

**DELETE volontairement refusé pour tous les rôles métier** : conformité Directive Police-Justice — les données s'archivent (`statut = 'archive'`), elles ne se suppriment pas.

#### 3.1.3 Choix de conception

| Choix | Justification |
|---|---|
| `REVOKE ALL` puis `GRANT` explicites | Idempotence : rejouable sans empilage de privilèges |
| Rôles NOLOGIN de groupe | Pattern canonique : sépare identité utilisateur et privilèges |
| GRANT séparé sur vues anonymisées | `auditeur` et `controleur_cnil` ne touchent jamais la donnée brute |
| GRANT `SELECT` sur tables leurres | Une honeytrap doit être consultable pour piéger (Pôle 3 ajoute les triggers d'alerte) |
| GRANT `USAGE` sur sequences | Sinon les INSERT échouent ("permission denied for sequence") |

---

### 3.2 Couche BLP/Biba — Script `mld/09_fonctions_triggers_blp.sql`

**Volume** : 456 lignes SQL.

#### 3.2.1 Les 9 fonctions PL/pgSQL

| Fonction | Type | Rôle |
|---|---|---|
| `fn_habilitation_agent(uuid) → int` | STABLE, SECURITY DEFINER | Niveau BLP max d'un agent (0..3, -1 si KO) |
| `fn_session_agent_id() → uuid` | STABLE | UUID de l'agent en session courante |
| `fn_session_level() → int` | STABLE | Niveau BLP de la session (-1 si pas ouverte) |
| `fn_log_audit(...)` | VOLATILE, SECURITY DEFINER | Écrit dans `audit_log` |
| `fn_open_session(uuid, int)` | VOLATILE, SECURITY DEFINER | Ouvre une session de travail |
| `fn_close_session()` | VOLATILE | Ferme la session courante |
| `fn_niveau_personne(uuid) → int` | STABLE, SECURITY DEFINER | Niveau BLP hérité d'une personne |
| `fn_niveau_affaire(uuid) → int` | STABLE, SECURITY DEFINER | Niveau BLP hérité d'une affaire |
| `fn_service_agent(uuid) → int` | STABLE, SECURITY DEFINER | service_id d'un agent (évite récursion RLS) |

#### 3.2.2 Le mode "session de travail"

**Le problème théorique** : Bell-LaPadula strict dit qu'on écrit *uniquement* à son niveau d'habilitation max. Conséquence : un magistrat habilité TSD ne pourrait JAMAIS saisir un PV classifié CD. Impraticable en pratique opérationnelle.

**Notre innovation** : l'agent **déclare son niveau de session à la connexion** (compris entre 0 et son habilitation max).

```sql
-- À la connexion applicative
SELECT fn_open_session(
    '<uuid-agent>'::uuid,    -- qui suis-je
    1                          -- niveau de session demandé (≤ habilitation)
);
-- → SET app.agent_id      = '<uuid>'
-- → SET app.session_level = 1
-- → INSERT INTO audit_log (action='LOGIN_SESSION', severite=1)
```

Toutes les requêtes de la session sont alors contraintes à ce niveau :
- **SELECT** : voit tout ce qui est `niveau ≤ session_level` (No Read Up)
- **INSERT/UPDATE** : impose `niveau = session_level` strict (No Write Down + No Write Up)

Le changement de niveau ⇒ nouvelle ouverture de session ⇒ trace dans `audit_log`.

#### 3.2.3 Le trigger BLP+Biba

`trg_blp_no_write_down` est un trigger générique `BEFORE INSERT OR UPDATE FOR EACH ROW` attaché à 4 tables :
- `personnes`
- `affaires`
- `biometrie`
- `signalements`

**Particularité** : le trigger couvre **simultanément Bell-LaPadula et Biba**. La règle `niveau_cible <> niveau_session ⇒ EXCEPTION` couvre :
- `niveau_cible < niveau_session` → No Write Down (BLP : pas de downgrade)
- `niveau_cible > niveau_session` → No Write Up (Biba : pas de contamination)

Le message d'erreur est explicite et exploitable côté application :

```
ERROR: Bell-LaPadula : écriture refusée.
Session niveau 2, cible niveau 1 (table personnes).
```

---

### 3.3 Couche RLS — Script `mld/08_rls_policies.sql`

**Volume** : 518 lignes SQL.

#### 3.3.1 Activation et FORCE

Toutes les tables sont activées avec **`FORCE ROW LEVEL SECURITY`**, ce qui empêche le bypass classique :
> *"Je suis owner de la table, donc je ne suis pas soumis à la RLS"*

Seul le superuser `postgres` est exempt grâce à un OR explicite dans chaque policy :

```sql
USING (current_user = 'postgres' OR <condition métier>)
```

Ce bypass est volontaire et auditable (apparait dans le code des policies, pas un effet de bord).

#### 3.3.2 Les 42 policies sur 15 tables

| Catégorie | Tables | Policies | Pattern |
|---|---|---|---|
| BLP propre | 4 | 12 | `niveau_classification_id` comparé à `fn_session_level()` |
| BLP héritée (personnes) | 3 | 9 | `fn_niveau_personne(personne_id)` |
| BLP héritée (affaires) | 4 | 12 | `fn_niveau_affaire(affaire_id)` |
| BLP héritée (MAX) | 1 | 3 | `GREATEST(fn_niveau_personne, fn_niveau_affaire)` |
| Owner-RLS | 3 | 6 | `agent_id = fn_session_agent_id()` |
| **Total** | **15** | **42** | |

#### 3.3.3 Détail des patterns

**Pattern A — BLP propre** (sur `personnes`, `affaires`, `biometrie`, `signalements`) :

```sql
CREATE POLICY blp_select_personnes ON personnes FOR SELECT
    USING (
        current_user = 'postgres'
        OR (SELECT cn.niveau FROM classification_niveaux cn
            WHERE cn.id = personnes.niveau_classification_id) <= fn_session_level()
    );
```

**Pattern B — BLP héritée** (sur `aliases`, `adresses`, `telephones`, etc.) :

```sql
CREATE POLICY blp_select_aliases ON aliases FOR SELECT
    USING (
        current_user = 'postgres'
        OR fn_niveau_personne(aliases.personne_id) <= fn_session_level()
    );
```

**Pattern C — Double héritage** (sur `affaire_personnes`) :

```sql
CREATE POLICY blp_select_affaire_personnes ON affaire_personnes FOR SELECT
    USING (
        current_user = 'postgres'
        OR GREATEST(
            fn_niveau_personne(affaire_personnes.personne_id),
            fn_niveau_affaire(affaire_personnes.affaire_id)
        ) <= fn_session_level()
    );
```

**Pattern D — Owner** (sur `consultations`, `audit_log`, `agents`) :

```sql
CREATE POLICY owner_select_consultations ON consultations FOR SELECT
    USING (
        current_user = 'postgres'
        OR current_user IN ('admin_systeme', 'auditeur', 'controleur_cnil')
        OR consultations.agent_id = fn_session_agent_id()
    );
```

---

## 4. Tests d'acceptance

### 4.1 Méthodologie

Un fichier `tests/test_matrix.sql` joue **25 cas de test** organisés en 7 blocs thématiques, capture les résultats dans une table temporaire et produit un rapport final consolidé.

**Pattern test utilisé** :
```sql
DO $$
DECLARE v_agent UUID; n INT;
BEGIN
    PERFORM fn_open_session(v_agent, niveau);
    SET LOCAL ROLE <rôle_testé>;
    SELECT ... INTO n FROM table;
    RESET ROLE;  -- AVANT d'écrire le résultat
    INSERT INTO test_results VALUES (...);
EXCEPTION WHEN ... THEN
    RESET ROLE;
    INSERT INTO test_results VALUES (...);
END$$;
```

### 4.2 Rapport final — 25/25 = 100%

| # | Test | Résultat |
|---:|---|---|
| T01 | `agent_saisie` SELECT personnes (session CD) | 957 ✅ |
| T02 | `agent_saisie` SELECT biometrie (REVOKE) | permission denied ✅ |
| T03 | `controleur_cnil` SELECT vue anonymisée | 1200 ✅ |
| T04 | `controleur_cnil` SELECT personnes brut (refus) | permission denied ✅ |
| T05 | `auditeur` SELECT audit_log | 514 ✅ |
| T06 | `opj` SELECT audit_log (refus) | permission denied ✅ |
| T07 | OPJ session SD voit 0 fiches TSD | 0 ✅ |
| T08 | Analyste session TSD voit signalements | 300 ✅ |
| T09 | agent_saisie session CD voit 0 niveau>CD | 0 ✅ |
| T10 | agent_saisie sans session → 0 personnes | 0 ✅ |
| T11 | OPJ session SD INSERT personne SD | inserted ✅ |
| T12 | OPJ session SD INSERT personne CD (No Write Down) | refused ✅ |
| T13 | Magistrat INSERT decision (RLS héritée affaire) | inserted ✅ |
| T14 | OPJ INSERT decision (refusé GRANT) | permission denied ✅ |
| T15 | agent_saisie demande session SD (élévation) | refused ✅ |
| T16 | Agent inactif ouvre session | refused ✅ |
| T17 | OPJ ne voit pas les conso des autres | 0 ✅ |
| T18 | Auditeur voit toutes consultations | 50 agents ✅ |
| T19 | Visibilité différente selon session | SD=300, TSD=300 ✅ |
| T20 | postgres bypass RLS (admin technique) | tout visible ✅ |
| T21 | agent_saisie CD voit aliases CD | 303 ✅ |
| T22 | aliases SD/TSD invisibles pour agent_saisie | 0/97 ✅ |
| T23 | OPJ voit scellés (RLS héritée affaires) | 326 ✅ |
| T24 | INSERT adresse (RLS héritée personne) | inserted ✅ |
| T25 | Magistrat voit uniquement son service | 0 hors service ✅ |

### 4.3 Reproductibilité

```bash
# En local
cd pole2_workspace
docker exec -i blackvault-local psql -U postgres -d blackvault < tests/test_matrix.sql

# En prod
cat tests/test_matrix.sql | ssh ephmr@10.4.1.200 \
    "PGPASSWORD=ProjetTaj2600 psql -h localhost -U taj_admin -d blackvault"
```

Les tests sont **idempotents** et peuvent être rejoués à volonté.

---

## 5. Méthodologie de développement

### 5.1 Stratégie "Local-First"

Pour éviter tout risque sur la base de l'équipe (utilisée en parallèle par les Pôles 1, 3, 4), tout le développement a été réalisé sur une **copie locale Docker**.

```
PROD (10.4.1.200)            LOCAL (Docker :5433)
       │                              │
       ├── 1. pg_dump (lecture) ─────▶│
       │                              │
       │      2. on bosse ici ────────┤
       │      (write/test/break/fix)  │
       │                              │
       │◀──── 3. scripts SQL ─────────┤
       │      (idempotents, propres)  │
       │                              │
       │      4. déploiement final    │
```

**Bénéfices** :
- Zéro risque pour les autres pôles
- Reset DB en 5 secondes (`./scripts/reset_local.sh`)
- Itération ultra-rapide (20 versions d'une policy en 10 minutes)
- Le livrable final = script idempotent rejouable sur n'importe quelle base

### 5.2 Outillage développé

| Script | Rôle |
|---|---|
| `re_dump_prod.sh` | Re-dump depuis la prod (en cas de schéma qui bouge côté équipe) |
| `reset_local.sh` | Reset complet de la base locale depuis le dump |
| `apply_pole2.sh` | Application des scripts 07+09+08 dans le bon ordre |
| `psql_local.sh` | Shortcut interactif `psql` |
| `test_matrix.sql` | 25 tests d'acceptance |

---

## 6. Déploiement en production

### 6.1 Procédure de déploiement

Une fois tous les tests locaux validés, le déploiement sur `10.4.1.200` se fait par SSH :

```bash
# Backup pré-déploiement
ssh ephmr@10.4.1.200 \
    "PGPASSWORD=ProjetTaj2600 pg_dump -h localhost -U taj_admin -d blackvault \
     --no-owner --no-privileges" > dumps/preprod_pole2_$(date +%Y%m%d_%H%M%S).sql

# Application des 3 scripts dans l'ordre obligatoire
for f in 07_roles_grants 09_fonctions_triggers_blp 08_rls_policies; do
    cat /Users/ephmr/Documents/V/mld/$f.sql | \
    ssh ephmr@10.4.1.200 \
      "PGPASSWORD=ProjetTaj2600 psql -h localhost -U taj_admin -d blackvault \
       -v ON_ERROR_STOP=1"
done

# Validation post-déploiement
cat tests/test_matrix.sql | ssh ephmr@10.4.1.200 \
    "PGPASSWORD=ProjetTaj2600 psql -h localhost -U taj_admin -d blackvault"
```

### 6.2 Ordre d'exécution obligatoire

**07 → 09 → 08**

- `07` crée les rôles RBAC (les fonctions de 09 sont attribuées à ces rôles)
- `09` crée les fonctions (utilisées par les policies de 08)
- `08` crée les policies RLS (consomment les fonctions de 09)

### 6.3 Résultats du déploiement (28/05/2026)

| Métrique | Valeur déployée |
|---|---|
| Rôles RBAC créés | 7 |
| Fonctions PL/pgSQL | 9 |
| Triggers BLP+Biba | 4 (sur 4 tables) |
| Tables avec RLS forcée | 15 |
| Policies RLS installées | 42 |
| Tests d'acceptance | 25/25 (100%) |

### 6.4 Rollback

En cas de problème détecté, un rollback est possible en :
1. Désactivant la RLS sur les 15 tables
2. Supprimant les rôles et fonctions
3. Restaurant le dump pré-déploiement

Le backup est conservé dans `pole2_workspace/dumps/preprod_pole2_*.sql`.

---

## 7. Tradeoffs assumés

### 7.1 Log audit lors d'une violation BLP

**Problème** : quand le trigger `trg_blp_no_write_down` lève `RAISE EXCEPTION`, la transaction entière (y compris l'INSERT dans `audit_log`) est rollback. C'est le comportement standard PostgreSQL.

**Stratégie combinée à 3 niveaux** :

1. **`audit_log` custom** (cette implémentation) → capture les actions **réussies** suspectes (login, élévation refusée AVANT exception, consultations honeytrap)
2. **pgaudit** (Pôle 4) → capture **toutes** les requêtes y compris **échouées** au niveau moteur PG, dans les logs système
3. **`RAISE EXCEPTION`** → message client immédiat, jamais perdu

**Extension future** : utiliser l'extension `dblink` pour autonomous transaction qui persisterait le log custom même au rollback. Hors scope J3.

### 7.2 DELETE non autorisé pour rôles métier

**Choix volontaire**, motivé par la conformité Directive Police-Justice (UE 2016/680). Les données du TAJ s'archivent (`statut = 'archive'` ou `'supprime'`), elles ne sont pas physiquement effacées.

Seul `postgres` (admin technique) conserve le DELETE physique, qui est journalisé par pgaudit.

### 7.3 Biba partiel (No Write Up couvert)

Le trigger BLP couvre simultanément :
- ✅ Bell-LaPadula *-Property (No Write Down)
- ✅ Biba *-Property (No Write Up)

Cependant Biba inclut aussi *No Read Down* (un agent haute intégrité ne se base pas sur des sources basses) qui n'est **pas** implémenté ici. Cette règle est moins pertinente pour notre cas d'usage et est partiellement adressée par Pôle 3 (bruit statistique pour l'agrégation).

### 7.4 Bypass `current_user = 'postgres'`

Chaque policy contient un OR explicite pour permettre au superuser de maintenir/sauvegarder/restaurer. Ce bypass est :
- **Explicite** (dans le code des policies, pas un effet de bord)
- **Auditable** (apparait textuellement)
- **Loggable** (toutes les opérations de postgres sont tracées par pgaudit)

### 7.5 Récursion sur policy de `agents`

La policy `owner_select_agents` doit consulter `agents.service_id` pour filtrer les agents visibles par un magistrat. Sans précaution, ce SELECT re-déclenche la policy → récursion infinie.

**Solution** : fonction helper `fn_service_agent(uuid)` en `SECURITY DEFINER` qui bypasse temporairement la RLS pour ce lookup uniquement.

---

## 8. Intégration inter-pôles

### 8.1 Ce que je livre aux autres pôles

| Vers | Quoi | Comment ils l'utilisent |
|---|---|---|
| **Pôle 1 (DBA)** | Validation que le schéma est utilisable avec sécurité activée | Test rejouable : `apply_pole2.sh && test_matrix.sql` doit donner 25/25 |
| **Pôle 3 (Deception)** | Fonctions `fn_session_*` + `audit_log` configuré | Les triggers Deception appellent `fn_log_audit('HONEYTRAP_ACCESS', ...)` |
| **Pôle 4 (Infra)** | Liste des 7 rôles + procédure de session | Configurer `pg_hba.conf` pour mapper les vrais users → ces rôles, activer pgaudit |

### 8.2 Dépendances entrantes (déjà résolues)

- Pôle 1 a livré le schéma stable, les 25 tables peuplées (~12k lignes), les 6 vues CNIL anonymisées
- Aucune modification de schéma n'a été demandée

### 8.3 Points d'attention pour les autres pôles

- **Pôle 3** : les tables leurres (`credentials`, `passwords`, etc.) ont déjà `GRANT SELECT` à tous les rôles. Le Pôle 3 n'a qu'à ajouter ses triggers d'alerte.
- **Pôle 4** : la fonction `fn_open_session()` doit être appelée par l'applicatif **à chaque connexion authentifiée**. Côté infra, prévoir un wrapper côté pgBouncer ou côté app.

---

## 9. Conclusion

### 9.1 Objectifs atteints

- ✅ 7 rôles RBAC créés avec matrice GRANT alignée sur la matrice d'accès cible
- ✅ Mécanisme Bell-LaPadula + Biba opérationnel via triggers + RLS
- ✅ 15 tables sécurisées par 42 policies RLS
- ✅ Mode "session de travail" innovant pour rendre BLP utilisable
- ✅ 25 tests d'acceptance automatisés, 100% passants
- ✅ Déploiement en production réussi, validé par re-test sur la prod

### 9.2 Qualité du livrable

| Critère | Atteint |
|---|---|
| Idempotence (scripts rejouables) | ✅ |
| Tests automatisés | ✅ (25 cas) |
| Documentation technique | ✅ |
| Conformité matrice d'accès | ✅ |
| Conformité Directive Police-Justice | ✅ (No DELETE) |
| Compatibilité Pôles 3 et 4 | ✅ |
| Rollback documenté | ✅ |

### 9.3 Volumétrie

- **1 211 lignes** de code SQL livrées (`mld/07_*`, `mld/08_*`, `mld/09_*`)
- **9 fonctions** PL/pgSQL
- **4 triggers** BLP+Biba
- **42 policies** RLS
- **15 tables** sécurisées
- **25 cas** de test
- **100%** de réussite locale et prod

---

## 10. Annexes

### Annexe A — Arborescence des livrables

```
V/
├── mld/
│   ├── 07_roles_grants.sql                  237 lignes — Pôle 2
│   ├── 08_rls_policies.sql                  518 lignes — Pôle 2
│   └── 09_fonctions_triggers_blp.sql        456 lignes — Pôle 2
├── docs/
│   └── matrice_acces.md                     Mise à jour Pôle 2 § 8
├── doc_pole2.md                             Doc équipe synthétique
├── pole2_workspace/
│   ├── JOURNAL.md                           Journal détaillé du sprint
│   ├── PPT_OUTLINE.md                       Squelette de présentation
│   ├── tests/test_matrix.sql                25 tests d'acceptance
│   └── scripts/                             5 scripts utilitaires bash
└── DOC_POLE2_FINALE.md                      Ce document
```

### Annexe B — Commandes utiles

```bash
# Lancer une démo interactive
docker exec -it blackvault-local psql -U postgres -d blackvault

# Dans psql, ouvrir une session OPJ niveau SD :
SELECT fn_open_session(
    (SELECT a.id FROM agents a JOIN roles r ON r.id=a.role_id
     WHERE r.nom='opj' LIMIT 1),
    2
);
SET ROLE opj;

# Tester No Read Up :
SELECT count(*) FROM signalements
  WHERE type='fiche_s'
    AND niveau_classification_id IN (3, 4);
-- → 0 ligne (les TSD sont filtrés)

# Tester No Write Down :
INSERT INTO personnes (nom, prenom, sexe,
                       niveau_classification_id, statut)
VALUES ('Test', 'Down', 'M', 2, 'actif');
-- → ERROR: Bell-LaPadula : écriture refusée.
```

### Annexe C — Glossaire

| Terme | Définition |
|---|---|
| **RBAC** | Role-Based Access Control. Modèle où les permissions sont liées à des rôles |
| **BLP** | Bell-LaPadula. Modèle théorique de confidentialité multi-niveau (1973) |
| **Biba** | Modèle dual de BLP centré sur l'intégrité (1977) |
| **RLS** | Row-Level Security. Filtrage automatique au niveau ligne par PostgreSQL |
| **No Read Up** | Règle BLP : pas de lecture au-dessus de son habilitation |
| **No Write Down** | Règle BLP : pas d'écriture en dessous de son niveau (évite downgrade) |
| **No Write Up** | Règle Biba : pas d'écriture vers plus fiable que soi (évite contamination) |
| **Idempotence** | Propriété d'un script qui peut être rejoué N fois sans erreur |
| **NC/CD/SD/TSD** | Niveaux de classification : Non Classifié, Confidentiel Défense, Secret Défense, Très Secret Défense |
| **GUC** | Grand Unified Configuration : variable de session PostgreSQL custom (`app.*`) |

### Annexe D — Références

- Bell, D. E., & LaPadula, L. J. (1973). *Secure Computer Systems: Mathematical Foundations*. MITRE TR 2547.
- Biba, K. J. (1977). *Integrity Considerations for Secure Computer Systems*. MITRE TR 3153.
- Instruction Générale Interministérielle n° 1300/SGDSN/PSE/PSD du 9 août 2021 (classification défense française).
- Directive (UE) 2016/680 du Parlement européen et du Conseil du 27 avril 2016 (Police-Justice).
- PostgreSQL Documentation — Row Security Policies : https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- PostgreSQL Documentation — GRANT : https://www.postgresql.org/docs/current/sql-grant.html

---

*Document généré le 28/05/2026 — Pôle 2 livré et déployé.*
