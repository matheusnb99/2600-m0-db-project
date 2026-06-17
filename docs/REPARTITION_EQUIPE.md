# 👥 Répartition des Tâches — Projet BLACKVAULT (4 membres)

> **Contrat d'équipe.** Chaque membre sait exactement ce qu'il doit livrer, quand, sur quels fichiers, et avec quelles dépendances vis-à-vis des autres pôles.

---

## § 1 — Principe de découpage

La répartition est faite **par pôle technique cohérent**, pas par table ni par "chacun un bout de tout". Raison : chaque membre maîtrise un **domaine entier** du projet et peut le défendre à l'oral J4 sans dépendre des autres. Les interfaces entre pôles sont explicites (qui livre quoi à qui, quand).

> **À éviter absolument** : découpe par table (ex: "toi tu fais les personnes, moi les affaires"). C'est l'anti-pattern classique — personne ne maîtrise l'ensemble, chacun fait sa sécurité à sa sauce, le schéma part en vrille.

---

## § 2 — Vue d'ensemble

| Pôle | Intitulé | Mission (1 ligne) | Livrables clés | Dossiers possédés | % temps |
|---|---|---|---|---|---|
| 🧱 **1** | DBA / Schéma & Data | Le schéma tourne sur PG 16 avec 1000+ lignes réalistes | DDL propre, seed data, vues anonymisées | `mld/`, `sql/` | 20% |
| 🛡️ **2** | Sécurité / BLP + RBAC | 7 rôles + RLS + triggers BLP/Biba fonctionnels | Rôles SQL, policies RLS, matrice testée | `mld/07-09_*.sql`, `docs/matrice_acces.md` | 30% |
| 🎭 **3** | Deception + Monitoring | 7/7 techniques + dashboards temps réel | Honeytokens, watermarking, polyinstanciation, Grafana | `monitoring/`, `mld/10-11_*.sql` | 30% |
| 🏗️ **4** | Infra Proxmox + Livrables | 3 VM sécurisées + rapport STRIDE + slides | Proxmox setup, hardening, STRIDE, slides J4 | `infra/`, `docs/rapport_*`, tous les `.md` racine | 20% |

---

## § 3 — Fiches détaillées par pôle

### 🧱 Pôle 1 — DBA / Schéma & Data

#### Mission
Garantir que le schéma PostgreSQL est **propre, performant et peuplé**. Tu es le gardien du `mld/`. Tout le monde construit sur ton travail, donc ta partie doit être **stable avant la semaine 6**.

#### Profil idéal
- **Hard skills** : SQL avancé, contraintes FK/CHECK, index B-tree/GIN, EXPLAIN ANALYZE, Python (Faker)
- **Soft skills** : rigueur, anticipation des besoins des autres pôles
- **Nice to have** : expérience pgAdmin, connaissance des types avancés PG (JSONB, UUID, BYTEA, ENUM)

#### Livrables J3 (semaine 8)
- [ ] Les **4 scripts DDL existants** testés sur une PG 16 vierge sans erreur
- [ ] `mld/05_seed_data.sql` — **1000+ lignes** réalistes (via Faker Python + export SQL)
- [ ] `mld/06_vues.sql` — vues anonymisées pour `controleur_cnil` (pseudonymisation identités)
- [ ] Rapport de performance : `EXPLAIN ANALYZE` sur les 10 requêtes les plus utilisées
- [ ] README d'installation : `psql -f 01 ... -f 06` en moins de 30 secondes

#### Livrables J4 (soutenance)
- [ ] Base restaurée en 1 commande (`./reset_db.sh`)
- [ ] Données de démo crédibles (noms français plausibles, dates cohérentes, numéros NATINF réels)
- [ ] 5 requêtes "showcase" préparées pour illustrer le volume + la perf

