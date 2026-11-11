-- Só a senha do papel do Auth, a mesma POSTGRES_PASSWORD do banco (ADR-006, seção 2).
-- Roda sozinho uma vez, na criação do volume; com o volume já criado, não roda de novo.
\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
