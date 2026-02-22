-- CreateTable
CREATE TABLE "eve_types" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "group_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "packaged_volume" DOUBLE PRECISION,
    "portion_size" INTEGER NOT NULL DEFAULT 1,
    "icon_id" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eve_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_prices" (
    "id" UUID NOT NULL,
    "type_id" INTEGER NOT NULL,
    "region_id" BIGINT NOT NULL,
    "buy_price" DECIMAL(20,2) NOT NULL,
    "sell_price" DECIMAL(20,2) NOT NULL,
    "buy_volume" BIGINT NOT NULL DEFAULT 0,
    "sell_volume" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_price_history" (
    "id" UUID NOT NULL,
    "type_id" INTEGER NOT NULL,
    "region_id" BIGINT NOT NULL,
    "buy_price" DECIMAL(20,2) NOT NULL,
    "sell_price" DECIMAL(20,2) NOT NULL,
    "buy_volume" BIGINT NOT NULL DEFAULT 0,
    "sell_volume" BIGINT NOT NULL DEFAULT 0,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_fetch_jobs" (
    "id" UUID NOT NULL,
    "region_id" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "items_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_fetch_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appraisals" (
    "id" TEXT NOT NULL,
    "user_id" UUID,
    "region_id" BIGINT NOT NULL,
    "raw_input" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "pricing_data" JSONB NOT NULL,
    "total_buy" DECIMAL(20,2) NOT NULL,
    "total_sell" DECIMAL(20,2) NOT NULL,
    "total_volume" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_price_check" TIMESTAMP(3),

    CONSTRAINT "appraisals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appraisal_revisions" (
    "id" UUID NOT NULL,
    "appraisal_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "pricing_data" JSONB NOT NULL,
    "total_buy" DECIMAL(20,2) NOT NULL,
    "total_sell" DECIMAL(20,2) NOT NULL,
    "price_changes" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appraisal_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_prices_region_id_idx" ON "market_prices"("region_id");

-- CreateIndex
CREATE UNIQUE INDEX "market_prices_type_id_region_id_key" ON "market_prices"("type_id", "region_id");

-- CreateIndex
CREATE INDEX "market_price_history_type_id_region_id_recorded_at_idx" ON "market_price_history"("type_id", "region_id", "recorded_at");

-- CreateIndex
CREATE INDEX "market_price_history_recorded_at_idx" ON "market_price_history"("recorded_at");

-- CreateIndex
CREATE INDEX "market_fetch_jobs_region_id_status_idx" ON "market_fetch_jobs"("region_id", "status");

-- CreateIndex
CREATE INDEX "appraisals_user_id_idx" ON "appraisals"("user_id");

-- CreateIndex
CREATE INDEX "appraisals_created_at_idx" ON "appraisals"("created_at");

-- CreateIndex
CREATE INDEX "appraisals_expires_at_idx" ON "appraisals"("expires_at");

-- CreateIndex
CREATE INDEX "appraisal_revisions_appraisal_id_idx" ON "appraisal_revisions"("appraisal_id");

-- CreateIndex
CREATE UNIQUE INDEX "appraisal_revisions_appraisal_id_revision_key" ON "appraisal_revisions"("appraisal_id", "revision");

-- AddForeignKey
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "eve_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_price_history" ADD CONSTRAINT "market_price_history_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "eve_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisals" ADD CONSTRAINT "appraisals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_revisions" ADD CONSTRAINT "appraisal_revisions_appraisal_id_fkey" FOREIGN KEY ("appraisal_id") REFERENCES "appraisals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
