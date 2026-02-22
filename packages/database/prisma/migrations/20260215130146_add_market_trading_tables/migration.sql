-- CreateTable
CREATE TABLE "market_character_orders" (
    "id" UUID NOT NULL,
    "character_id" BIGINT NOT NULL,
    "order_id" BIGINT NOT NULL,
    "type_id" INTEGER NOT NULL,
    "region_id" BIGINT NOT NULL,
    "location_id" BIGINT NOT NULL,
    "is_buy_order" BOOLEAN NOT NULL,
    "price" DECIMAL(20,2) NOT NULL,
    "volume_total" INTEGER NOT NULL,
    "volume_remain" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "issued" TIMESTAMP(3) NOT NULL,
    "min_volume" INTEGER NOT NULL DEFAULT 1,
    "state" TEXT NOT NULL DEFAULT 'active',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_character_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_transactions" (
    "id" UUID NOT NULL,
    "character_id" BIGINT NOT NULL,
    "transaction_id" BIGINT NOT NULL,
    "type_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(20,2) NOT NULL,
    "is_buy" BOOLEAN NOT NULL,
    "station_id" BIGINT NOT NULL,
    "journal_ref_id" BIGINT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_profit_entries" (
    "id" UUID NOT NULL,
    "character_id" BIGINT NOT NULL,
    "type_id" INTEGER NOT NULL,
    "buy_transaction_id" UUID,
    "sell_transaction_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "buy_price" DECIMAL(20,2) NOT NULL,
    "sell_price" DECIMAL(20,2) NOT NULL,
    "taxes" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "profit" DECIMAL(20,2) NOT NULL,
    "matched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_profit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "market_character_orders_order_id_key" ON "market_character_orders"("order_id");

-- CreateIndex
CREATE INDEX "market_character_orders_character_id_idx" ON "market_character_orders"("character_id");

-- CreateIndex
CREATE INDEX "market_character_orders_character_id_state_idx" ON "market_character_orders"("character_id", "state");

-- CreateIndex
CREATE INDEX "market_character_orders_type_id_idx" ON "market_character_orders"("type_id");

-- CreateIndex
CREATE UNIQUE INDEX "market_transactions_transaction_id_key" ON "market_transactions"("transaction_id");

-- CreateIndex
CREATE INDEX "market_transactions_character_id_idx" ON "market_transactions"("character_id");

-- CreateIndex
CREATE INDEX "market_transactions_character_id_date_idx" ON "market_transactions"("character_id", "date");

-- CreateIndex
CREATE INDEX "market_transactions_type_id_idx" ON "market_transactions"("type_id");

-- CreateIndex
CREATE INDEX "market_profit_entries_character_id_idx" ON "market_profit_entries"("character_id");

-- CreateIndex
CREATE INDEX "market_profit_entries_character_id_type_id_idx" ON "market_profit_entries"("character_id", "type_id");

-- CreateIndex
CREATE INDEX "market_profit_entries_matched_at_idx" ON "market_profit_entries"("matched_at");

-- AddForeignKey
ALTER TABLE "market_character_orders" ADD CONSTRAINT "market_character_orders_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "eve_characters"("character_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_transactions" ADD CONSTRAINT "market_transactions_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "eve_characters"("character_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_profit_entries" ADD CONSTRAINT "market_profit_entries_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "eve_characters"("character_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_profit_entries" ADD CONSTRAINT "market_profit_entries_buy_transaction_id_fkey" FOREIGN KEY ("buy_transaction_id") REFERENCES "market_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_profit_entries" ADD CONSTRAINT "market_profit_entries_sell_transaction_id_fkey" FOREIGN KEY ("sell_transaction_id") REFERENCES "market_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