#### Fichiers possédés
| Fichier | Statut | Rôle |
|---|---|---|
| `mld/01_types_et_extensions.sql` | existant | maintenance |
| `mld/02_tables_principales.sql` | existant | maintenance — c'est LE fichier critique |
| `mld/04_donnees_reference.sql` | existant | maintenance |
| `mld/05_seed_data.sql` | **à créer** | jeu de données 1000+ lignes |
| `mld/06_vues.sql` | **à créer** | vues anonymisées CNIL |
| `sql/reset_db.sh` | **à créer** | script de reset one-shot |

#### Compétences à acquérir si manque
- Faker Python : https://faker.readthedocs.io/ (30 min suffisent)
- PostgreSQL EXPLAIN : https://www.postgresql.org/docs/current/using-explain.html
- `generate_series()` pour data synthétique en SQL pur

#### Dépendances
- **Entrants** : aucun (tu démarres en premier)
- **Sortants** : **TOUT LE MONDE DÉPEND DE TOI**. Pôle 2 ne peut poser ses RLS que sur un schéma figé. Pôle 3 ne peut trigger ses honeytokens que sur des tables existantes.

#### Critères de "done"
- ✅ `psql -f mld/*.sql` passe sans erreur sur une PG 16 vierge
- ✅ Au moins 1000 lignes dans `personnes`, 500 dans `affaires`, 200 dans `signalements`
- ✅ Temps d'exécution du seed < 60s
- ✅ Aucune table sans index sur les colonnes FK
- ✅ Les 3 autres pôles t'ont validé le schéma

---

### 🛡️ Pôle 2 — Sécurité / BLP + RBAC

#### Mission
Implémenter **toute la couche sécurité PostgreSQL** : les 7 rôles, les GRANT par table, les policies RLS (Bell-LaPadula), les triggers Biba. Tu es celui qui prouve que le modèle théorique tourne vraiment.

#### Profil idéal
- **Hard skills** : PL/pgSQL, RLS PostgreSQL, GRANT/REVOKE, triggers, `SECURITY DEFINER`, `current_setting()`, Bell-LaPadula théorique
- **Soft skills** : esprit paranoïaque (penser à tous les bypass), rigueur sur les tests matriciels
- **Nice to have** : expérience Oracle Label Security ou SE-Linux, lecture de papers MITRE

#### Livrables J3 (semaine 8)
- [ ] `mld/07_roles_grants.sql` — **7 rôles PostgreSQL** créés + `GRANT` par table (matrice 7×25)
- [ ] `mld/08_rls_policies.sql` — policies RLS sur les **~15 tables sensibles** (personnes, affaires, signalements, biometrie, etc.)
- [ ] `mld/09_fonctions_triggers_blp.sql` — fonctions `fn_habilitation_agent()`, `fn_niveau_session()`, trigger `trg_controle_classification`
- [ ] Gestion du **mode session de travail** (`set_config('app.session_level', ...)`) documentée
- [ ] **Matrice de tests** : un script `.sql` par rôle qui joue : SELECT / INSERT / UPDATE / DELETE sur les tables critiques → résultat attendu (OK / 0 lignes / erreur RLS)

#### Livrables J4 (soutenance)
- [ ] Démo live : changer de rôle (`SET ROLE ...`) et montrer le filtrage auto
- [ ] Démo live : tenter un No Read Up → 0 ligne + alerte dans `audit_log`
- [ ] Démo live : tenter un No Write Down → exception levée
- [ ] `docs/matrice_acces.md` à jour avec le **vrai comportement testé** (pas juste théorique)

#### Fichiers possédés
| Fichier | Statut | Rôle |
|---|---|---|
| `mld/07_roles_grants.sql` | **à créer** | 7 rôles + GRANT 25 tables |
| `mld/08_rls_policies.sql` | **à créer** | toutes les policies RLS |
| `mld/09_fonctions_triggers_blp.sql` | **à créer** | fonctions + triggers BLP/Biba |
| `docs/matrice_acces.md` | existant | mise à jour après tests |
| `docs/classification_bell_lapadula.md` | existant | maintenance |
| `tests/test_rbac_matrix.sh` | **à créer** | script de validation matricielle |

