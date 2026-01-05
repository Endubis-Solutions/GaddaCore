"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ExternalLink,
  Lock,
  Scale,
  ShieldCheck,
  DollarSign,
  Shield,
  AlertCircleIcon,
  AlertTriangle,
  X,
  Plus,
  CheckCircle,
  ChevronDown,
  Eye,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  Clock,
  Hash,
  User,
  Wallet,
  FileText,
  Link as LinkIcon,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { useWalletContext } from "@/contexts/WalletContext";
import { useGetUsersEscrowQuery } from "@/services/escrow.service";
import { EscrowTransaction, EscrowStatus } from "@/types";
import { formatAddress, formatDate, calculateTimeRemaining } from "@/utils";

import HeroSection from "./_components/HeroSection";
import StatCard from "@/components/custom/StatCard";
import ViewDetailsDialog from "@/components/custom/ViewDetailDialog";
import { useRouter } from "next/navigation";
import FloatingDebugJson from "@/components/custom/DebugJson";
import { byteArrayToHash } from "@/lib/utils";

// --- COPY TO CLIPBOARD COMPONENT ---
interface CopyToClipboardProps {
  text: string;
  format?: boolean;
  prefix?: string;
  className?: string;
}

function CopyToClipboard({ text, format = false, prefix, className = "" }: CopyToClipboardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const displayText = format ? formatAddress(text, 6, 4) : text;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleCopy}
            className={`group hover:text-primary flex cursor-pointer items-center gap-2 transition-colors ${className}`}
          >
            {prefix && <span className="text-muted-foreground">{prefix}</span>}
            <code className="bg-muted hover:bg-muted/80 rounded px-2 py-1 font-mono text-sm transition-colors">
              {displayText}
            </code>
            <div className="relative h-4 w-4">
              <Copy
                className={`text-muted-foreground group-hover:text-primary h-4 w-4 transition-all ${copied ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
              />
              <Check
                className={`absolute top-0 left-0 h-4 w-4 text-emerald-500 transition-all ${copied ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
              />
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent>{copied ? "Copied!" : "Click to copy"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// --- ENHANCED DATA DISPLAY COMPONENT ---
interface DataDisplayProps {
  label: string;
  value: string | number | Date | null | undefined;
  type?: "string" | "number" | "date" | "currency";
  icon?: React.ReactNode;
  copyable?: boolean;
  link?: string;
  className?: string;
}

function DataDisplay({
  label,
  value,
  type = "string",
  icon,
  copyable = false,
  link,
  className = "",
}: DataDisplayProps) {
  const MAX_CHAR_TO_DISPLAY = 24;
  const getFormattedValue = () => {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    switch (type) {
      case "number":
        return Number(value).toLocaleString();
      case "currency":
        return `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ADA`;
      case "date":
        return formatDate(value as Date);
      default:
        return String(value);
    }
  };

  const formattedValue = getFormattedValue();

  if (link) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">{label}</span>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary flex items-center gap-1 text-sm transition-colors"
          >
            {formattedValue.length > MAX_CHAR_TO_DISPLAY
              ? formattedValue.slice(0, MAX_CHAR_TO_DISPLAY) + "..."
              : formattedValue}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  if (copyable && formattedValue !== "-") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">{label}</span>
          <CopyToClipboard text={String(value)} format={type === "string"} />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <div className="flex flex-col">
        <span className="text-muted-foreground text-xs">{label}</span>
        <span className="text-sm font-medium">
          {formattedValue.length > MAX_CHAR_TO_DISPLAY
            ? `${formattedValue.slice(0, MAX_CHAR_TO_DISPLAY)}...`
            : formattedValue}
        </span>
      </div>
    </div>
  );
}

// --- HELPER FUNCTIONS ---
const getStatusColor = (status: EscrowStatus): string => {
  const colors: Record<EscrowStatus, string> = {
    AWAITING_RECIPIENT: " text-amber-600 ",
    ACTIVE: "text-emerald-600 border-emerald-500/20",
    APPROVED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    DISPUTED: "bg-red-500/10 text-red-600 border-red-500/20",
    RESOLVED: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    CANCELLED: " text-gray-600 ",
  };
  return colors[status] || " text-gray-600";
};

const getStatusIcon = (status: EscrowStatus) => {
  switch (status) {
    case "AWAITING_RECIPIENT":
      return <AlertTriangle className="h-7 w-7" strokeWidth={1.25} />;
    case "ACTIVE":
      return <Lock className="h-7 w-7" strokeWidth={1.25} />;
    case "APPROVED":
      return <CheckCircle className="h-7 w-7" strokeWidth={1.25} />;
    case "DISPUTED":
      return <Scale className="h-7 w-7" strokeWidth={1.25} />;
    case "RESOLVED":
      return <ShieldCheck className="h-7 w-7" strokeWidth={1.25} />;
    case "CANCELLED":
      return <X className="h-7 w-7" strokeWidth={1.25} />;
    default:
      return <Shield className="h-7 w-7" strokeWidth={1.25} />;
  }
};

// --- ENHANCED TRANSACTION ROW COMPONENT ---
interface TransactionRowProps {
  transaction: EscrowTransaction;
  role: "funder" | "recipient";
  onApprove: (tx: EscrowTransaction) => void;
  onDispute: (tx: EscrowTransaction) => void;
  onCancel: (tx: EscrowTransaction) => void;
  onDeposit: (tx: EscrowTransaction) => void;
  onViewDetails: (tx: EscrowTransaction) => void;
  isLoading: boolean;
}

function TransactionRow({
  transaction,
  role,
  onApprove,
  onDispute,
  onCancel,
  onDeposit,
  onViewDetails,
  isLoading,
}: TransactionRowProps) {
  const isRecipient = role === "recipient";
  const statusColor = getStatusColor(transaction.status);
  const now = new Date();
  const isExpired =
    transaction.recipientLockDeadline && new Date(transaction.recipientLockDeadline) < now;
  const timeRemaining = transaction.recipientLockDeadline
    ? calculateTimeRemaining(new Date(transaction.recipientLockDeadline))
    : null;

  return (
    <TableRow className="group border-border/40 hover:bg-muted/40 items-center border-b transition-all">
      {/* Amount & Details */}
      <TableCell className="py-5 pl-6 align-top">
        <div className="flex gap-4">
          <div
            className={`flex h-11 w-11 items-center justify-center transition-transform duration-200 group-hover:scale-105 ${statusColor}`}
          >
            {getStatusIcon(transaction.status)}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="text-foreground text-base font-semibold tracking-tight">
                {transaction.funderStakeInAda.toFixed(2)}{" "}
                <span className="text-muted-foreground text-[10px] font-bold uppercase">ADA</span>
              </span>
              {transaction.recipientStakeInAda && (
                <Badge variant="outline" className="h-5 py-0 text-xs">
                  +{transaction.recipientStakeInAda.toFixed(2)} ADA stake
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <DataDisplay
                label="Escrow ID"
                value={transaction.id}
                copyable={true}
                icon={<Hash className="h-3 w-3" />}
                className="text-xs"
              />
              {transaction.scriptAddress && (
                <DataDisplay
                  label="Script Address"
                  value={transaction.scriptAddress}
                  copyable={true}
                  icon={<FileText className="h-3 w-3" />}
                  className="text-xs"
                />
              )}
            </div>
          </div>
        </div>
      </TableCell>

      {/* Status & Timeline */}
      <TableCell className="items-start py-5 align-top">
        <div className="flex flex-col gap-3">
          <Badge
            variant="outline"
            className={`w-fit rounded-lg border px-3 py-1 text-xs font-bold tracking-[0.05em] uppercase ${statusColor}`}
          >
            <div className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            {transaction.status.replace("_", " ")}
          </Badge>

          <div className="space-y-2">
            {timeRemaining && transaction.status === "AWAITING_RECIPIENT" && (
              <DataDisplay
                label="Time Remaining"
                value={
                  isExpired
                    ? "EXPIRED"
                    : `${timeRemaining.hours} h ${timeRemaining.minutes} m ${timeRemaining.seconds} s`
                }
                type="string"
                icon={<Clock className="h-3 w-3" />}
                className={`text-xs ${isExpired ? "text-red-500" : "text-amber-600"}`}
              />
            )}

            {transaction.resolutionDeadline &&
              ["ACTIVE", "DISPUTED"].includes(transaction.status) && (
                <DataDisplay
                  label="Resolution Deadline"
                  value={transaction.resolutionDeadline}
                  type="date"
                  icon={<Calendar className="h-3 w-3" />}
                  className="text-xs"
                />
              )}

            <DataDisplay
              label="Created"
              value={transaction.createdAt}
              type="date"
              icon={<Calendar className="h-3 w-3" />}
              className="text-xs"
            />
          </div>
        </div>
      </TableCell>

      {/* Participants */}
      <TableCell className="py-5 align-top">
        <div className="space-y-3">
          <DataDisplay
            label={isRecipient ? "Funder Address" : "Recipient Address"}
            value={isRecipient ? transaction.funderAddress : transaction.recipientAddress}
            copyable={true}
            icon={<User className="h-3 w-3" />}
          />

          {transaction.transactions[0]?.txHash && (
            <DataDisplay
              label="Transaction Hash"
              value={transaction.transactions[0].txHash}
              copyable={true}
              icon={<Wallet className="h-3 w-3" />}
              link={`https://preprod.cardanoscan.io/transaction/${transaction.transactions[0].txHash}`}
            />
          )}

          {transaction.contractIpfsHash && (
            <DataDisplay
              label="Contract IPFS"
              value={byteArrayToHash(transaction.contractIpfsHash)}
              copyable={true}
              icon={<LinkIcon className="h-3 w-3" />}
              link={`https://ipfs.io/ipfs/${byteArrayToHash(transaction.contractIpfsHash)}`}
            />
          )}
        </div>
      </TableCell>

      {/* Resolutions & Actions */}
      <TableCell className="py-5 align-top">
        <div className="space-y-3">
          {transaction.approvedAt && (
            <DataDisplay
              label="Approved At"
              value={transaction.approvedAt}
              type="date"
              icon={<CheckCircle className="h-3 w-3" />}
            />
          )}

          {transaction.disputedAt && (
            <DataDisplay
              label="Disputed At"
              value={transaction.disputedAt}
              type="date"
              icon={<Scale className="h-3 w-3" />}
            />
          )}

          {transaction.resolvedAt && (
            <DataDisplay
              label="Resolved At"
              value={transaction.resolvedAt}
              type="date"
              icon={<ShieldCheck className="h-3 w-3" />}
            />
          )}

          {transaction.updatedAt && (
            <DataDisplay
              label="Last Updated"
              value={transaction.updatedAt}
              type="date"
              icon={<RefreshCw className="h-3 w-3" />}
            />
          )}
        </div>
      </TableCell>

      {/* Action Group */}
      <TableCell className="py-5 pr-6 text-right align-top">
        <div className="flex flex-col items-end gap-3 opacity-90 transition-opacity group-hover:opacity-100">
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-lg font-semibold transition-all"
            onClick={() => onViewDetails(transaction)}
          >
            <Eye className="h-4 w-4" />
            {` `}Details
          </Button>

          {/* Recipient Specific Actions */}
          {transaction.status === "AWAITING_RECIPIENT" && isRecipient && !isExpired && (
            <Button
              variant="outline"
              size="sm"
              className="border-border hover:bg-accent h-9 rounded-lg font-semibold transition-all"
              onClick={() => onDeposit(transaction)}
              disabled={isLoading}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Deposit Stake
            </Button>
          )}

          {/* Funder Specific Actions */}
          {["AWAITING_RECIPIENT", "ACTIVE"].includes(transaction.status) && role === "funder" && (
            <div className="animate-in fade-in slide-in-from-right-2 flex flex-col gap-2">
              {transaction.status === "ACTIVE" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg px-4 font-semibold transition-all"
                  onClick={() => onApprove(transaction)}
                  disabled={isLoading}
                >
                  Release Funds
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="hover:text-destructive hover:bg-destructive/10 h-9 rounded-lg font-semibold"
                onClick={() => onDispute(transaction)}
                disabled={isLoading}
              >
                Raise Dispute
              </Button>

              {transaction.status === "AWAITING_RECIPIENT" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg font-semibold hover:bg-rose-50 hover:text-rose-600"
                  onClick={() => onCancel(transaction)}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                  {` `}Cancel
                </Button>
              )}
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// --- PAGINATION COMPONENT ---
interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}: PaginationControlsProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between border-t border-zinc-100 px-2 py-4">
      <div className="text-sm text-zinc-500">
        Showing{" "}
        <span className="font-semibold text-zinc-700">
          {startItem}-{endItem}
        </span>{" "}
        of <span className="font-semibold text-zinc-700">{totalItems}</span> results
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="gap-1"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </PaginationItem>

          <PaginationItem>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
          </PaginationItem>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              if (pageNum < 1 || pageNum > totalPages) return null;

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "ghost"}
                  size="sm"
                  className={`h-8 w-8 ${currentPage === pageNum ? "bg-primary text-white" : ""}`}
                  onClick={() => onPageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <PaginationItem>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </PaginationItem>

          <PaginationItem>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="gap-1"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

// --- DUMMY STAT DATA ---
const dummyStats = {
  totalValueLocked: "2,850 ADA",
  activeEscrows: 8,
  pendingActions: 3,
  disputeCount: 2,
  successRate: "96.5%",
  avgStakeAmount: "145 ADA",
  totalTransactions: 24,
  casesRaised: 1,
};

// --- MAIN PAGE ---
export default function Home() {
  const { connected, changeAddress, isUserSynced, userSyncError, isUserSyncing } =
    useWalletContext();
  const router = useRouter();

  const { data, isLoading: escrowsLoading } = useGetUsersEscrowQuery(changeAddress, isUserSynced);
  const [isLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<EscrowStatus[]>([
    "AWAITING_RECIPIENT",
    "ACTIVE",
    "DISPUTED",
    "CANCELLED",
    "APPROVED",
    "RESOLVED",
  ]);
  const [selectedTransaction, setSelectedTransaction] = useState<EscrowTransaction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const escrows = useMemo(() => data || [], [data]);

  // Calculate real stats from user data
  const calculateRealStats = useCallback((escrows: EscrowTransaction[], address: string) => {
    const myEscrows = escrows.filter(
      (tx) => tx.recipientAddress === address || tx.funderAddress === address
    );

    const activeEscrows = myEscrows.filter(
      (tx) => tx.status === "ACTIVE" || tx.status === "AWAITING_RECIPIENT"
    ).length;

    const pendingForMe = myEscrows.filter(
      (tx) => tx.status === "AWAITING_RECIPIENT" && tx.recipientAddress === address
    ).length;

    const disputeCount = myEscrows.filter((tx) => tx.status === "DISPUTED").length;

    const totalValue = myEscrows.reduce((sum, tx) => sum + tx.funderStakeInAda, 0);

    const successfulEscrows = myEscrows.filter((tx) => tx.status === "APPROVED").length;
    const successRate = myEscrows.length > 0 ? (successfulEscrows / myEscrows.length) * 100 : 0;

    return {
      activeEscrows,
      pendingActions: pendingForMe,
      totalValueLocked: `${totalValue.toLocaleString()} ADA`,
      totalTransactions: myEscrows.length,
      disputeCount,
      successRate: `${successRate.toFixed(1)}%`,
    };
  }, []);

  const realStats = changeAddress ? calculateRealStats(escrows, changeAddress) : null;

  // Combine dummy and real stats
  const displayStats = {
    totalValueLocked: realStats?.totalValueLocked || 0,
    activeEscrows: realStats?.activeEscrows || 0,
    pendingActions: realStats?.pendingActions || 0,
    disputeCount: realStats?.disputeCount !== undefined ? realStats.disputeCount : 0,
    successRate: realStats?.successRate || 0,
    totalTransactions: realStats?.totalTransactions || 0,
  };

  // Combine all user's escrows (both funded and received)
  const myEscrows = escrows.filter(
    (tx) => tx.recipientAddress === changeAddress || tx.funderAddress === changeAddress
  );

  // Identify pending for recipient escrows for highlighting
  const pendingForRecipient = myEscrows.filter(
    (tx) => tx.status === "AWAITING_RECIPIENT" && tx.recipientAddress === changeAddress
  );

  // Search filter function
  const filterBySearch = useCallback(
    (transactions: EscrowTransaction[]) => {
      if (!searchTerm.trim()) return transactions;

      const term = searchTerm.toLowerCase().trim();
      return transactions.filter(
        (tx) =>
          tx.funderAddress.toLowerCase().includes(term) ||
          tx.recipientAddress.toLowerCase().includes(term) ||
          tx.transactions[0]?.txHash?.toLowerCase().includes(term) ||
          tx.id.toLowerCase().includes(term) ||
          tx.scriptAddress.toLowerCase().includes(term) ||
          tx.funderStakeInAda.toString().includes(term) ||
          (tx.recipientStakeInAda?.toString() || "").includes(term) ||
          tx.status.toLowerCase().includes(term)
      );
    },
    [searchTerm]
  );

  // Apply status filter and search
  const filteredEscrows = filterBySearch(
    myEscrows.filter((tx) => statusFilter.includes(tx.status))
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredEscrows.length / itemsPerPage);
  const paginatedEscrows = filteredEscrows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Status options for filter
  const statusOptions: { value: EscrowStatus; label: string }[] = [
    { value: "AWAITING_RECIPIENT", label: "Awaiting Recipient" },
    { value: "ACTIVE", label: "Active" },
    { value: "DISPUTED", label: "Disputed" },
    { value: "APPROVED", label: "Approved" },
    { value: "RESOLVED", label: "Resolved" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  const handleStatusFilterChange = (status: EscrowStatus) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewDetails = (transaction: EscrowTransaction) => {
    setSelectedTransaction(transaction);
  };

  const handleCloseDetails = () => {
    setSelectedTransaction(null);
  };

  // Action handlers
  const handleApprove = (tx: EscrowTransaction) => {
    router.push(`/release-payment?id=${tx.id}`);
  };

  const handleDispute = (tx: EscrowTransaction) => {
    router.push(`/dispute?id=${tx.id}`);
  };

  const handleCancel = (tx: EscrowTransaction) => {
    router.push(`/cancel-payment?id=${tx.id}`);
  };

  const handleDeposit = (tx: EscrowTransaction) => {
    router.push(`/recipient-deposit?id=${tx.id}`);
  };

  const getRoleForTransaction = (transaction: EscrowTransaction): "funder" | "recipient" => {
    return transaction.funderAddress === changeAddress ? "funder" : "recipient";
  };

  if (!connected) return <HeroSection />;
  if (escrowsLoading)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Spinner className="size-12" />
        <FloatingDebugJson data={{ isUserSynced, userSyncError, isUserSyncing }} />
      </div>
    );

  if (isUserSyncing) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Spinner className="size-12" />
        <p>Is Syncing user info</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-12 px-6 py-12">
      {/* Stat Cards Section */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Agreements"
          value={displayStats.activeEscrows}
          icon={Shield}
          trend={displayStats.activeEscrows > 0 ? "up" : undefined}
        />

        <StatCard
          label="Pending Actions"
          value={displayStats.pendingActions}
          icon={AlertCircleIcon}
          trend={displayStats.pendingActions > 0 ? "down" : undefined}
        />

        <StatCard
          label="Total Value Locked"
          value={displayStats.totalValueLocked}
          icon={DollarSign}
          trend="up"
        />

        <StatCard
          label="Dispute Cases"
          value={displayStats.disputeCount}
          icon={Scale}
          trend={displayStats.disputeCount > 0 ? "down" : undefined}
        />
      </div>

      <section>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-5 w-1 rounded-full bg-zinc-900" />
            <h2 className="text-[11px] font-black tracking-[0.2em] text-zinc-400 uppercase">
              My Agreements ({filteredEscrows.length})
            </h2>
          </div>
          <span className="text-xs text-zinc-400">
            Showing {filteredEscrows.length} of {myEscrows.length}
          </span>
        </div>

        {/* Pending Actions Alert */}
        {pendingForRecipient.length > 0 && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircleIcon className="mt-0.5 h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-amber-900">
                    Action Required: {pendingForRecipient.length} agreement(s) awaiting your stake
                    deposit
                  </h3>
                  <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800">
                    {pendingForRecipient.length} pending
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-amber-700">
                  You have {pendingForRecipient.length} agreement(s) where {`you're`} the recipient.
                  Deposit your stake to activate these agreements.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-zinc-400" />
            <Input
              placeholder="Search by address, transaction hash, or amount..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="h-10 rounded-none border-0 border-b border-zinc-200 pl-10 shadow-none focus-visible:ring-0"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1/2 right-2 h-6 w-6 -translate-y-1/2 transform p-0"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-2">
                  <Filter className="h-4 w-4" />
                  Filter Status
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {statusOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={statusFilter.includes(option.value)}
                    onCheckedChange={() => handleStatusFilterChange(option.value)}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <div className="px-2 py-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setStatusFilter(["AWAITING_RECIPIENT", "ACTIVE", "DISPUTED"]);
                      setCurrentPage(1);
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {(searchTerm || statusFilter.length !== 3) && (
              <Button
                variant="destructive"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter(["AWAITING_RECIPIENT", "ACTIVE", "DISPUTED"]);
                  setCurrentPage(1);
                }}
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Single Table for All Agreements */}
        <Card className="overflow-hidden rounded-md border-zinc-100 bg-white shadow-none">
          <Table>
            <TableHeader className="border-b border-zinc-100 bg-zinc-50/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12 pl-6 text-[10px] font-bold text-zinc-400 uppercase">
                  Agreement Details
                </TableHead>
                <TableHead className="h-12 text-[10px] font-bold text-zinc-400 uppercase">
                  Status & Timeline
                </TableHead>
                <TableHead className="h-12 text-[10px] font-bold text-zinc-400 uppercase">
                  Participants & Links
                </TableHead>
                <TableHead className="h-12 text-[10px] font-bold text-zinc-400 uppercase">
                  Resolutions
                </TableHead>
                <TableHead className="h-12 pr-6 text-right text-[10px] font-bold text-zinc-400 uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEscrows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ShieldCheck className="h-10 w-10 text-zinc-200" />
                      <p className="text-sm font-medium text-zinc-400">
                        {searchTerm
                          ? `No agreements found for "${searchTerm}"`
                          : "No agreements match your filters."}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter(["AWAITING_RECIPIENT", "ACTIVE", "DISPUTED"]);
                          setCurrentPage(1);
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEscrows.map((tx) => {
                  const role = getRoleForTransaction(tx);
                  const isPendingForRecipient =
                    tx.status === "AWAITING_RECIPIENT" && role === "recipient";

                  return (
                    <TableRow
                      key={tx.id}
                      className={`group border-border/40 hover:bg-muted/40 transition-al items-center border-b`}
                    >
                      <TableCell className="py-5 pl-6 align-top">
                        <div className="flex gap-4">
                          <div
                            className={`flex h-11 w-11 items-center justify-center transition-transform duration-200 group-hover:scale-105 ${getStatusColor(tx.status)}`}
                          >
                            {getStatusIcon(tx.status)}
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                              <span className="text-foreground text-base font-semibold tracking-tight">
                                {tx.funderStakeInAda.toFixed(2)}{" "}
                                <span className="text-muted-foreground text-[10px] font-bold uppercase">
                                  ADA
                                </span>
                              </span>
                              {tx.recipientStakeInAda && (
                                <Badge variant="outline" className="h-5 py-0 text-xs">
                                  +{tx.recipientStakeInAda.toFixed(2)} ADA stake
                                </Badge>
                              )}
                              {isPendingForRecipient && (
                                <Badge className="h-5 border-amber-300 bg-amber-100 py-0 text-xs text-amber-800">
                                  Action Required
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <DataDisplay
                                label="Escrow ID"
                                value={tx.id}
                                copyable={true}
                                icon={<Hash className="h-3 w-3" />}
                                className="text-xs"
                              />
                              {tx.scriptAddress && (
                                <DataDisplay
                                  label="Script Address"
                                  value={tx.scriptAddress}
                                  copyable={true}
                                  icon={<FileText className="h-3 w-3" />}
                                  className="text-xs"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Status & Timeline */}
                      <TableCell className="items-start py-5 align-top">
                        <div className="flex flex-col gap-3">
                          <Badge
                            variant="outline"
                            className={`w-fit rounded-lg border px-3 py-1 text-xs font-bold tracking-[0.05em] uppercase ${getStatusColor(tx.status)}`}
                          >
                            <div className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                            {tx.status.replace("_", " ")}
                          </Badge>

                          <div className="space-y-2">
                            {tx.recipientLockDeadline && tx.status === "AWAITING_RECIPIENT" && (
                              <DataDisplay
                                label="Time Remaining"
                                value={
                                  calculateTimeRemaining(new Date(tx.recipientLockDeadline)).hours
                                }
                                type="string"
                                icon={<Clock className="h-3 w-3" />}
                                className={`text-xs ${new Date(tx.recipientLockDeadline) < new Date() ? "text-red-500" : "text-amber-600"}`}
                              />
                            )}

                            {tx.resolutionDeadline &&
                              ["ACTIVE", "DISPUTED"].includes(tx.status) && (
                                <DataDisplay
                                  label="Resolution Deadline"
                                  value={tx.resolutionDeadline}
                                  type="date"
                                  icon={<Calendar className="h-3 w-3" />}
                                  className="text-xs"
                                />
                              )}

                            <DataDisplay
                              label="Created"
                              value={tx.createdAt}
                              type="date"
                              icon={<Calendar className="h-3 w-3" />}
                              className="text-xs"
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* Participants */}
                      <TableCell className="py-5 align-top">
                        <div className="space-y-3">
                          <DataDisplay
                            label={role === "recipient" ? "Funder Address" : "Recipient Address"}
                            value={role === "recipient" ? tx.funderAddress : tx.recipientAddress}
                            copyable={true}
                            icon={<User className="h-3 w-3" />}
                          />

                          {tx.transactions[0]?.txHash && (
                            <DataDisplay
                              label="Transaction Hash"
                              value={tx.transactions[0].txHash}
                              copyable={true}
                              icon={<Wallet className="h-3 w-3" />}
                              link={`https://preprod.cardanoscan.io/transaction/${tx.transactions[0].txHash}`}
                            />
                          )}

                          {tx.contractIpfsHash && (
                            <DataDisplay
                              label="Contract IPFS"
                              value={byteArrayToHash(tx.contractIpfsHash)}
                              copyable={true}
                              icon={<LinkIcon className="h-3 w-3" />}
                              link={`https://ipfs.io/ipfs/${byteArrayToHash(tx.contractIpfsHash)}`}
                            />
                          )}
                        </div>
                      </TableCell>

                      {/* Resolutions & Actions */}
                      <TableCell className="py-5 align-top">
                        <div className="space-y-3">
                          {tx.approvedAt && (
                            <DataDisplay
                              label="Approved At"
                              value={tx.approvedAt}
                              type="date"
                              icon={<CheckCircle className="h-3 w-3" />}
                            />
                          )}

                          {tx.disputedAt && (
                            <DataDisplay
                              label="Disputed At"
                              value={tx.disputedAt}
                              type="date"
                              icon={<Scale className="h-3 w-3" />}
                            />
                          )}

                          {tx.resolvedAt && (
                            <DataDisplay
                              label="Resolved At"
                              value={tx.resolvedAt}
                              type="date"
                              icon={<ShieldCheck className="h-3 w-3" />}
                            />
                          )}

                          {tx.updatedAt && (
                            <DataDisplay
                              label="Last Updated"
                              value={tx.updatedAt}
                              type="date"
                              icon={<RefreshCw className="h-3 w-3" />}
                            />
                          )}
                        </div>
                      </TableCell>

                      {/* Action Group */}
                      <TableCell className="py-5 pr-6 text-right align-top">
                        <div className="flex flex-col items-end gap-3 opacity-90 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-lg font-semibold transition-all"
                            onClick={() => handleViewDetails(tx)}
                          >
                            <Eye className="h-4 w-4" />
                            {` `}Details
                          </Button>

                          {/* Recipient Specific Actions */}
                          {tx.status === "AWAITING_RECIPIENT" &&
                            role === "recipient" &&
                            new Date(tx.recipientLockDeadline || new Date()) >= new Date() && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-border hover:bg-accent h-9 rounded-lg font-semibold transition-all"
                                onClick={() => handleDeposit(tx)}
                                disabled={isLoading}
                              >
                                <Plus className="mr-1.5 h-4 w-4" />
                                Deposit Stake
                              </Button>
                            )}

                          {/* Funder Specific Actions */}
                          {["AWAITING_RECIPIENT", "ACTIVE"].includes(tx.status) &&
                            role === "funder" && (
                              <div className="animate-in fade-in slide-in-from-right-2 flex flex-col gap-2">
                                {tx.status === "ACTIVE" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 rounded-lg px-4 font-semibold transition-all"
                                    onClick={() => handleApprove(tx)}
                                    disabled={isLoading}
                                  >
                                    Release Funds
                                  </Button>
                                )}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="hover:text-destructive hover:bg-destructive/10 h-9 rounded-lg font-semibold"
                                  onClick={() => handleDispute(tx)}
                                  disabled={isLoading}
                                >
                                  Raise Dispute
                                </Button>

                                {tx.status === "AWAITING_RECIPIENT" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 rounded-lg font-semibold hover:bg-rose-50 hover:text-rose-600"
                                    onClick={() => handleCancel(tx)}
                                    disabled={isLoading}
                                  >
                                    <X className="h-4 w-4" />
                                    {` `}Cancel
                                  </Button>
                                )}
                              </div>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {filteredEscrows.length > itemsPerPage && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              itemsPerPage={itemsPerPage}
              totalItems={filteredEscrows.length}
            />
          )}
        </Card>
      </section>

      {/* View Details Dialog */}
      {selectedTransaction && (
        <ViewDetailsDialog
          transaction={selectedTransaction}
          isOpen={!!selectedTransaction}
          onClose={handleCloseDetails}
        />
      )}
    </main>
  );
}
