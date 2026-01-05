"use client";

import React from "react";
import {
  User,
  Clock,
  Lock,
  ExternalLink,
  ShieldCheck,
  FileText,
  Copy,
  CalendarDays,
  Hourglass,
  CheckCircle2,
  Wallet,
  Code2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { byteArrayToHash } from "@/lib/utils"; // Assuming this utility exists based on your snippet
import FloatingDebugJson from "./DebugJson";
import { EscrowTransaction } from "@/types"; // Assuming type exists

interface EscrowAnalysisCardProps {
  data?: EscrowTransaction;
  mode?: "recipient-deposit" | "cancel" | "complete";
}

const formatDateSafe = (dateString?: string | Date | null) => {
  if (!dateString) return "N/A";
  return format(new Date(dateString), "PPP p");
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "AWAITING_RECIPIENT":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "IN_PROGRESS":
      return "text-blue-600 bg-blue-50 border-blue-200";
    case "COMPLETED":
      return "text-emerald-600 bg-emerald-50 border-emerald-200";
    default:
      return "text-zinc-600 bg-zinc-50 border-zinc-200";
  }
};

const AddressRow = ({
  label,
  address,
  icon: Icon,
}: {
  label: string;
  address: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
}) => (
  <div className="flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50/50 p-2.5 transition-colors hover:bg-zinc-50">
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-zinc-200">
        <Icon className="h-3.5 w-3.5 text-zinc-500" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
          {label}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <code className="max-w-[140px] cursor-help truncate font-mono text-[11px] font-medium text-zinc-700 sm:max-w-[180px]">
                {address}
              </code>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-mono text-xs">{address}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-zinc-400 hover:text-zinc-700"
      onClick={() => navigator.clipboard.writeText(address)}
    >
      <Copy className="h-3 w-3" />
    </Button>
  </div>
);

export const EscrowAnalysisCard = ({
  data,
  mode = "recipient-deposit",
}: EscrowAnalysisCardProps) => {
  if (!data) {
    return <Skeleton className="h-[600px] w-full rounded-xl" />;
  }

  const isPendingRecipient = data.status === "AWAITING_RECIPIENT";
  const ipfsLink = data.contractIpfsHash
    ? `https://gateway.pinata.cloud/ipfs/${byteArrayToHash(data.contractIpfsHash).split("/").pop()}`
    : "#";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
      <div className="relative overflow-hidden border-l border-zinc-200/80 bg-white">
        <FloatingDebugJson data={{ data }} />

        {/* --- Header Section --- */}
        <div className="relative p-6 pb-2">
          <div className="mb-6 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase ${getStatusColor(
                    data.status
                  )}`}
                >
                  {data.status.replace("_", " ")}
                </Badge>
                <span className="text-[10px] font-medium text-zinc-400">
                  {formatDistanceToNow(new Date(data.createdAt))} ago
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900">
                Smart Contract Ledger
              </h2>
            </div>
            <div className="rounded-lg bg-zinc-100 p-2">
              <Code2 className="h-5 w-5 text-zinc-400" />
            </div>
          </div>

          {/* Value Summary */}
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                Funder Locked
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-zinc-900">{data.funderStakeInAda}</span>
                <span className="text-xs font-bold text-zinc-500">ADA</span>
              </div>
            </div>
            <div className="space-y-1 border-l border-zinc-200 pl-4">
              <p className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                Recipient Bond
              </p>
              {data.recipientStakeInAda ? (
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-zinc-900">
                    {data.recipientStakeInAda}
                  </span>
                  <span className="text-xs font-bold text-zinc-500">ADA</span>
                </div>
              ) : (
                <div className="flex h-8 items-center gap-1.5">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span className="text-sm font-semibold text-zinc-400 italic">Pending...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-4 opacity-50" />

        {/* --- Timeline Section --- */}
        <div className="space-y-4 px-6">
          <h3 className="flex items-center gap-2 text-xs font-bold tracking-widest text-zinc-900 uppercase">
            <CalendarDays className="text-primary h-3.5 w-3.5" />
            Critical Timeline
          </h3>
          <div className="relative ml-1.5 space-y-6 border-l-2 border-zinc-100 py-2 pl-6">
            {/* Created */}
            <div className="relative">
              <span className="absolute top-1 -left-[29px] h-3 w-3 rounded-full border-2 border-white bg-zinc-300 shadow-sm" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Created</span>
                <span className="text-xs font-medium text-zinc-700">
                  {formatDateSafe(data.createdAt)}
                </span>
              </div>
            </div>

            {/* Lock Deadline */}
            <div className="relative">
              <span
                className={`absolute top-1 -left-[29px] h-3 w-3 rounded-full border-2 border-white shadow-sm ${
                  isPendingRecipient ? "animate-pulse bg-amber-500" : "bg-zinc-300"
                }`}
              />
              <div className="flex flex-col">
                <span
                  className={`text-[10px] font-bold uppercase ${isPendingRecipient ? "text-amber-600" : "text-zinc-400"}`}
                >
                  Acceptance Deadline
                </span>
                <span className="text-xs font-medium text-zinc-900">
                  {formatDateSafe(data.recipientLockDeadline)}
                </span>
                {isPendingRecipient && (
                  <span className="mt-0.5 text-[10px] font-medium text-amber-600">
                    (Action Required)
                  </span>
                )}
              </div>
            </div>

            {/* Submission Deadline */}
            <div className="relative">
              <span className="absolute top-1 -left-[29px] h-3 w-3 rounded-full border-2 border-white bg-zinc-200 shadow-sm" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">
                  Project Deadline
                </span>
                <span className="text-xs font-medium text-zinc-700">
                  {formatDateSafe(data.submissionDeadline)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-4 opacity-50" />

        {/* --- Identities Section --- */}
        <div className="space-y-3 px-6 pb-6">
          <h3 className="mb-4 flex items-center gap-2 text-xs font-bold tracking-widest text-zinc-900 uppercase">
            <ShieldCheck className="text-primary h-3.5 w-3.5" />
            Contract Participants
          </h3>

          <AddressRow label="Funder (Initiator)" address={data.funderAddress} icon={User} />

          <AddressRow
            label="Recipient (Worker)"
            address={data.recipientAddress || "Not yet assigned"}
            icon={Wallet}
          />

          <div className="mt-2">
            <AddressRow
              label="Contract Script (Validator)"
              address={data.scriptAddress}
              icon={Code2}
            />
          </div>
        </div>

        {/* --- Footer / Terms --- */}
        <div className="bg-zinc-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-800">
                <FileText className="h-4 w-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                  Agreement Terms
                </p>
                <p className="text-[10px] text-zinc-400">Stored immutably on IPFS</p>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              className="h-8 bg-white text-[10px] font-bold tracking-wide text-zinc-900 hover:bg-zinc-200"
            >
              <a href={ipfsLink} target="_blank" rel="noreferrer">
                VIEW DOCUMENT <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3">
            <span className="font-mono text-[9px] text-zinc-600">
              ID: {data.id.slice(0, 8)}...{data.id.slice(-6)}
            </span>
            <span className="flex items-center gap-1 font-mono text-[9px] text-zinc-600">
              <CheckCircle2 className="h-3 w-3 text-emerald-900" />
              Verified
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
