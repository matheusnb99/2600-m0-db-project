psql -U postgres -f ./00_setup_db.sql
psql -U taj_admin -d blackvault -f ./01_types_et_extensions.sql
psql -U taj_admin -d blackvault -f ./02_tables_principales.sql
psql -U taj_admin -d blackvault -f ./03_tables_leurres.sql
psql -U taj_admin -d blackvault -f ./04_donnees_reference.sql
psql -U taj_admin -d blackvault -f ./05_seed_data.sql
psql -U taj_admin -d blackvault -f ./06_vues.sql
psql -U taj_admin -d blackvault -f ./07_roles_grants.sql
# 09 (fonctions) AVANT 08 (policies) : les policies appellent fn_session_level/fn_niveau_*
psql -U taj_admin -d blackvault -f ./09_fonctions_triggers_blp.sql
psql -U taj_admin -d blackvault -f ./08_rls_policies.sql
psql -U postgres -d blackvault -f ./10_grant_user_owner.sql
# 11 en postgres : INSERT dans agents, bloqué par la RLS pour un non-admin
psql -U postgres -d blackvault -f ./11_demo_accounts.sql
# Réowne les fonctions SECURITY DEFINER vers postgres (récursion RLS + audit) —
# DOIT être lancé en superuser, après 09.
psql -U postgres -d blackvault -f ./12_proprietaires_fonctions.sql
