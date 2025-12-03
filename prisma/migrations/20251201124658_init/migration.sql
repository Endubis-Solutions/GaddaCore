-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ARBITRATOR', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Arbitrator" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "expertise" TEXT[],
    "isQualified" BOOLEAN NOT NULL DEFAULT false,
    "qualificationScore" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lockedAmount" BIGINT NOT NULL DEFAULT 0,
    "lockedTxHash" TEXT,
    "totalEarned" BIGINT NOT NULL DEFAULT 0,
    "totalLost" BIGINT NOT NULL DEFAULT 0,
    "totalCases" INTEGER NOT NULL DEFAULT 0,
    "correctVotes" INTEGER NOT NULL DEFAULT 0,
    "wrongVotes" INTEGER NOT NULL DEFAULT 0,
    "reputationScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Arbitrator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE INDEX "User_walletAddress_idx" ON "User"("walletAddress");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Arbitrator_walletAddress_key" ON "Arbitrator"("walletAddress");

-- CreateIndex
CREATE INDEX "Arbitrator_reputationScore_idx" ON "Arbitrator"("reputationScore");

-- CreateIndex
CREATE INDEX "Arbitrator_isQualified_idx" ON "Arbitrator"("isQualified");

-- CreateIndex
CREATE INDEX "Arbitrator_isActive_idx" ON "Arbitrator"("isActive");

-- CreateIndex
CREATE INDEX "Arbitrator_lockedAmount_idx" ON "Arbitrator"("lockedAmount");

-- AddForeignKey
ALTER TABLE "Arbitrator" ADD CONSTRAINT "Arbitrator_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;
