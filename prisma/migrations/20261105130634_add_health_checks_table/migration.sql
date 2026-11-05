-- CreateTable
CREATE TABLE "health_checks" (
    "id" SERIAL NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- EnableRLS
ALTER TABLE "health_checks" ENABLE ROW LEVEL SECURITY;

-- CreatePolicy
CREATE POLICY "health_checks_deny_all" ON "health_checks"
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
