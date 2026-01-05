import { Escrow, Transaction } from "@/lib/generated/prisma/client";

export type EscrowStatus =
  | "AWAITING_RECIPIENT"
  | "ACTIVE"
  | "APPROVED"
  | "DISPUTED"
  | "RESOLVED"
  | "CANCELLED";

export type EscrowTransaction = Escrow & {
  transactions: Transaction[];
};
