"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ExternalLink,
  FileText,
  Clock,
  AlertTriangle,
  ArrowRightLeft,
  Timer,
  CheckCircle2,
  History,
  Copy,
} from "lucide-react";
import { EscrowTransaction } from "@/types";
import { byteArrayToHash } from "@/lib/utils";
import FloatingDebugJson from "./DebugJson";
import { format } from "date-fns";

interface ViewDetailsDialogProps {
  transaction: EscrowTransaction;
  isOpen: boolean;
  onClose: () => void;
}

export default function ViewDetailsDialog({
  transaction,
  isOpen,
  onClose,
}: ViewDetailsDialogProps) {
  if (!transaction) return null;

  const ipfsUrl = transaction.contractIpfsHash
    ? `https://gateway.pinata.cloud/ipfs/${byteArrayToHash(transaction.contractIpfsHash).split("/").pop()}`
    : "";

  const statusStyles = {
    ACTIVE: "bg-emerald-50 text-emerald-600 border-emerald-200",
    DISPUTED: "bg-rose-50 text-rose-600 border-rose-200",
    AWAITING_RECIPIENT: "bg-amber-50 text-amber-600 border-amber-200",
    APPROVED: "bg-blue-50 text-blue-600 border-blue-200",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-md border-none bg-white p-0 shadow-2xl sm:max-w-[850px]">
        <div className="p-0">
          {/* <FloatingDebugJson data={{ transaction }} /> */}

          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* --- Left Panel: Contract Info & Parties --- */}
            <div className="border-r border-zinc-100 p-8 lg:col-span-7">
              <DialogHeader className="mb-8">
                <div className="mb-2 flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase ${statusStyles[transaction.status as keyof typeof statusStyles] || "bg-zinc-50 text-zinc-600"}`}
                  >
                    {transaction.status?.replace("_", " ")}
                  </Badge>
                  <span className="font-mono text-[10px] text-zinc-400">Ver. 1.0.4</span>
                </div>
                <DialogTitle className="flex items-center gap-2 text-2xl font-bold tracking-tight text-zinc-900">
                  Agreement Details
                </DialogTitle>
                <p className="text-sm text-zinc-500">
                  On-chain verification for Escrow ID:{" "}
                  <span className="font-mono text-xs">{transaction.id.slice(0, 12)}...</span>
                </p>
              </DialogHeader>

              <div className="space-y-6">
                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
                    <p className="mb-1 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                      Funder Locked
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-zinc-900">
                        {transaction.funderStakeInAda}
                      </span>
                      <span className="text-xs font-bold text-zinc-500">ADA</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
                    <p className="mb-1 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                      Recipient Bond
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-zinc-900">
                        {transaction.recipientStakeInAda || 0}
                      </span>
                      <span className="text-xs font-bold text-zinc-500">ADA</span>
                    </div>
                  </div>
                </div>

                {/* Participant Addresses */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-zinc-900 uppercase">
                    <ArrowRightLeft className="text-primary h-3 w-3" />
                    Verified Identities
                  </h4>
                  <div className="space-y-2">
                    <AddressField label="Funder" address={transaction.funderAddress} />
                    <AddressField label="Recipient" address={transaction.recipientAddress} />
                    <AddressField label="Script" address={transaction.scriptAddress} />
                  </div>
                </div>

                {/* Dispute Alert */}
                {transaction.status === "DISPUTED" && (
                  <div className="flex gap-4 rounded-xl border border-rose-100 bg-rose-50 p-4">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
                    <div>
                      <p className="text-xs font-bold text-rose-900 uppercase">Litigation Active</p>
                      <p className="text-[11px] leading-relaxed text-rose-700">
                        Funds are locked in the validator script until an Oracle or Admin resolution
                        is submitted.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* --- Right Panel: Timelines & History --- */}
            <div className="bg-zinc-50/50 p-8 lg:col-span-5">
              <div className="space-y-8">
                {/* Deadlines Section */}
                <section className="space-y-4">
                  <h4 className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-zinc-900 uppercase">
                    <Timer className="text-primary h-3.5 w-3.5" />
                    Key Deadlines
                  </h4>
                  <div className="space-y-4">
                    <DeadlineBox
                      label="Lock Deadline"
                      date={transaction.recipientLockDeadline}
                      desc="Recipient must deposit bond by this time."
                    />
                    <DeadlineBox
                      label="Submission"
                      date={transaction.submissionDeadline}
                      desc="Final work/proof must be submitted."
                    />
                  </div>
                </section>

                <Separator />

                {/* Transaction History (Parsed from transaction.transactions) */}
                <section className="space-y-4">
                  <h4 className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-zinc-900 uppercase">
                    <History className="text-primary h-3.5 w-3.5" />
                    Ledger History
                  </h4>
                  <div className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-0.5 before:bg-zinc-200">
                    {transaction.transactions.map((tx, idx) => (
                      <div key={tx.id} className="relative pl-8">
                        <div className="absolute top-1 left-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-zinc-200 bg-white">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-zinc-900">
                            {tx.type.replace("_", " ")}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {format(new Date(tx.createdAt), "MMM d, yyyy · HH:mm")}
                          </span>
                          <a
                            href={`https://preprod.cardanoscan.io/transaction/${tx.txHash}`}
                            target="_blank"
                            className="text-primary truncate font-mono text-[9px] hover:underline"
                          >
                            {tx.txHash.slice(0, 16)}...
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>

        {/* --- Unified Footer --- */}
        <DialogFooter className="flex flex-col items-center justify-between gap-4 border-t border-zinc-100 bg-white p-6 sm:flex-row">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-2 text-xs font-bold"
              onClick={() => window.open(ipfsUrl, "_blank")}
            >
              <FileText className="h-3.5 w-3.5" />
              VIEW CONTRACT
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              className="h-9 gap-2 px-6 text-xs font-bold"
              onClick={() =>
                window.open(
                  `https://preprod.cardanoscan.io/transaction/${transaction.transactions[0].txHash}`,
                  "_blank"
                )
              }
            >
              <ExternalLink className="h-3.5 w-3.5" />
              EXPLORE ON SCAN
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Sub-components for cleaner code ---

function AddressField({ label, address }: { label: string; address?: string }) {
  if (!address) return null;
  return (
    <div className="group hover:border-primary/30 relative flex flex-col gap-1 rounded-lg border border-zinc-100 bg-white p-3 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold tracking-tighter text-zinc-400 uppercase">
          {label}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => navigator.clipboard.writeText(address)}
        >
          <Copy className="h-2.5 w-2.5" />
        </Button>
      </div>
      <code className="font-mono text-[10px] leading-tight break-all text-zinc-600">{address}</code>
    </div>
  );
}

function DeadlineBox({
  label,
  date,
  desc,
}: {
  label: string;
  date?: string | Date | null;
  desc: string;
}) {
  if (!date) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Clock className="h-3 w-3 text-zinc-400" />
        <span className="text-[10px] font-bold text-zinc-900 uppercase">{label}</span>
      </div>
      <div className="pl-5">
        <p className="text-xs font-bold text-zinc-700">{format(new Date(date), "PPP p")}</p>
        <p className="text-[10px] leading-tight text-zinc-400">{desc}</p>
      </div>
    </div>
  );
}
