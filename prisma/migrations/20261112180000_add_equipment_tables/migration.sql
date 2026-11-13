-- CreateEnum
CREATE TYPE "equipment_status" AS ENUM ('available', 'loaned', 'maintenance', 'out_of_service');

-- CreateTable
CREATE TABLE "equipment_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "asset_tag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "status" "equipment_status" NOT NULL,
    "image_object" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipment_categories_tenant_id_name_key" ON "equipment_categories"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_categories_tenant_id_id_key" ON "equipment_categories"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "equipments_category_id_idx" ON "equipments"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipments_tenant_id_asset_tag_key" ON "equipments"("tenant_id", "asset_tag");

-- AddForeignKey
ALTER TABLE "equipment_categories" ADD CONSTRAINT "equipment_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipments" ADD CONSTRAINT "equipments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipments" ADD CONSTRAINT "equipments_tenant_id_category_id_fkey" FOREIGN KEY ("tenant_id", "category_id") REFERENCES "equipment_categories"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- EnableRLS
ALTER TABLE "equipment_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "equipments" ENABLE ROW LEVEL SECURITY;

-- CreatePolicy
-- Mesmo padrão de tenants, memberships e profiles: a aplicação lê pelo Prisma, como dona das
-- tabelas, e anon e authenticated não precisam de nenhuma linha (spec 003, CA-10).
CREATE POLICY "equipment_categories_deny_all" ON "equipment_categories"
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "equipments_deny_all" ON "equipments"
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
