"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatAddress } from "@/utils";
import { 
    ExternalLink, 
    Calendar, 
    Wallet, 
    FileText, 
    Clock, 
    Shield, 
    AlertTriangle, 
    ArrowRightLeft,
    Timer,
    Scale,
    LinkIcon
} from "lucide-react";
import { EscrowTransaction } from "@/types";
import { byteArrayToHash } from "@/lib/utils";
import FloatingDebugJson from "./DebugJson";



interface ViewDetailsDialogProps {
    transaction: EscrowTransaction;
    isOpen: boolean;
    onClose: () => void;
}

export default function ViewDetailsDialog({ transaction, isOpen, onClose }: ViewDetailsDialogProps) {
    if (!transaction) return null;

    const ipfsUrl = transaction.contractIpfsHash ?  byteArrayToHash(transaction.contractIpfsHash) : ''
    
    const statusStyles = {
        ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        DISPUTED: "bg-destructive/10 text-destructive border-destructive/20",
        AWAITING_RECIPIENT: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        APPROVED: "bg-primary/10 text-primary border-primary/20",
        DEFAULT: "bg-muted text-muted-foreground border-transparent"
    };

    const currentStyle = statusStyles[transaction.status as keyof typeof statusStyles] || statusStyles.DEFAULT;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[750px] p-0 overflow-hidden border-none shadow-2xl rounded-md bg-white">
                <div className={`h-1.5 w-full ${transaction.status === 'DISPUTED' ? 'bg-destructive' : 'bg-primary'}`} />
                
                <div className="p-8">
                    <DialogHeader className="mb-8 flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <DialogTitle className="text-2xl font-semibold tracking-tight flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                    <Shield className="h-6 w-6" />
                                </div>
                                Agreement Details
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground font-mono">ID: {transaction.id}</p>
                        </div>
                        <Badge variant="secondary" className={`rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-widest border ${currentStyle}`}>
                            {transaction.status?.replace("_", " ")}
                        </Badge>
                    </DialogHeader>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Column: Core Data */}
                        <FloatingDebugJson data={{transaction}} />
                        <div className="lg:col-span-7 space-y-8">
                            
                            {/* Value Card */}
                            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-100 flex justify-between items-center group">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Locked Amount</span>
                                    <p className="text-3xl font-bold tracking-tighter text-zinc-900">
                                        {transaction.amountAda?.toFixed(2) ?? "0.00"} 
                                        <span className="text-sm font-medium ml-2 opacity-40">ADA</span>
                                    </p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-white border border-zinc-100 flex items-center justify-center shadow-sm">
                                    <Wallet className="h-5 w-5 text-zinc-400 group-hover:text-primary transition-colors" />
                                </div>
                            </div>

                            {/* Addresses Section */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                    <ArrowRightLeft className="h-3 w-3" />
                                    Participating Parties
                                </h4>
                                <div className="space-y-3">
                                    {[
                                        { label: "Funder", addr: transaction.funderAddress },
                                        { label: "Recipient", addr: transaction.recipientAddress },
                                        { label: "Script (Vault)", addr: transaction.scriptAddress }
                                    ].map((party) => party.addr && (
                                        <div key={party.label} className="p-3 rounded-xl bg-white border border-zinc-100 flex flex-col gap-1 hover:border-zinc-300 transition-all">
                                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">{party.label}</span>
                                            <code className="text-[11px] font-mono text-zinc-600 break-all">{party.addr}</code>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Deadlines & Documents */}
                        <div className="lg:col-span-5 space-y-8">
                            
                            {/* Deadlines Sidebar */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                    <Timer className="h-3.5 w-3.5" />
                                    Contract Timelines
                                </h4>
                                <div className="space-y-4 p-5 rounded-2xl border border-zinc-100 bg-zinc-50/50">
                                    <DeadlineItem 
                                        label="Creation" 
                                        date={transaction.createdAt} 
                                        icon={<Calendar className="h-3.5 w-3.5" />} 
                                    />
                                    <DeadlineItem 
                                        label="Recipient Stake By" 
                                        date={transaction.recipientLockDeadline} 
                                        icon={<Clock className="h-3.5 w-3.5 text-amber-500" />} 
                                        isWarning 
                                    />
                                    <DeadlineItem 
                                        label="Dispute Cutoff" 
                                        date={transaction.disputeDeadline} 
                                        icon={<Scale className="h-3.5 w-3.5 text-rose-500" />} 
                                    />
                                </div>
                            </div>

                            {/* Documents Section */}
                            <div className="space-y-3">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Legal Documentation</h4>
                                {ipfsUrl ? (
                                    <Button 
                                        variant="outline" 
                                        className="w-full h-14 justify-between group hover:bg-zinc-900 hover:text-white transition-all rounded-xl"
                                        onClick={() => window.open(ipfsUrl, '_blank')}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-zinc-100 group-hover:bg-zinc-800 transition-colors">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <span className="text-sm font-semibold">View Contract (PDF)</span>
                                        </div>
                                        <ExternalLink className="h-4 w-4 opacity-30 group-hover:opacity-100" />
                                    </Button>
                                ) : (
                                    <div className="p-4 rounded-xl border border-dashed border-zinc-200 text-center">
                                        <p className="text-xs text-zinc-400">No external contract attached</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dispute Banner */}
                    {transaction.status === "DISPUTED" && (
                        <div className="mt-8 bg-rose-50 border border-rose-100 rounded-2xl p-5 flex gap-4 animate-in slide-in-from-bottom-2">
                            <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                                <AlertTriangle className="h-5 w-5 text-rose-600" />
                            </div>
                            <div className="space-y-1">
                                <h5 className="text-sm font-bold text-rose-900 uppercase tracking-wide">Litigation in Progress</h5>
                                <p className="text-xs text-rose-700/80 leading-relaxed">
                                    Settlement is frozen. Evidence is being reviewed on-chain. Reference hash: 
                                    <span className="font-mono ml-1">{transaction.txHash.slice(0, 10)}...</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="bg-zinc-50 p-6 border-t border-zinc-100 flex items-center justify-between gap-4">
                    <div className="hidden sm:flex items-center gap-2 text-zinc-400 group cursor-help">
                        <LinkIcon className="h-3 w-3" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">UTXO Explorer</span>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button variant="ghost" onClick={onClose} className="rounded-lg text-zinc-500 font-medium">
                            Close
                        </Button>
                        <Button
                            className="rounded-lg shadow-sm font-semibold px-6"
                            onClick={() => window.open(`https://preprod.cardanoscan.io/transaction/${transaction.txHash}`, '_blank')}
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Cardanoscan
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeadlineItem({ label, date, icon, isWarning }: { label: string, date?: string | Date | null, icon: React.ReactNode, isWarning?: boolean }) {
    if (!date) return null;
    const d = new Date(date);
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5">{icon}</div>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{label}</span>
                <span className={`text-xs font-semibold ${isWarning ? 'text-zinc-900' : 'text-zinc-700'}`}>
                    {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>
    );
}