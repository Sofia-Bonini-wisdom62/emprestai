-- CreateTable
CREATE TABLE "loans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_on" DATE NOT NULL,
    "returned_at" TIMESTAMP(3),

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loans_tenant_id_user_id_idx" ON "loans"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "audit_events_tenant_id_created_at_idx" ON "audit_events"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "equipments_tenant_id_id_key" ON "equipments"("tenant_id", "id");

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_tenant_id_equipment_id_fkey" FOREIGN KEY ("tenant_id", "equipment_id") REFERENCES "equipments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_tenant_id_user_id_fkey" FOREIGN KEY ("tenant_id", "user_id") REFERENCES "memberships"("tenant_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- CreateIndex
-- Um empréstimo em aberto por equipamento (spec 004, RN-09). O Prisma não modela índice parcial,
-- então ele fica só aqui.
CREATE UNIQUE INDEX "loans_equipment_id_open_key"
  ON "loans" ("equipment_id") WHERE "returned_at" IS NULL;

-- EnableRLS
ALTER TABLE "loans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;

-- CreatePolicy
-- Mesmo padrão de equipments: a aplicação lê pelo Prisma, como dona das tabelas, e anon e
-- authenticated não precisam de nenhuma linha (spec 004, CA-15).
CREATE POLICY "loans_deny_all" ON "loans"
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "audit_events_deny_all" ON "audit_events"
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- AppendOnly
-- audit_events só aceita INSERT, também para o dono das tabelas, que é o papel da aplicação
-- (spec 004, RN-22; ADR-010). DDL aprovado pela pessoa em 2026-11-12.
CREATE FUNCTION "audit_events_reject_change"() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'audit_events é append-only: % recusado', TG_OP;
END;
$$;
CREATE TRIGGER "audit_events_no_update_delete"
  BEFORE UPDATE OR DELETE ON "audit_events"
  FOR EACH ROW EXECUTE FUNCTION "audit_events_reject_change"();
CREATE TRIGGER "audit_events_no_truncate"
  BEFORE TRUNCATE ON "audit_events"
  FOR EACH STATEMENT EXECUTE FUNCTION "audit_events_reject_change"();
REVOKE UPDATE, DELETE, TRUNCATE ON "audit_events" FROM anon, authenticated;
