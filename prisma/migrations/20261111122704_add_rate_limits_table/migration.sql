-- CreateTable
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "window_started_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- EnableRLS
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;

-- CreatePolicy
-- Só a aplicação, dona da tabela, conta tentativas: anon e authenticated não leem nem gravam.
CREATE POLICY "rate_limits_deny_all" ON "rate_limits"
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
