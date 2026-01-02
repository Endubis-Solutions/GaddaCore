"use client";

import { useState, useMemo } from "react";
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
    ChevronsRight
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

import { useWalletContext } from "@/contexts/WalletContext";
import { useGetUsersEscrowQuery } from "@/services/escrow.service";
import { EscrowTransaction, EscrowStatus } from "@/types";
import { formatAddress } from "@/utils";
import { RECIPIENT_STAKE_AMOUNT } from "@/constants";

import StakeDialog from "./_components/RecipientStakingDialog";
import HeroSection from "./_components/HeroSection";
import StatCard from "@/components/custom/StatCard";
import ViewDetailsDialog from "@/components/custom/ViewDetailDialog";
import { useRouter } from "next/navigation";

// --- PROPERLY TYPED ROW COMPONENT ---
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
    transaction, role, onApprove, onDispute, onCancel, onDeposit, onViewDetails, isLoading
}: TransactionRowProps) {
    const isRecipient = role === "recipient";

    const router = useRouter()

    // Style Mapping for Status UI
    const statusStyles = {
        ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        DISPUTED: "bg-destructive/10 text-destructive border-destructive/20",
        AWAITING_RECIPIENT: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        APPROVED: "bg-primary/10 text-primary border-primary/20",
        DEFAULT: "bg-muted text-muted-foreground border-transparent"
    };

    const currentStyle = statusStyles[transaction.status as keyof typeof statusStyles] || statusStyles.DEFAULT;

    return (
        <TableRow className="group border-b border-border/40 transition-all hover:bg-muted/40 items-center">
            {/* Amount & Transaction Link */}
            <TableCell className="py-5 pl-6">
                <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-transform duration-200 group-hover:scale-105 ${currentStyle}`}>
                        {transaction.status === "DISPUTED" ? (
                            <Scale className="h-5 w-5" />
                        ) : transaction.status === "AWAITING_RECIPIENT" ? (
                            <AlertTriangle className="h-5 w-5" />
                        ) : transaction.status === "ACTIVE" ? (
                            <Lock className="h-5 w-5" />
                        ) : (
                            <CheckCircle className="h-5 w-5" />
                        )}
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-base font-semibold tracking-tight text-foreground">
                            {transaction.amountAda.toFixed(2)} <span className="text-[10px] font-bold text-muted-foreground uppercase">ADA</span>
                        </span>
                        <a
                            href={`https://preprod.cardanoscan.io/transaction/${transaction.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors group/link"
                        >
                            {formatAddress(transaction.txHash, 6, 4)}
                            <ExternalLink className="h-3 w-3 opacity-0 -translate-y-0.5 group-hover/link:opacity-100 group-hover/link:translate-y-0 transition-all" />
                        </a>
                    </div>
                </div>
            </TableCell>

            {/* Status & Participants */}
            <TableCell className="py-5">
                <div className="flex flex-col gap-2">
                    <Badge variant="secondary" className={`w-fit rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] border ${currentStyle}`}>
                        <div className="mr-1.5 h-1 w-1 rounded-full bg-current animate-pulse" />
                        {transaction.status.replace("_", " ")}
                    </Badge>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80 font-medium">
                        <span className="opacity-60">{isRecipient ? "From" : "To"}:</span>
                        <code className="bg-muted px-1.5 py-0.5 rounded text-foreground/70">
                            {formatAddress(isRecipient ? transaction.funderAddress : transaction.recipientAddress, 6, 4)}
                        </code>
                    </div>
                </div>
            </TableCell>

            {/* Action Group */}
            <TableCell className="py-5 pr-6 text-right">
                <div className="flex justify-end items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all font-medium"
                        onClick={() => onViewDetails(transaction)}
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                    </Button>

                    {/* Recipient Specific Actions */}
                    {transaction.status === "AWAITING_RECIPIENT" && isRecipient && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-lg border-border hover:bg-accent font-semibold transition-all"
                                onClick={() => onDeposit(transaction)}
                                disabled={isLoading}
                            >
                                <Plus className="h-4 w-4 mr-1.5" />
                                Deposit
                            </Button>
                    )}

                    {/* Funder Specific Actions */}
                    {["AWAITING_RECIPIENT", "ACTIVE"].includes(transaction.status) && role === "funder" && (
                        <div className="flex gap-2 animate-in fade-in slide-in-from-right-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="h-9 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/10 font-bold px-4 transition-all"
                                onClick={() => onApprove(transaction)}
                                disabled={isLoading}
                            >
                                Release
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-semibold"
                                onClick={() => onDispute(transaction)}
                                disabled={isLoading}
                            >
                                Dispute
                            </Button>
                            {transaction.status === "AWAITING_RECIPIENT" && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 font-semibold"
                                    onClick={() => onCancel(transaction)}
                                    disabled={isLoading}
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
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
    totalItems
}: PaginationControlsProps) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex items-center justify-between px-2 py-4 border-t border-zinc-100">
            <div className="text-sm text-zinc-500">
                Showing <span className="font-semibold text-zinc-700">{startItem}-{endItem}</span> of{" "}
                <span className="font-semibold text-zinc-700">{totalItems}</span> results
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
    casesRaised: 1
};

// Calculate real stats from your data
const calculateRealStats = (escrows: EscrowTransaction[], changeAddress: string) => {
    const myEscrows = escrows.filter(
        tx => tx.recipientAddress === changeAddress || tx.funderAddress === changeAddress
    );

    const activeEscrows = myEscrows.filter(tx =>
        tx.status === "ACTIVE" || tx.status === "AWAITING_RECIPIENT"
    ).length;

    const pendingForMe = myEscrows.filter(tx =>
        tx.status === "AWAITING_RECIPIENT" && tx.recipientAddress === changeAddress
    ).length;

    const disputeCount = myEscrows.filter(tx => tx.status === "DISPUTED").length;

    const totalValue = myEscrows.reduce((sum, tx) => sum + tx.amountAda, 0);

    const successfulEscrows = myEscrows.filter(tx => tx.status === "APPROVED").length;
    const successRate = myEscrows.length > 0 ? (successfulEscrows / myEscrows.length) * 100 : 0;

    return {
        activeEscrows,
        pendingActions: pendingForMe,
        totalValueLocked: `${totalValue.toLocaleString()} ADA`,
        totalTransactions: myEscrows.length,
        disputeCount,
        successRate: `${successRate.toFixed(1)}%`
    };
};

// --- MAIN PAGE ---
export default function Home() {
    const { connected, changeAddress } = useWalletContext();
    const router = useRouter()

    const { data, isLoading: escrowsLoading } = useGetUsersEscrowQuery(changeAddress);
    const [isLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<EscrowStatus[]>([
        "AWAITING_RECIPIENT",
        "ACTIVE",
        "DISPUTED"
    ]);
    const [selectedTransaction, setSelectedTransaction] = useState<EscrowTransaction | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const escrows = useMemo(() => data || [], [data]);

    // Calculate real stats from user data
    const realStats = changeAddress ? calculateRealStats(escrows, changeAddress) : null;

    // Combine dummy and real stats
    const displayStats = {
        totalValueLocked: realStats?.totalValueLocked || dummyStats.totalValueLocked,
        activeEscrows: realStats?.activeEscrows || dummyStats.activeEscrows,
        pendingActions: realStats?.pendingActions || dummyStats.pendingActions,
        disputeCount: realStats?.disputeCount || dummyStats.disputeCount,
        successRate: realStats?.successRate || dummyStats.successRate,
        totalTransactions: realStats?.totalTransactions || dummyStats.totalTransactions,
        avgStakeAmount: dummyStats.avgStakeAmount,
        casesRaised: dummyStats.casesRaised
    };

    // Data filtering from your original logic
    const pendingForRecipient = escrows.filter(
        (tx) => tx.status === "AWAITING_RECIPIENT" && tx.recipientAddress === changeAddress
    );

    const fundedByMe = escrows.filter(
        (tx) => ["AWAITING_RECIPIENT", "ACTIVE", "DISPUTED"].includes(tx.status) && tx.funderAddress === changeAddress
    );

    // Search filter function
    const filterBySearch = (transactions: EscrowTransaction[]) => {
        if (!searchTerm.trim()) return transactions;

        const term = searchTerm.toLowerCase().trim();
        return transactions.filter(tx =>
            tx.funderAddress.toLowerCase().includes(term) ||
            tx.recipientAddress.toLowerCase().includes(term) ||
            tx.txHash.toLowerCase().includes(term) ||
            tx.amountAda.toString().includes(term)
        );
    };

    // Apply status filter and search
    const filteredPendingForRecipient = filterBySearch(
        pendingForRecipient.filter(tx => statusFilter.includes(tx.status))
    );

    const filteredFundedByMe = filterBySearch(
        fundedByMe.filter(tx => statusFilter.includes(tx.status))
    );

    // Pagination logic
    const totalPendingPages = Math.ceil(filteredPendingForRecipient.length / itemsPerPage);
    const totalFundedPages = Math.ceil(filteredFundedByMe.length / itemsPerPage);

    const paginatedPendingForRecipient = filteredPendingForRecipient.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const paginatedFundedByMe = filteredFundedByMe.slice(
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
        { value: "EXPIRED", label: "Expired" },
        { value: "CANCELLED", label: "Cancelled" }
    ];

    const handleStatusFilterChange = (status: EscrowStatus) => {
        setStatusFilter(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
        setCurrentPage(1); // Reset to first page when filter changes
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to first page when search changes
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        // Optional: scroll to top of table
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleViewDetails = (transaction: EscrowTransaction) => {
        setSelectedTransaction(transaction);
    };

    const handleCloseDetails = () => {
        setSelectedTransaction(null);
    };

    // Action handlers
    const handleApprove = (tx: EscrowTransaction) => {
        console.log("Approve transaction:", tx);
        router.push(`/release-payment?id=${tx.id}`)
    };

    const handleDispute = (tx: EscrowTransaction) => {
         router.push(`/dispute?id=${tx.id}`)
        // Implement dispute logic
    };

    const handleCancel = (tx: EscrowTransaction) => {
         router.push(`/cancel-payment?id=${tx.id}`)
        // Implement cancel logic
    };

    const handleDeposit = (tx: EscrowTransaction) => {
        console.log("Make deposit for:", tx);
       router.push(`/recipient-deposit?id=${tx.id}`)
    };

    if (!connected) return <HeroSection />;
    if (escrowsLoading) return <div className="flex h-[80vh] items-center justify-center"><Spinner className="size-12" /></div>;

    return (
        <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">

            {/* Stat Cards Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Search and Filter Controls */}


            <section className="space-y-12">
                {/* Section: Incoming Requests */}
                {filteredPendingForRecipient.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-5 w-1 bg-primary rounded-full" />
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                    Action Required: Stake & Accept ({filteredPendingForRecipient.length})
                                </h2>
                            </div>
                            <span className="text-xs text-zinc-400">
                                Showing {filteredPendingForRecipient.length} of {pendingForRecipient.length}
                            </span>
                        </div>
                        <Card className="rounded-md shadow-none border-zinc-100 overflow-hidden bg-white">
                            <Table>
                                <TableBody>
                                    {paginatedPendingForRecipient.map((tx) => (
                                        <TransactionRow
                                            key={tx.id}
                                            transaction={tx}
                                            role="recipient"
                                            onApprove={handleApprove}
                                            onDispute={handleDispute}
                                            onCancel={handleCancel}
                                            onDeposit={handleDeposit}
                                            onViewDetails={handleViewDetails}
                                            isLoading={isLoading}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                            {filteredPendingForRecipient.length > itemsPerPage && (
                                <PaginationControls
                                    currentPage={currentPage}
                                    totalPages={totalPendingPages}
                                    onPageChange={handlePageChange}
                                    itemsPerPage={itemsPerPage}
                                    totalItems={filteredPendingForRecipient.length}
                                />
                            )}
                        </Card>
                    </div>
                )}

                {/* Section: My Funded Vaults */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-5 w-1 bg-zinc-900 rounded-full" />
                            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                My Funded Agreements ({filteredFundedByMe.length})
                            </h2>
                        </div>
                        <span className="text-xs text-zinc-400">
                            Showing {filteredFundedByMe.length} of {fundedByMe.length}
                        </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="relative w-full sm:w-96">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input
                                placeholder="Search by address, transaction hash, or amount..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="pl-10 h-10 border-zinc-200"
                            />
                            {searchTerm && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                                    onClick={() => setSearchTerm("")}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-10 gap-2 border-zinc-200">
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
                                    variant="ghost"
                                    size="sm"
                                    className="h-10 text-xs"
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
                    <Card className="rounded-md border-zinc-100 shadow-none overflow-hidden bg-white">
                        <Table>
                            <TableHeader className="bg-zinc-50/40 border-b border-zinc-100">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="h-12 text-[10px] uppercase font-bold text-zinc-400 pl-6">Agreement</TableHead>
                                    <TableHead className="h-12 text-[10px] uppercase font-bold text-zinc-400">Status</TableHead>
                                    <TableHead className="h-12 text-[10px] uppercase font-bold text-zinc-400 text-right pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredFundedByMe.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <ShieldCheck className="h-10 w-10 text-zinc-200" />
                                                <p className="text-sm text-zinc-400 font-medium">
                                                    {searchTerm
                                                        ? `No agreements found for "${searchTerm}"`
                                                        : "No agreements match your filters."
                                                    }
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
                                    paginatedFundedByMe.map((tx) => (
                                        <TransactionRow
                                            key={tx.id}
                                            transaction={tx}
                                            role="funder"
                                            onApprove={handleApprove}
                                            onDispute={handleDispute}
                                            onCancel={handleCancel}
                                            onDeposit={handleDeposit}
                                            onViewDetails={handleViewDetails}
                                            isLoading={isLoading}
                                        />
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        {filteredFundedByMe.length > itemsPerPage && (
                            <PaginationControls
                                currentPage={currentPage}
                                totalPages={totalFundedPages}
                                onPageChange={handlePageChange}
                                itemsPerPage={itemsPerPage}
                                totalItems={filteredFundedByMe.length}
                            />
                        )}
                    </Card>
                </div>
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