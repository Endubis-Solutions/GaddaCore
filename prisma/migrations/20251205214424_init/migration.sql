-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('AWAITING_RECIPIENT', 'ACTIVE', 'APPROVED', 'DISPUTED', 'RESOLVED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_REVIEW', 'RESOLVED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DisputeRaisedBy" AS ENUM ('FUNDER', 'RECIPIENT');

-- CreateEnum
CREATE TYPE "ResolutionType" AS ENUM ('DIRECT_RELEASE', 'DIRECT_REFUND', 'ARBITRATED_RELEASE', 'ARBITRATED_REFUND');

-- CreateEnum
CREATE TYPE "ResolutionResult" AS ENUM ('RELEASE', 'REFUND');

-- CreateEnum
CREATE TYPE "ResolutionBy" AS ENUM ('FUNDER', 'RECIPIENT', 'ARBITRATOR');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('USER', 'ARBITRATOR', 'ESCROW', 'DISPUTE', 'RESOLUTION');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "network" TEXT NOT NULL DEFAULT 'preprod';

-- CreateTable
CREATE TABLE "Escrow" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "scriptAddress" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "amountAda" DOUBLE PRECISION NOT NULL,
    "funderAddress" TEXT NOT NULL,
    "funderPubKeyHash" TEXT,
    "recipientAddress" TEXT NOT NULL,
    "recipientPubKeyHash" TEXT,
    "status" "EscrowStatus" NOT NULL DEFAULT 'AWAITING_RECIPIENT',
    "disputeDeadline" TIMESTAMP(3),
    "recipientLockDeadline" TIMESTAMP(3),
    "datum" JSONB NOT NULL,
    "contractIpfsHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolutionDeadline" TIMESTAMP(3),
    "datumHash" TEXT,
    "scriptCbor" TEXT,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "blockHeight" INTEGER,
    "blockHash" TEXT,
    "approvedAt" TIMESTAMP(3),
    "disputedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "userId" TEXT,

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "raisedBy" "DisputeRaisedBy" NOT NULL,
    "raisedById" TEXT,
    "raisedByAddress" TEXT NOT NULL,
    "reason" TEXT,
    "evidence" TEXT,
    "txHash" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'PENDING',
    "assignedArbitratorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "userId" TEXT,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resolution" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "type" "ResolutionType" NOT NULL,
    "result" "ResolutionResult" NOT NULL,
    "resolvedBy" "ResolutionBy" NOT NULL,
    "resolvedById" TEXT,
    "resolvedByAddress" TEXT NOT NULL,
    "arbitratorId" TEXT,
    "payoutAddress" TEXT NOT NULL,
    "payoutAmount" BIGINT NOT NULL,
    "payoutAmountAda" DOUBLE PRECISION NOT NULL,
    "txHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disputeId" TEXT,
    "userId" TEXT,

    CONSTRAINT "Resolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedByAddress" TEXT,
    "metadata" JSONB,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Escrow_txHash_key" ON "Escrow"("txHash");

-- CreateIndex
CREATE INDEX "Escrow_txHash_idx" ON "Escrow"("txHash");

-- CreateIndex
CREATE INDEX "Escrow_funderAddress_idx" ON "Escrow"("funderAddress");

-- CreateIndex
CREATE INDEX "Escrow_recipientAddress_idx" ON "Escrow"("recipientAddress");

-- CreateIndex
CREATE INDEX "Escrow_status_idx" ON "Escrow"("status");

-- CreateIndex
CREATE INDEX "Escrow_createdAt_idx" ON "Escrow"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_escrowId_key" ON "Dispute"("escrowId");

-- CreateIndex
CREATE INDEX "Dispute_escrowId_idx" ON "Dispute"("escrowId");

-- CreateIndex
CREATE INDEX "Dispute_raisedByAddress_idx" ON "Dispute"("raisedByAddress");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "Dispute_assignedArbitratorId_idx" ON "Dispute"("assignedArbitratorId");

-- CreateIndex
CREATE INDEX "Dispute_createdAt_idx" ON "Dispute"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Resolution_escrowId_key" ON "Resolution"("escrowId");

-- CreateIndex
CREATE UNIQUE INDEX "Resolution_disputeId_key" ON "Resolution"("disputeId");

-- CreateIndex
CREATE INDEX "Resolution_escrowId_idx" ON "Resolution"("escrowId");

-- CreateIndex
CREATE INDEX "Resolution_txHash_idx" ON "Resolution"("txHash");

-- CreateIndex
CREATE INDEX "Resolution_resolvedByAddress_idx" ON "Resolution"("resolvedByAddress");

-- CreateIndex
CREATE INDEX "Resolution_createdAt_idx" ON "Resolution"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivityLog_performedBy_idx" ON "ActivityLog"("performedBy");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "User_network_idx" ON "User"("network");

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_assignedArbitratorId_fkey" FOREIGN KEY ("assignedArbitratorId") REFERENCES "Arbitrator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resolution" ADD CONSTRAINT "Resolution_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resolution" ADD CONSTRAINT "Resolution_arbitratorId_fkey" FOREIGN KEY ("arbitratorId") REFERENCES "Arbitrator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resolution" ADD CONSTRAINT "Resolution_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resolution" ADD CONSTRAINT "Resolution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
