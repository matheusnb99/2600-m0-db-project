# Modèle de Classification — Bell-LaPadula & Biba

**Projet** : Refonte de l'infrastructure du TAJ (Opération BLACKVAULT)
**Objectif** : assurer à la fois la **confidentialité** (Bell-LaPadula) et l'**intégrité** (Biba) des données du TAJ.

---

## 1. Rappel théorique

### 1.1 Bell-LaPadula (BLP) — 1973
Modèle de sécurité **multi-niveau** centré sur la **confidentialité**.
Développé par David Bell et Leonard LaPadula pour l'US Air Force.

**Objectif** : empêcher qu'une information classifiée "remonte" vers un niveau inférieur (fuite).

**Règles fondamentales** :
| Règle | Nom | Description |
|---|---|---|
| **SS-Property** | Simple Security | **No Read Up** : un sujet ne peut pas lire un objet de niveau > au sien |
| **\*-Property** | Star Property | **No Write Down** : un sujet ne peut pas écrire dans un objet de niveau < au sien |
| **DS-Property** | Discretionary Security | Matrice d'accès discrétionnaire (RBAC) |

### 1.2 Biba — 1977
Modèle **dual** de Bell-LaPadula, centré sur l'**intégrité**.
Développé par Kenneth Biba.

**Objectif** : empêcher qu'une information de basse intégrité "contamine" une information de haute intégrité.

**Règles fondamentales** :
| Règle | Description |
|---|---|
| **Simple Integrity** | **No Read Down** : un sujet ne peut pas lire un objet d'intégrité < à la sienne |
| **Integrity \*-Property** | **No Write Up** : un sujet ne peut pas écrire dans un objet d'intégrité > à la sienne |

---

## 2. Niveaux de classification appliqués au TAJ

4 niveaux alignés sur la classification défense française :

| Niveau | Code | Libellé | Exemples de données TAJ |
|---|---|---|---|
| 0 | `NC` | Non Classifié | Référentiels publics (infractions NATINF, codes postaux) |
| 1 | `CD` | Confidentiel Défense | Antécédents judiciaires standards, affaires courantes, adresses |
| 2 | `SD` | Secret Défense | Fiches S, biométrie, enquêtes sensibles, données financières |
| 3 | `TSD` | Très Secret Défense | Témoins protégés, agents infiltrés, opérations antiterroristes en cours |

### 2.1 Justification des niveaux

#### Niveau 0 — Non Classifié (NC)
Données dont la divulgation ne porte aucun préjudice.
**Exemples** :
- Nomenclature NATINF (publique par nature)
- Liste des services de police (annuaire public)
- Niveaux de classification eux-mêmes

#### Niveau 1 — Confidentiel Défense (CD)
Données dont la divulgation porte atteinte à la vie privée ou à la présomption d'innocence.
**Exemples** :
- Identités des personnes mises en cause pour des délits
- Adresses et téléphones
- Affaires judiciaires en cours (non sensibles)
- Procès-verbaux standards

