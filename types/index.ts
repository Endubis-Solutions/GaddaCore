import { Escrow } from "@/lib/generated/prisma/client";

export type EscrowStatus = "active" | "approved" | "disputed" | "resolved";

export type EscrowTransaction = Escrow & {
}