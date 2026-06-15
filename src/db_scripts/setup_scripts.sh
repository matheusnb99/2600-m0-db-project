psql -U postgres -f ./00_setup_db.sql
psql -U taj_owner -d taj -f ./01_types_et_extensions.sql
psql -U taj_owner -d taj -f ./02_tables_principales.sql
psql -U taj_owner -d taj -f ./03_tables_leurres.sql
psql -U taj_owner -d taj -f ./04_donnees_reference.sql
psql -U taj_owner -d taj -f ./05_seed_data.sql
psql -U taj_owner -d taj -f ./06_vues.sql
psql -U taj_owner -d taj -f ./07_roles_grants.sql
psql -U taj_owner -d taj -f ./08_rls_policies.sql
psql -U taj_owner -d taj -f ./09_fonctions_triggers_blp.sql
psql -U postgres -d taj -f ./10_grant_user_role.sql
