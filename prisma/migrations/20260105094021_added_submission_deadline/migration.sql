/*
  Warnings:

  - Added the required column `submissionDeadline` to the `Escrow` table without a default value. This is not possible if the table is not empty.
  - Made the column `recipientLockDeadline` on table `Escrow` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Escrow" ADD COLUMN     "submissionDeadline" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "recipientLockDeadline" SET NOT NULL;
