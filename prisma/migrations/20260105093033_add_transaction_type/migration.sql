/*
  Warnings:

  - The values [EXPIRED] on the enum `EscrowStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `description` on the `Arbitrator` table. All the data in the column will be lost.
  - You are about to drop the column `registeredAt` on the `Arbitrator` table. All the data in the column will be lost.
  - You are about to drop the column `assignedArbitratorId` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `evidence` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `raisedBy` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `raisedByAddress` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `raisedById` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `txHash` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `amountAda` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `blockHash` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `blockHeight` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `confirmations` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `datum` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `datumHash` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `disputeDeadline` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `funderPubKeyHash` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `lockedAt` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `recipientPubKeyHash` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `txHash` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `arbitratorId` on the `Resolution` table. All the data in the column will be lost.
  - You are about to drop the column `payoutAddress` on the `Resolution` table. All the data in the column will be lost.
  - You are about to drop the column `payoutAmount` on the `Resolution` table. All the data in the column will be lost.
  - You are about to drop the column `payoutAmountAda` on the `Resolution` table. All the data in the column will be lost.
  - You are about to drop the column `resolvedBy` on the `Resolution` table. All the data in the column will be lost.
  - You are about to drop the column `resolvedByAddress` on the `Resolution` table. All the data in the column will be lost.
  - You are about to drop the column `resolvedById` on the `Resolution` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Resolution` table. All the data in the column will be lost.
  - Made the column `lockedTxHash` on table `Arbitrator` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `funderStakeInAda` to the `Escrow` table without a default value. This is not possible if the table is not empty.
  - Made the column `contractIpfsHash` on table `Escrow` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "TransactionCurrency" AS ENUM ('ADA');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREATE_ESCROW', 'DEPOSIT_COLLATERAL', 'CANCEL', 'RELEASE_FUNDS', 'DISPUTE_INITIATOR', 'DISPUTE_RECIPIENT', 'VOTE');

-- AlterEnum
BEGIN;
CREATE TYPE "EscrowStatus_new" AS ENUM ('AWAITING_RECIPIENT', 'ACTIVE', 'APPROVED', 'DISPUTED', 'RESOLVED', 'CANCELLED');
ALTER TABLE "public"."Escrow" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Escrow" ALTER COLUMN "status" TYPE "EscrowStatus_new" USING ("status"::text::"EscrowStatus_new");
ALTER TYPE "EscrowStatus" RENAME TO "EscrowStatus_old";
ALTER TYPE "EscrowStatus_new" RENAME TO "EscrowStatus";
DROP TYPE "public"."EscrowStatus_old";
ALTER TABLE "Escrow" ALTER COLUMN "status" SET DEFAULT 'AWAITING_RECIPIENT';
COMMIT;

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_assignedArbitratorId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_userId_fkey";

-- DropForeignKey
ALTER TABLE "Escrow" DROP CONSTRAINT "Escrow_userId_fkey";

-- DropForeignKey
ALTER TABLE "Resolution" DROP CONSTRAINT "Resolution_arbitratorId_fkey";

-- DropIndex
DROP INDEX "Dispute_assignedArbitratorId_idx";

-- DropIndex
DROP INDEX "Dispute_raisedByAddress_idx";

-- DropIndex
DROP INDEX "Escrow_txHash_idx";

-- DropIndex
DROP INDEX "Escrow_txHash_key";

-- DropIndex
DROP INDEX "Resolution_resolvedByAddress_idx";

-- AlterTable
ALTER TABLE "Arbitrator" DROP COLUMN "description",
DROP COLUMN "registeredAt",
ADD COLUMN     "bio" TEXT,
ALTER COLUMN "lockedTxHash" SET NOT NULL;

-- AlterTable
ALTER TABLE "Dispute" DROP COLUMN "assignedArbitratorId",
DROP COLUMN "evidence",
DROP COLUMN "raisedBy",
DROP COLUMN "raisedByAddress",
DROP COLUMN "raisedById",
DROP COLUMN "reason",
DROP COLUMN "txHash",
DROP COLUMN "userId",
ADD COLUMN     "funderEvidenceIpfsHash" TEXT,
ADD COLUMN     "recipientEvidenceIpfsHash" TEXT,
ADD COLUMN     "requiredArbitratorCount" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "resolutionDeadline" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Escrow" DROP COLUMN "amount",
DROP COLUMN "amountAda",
DROP COLUMN "blockHash",
DROP COLUMN "blockHeight",
DROP COLUMN "confirmations",
DROP COLUMN "datum",
DROP COLUMN "datumHash",
DROP COLUMN "disputeDeadline",
DROP COLUMN "funderPubKeyHash",
DROP COLUMN "lockedAt",
DROP COLUMN "recipientPubKeyHash",
DROP COLUMN "txHash",
DROP COLUMN "userId",
ADD COLUMN     "funderStakeInAda" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "recipientStakeInAda" DOUBLE PRECISION,
ALTER COLUMN "contractIpfsHash" SET NOT NULL;

-- AlterTable
ALTER TABLE "Resolution" DROP COLUMN "arbitratorId",
DROP COLUMN "payoutAddress",
DROP COLUMN "payoutAmount",
DROP COLUMN "payoutAmountAda",
DROP COLUMN "resolvedBy",
DROP COLUMN "resolvedByAddress",
DROP COLUMN "resolvedById",
DROP COLUMN "type";

-- DropEnum
DROP TYPE "ResolutionBy";

-- DropEnum
DROP TYPE "ResolutionType";

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "datum" JSONB NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" "TransactionCurrency" NOT NULL DEFAULT 'ADA',
    "reason" TEXT,
    "type" "TransactionType" NOT NULL DEFAULT 'CREATE_ESCROW',
    "userId" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "disputeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "arbitratorId" TEXT NOT NULL,
    "decision" "ResolutionResult" NOT NULL,
    "reason" TEXT,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ArbitratorToResolution" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ArbitratorToResolution_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ArbitratorDisputes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ArbitratorDisputes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EscrowToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EscrowToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DisputeToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DisputeToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_txHash_key" ON "Transaction"("txHash");

-- CreateIndex
CREATE INDEX "Vote_disputeId_idx" ON "Vote"("disputeId");

-- CreateIndex
CREATE INDEX "Vote_arbitratorId_idx" ON "Vote"("arbitratorId");

-- CreateIndex
CREATE INDEX "Vote_decision_idx" ON "Vote"("decision");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_disputeId_arbitratorId_key" ON "Vote"("disputeId", "arbitratorId");

-- CreateIndex
CREATE INDEX "_ArbitratorToResolution_B_index" ON "_ArbitratorToResolution"("B");

-- CreateIndex
CREATE INDEX "_ArbitratorDisputes_B_index" ON "_ArbitratorDisputes"("B");

-- CreateIndex
CREATE INDEX "_EscrowToUser_B_index" ON "_EscrowToUser"("B");

-- CreateIndex
CREATE INDEX "_DisputeToUser_B_index" ON "_DisputeToUser"("B");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_arbitratorId_fkey" FOREIGN KEY ("arbitratorId") REFERENCES "Arbitrator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArbitratorToResolution" ADD CONSTRAINT "_ArbitratorToResolution_A_fkey" FOREIGN KEY ("A") REFERENCES "Arbitrator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArbitratorToResolution" ADD CONSTRAINT "_ArbitratorToResolution_B_fkey" FOREIGN KEY ("B") REFERENCES "Resolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArbitratorDisputes" ADD CONSTRAINT "_ArbitratorDisputes_A_fkey" FOREIGN KEY ("A") REFERENCES "Arbitrator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArbitratorDisputes" ADD CONSTRAINT "_ArbitratorDisputes_B_fkey" FOREIGN KEY ("B") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EscrowToUser" ADD CONSTRAINT "_EscrowToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Escrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EscrowToUser" ADD CONSTRAINT "_EscrowToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DisputeToUser" ADD CONSTRAINT "_DisputeToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DisputeToUser" ADD CONSTRAINT "_DisputeToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
