-- CreateTable
CREATE TABLE "solar_systems" (
    "system_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,
    "security_status" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "solar_systems_pkey" PRIMARY KEY ("system_id")
);
