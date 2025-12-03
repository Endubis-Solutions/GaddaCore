export type EscrowStatus = "active" | "approved" | "disputed" | "resolved";

export interface EscrowTransaction {
  id: string;
  txHash: string;
  amount: number; // in lovelace
  recipientAddress: string;
  status: EscrowStatus;
  createdAt: Date;
  disputeDeadline: number; // timestamp
  datum: unknown;
}