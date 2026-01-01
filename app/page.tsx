"use client";

import { useState, useMemo } from "react";
import { 
    Lock, CheckCircle, Plus, Wallet, AlertCircle, 
    Rocket, Hourglass, ExternalLink, ShieldCheck,
    ChevronRight, Scale
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

import { useWalletContext } from "@/contexts/WalletContext";
import { useGetUsersEscrowQuery } from "@/services/escrow.service";
import { EscrowTransaction } from "@/types";
import { formatAddress } from "@/utils";
import { RECIPIENT_STAKE_AMOUNT } from "@/constants";

import QrCodeDialog from "./_components/QrCodeDialog";
import StakeDialog from "./_components/RecipientStakingDialog";
import HeroSection from "./_components/HeroSection";

// --- PROPERLY TYPED ROW COMPONENT ---
interface TransactionRowProps {
    transaction: EscrowTransaction;
    role: "funder" | "recipient";
    onApprove: (tx: EscrowTransaction) => void;
    onDispute: (tx: EscrowTransaction) => void;
    isLoading: boolean;
}

function TransactionRow({ 
    transaction, role, onApprove, onDispute, isLoading 
}: TransactionRowProps) {
    const isRecipient = role === "recipient";
    
    return (
        <TableRow className="group border-b border-zinc-100/80 transition-colors hover:bg-zinc-50/30">
            <TableCell className="py-6 pl-6">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-md bg-zinc-50 flex items-center justify-center border border-zinc-100">
                        {transaction.status === "DISPUTED" ? (
                            <Scale className="h-5 w-5 text-red-500" />
                        ) : (
                            <Lock className="h-5 w-5 text-zinc-400" />
                        )}
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-zinc-900 leading-none">
                            {transaction.amountAda.toFixed(2)} ADA
                        </span>
                        <a 
                            href={`https://preprod.cardanoscan.io/transaction/${transaction.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-primary transition-colors"
                        >
                            {formatAddress(transaction.txHash, 8, 6)} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                    </div>
                </div>
            </TableCell>

            <TableCell className="py-6">
                <div className="flex flex-col gap-1.5">
                    <Badge variant="outline" className={`w-fit rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border-none ${
                        transaction.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : 
                        transaction.status === "DISPUTED" ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-600"
                    }`}>
                        {transaction.status.replace("_", " ")}
                    </Badge>
                    <span className="text-[10px] text-zinc-400 font-medium">
                        {isRecipient ? "From: " : "To: "}{formatAddress(isRecipient ? transaction.funderAddress : transaction.recipientAddress, 6, 4)}
                    </span>
                </div>
            </TableCell>

            <TableCell className="py-6 pr-6 text-right">
                <div className="flex justify-end items-center gap-2">
                    <QrCodeDialog transaction={transaction} />
                    
                    {transaction.status === "AWAITING_RECIPIENT" && isRecipient && (
                        <StakeDialog transaction={transaction} onSuccess={() => {}}>
                            <Button size="sm" className="h-9 rounded-md bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 shadow-md shadow-primary/20">
                                Stake {RECIPIENT_STAKE_AMOUNT} ADA
                            </Button>
                        </StakeDialog>
                    )}

                    {["AWAITING_RECIPIENT", "ACTIVE"].includes(transaction.status) && role === "funder" && (
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm"
                                className="h-9 rounded-md border-zinc-200 text-xs font-bold hover:bg-emerald-50 hover:text-emerald-700 transition-all"
                                onClick={() => onApprove(transaction)}
                                disabled={isLoading}
                            >
                                Release
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-9 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 text-xs font-bold"
                                onClick={() => onDispute(transaction)}
                                disabled={isLoading}
                            >
                                Dispute
                            </Button>
                        </div>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
}

// --- MAIN PAGE ---
export default function Home() {
    const { connected, changeAddress, balance } = useWalletContext();
    const { data, isLoading: escrowsLoading } = useGetUsersEscrowQuery(changeAddress);
    const [isLoading, setIsLoading] = useState(false);
    
    const escrows = useMemo(() => data || [], [data]);

    // Data filtering from your original logic
    const pendingForRecipient = escrows.filter(
        (tx) => tx.status === "AWAITING_RECIPIENT" && tx.recipientAddress === changeAddress
    );
    const fundedByMe = escrows.filter(
        (tx) => ["AWAITING_RECIPIENT", "ACTIVE", "DISPUTED"].includes(tx.status) && tx.funderAddress === changeAddress
    );

    if (!connected) return <HeroSection />;
    if (escrowsLoading) return <div className="flex h-[80vh] items-center justify-center"><Spinner className="size-12" /></div>;

    return (
        <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">

            {/* Segmented Control Tabs */}
            <Tabs defaultValue="active" className="w-full">
                <TabsList className="bg-zinc-100/60 p-1 rounded-md mb-8 h-12">
                    <TabsTrigger value="active" className="rounded-sm px-8 h-10 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                        Active Board ({fundedByMe.length + pendingForRecipient.length})
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-sm px-8 h-10 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                        History
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-12">
                    {/* Section: Incoming Requests */}
                    {pendingForRecipient.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-5 w-1 bg-primary rounded-full" />
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Action Required: Stake & Accept</h2>
                            </div>
                            <Card className="rounded-md border-zinc-100 shadow-sm overflow-hidden bg-white">
                                <Table>
                                    <TableBody>
                                        {pendingForRecipient.map((tx) => (
                                            <TransactionRow 
                                                key={tx.id} 
                                                transaction={tx} 
                                                role="recipient" 
                                                onApprove={() => {}} 
                                                onDispute={() => {}} 
                                                isLoading={isLoading} 
                                            />
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    )}

                    {/* Section: My Funded Vaults */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-5 w-1 bg-zinc-900 rounded-full" />
                            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">My Funded Agreements</h2>
                        </div>
                        <Card className="rounded-md border-zinc-100 shadow-sm overflow-hidden bg-white">
                            <Table>
                                <TableHeader className="bg-zinc-50/40 border-b border-zinc-100">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="h-12 text-[10px] uppercase font-bold text-zinc-400 pl-6">Agreement</TableHead>
                                        <TableHead className="h-12 text-[10px] uppercase font-bold text-zinc-400">Status</TableHead>
                                        <TableHead className="h-12 text-[10px] uppercase font-bold text-zinc-400 text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fundedByMe.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <ShieldCheck className="h-10 w-10 text-zinc-200" />
                                                    <p className="text-sm text-zinc-400 font-medium">No active funded agreements found.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        fundedByMe.map((tx) => (
                                            <TransactionRow 
                                                key={tx.id} 
                                                transaction={tx} 
                                                role="funder" 
                                                onApprove={() => {}} 
                                                onDispute={() => {}} 
                                                isLoading={isLoading} 
                                            />
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </main>
    );
}