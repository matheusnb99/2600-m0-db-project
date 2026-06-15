#!/usr/bin/env python3
"""
OPÉRATION BLACKVAULT — TAJ
Script : reset_db.py
Usage  : python3 reset_db.py
Remet la base blackvault à zéro et recharge tous les scripts dans l'ordre.
"""

import subprocess
import sys
import os
import time

# ============================================================
# CONFIGURATION
# ============================================================
DB_NAME    = "blackvault"
DB_USER    = "postgres"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

SCRIPTS = [
    ("01_types_et_extensions.sql", "01 — Extensions et types ENUM"),
    ("02_tables_principales.sql",  "02 — Tables principales"),
    ("03_tables_leurres.sql",      "03 — Tables leurres (Deception)"),
    ("04_donnees_reference.sql",   "04 — Données de référence"),
    ("05_seed_data.sql",           "05 — Seed data (1200+ lignes)"),
    ("06_vues.sql",                "06 — Vues anonymisées CNIL"),
]

# ============================================================
# COULEURS TERMINAL
# ============================================================
BLUE   = "\033[0;34m"
GREEN  = "\033[0;32m"
YELLOW = "\033[1;33m"
RED    = "\033[0;31m"
RESET  = "\033[0m"

def info(msg):  print(f"{BLUE}[INFO]{RESET}  {msg}")
def ok(msg):    print(f"{GREEN}[OK]{RESET}    {msg}")
def warn(msg):  print(f"{YELLOW}[WARN]{RESET}  {msg}")
def error(msg): print(f"{RED}[ERROR]{RESET} {msg}")

# ============================================================
# FONCTIONS
# ============================================================
def run_psql(sql=None, fichier=None):
    """
    Exécute une commande psql.
    - sql    : requête SQL directe (ex: "DROP SCHEMA public CASCADE;")
    - fichier: chemin vers un fichier .sql à charger
    """
    cmd = ["sudo", "-u", DB_USER, "psql", "-d", DB_NAME, "-q"]
    if sql:
        cmd += ["-c", sql]
    elif fichier:
        cmd += ["-f", fichier]

    resultat = subprocess.run(cmd, capture_output=True, text=True)

    if resultat.returncode != 0:
        error(f"Erreur psql :\n{resultat.stderr}")
        sys.exit(1)

def charger_script(nom_fichier, label):
    """Charge un fichier SQL dans la base."""
    chemin = os.path.join(SCRIPT_DIR, nom_fichier)
    info(f"Chargement : {label}...")
    run_psql(fichier=chemin)
    ok(f"{label} chargé.")

def verifier_fichiers():
    """Vérifie que tous les fichiers SQL sont présents."""
    info("Vérification des fichiers SQL...")
    manquants = []
    for nom_fichier, _ in SCRIPTS:
        chemin = os.path.join(SCRIPT_DIR, nom_fichier)
        if not os.path.exists(chemin):
            manquants.append(chemin)

    if manquants:
        for f in manquants:
            error(f"Fichier manquant : {f}")
        sys.exit(1)

    ok("Tous les fichiers sont présents.")

def afficher_volumes():
    """Affiche le nombre de lignes par table."""
    info("Vérification des volumes...")

    requete_volumes = """
SELECT table_name AS "Table", to_char(row_count, '999,999') AS "Lignes"
FROM (
    SELECT 'personnes'     AS table_name, COUNT(*) AS row_count FROM personnes
    UNION ALL SELECT 'affaires',          COUNT(*) FROM affaires
    UNION ALL SELECT 'signalements',      COUNT(*) FROM signalements
    UNION ALL SELECT 'agents',            COUNT(*) FROM agents
    UNION ALL SELECT 'biometrie',         COUNT(*) FROM biometrie
    UNION ALL SELECT 'adresses',          COUNT(*) FROM adresses
    UNION ALL SELECT 'telephones',        COUNT(*) FROM telephones
    UNION ALL SELECT 'consultations',     COUNT(*) FROM consultations
    UNION ALL SELECT 'audit_log',         COUNT(*) FROM audit_log
) t ORDER BY table_name;
"""
    cmd = ["sudo", "-u", DB_USER, "psql", "-d", DB_NAME, "-c", requete_volumes]
    subprocess.run(cmd)

def afficher_vues():
    """Vérifie que les 6 vues CNIL sont bien créées."""
    info("Vérification des vues CNIL...")

    requete_vues = """
SELECT viewname AS "Vue", 'OK' AS "Statut"
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'personnes_anonymisees', 'signalements_anonymises',
    'agents_anonymises',     'audit_log_anonymise',
    'statistiques_cnil',     'durees_conservation'
  )
ORDER BY viewname;
"""
    cmd = ["sudo", "-u", DB_USER, "psql", "-d", DB_NAME, "-c", requete_vues]
    subprocess.run(cmd)

# ============================================================
# PROGRAMME PRINCIPAL
# ============================================================
def main():
    print()
    print("==============================================")
    print("  BLACKVAULT — Reset base de données")
    print("==============================================")
    print()

    # 1. Vérifier les fichiers
    verifier_fichiers()
    print()

    # 2. Demander confirmation
    warn(f"Cette opération va SUPPRIMER et RECRÉER toute la base '{DB_NAME}'.")
    confirmation = input("Confirmer ? (oui/non) : ").strip().lower()
    if confirmation != "oui":
        info("Annulé.")
        sys.exit(0)
    print()

    # 3. Lancer le chrono
    debut = time.time()

    # 4. Reset du schéma
    info("Suppression du schéma public...")
    run_psql(sql="DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    ok("Schéma réinitialisé.")

    # 5. Charger les scripts dans l'ordre
    for nom_fichier, label in SCRIPTS:
        charger_script(nom_fichier, label)

    # 6. Vérifications finales
    print()
    afficher_volumes()
    afficher_vues()

    # 7. Résumé
    duree = int(time.time() - debut)
    print()
    print("==============================================")
    ok(f"Reset terminé en {duree} secondes.")
    print(f"  Base    : {DB_NAME}")
    print(f"  Scripts : {len(SCRIPTS)} chargés")
    print(f"  Date    : {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("==============================================")
    print()

if __name__ == "__main__":
    main()