#### Niveau 2 — Secret Défense (SD)
Données dont la divulgation porte atteinte à la sécurité publique ou à la sûreté de l'État.
**Exemples** :
- Fiches S (Sûreté de l'État)
- Données biométriques (empreintes, photos, ADN)
- Enquêtes sur crime organisé, stupéfiants à grande échelle
- Mandats d'arrêt internationaux

#### Niveau 3 — Très Secret Défense (TSD)
Données dont la divulgation constitue un danger vital pour des personnes ou l'État.
**Exemples** :
- Identités réelles des témoins protégés
- Agents infiltrés (identités, couvertures, missions)
- Opérations antiterroristes en cours
- Signalements liés au contre-espionnage

---

## 3. Application de Bell-LaPadula au TAJ

### 3.1 Scénario "No Read Up"
Un **agent de saisie** (habilité CD=1) tente de consulter une fiche S classifiée SD=2.

```
SELECT * FROM signalements WHERE type = 'fiche_s';
```

→ Le RLS filtre automatiquement : **aucune ligne retournée** (ou ligne leurre selon la Deception).
→ Une consultation anormale est loggée dans `audit_log`.

### 3.2 Scénario "No Write Down"
Un **analyste renseignement** (habilité TSD=3) tente d'enregistrer un signalement en classification CD=1.

```
INSERT INTO signalements (..., niveau_classification_id) VALUES (..., 1);
```

→ La politique RLS INSERT **rejette l'opération** : risque de downgrade d'information sensible.
→ L'analyste doit créer le signalement au moins en SD=2.

### 3.3 Cas des utilisateurs multi-niveau
Un magistrat (habilité TSD=3) peut **lire** tous les niveaux ≤ TSD mais ne peut **écrire** qu'au niveau TSD (contrainte forte).

Pour résoudre les frictions opérationnelles, on introduit la notion de **"session de travail"** :
- L'agent choisit à la connexion son "niveau de session" (≤ habilitation)
- Il peut alors écrire à ce niveau
- Le changement de niveau en session est tracé

---

## 4. Application de Biba au TAJ

### 4.1 Intégrité = fiabilité de la source
Dans le TAJ, l'intégrité correspond à la **fiabilité de l'information saisie** :
- Une fiche S validée par un analyste renseignement = **haute intégrité**
- Une note personnelle d'un agent de saisie = **basse intégrité**

### 4.2 Scénario "No Write Up"
Un **agent de saisie** (intégrité CD) tente de modifier une fiche S (intégrité SD).

```
UPDATE signalements SET motif = '...' WHERE type = 'fiche_s';
```

→ Rejet : un agent de basse intégrité ne peut pas altérer une information de haute intégrité.
→ Seul un analyste renseignement peut modifier les fiches S.

### 4.3 Scénario "No Read Down"
Un **analyste renseignement** ne doit pas se baser sur des données de basse intégrité pour ses analyses.
Dans la pratique : les données de niveau NC ne sont pas intégrées dans les analyses sensibles.

---

## 5. Mapping Rôles × Niveaux

### 5.1 Lecture (BLP No Read Up)

| Rôle | Niveau habilitation | Peut lire NC | Peut lire CD | Peut lire SD | Peut lire TSD |
|---|---|:---:|:---:|:---:|:---:|
| Agent de saisie | CD (1) | ✅ | ✅ | ❌ | ❌ |
| OPJ | SD (2) | ✅ | ✅ | ✅ | ❌ |
| Magistrat | TSD (3) | ✅ | ✅ | ✅ | ✅ |
| Analyste renseignement | TSD (3) | ✅ | ✅ | ✅ | ✅ |
| Admin système | N/A | ❌ | ❌ | ❌ | ❌ |
| Auditeur | TSD (3)* | ✅* | ✅* | ✅* | ✅* |
| Contrôleur CNIL | SD (2)* | ✅* | ✅* | ✅* | ❌ |

> *Lecture anonymisée uniquement via vues masquées.

### 5.2 Écriture (BLP No Write Down — *-Property stricte)

| Rôle | Peut écrire NC | Peut écrire CD | Peut écrire SD | Peut écrire TSD |
|---|:---:|:---:|:---:|:---:|
| Agent de saisie | ❌ | ✅ | ❌ | ❌ |
| OPJ | ❌ | ✅† | ✅ | ❌ |
| Magistrat | ❌ | ❌ | ❌ | ✅ |
| Analyste renseignement | ❌ | ❌ | ✅† | ✅ |
| Admin système | N/A | ❌ | ❌ | ❌ |

> † : écriture à un niveau inférieur à l'habilitation maximale, autorisée uniquement via le mode "session de travail" déclaré à la connexion.

---

## 6. Implémentation PostgreSQL

### 6.1 Stockage du niveau de session
```sql
-- À la connexion de l'agent, on stocke son ID et son niveau de session
SELECT set_config('app.agent_id', '<uuid_agent>', FALSE);
SELECT set_config('app.session_level', '2', FALSE);  -- Session en SD
```

### 6.2 Fonction de vérification d'habilitation
```sql
CREATE OR REPLACE FUNCTION fn_habilitation_agent(agent_uuid UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    niveau INT;
BEGIN
    SELECT cn.niveau INTO niveau
    FROM agents a
    JOIN classification_niveaux cn ON cn.id = a.habilitation_niveau_id
    WHERE a.id = agent_uuid AND a.actif = TRUE AND a.verrouille = FALSE;

    RETURN COALESCE(niveau, -1);
END;
$$;
```

### 6.3 Politique RLS — Lecture (No Read Up)
```sql
-- Sur la table personnes
CREATE POLICY blp_no_read_up_personnes ON personnes
    FOR SELECT
    USING (
        (SELECT cn.niveau FROM classification_niveaux cn
         WHERE cn.id = personnes.niveau_classification_id)
        <= fn_habilitation_agent(current_setting('app.agent_id')::uuid)
    );
```

### 6.4 Politique RLS — Écriture (No Write Down + Biba No Write Up)
```sql
-- L'agent ne peut écrire qu'à son niveau de session exact
CREATE POLICY blp_biba_write_personnes ON personnes
    FOR INSERT
    WITH CHECK (
        (SELECT cn.niveau FROM classification_niveaux cn
         WHERE cn.id = personnes.niveau_classification_id)
        = current_setting('app.session_level')::INT
    );

-- UPDATE : on ne peut modifier que des lignes de son niveau
CREATE POLICY blp_biba_update_personnes ON personnes
    FOR UPDATE
    USING (
        (SELECT cn.niveau FROM classification_niveaux cn
         WHERE cn.id = personnes.niveau_classification_id)
        = current_setting('app.session_level')::INT
    );
```

### 6.5 Trigger de vérification — défense en profondeur
```sql
CREATE OR REPLACE FUNCTION trg_controle_classification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    niveau_hab INT;
    niveau_cible INT;
BEGIN
    niveau_hab := fn_habilitation_agent(current_setting('app.agent_id')::uuid);

    SELECT cn.niveau INTO niveau_cible
    FROM classification_niveaux cn
    WHERE cn.id = NEW.niveau_classification_id;

    -- Bell-LaPadula : pas d'écriture en dessous de son habilitation (No Write Down)
    IF niveau_cible < niveau_hab THEN
        INSERT INTO audit_log (agent_id, action, table_cible, details, alerte, type_alerte, severite)
        VALUES (
            current_setting('app.agent_id')::uuid,
            TG_OP,
            TG_TABLE_NAME,
            jsonb_build_object(
                'tentative', 'no_write_down_violation',
                'niveau_habilitation', niveau_hab,
                'niveau_cible', niveau_cible
            ),
            TRUE,
            'violation_bell_lapadula',
            4
        );
        RAISE EXCEPTION 'Violation Bell-LaPadula : écriture interdite à un niveau inférieur (No Write Down)';
    END IF;

    RETURN NEW;
END;
$$;
```

---

## 7. Limites du modèle

### 7.1 Covert channels (canaux cachés)
Bell-LaPadula ne protège pas contre les **canaux cachés** :
- Temps de réponse d'une requête
- Existence de clés primaires (collision sur UUID)
- Métadonnées des requêtes

**Mitigation** : audit comportemental + détection d'anomalies.

### 7.2 Agrégation
Des données de niveau CD peuvent, agrégées, révéler une information de niveau SD.
Exemple : 10 adresses + 10 véhicules + 10 téléphones = un profil complet d'agent infiltré.

**Mitigation** : limiter le nombre de requêtes par session, détecter les patterns d'exfiltration.

### 7.3 Insider threats
Un agent habilité TSD peut exfiltrer légitimement des données TSD.

**Mitigation** : **watermarking** (traçabilité des exports), audit, honeytokens.

---

## 8. Références

- Bell, D. E., & LaPadula, L. J. (1973). *Secure Computer Systems: Mathematical Foundations*. MITRE Technical Report 2547.
- Biba, K. J. (1977). *Integrity Considerations for Secure Computer Systems*. MITRE Technical Report 3153.
- Instruction Générale Interministérielle n° 1300/SGDSN/PSE/PSD du 9 août 2021 sur la protection du secret de la défense nationale.
- PostgreSQL Documentation — Row Security Policies : https://www.postgresql.org/docs/current/ddl-rowsecurity.html