#### Compétences à acquérir si manque
- PostgreSQL RLS : https://www.postgresql.org/docs/current/ddl-rowsecurity.html (1h de lecture)
- PL/pgSQL : https://www.postgresql.org/docs/current/plpgsql.html
- Relire `docs/classification_bell_lapadula.md` § 6 : tout est déjà pré-mâché

#### Dépendances
- **Entrants** : Pôle 1 (schéma stable) — bloque jusqu'à sem 6
- **Sortants** : Pôle 3 (a besoin de tes GRANT pour ses honeytraps), Pôle 4 (a besoin de tes rôles pour `pg_hba.conf`)

#### Critères de "done"
- ✅ Les 7 rôles existent + sont listés dans `\du`
- ✅ Matrice 7×25 testée : chaque cellule a le comportement attendu (prouvé par script)
- ✅ Un `agent_saisie` qui fait `SELECT FROM signalements WHERE type='fiche_s'` → 0 ligne + entrée `audit_log`
- ✅ Un INSERT avec `niveau_classification < habilitation` → rejeté par trigger
- ✅ `docs/matrice_acces.md` reflète la réalité testée

---

### 🎭 Pôle 3 — Deception + Monitoring

#### Mission
Implémenter les **7 techniques de Deception** (4 obligatoires + 3 bonus pour le +1) et toute la stack de **monitoring** (VM2). Tu es celui qui fait flasher les dashboards rouges en soutenance.

#### Profil idéal
- **Hard skills** : triggers PostgreSQL, JSONB, pgaudit, Grafana, Prometheus, pgBadger, regex, Bash
- **Soft skills** : créativité (bien nommer les leurres), sens du show (dashboards qui claquent)
- **Nice to have** : expérience Blue Team / SIEM, MITRE Engage

#### Livrables J3 (semaine 8)
- [ ] **4 techniques obligatoires** :
  - [ ] **Honeytokens** : UUIDs "piégés" dans `personnes`, `affaires`, `biometrie` — liste maintenue dans `deception_honeytokens` — tout SELECT dessus = alerte critique
  - [ ] **Tables leurres** : les 5 `fake_*` (déjà faites) + triggers d'alerte sur chaque SELECT/INSERT
  - [ ] **RLS** : dépendance Pôle 2 — tu valides que RLS est en place
  - [ ] **Synonymes/Vues Deception** : vue `users` qui pointe sur rien, vue `admin_panel` qui loggue toute consultation
