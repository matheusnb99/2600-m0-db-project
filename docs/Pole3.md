Voici une proposition de rapport technique pour le **Pôle 3 (Deception & Monitoring)**, calibré exactement sur le même ton, le même formalisme académique et la même structure rigoureuse que ton document du Pôle 2.

---

# Documentation Pôle 3 — Deception & Monitoring

## OPÉRATION BLACKVAULT — Refonte de l'Infrastructure du TAJ

---

**Projet** : B3 DB-Security — Final Project
**École** : 2600 — Promo 2025-2026
**Formateur** : Hakim Loumi (Kyrion-CS)
**Pôle traité** : Pôle 3 — Cyber-Deception, Centralisation & Supervision (Loki + Promtail + Grafana)
**Auteur** : Ephmr
**Date de remise** : Juin 2026

---

## Sommaire

1. [Contexte et objectifs](https://www.google.com/search?q=%231-contexte-et-objectifs)
2. [Architecture du pipeline de monitoring](https://www.google.com/search?q=%232-architecture-du-pipeline-de-monitoring)
3. [Implémentation détaillée](https://www.google.com/search?q=%233-impl%C3%A9mentation-d%C3%A9taill%C3%A9e)
4. [Tests d'acceptance et de validation](https://www.google.com/search?q=%234-tests-dacceptance-et-de-validation)
5. [Méthodologie de développement](https://www.google.com/search?q=%235-m%C3%A9thodologie-de-d%C3%A9veloppement)
6. [Procédure de déploiement](https://www.google.com/search?q=%236-proc%C3%A9dure-de-d%C3%A9ploiement)
7. [Analyse des pannes et Tradeoffs résolus](https://www.google.com/search?q=%237-analyse-des-pannes-et-tradeoffs-r%C3%A9solus)
8. [Intégration inter-pôles](https://www.google.com/search?q=%238-int%C3%A9gration-inter-p%C3%B4les)
9. [Conclusion](https://www.google.com/search?q=%239-conclusion)
10. [Annexes](https://www.google.com/search?q=%2310-annexes)

---

## 1. Contexte et objectifs

### 1.1 Rappel du projet

Dans le cadre de l'**OPÉRATION BLACKVAULT**, la centralisation des logs d'audit et la détection d'intrusions sur le fichier national du TAJ représentent une obligation légale stricte. La Directive Police-Justice (UE 2016/680) impose une traçabilité totale et inaltérable des accès aux données hautement sensibles.

### 1.2 Périmètre du Pôle 3

Le Pôle 3 intervient immédiatement après les restrictions d'accès du Pôle 2 pour mettre en œuvre une stratégie de **Cyber-Deception active** et de **supervision temps réel**. Son but est de capturer les mouvements latéraux d'un attaquant ou d'un utilisateur interne malveillant (Insider) ayant réussi à compromettre un compte applicatif.

Ce pôle déploie une solution de récolte légère, non intrusive et performante basée sur la stack **PLG** (Promtail, Loki, Grafana) distribuée sur une architecture multi-VM.

### 1.3 Contraintes fonctionnelles et techniques

| Contrainte | Source | Objectif |
| --- | --- | --- |
| Traçabilité des accès | Directive Police-Justice art. 25 | Journalisation des consultations |
| Détection active | Spécifications Deception | Piéger l'attaquant via des tables leurres |
| Architecture distribuée | Contrainte Infra | Collecte sur VM-DB, centralisation sur VM-Monitor |
| Consommation CPU/RAM minimale | Optimisation système | Choix de Loki/Promtail face à une stack ELK lourde |
| Temps de rétention et alerte | NIS2 | Visualisation instantanée des alertes critiques |

---

## 2. Architecture du pipeline de monitoring

### 2.1 Schéma d'ensemble du flux de données

```
┌─────────────────────────────────────────────────────────────────┐
│              VM-DB (10.4.1.200 / Debian-DB)                     │
│                                                                 │
│  PostgreSQL (Trigger Deception / Audit)                         │
│       │                                                         │
│       ▼ Écriture locale (Append-Only)                           │
│  File: /var/log/deception_alerts.log                            │
│       │                                                         │
│       ▼ Lecture continue (Inotify / Tail)                       │
│  Promtail (Agent de collecte léger)                             │
└───────┬─────────────────────────────────────────────────────────┘
        │
        │ Flux HTTP POST (TCP / Port 3100)
        ▼
┌─────────────────────────────────────────────────────────────────┐
│              VM-MONITOR (10.4.1.100 / Debian-Monitor)           │
│                                                                 │
│  Loki (Moteur d'indexation orienté labels)                      │
│       │                                                         │
│       ▼ Requêtes LogQL natives                                  │
│  Grafana (Serveur de restitution & Dashboard)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

```

### 2.2 Choix de la Stack technique (PLG)

* **Promtail** : Préféré à Logstash pour sa légèreté absolue en production. Il n'effectue aucune transformation lourde sur la VM de base de données, préservant les performances d'I/O de PostgreSQL.
* **Loki** : Système d'indexation "水平" (horizontal) inspiré de Prometheus. Contrairement à Elasticsearch, Loki n'indexe pas le contenu des logs mais uniquement les métadonnées (labels), réduisant drastiquement l'espace disque.
* **Grafana** : Interface unique permettant d'unifier les métriques système et les flux de logs via des requêtes LogQL performantes.

---

## 3. Implémentation détaillée

### 3.1 Configuration de l'agent Promtail (`/etc/promtail/config.yaml`)

Déployé sur la **VM-DB (10.4.1.200)**, l'agent scrute les fichiers de logs générés par les mécanismes de déception de la base de données.

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://10.4.1.100:3100/loki/api/v1/push

scrape_configs:
  - job_name: deception_logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: deception_logs
          __path__: /var/log/deception_alerts.log

```

* **Mécanisme d'idempotence (`positions.yaml`)** : Enregistre le pointeur d'octet (offset) lu dans le fichier cible. En cas de coupure de l'agent, la lecture reprend exactement là où elle s'était arrêtée, évitant la duplication ou la perte de logs.

### 3.2 Configuration du serveur Loki (`/etc/loki/config.yaml`)

Déployé sur la **VM-MONITOR (10.4.1.100)**, Loki reçoit les flux distants. Sa configuration réseau est modifiée pour écouter sur l'ensemble des interfaces réseau afin de valider les connexions inter-VM :

```yaml
server:
  http_listen_address: 0.0.0.0
  http_listen_port: 3100

```

### 3.3 Interface de supervision Grafana

La restitution visuelle s'appuie sur le moteur d'exploration de Grafana. Le filtrage des flux s'effectue via des requêtes structurées en **LogQL** (Log Query Language).

La requête canonique exploitée pour isoler les compromissions de leurres est :

```logql
{job="deception_logs"}

```

---

## 4. Tests d'acceptance et de validation

### 4.1 Injection de logs simulée

Afin de valider l'intégrité du pipeline de bout en bout sans altérer les déclencheurs PostgreSQL, un protocole d'injection forcée en mode privilège (`sudo`) a été mis en place sur la **VM-DB** :

```bash
sudo tee -a /var/log/deception_alerts.log <<< "ALERTE SÉCURITÉ : Tentative d'accès illicite à la table fake_biometrie par l'IP 192.168.1.50"

```

### 4.2 Matrice de validation du pipeline

| Id | Étape de validation | Commande de contrôle | État attendu | Résultat |
| --- | --- | --- | --- | --- |
| **V01** | Disponibilité réseau Loki | `wget --spider http://10.4.1.100:3100/ready` | `connected` / `405 Method Not Allowed` |  |
| **V02** | Initialisation Promtail | `ps aux | grep promtail` | Processus actif sous PID unique |  |
| **V03** | Injection de trace | `tail -n 1 /var/log/deception_alerts.log` | Ligne écrite avec succès |  |
| **V04** | Indexation Loki | `cat ~/logs/loki.log | tail -n 5` | `syncing tables` / Aucun rejet |  |
| **V05** | Affichage Grafana | Interface UI (Onglet Explore) | Rendu de la chaîne exacte insérée |  |

---

## 5. Méthodologie de développement

Le déploiement a suivi une approche incrémentale stricte basée sur l'isolation des couches réseau :

```
[Étape 1: Validation Locale] ──▶ [Étape 2: Interconnexion Réseau] ──▶ [Étape 3: Synchronisation Grafana]

```

1. **Isolation des composants** : Validation de l'écriture locale PostgreSQL et des droits du fichier `/var/log/deception_alerts.log`.
2. **Vérification de la couche Transport** : Tests de connectivité inter-VM pour s'assurer de l'absence de restrictions de routage ou de blocages pare-feu.
3. **Ajustement de la granularité temporelle** : Résolution des problématiques liées aux fuseaux horaires machine影响 la visibilité des événements.

---

## 6. Procédure de déploiement

### 6.1 Démarrage sécurisé des services

Sur la **VM-MONITOR (103)** :

```bash
# Lancement de Loki en tâche de fond avec redirection des logs d'audit
nohup /usr/local/bin/loki -config.file=/etc/loki/config.yaml > ~/logs/loki.log 2>&1 &

```

Sur la **VM-DB (100)** :

```bash
# Purge des processus orphelins ou mal configurés
sudo pkill -9 promtail
sudo rm -f /tmp/positions.yaml

# Instanciation de l'agent avec la configuration validée
sudo /usr/local/bin/promtail -config.file=/etc/promtail/config.yaml &

```

---

## 7. Analyse des pannes et Tradeoffs résolus

### 7.1 Résolution de l'anomalie d'URI réseau (*No Host in request URL*)

**Symptôme** : Promtail levait l'alerte critique suivante dans les logs système :

```
caller=client.go:419 msg="error sending batch, will retry" error="Post \"http:10.4.1.100:3100/loki/api/v1/push\": http: no Host in request URL"

```

**Analyse** : Une erreur de syntaxe dans le fichier `config.yaml` omettait les caractères d'ancrage de protocole `//` (`http:10.4.1.100` au lieu de `http://10.4.1.100`). Le parseur Go de l'agent rejetait la structure de la requête.
**Correctif** : Réécriture du bloc `clients`, arrêt chirurgical des processus via leurs identifiants système (PID) et rechargement de la configuration.

### 7.2 Piège de la redirection d'E/S avec Sudo (`Permission non accordée`)

**Symptôme** : La commande `sudo echo "..." >> /var/log/deception_alerts.log` échouait systématiquement.
**Analyse** : Le privilège élevé accordé par `sudo` ne s'applique qu'à l'évaluation de la commande `echo`. La redirection `>>` est exécutée par l'interpréteur de commandes (Shell) de l'utilisateur non privilégié, qui n'a pas les droits d'écriture dans `/var/log`.
**Correctif** : Utilisation de l'utilitaire `tee` avec l'argument `-a` (append) combiné à un *Here-String* (`<<<`), exécutant l'ouverture et l'écriture du fichier directement dans l'espace kernel sécurisé :

```bash
sudo tee -a /var/log/deception_alerts.log <<< "..."

```

### 7.3 Décalage d'indexation temporelle UTC vs LocalTime

**Symptôme** : Les logs étaient correctement transmis et reçus par Loki, mais l'interface Grafana retournait la mention `No logs found`.
**Analyse** : Les systèmes d'exploitation des VM étaient synchronisés sur l'horloge universelle **UTC** (décalage de -2 heures par rapport à l'heure locale française). La fenêtre d'affichage par défaut de Grafana se basait sur l'heure du navigateur de l'analyste, masquant ainsi les événements jugés "futurs" ou hors plage par le moteur de rendu.
**Correctif** : Élargissement dynamique de la plage temporelle à `Last 3 hours` et activation du mode de rafraîchissement **Live** (flux continu).

---

## 8. Intégration inter-pôles

### 8.1 Points de contact et dépendances

```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│     PÔLE 1 (DBA)       │      │     PÔLE 2 (APPLICATIF)│      │    PÔLE 3 (DECEPTION)  │
├────────────────────────┤      ├────────────────────────┤      ├────────────────────────┤
│ Livrera le modèle de   │─────▶│ Implémente les fonctions│─────▶│ Consomme les sessions  │
│ données des leurres    │      │ d'audit & sessions GUC │      │ pour contextualiser    │
│ (ex: fake_biometrie)   │      │ (ex: fn_session_agent) │      │ les alertes Grafana    │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘

```

* **Lien Pôle 2 (Sécurité Applicative)** : Les alertes générées en base exploitent l'identifiant de l'agent mis en session via la variable de configuration globale (`app.agent_id`). Le Pôle 3 extrait cette métadonnée pour identifier instantanément l'attaquant dans Grafana.
* **Lien Pôle 4 (Infrastructure & Hardening)** : L'infrastructure réseau doit garantir l'ouverture permanente du port TCP **3100** entre la zone de base de données et la zone de monitoring.

---

## 9. Conclusion

Le pipeline de centralisation et de déception active du TAJ est pleinement opérationnel. Les mécanismes de détection passive fonctionnent sans impacter les performances de l'infrastructure de production.

Le système est prêt pour la phase de démonstration devant le jury : le déclenchement d'une alerte sur la base de données (VM-DB) se répercute désormais en **moins d'une seconde** sur le tableau de bord de supervision de la cellule de crise (VM-Monitor).

---

## 10. Annexes

### Annexe A — Commandes de diagnostic rapide

```bash
# Vérifier la connectivité brute vers Loki (depuis la VM-DB)
wget --spider http://10.4.1.100:3100/ready

# Analyser le comportement de l'agent de collecte
sudo tail -f /var/log/promtail.log

# Forcer une alerte type pour démonstration Jury
sudo tee -a /var/log/deception_alerts.log <<< "ALERTE JURY : Demonstator Intrusion Validation OK"

```