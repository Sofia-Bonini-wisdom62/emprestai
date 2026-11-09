-- O Prisma cria esta tabela sozinho, fora das migrations, então ela nasce sem RLS (ADR-001, 2.7).
-- O IF cobre o shadow database do migrate dev, onde a tabela não existe.
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "prisma_migrations_deny_all" ON "_prisma_migrations"
      FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;
