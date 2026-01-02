import { Escrow } from "@/lib/generated/prisma/client";

export type EscrowStatus = "AWAITING_RECIPIENT" |
    "ACTIVE" |
    "APPROVED" |
    "DISPUTED" |
    "RESOLVED" |
    "EXPIRED" |
    "CANCELLED"

export type EscrowTransaction = Escrow & {
}