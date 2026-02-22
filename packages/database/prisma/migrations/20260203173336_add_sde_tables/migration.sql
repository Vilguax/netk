-- CreateTable
CREATE TABLE "reprocess_materials" (
    "id" SERIAL NOT NULL,
    "type_id" INTEGER NOT NULL,
    "material_type_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "reprocess_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compression_mappings" (
    "id" SERIAL NOT NULL,
    "ore_type_id" INTEGER NOT NULL,
    "compressed_type_id" INTEGER NOT NULL,
    "ore_name" TEXT NOT NULL,
    "compressed_name" TEXT NOT NULL,
    "ratio" INTEGER NOT NULL DEFAULT 100,
    "group_id" INTEGER NOT NULL,

    CONSTRAINT "compression_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eve_groups" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "eve_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reprocess_materials_type_id_idx" ON "reprocess_materials"("type_id");

-- CreateIndex
CREATE INDEX "reprocess_materials_material_type_id_idx" ON "reprocess_materials"("material_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "reprocess_materials_type_id_material_type_id_key" ON "reprocess_materials"("type_id", "material_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "compression_mappings_ore_type_id_key" ON "compression_mappings"("ore_type_id");

-- CreateIndex
CREATE INDEX "compression_mappings_compressed_type_id_idx" ON "compression_mappings"("compressed_type_id");

-- CreateIndex
CREATE INDEX "compression_mappings_group_id_idx" ON "compression_mappings"("group_id");

-- CreateIndex
CREATE INDEX "eve_groups_category_id_idx" ON "eve_groups"("category_id");