- [ ] **3 techniques bonus** :
  - [ ] **Bruit statistique** : fonction qui ajoute ±ε sur `COUNT()` pour les rôles non-admin
  - [ ] **Watermarking** : fonction `fn_export_csv(table, agent_id)` qui tatoue chaque export (micro-variations d'espaces ou UUIDs invisibles)
  - [ ] **Polyinstanciation** : vues qui retournent des données différentes selon `current_user` (ex: vrai nom pour analyste, alias pour agent)

#### Livrables J4 (soutenance)
- [ ] **Stack Monitoring** sur VM2 :
  - [ ] Grafana avec dashboards : tentatives BLP / alertes honeytrap / top requêtes / erreurs RLS
  - [ ] Prometheus scraping `audit_log` + métriques PostgreSQL
  - [ ] pgBadger générant un rapport quotidien
  - [ ] Alertes temps réel (webhook / email fake)
- [ ] **Scénario démo** : attaquant fait `SELECT * FROM fake_credentials` → dashboard rouge en moins de 2s

#### Fichiers possédés
| Fichier | Statut | Rôle |
|---|---|---|
| `mld/03_tables_leurres.sql` | existant | maintenance + enrichir les données |
| `mld/10_deception_triggers.sql` | **à créer** | triggers d'alerte sur honeytraps |
| `mld/11_watermarking.sql` | **à créer** | fonction de tatouage exports |
| `mld/12_polyinstanciation.sql` | **à créer** | vues polyinstanciées |
| `mld/13_honeytokens.sql` | **à créer** | UUIDs piégés + détection |
| `monitoring/grafana_dashboards/*.json` | **à créer** | 3-4 dashboards |
| `monitoring/prometheus.yml` | **à créer** | config scraping |
| `monitoring/pgbadger.conf` | **à créer** | rapports audit |

#### Compétences à acquérir si manque
- Grafana (https://grafana.com/tutorials/) — 2h
- pgaudit : https://www.pgaudit.org/
- MITRE Engage (Deception framework) : https://engage.mitre.org/
- Relire `FAQ_DEFENSE_J2.md` section Deception

#### Dépendances
- **Entrants** : Pôle 1 (schéma), Pôle 2 (rôles/RLS)
- **Sortants** : Pôle 4 (tu livres la config Grafana/Prometheus à déployer sur VM2)

#### Critères de "done"
- ✅ Les 7 techniques sont implémentées et démontrables en live
- ✅ Un `SELECT * FROM fake_credentials` déclenche une alerte visible sur Grafana en < 2s
- ✅ Deux agents différents qui exportent la même table → deux CSV différents (watermarking fonctionne)
- ✅ `docs/deception_techniques.md` décrit chaque technique avec exemple + capture Grafana

---

### 🏗️ Pôle 4 — Infra Proxmox + Livrables

#### Mission
Monter et sécuriser les **3 VM Proxmox**, hardener PostgreSQL, rédiger le **rapport sécurité STRIDE** exigé pour NIS2, et maintenir tous les **livrables documentaires**. Tu es à la fois sysadmin, auditeur sécurité et documentaliste.

#### Profil idéal
- **Hard skills** : Proxmox VE, Linux (Debian/Ubuntu), iptables/nftables, OpenSSL/Let's Encrypt, Bash, Markdown, LaTeX/Typora
- **Soft skills** : rédaction claire, sens du document livrable, vision globale
- **Nice to have** : ANSSI/STRIDE, ISO 27001, préparation slides pro

#### Livrables J3 (semaine 8)
- [ ] **Infra Proxmox opérationnelle** :
  - [ ] `vm-db` — Debian 12 + PostgreSQL 16 + extensions (pgaudit, pgcrypto, pg_trgm)
  - [ ] `vm-monitor` — Grafana + Prometheus + pgBadger (installe le contenu livré par Pôle 3)
  - [ ] `vm-agent` — Debian 12 + pgAdmin + psql + scripts d'attaque
  - [ ] VLAN isolé, **pas d'accès Internet**, TLS 1.3 inter-VM
- [ ] **Hardening PostgreSQL** :
  - [ ] `pg_hba.conf` : seulement `hostssl` + certificats clients
  - [ ] `postgresql.conf` : `ssl=on`, `log_statement=all` via pgaudit, `password_encryption=scram-sha-256`
  - [ ] Certificats TLS générés + rotation automatisée
- [ ] **Backup** : `infra/backup.sh` (pg_dump → chiffré gpg → stocké offline) + crontab quotidien

#### Livrables J4 (soutenance)
- [ ] **Rapport sécurité STRIDE** (`docs/rapport_securite_stride.md`) :
  - Analyse des 6 menaces (Spoofing / Tampering / Repudiation / Info disclosure / DoS / Elevation of privilege)
  - Pour chaque menace : vecteur → impact → mitigation mise en place
  - AIPD (Analyse d'Impact RGPD) en annexe
- [ ] **Slides soutenance J4** (~25 slides, 30 min de présentation)
- [ ] **Mise à jour finale de tous les livrables** :
  - `cahier_des_charges.md`, `FAQ_DEFENSE_J2.md`, `START_HERE.md`, `REMISE_J2.md`, `CLAUDE.md`
- [ ] **Vidéo de démo** de secours (2 min, au cas où la démo live plante)

#### Fichiers possédés
| Fichier | Statut | Rôle |
|---|---|---|
| `infra/proxmox_setup.md` | **à créer** | procédure d'installation des 3 VM |
| `infra/pg_hba.conf` | **à créer** | config d'accès PG |
| `infra/postgresql.conf` | **à créer** | config moteur PG hardened |
| `infra/backup.sh` | **à créer** | script backup chiffré |
| `infra/firewall.nft` | **à créer** | règles nftables |
| `docs/rapport_securite_stride.md` | **à créer** | rapport STRIDE + AIPD |
| `slides/soutenance_j4.pptx` | **à créer** | 25 slides |
| Tous les `.md` à la racine | existants | **gardien documentaire** |

#### Compétences à acquérir si manque
- Proxmox : https://pve.proxmox.com/wiki/Main_Page (installation en 1h)
- STRIDE : https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats
- PostgreSQL hardening : https://www.crunchydata.com/blog/postgresql-security-hardening

#### Dépendances
- **Entrants** : Pôle 1 (DDL à installer), Pôle 2 (rôles à configurer dans `pg_hba.conf`), Pôle 3 (config Grafana/Prometheus à déployer)
- **Sortants** : tout le monde — tu leur fournis l'environnement d'intégration

#### Critères de "done"
- ✅ Les 3 VM pingent via leur VLAN, pas via Internet
- ✅ `psql` ne se connecte qu'en TLS (connexion en clair refusée)
- ✅ Un test d'intrusion basique (nmap + tentative login) loggue correctement
- ✅ Backup chiffré restauré avec succès sur une VM vide
- ✅ Rapport STRIDE couvre les 6 catégories avec au moins 2 mitigations chacune
- ✅ Slides J4 répétées 2× en conditions réelles

---

## § 4 — Dépendances et ordre de démarrage

```
     J2 validé (done ✓)
          │
          ▼
  ┌───────────────────┐
  │  Pôle 1 (DBA)     │ ──┐ schéma stable (cible: sem 6)
  └───────────────────┘   │
                          ▼
            ┌───────────────────────┐
            │  Pôle 2 (Sécurité)    │ ──┐ rôles + RLS (cible: sem 7)
            └───────────────────────┘   │
                                        ▼
                       ┌─────────────────────────┐
                       │  Pôle 3 (Deception)     │ (cible: sem 8 = J3)
                       └─────────────────────────┘
                                   │
                                   ▼ consommé par:
  ┌──────────────────────────────────────────────┐
  │  Pôle 4 (Infra Proxmox) — dès sem 4 !       │
  │  → démarre en parallèle de Pôle 1            │
  │  → intègre tout en sem 10 → sem 16           │
  └──────────────────────────────────────────────┘
```

**Point de synchro critique** : **fin semaine 6** → schéma DOIT être figé. Si Pôle 1 modifie une table après, ça casse Pôle 2 et 3.

---

## § 5 — Ce qui reste collectif

### 🎤 Soutenance J4
- Chacun présente **SA partie** (5-8 min × 4 = 25-30 min)
- Ordre recommandé : Pôle 4 (contexte infra) → Pôle 1 (data) → Pôle 2 (sécu live) → Pôle 3 (deception + monitoring = climax)
- Q&A : chacun répond à sa zone, **entraide autorisée**

### 📅 Review J2
- Choréo déjà écrite dans `REMISE_J2.md` → 4 × 2.5 min

### 📚 Maîtrise croisée
- Chacun connaît **SA partie à 100%** + **grandes lignes des 3 autres**
- Avant J4 : chaque membre présente sa partie aux 3 autres (20 min × 4)

### 🗓️ Rituel hebdo
- **Stand-up lundi matin 30 min** : ce que j'ai fait / ce que je fais / ce qui me bloque
- **Debrief vendredi 30 min** : démo croisée de la semaine

---

## § 6 — Anti-patterns à éviter

| ❌ Anti-pattern | Pourquoi c'est mauvais |
|---|---|
| Découpe par table ("toi les personnes, moi les affaires") | Personne ne maîtrise l'ensemble, la sécurité part en vrille |
| Chef de projet + 3 exécutants | En B3, tout le monde doit savoir défendre à l'oral |
| Binôme "backend / frontend" | Pas de frontend ici, inutile |
| "On se répartira au fur et à mesure" | = personne ne s'engage = deadlines ratées |
| Modifier le schéma après semaine 6 | Casse le travail des Pôles 2 et 3 → remonte un PR, on débat |
| Push direct sur `main` | Zéro review → bugs en démo J4 |

---

## § 7 — Planning macro (J2 → J4)

| Sem | Pôle 1 (DBA) | Pôle 2 (Sécu) | Pôle 3 (Deception) | Pôle 4 (Infra) | Jalon |
|---|---|---|---|---|---|
| **4** | J2 remis ✓ | J2 remis ✓ | J2 remis ✓ | J2 remis ✓ + Proxmox monté | **J2** |
| **5** | Affinage DDL + Faker POC | Lecture RLS + matrice design | Brainstorm honeytokens | vm-db + pg_hba | |
| **6** | Seed data 1000+ lignes + vues | Rôles + 1re policy RLS | Triggers honeytraps leurres | vm-monitor + TLS certs | **Schéma figé** |
| **7** | EXPLAIN ANALYZE + reset.sh | Toutes policies RLS + triggers | Watermarking + polyinstanciation | vm-agent + firewall | |
| **8** | Livraison Pôle 1 | Livraison Pôle 2 | Livraison Pôle 3 | Livraison Pôle 4 infra | **J3** |
| **9-10** | Support intégration | Tests matriciels finaux | Dashboards Grafana | Intégration 3 pôles sur Proxmox | |
| **11-12** | | | Scénario démo monitoring | Rapport STRIDE | |
| **13-14** | | | | Slides + AIPD | |
| **15** | Répétitions démo × 3 | Répétitions démo × 3 | Répétitions démo × 3 | Répétitions démo × 3 | |
| **16** | Soutenance | Soutenance | Soutenance | Soutenance | **J4** |

---

## § 8 — Règles git

- **1 pôle = 1 dossier "propriétaire"** (voir tableaux § 3)
- **Branches nommées** : `pole1-dba`, `pole2-securite`, `pole3-deception`, `pole4-infra`
- **PR obligatoires** sur `main` avec **review croisée** :
  - Pôle 1 review Pôle 2 (il connaît le schéma)
  - Pôle 2 review Pôle 3 (sécu ↔ deception)
  - Pôle 3 review Pôle 4 (monitoring ↔ infra)
  - Pôle 4 review Pôle 1 (intégration finale)
- **Pas de push direct sur `main`** — ce qui est sur `main` = ce qu'on remet au formateur
- **Tag** chaque jalon : `git tag j2-remis`, `git tag j3-remis`, `git tag j4-soutenance`

---

## § 9 — Auto-assignation

À remplir en groupe avant la prochaine réunion :

| Pôle | Nom | Email | Forces revendiquées | Validé ? |
|---|---|---|---|---|
| 🧱 1 — DBA | ________ | ________ | ________ | ☐ |
| 🛡️ 2 — Sécurité | ________ | ________ | ________ | ☐ |
| 🎭 3 — Deception | ________ | ________ | ________ | ☐ |
| 🏗️ 4 — Infra | ________ | ________ | ________ | ☐ |

### Comment choisir son pôle ?

- **Tu aimes le SQL pur et les data pipelines** → Pôle 1
- **Tu kiffes la théorie sécurité et les policies fines** → Pôle 2
- **Tu es créatif et aimes les dashboards visuels** → Pôle 3
- **Tu es à l'aise avec Linux/Proxmox et aimes rédiger** → Pôle 4

### Règles de choix
1. Chacun exprime son **top 2** avant de trancher
2. En cas de conflit : celui qui a **le profil le plus aligné** prend
3. Si personne ne veut un pôle : on le **binôme temporairement** jusqu'à sem 6 puis on arbitre

---

## § 10 — Aide-mémoire pour démarrer TA semaine

À lire chaque lundi matin :

1. Relire ta fiche § 3 (ta section)
2. Vérifier tes **livrables de la semaine** dans le planning § 7
3. Vérifier tes **dépendances entrantes** : est-ce que les autres pôles ont livré ce dont j'ai besoin ?
4. Si non → parler au pôle concerné **lundi midi au plus tard**
5. Si oui → go ✅

**Contact formateur (urgence seulement)** : Hakim Loumi — Kyrion-CS / École 2600
