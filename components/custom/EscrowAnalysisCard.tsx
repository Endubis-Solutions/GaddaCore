"use client"

import React, { useEffect } from 'react'
import { 
    User, 
    CalendarDays, 
    Clock, 
    Lock, 
    ExternalLink, 
    AlertTriangle, 
    Fingerprint,
    ShieldCheck,
    ArrowUpRight
} from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// Exact data from your provided JSON
const DUMMY_ESCROW_DATA = {
  id: "cmithe2mq000174s2ypzj57r3",
  txHash: "921085138b9ee19be5a259863674e16597ef5190d7ba886bd139a0f0703c0fa3",
  scriptAddress: "addr_test1wzy4snp4wqrf5hk8apvzkywttfvqg7jn92qs0vlsump8nggu0z4u8",
  amountAda: 7,
  funderAddress: "addr_test1qqqkfry0esl4jrq0879uu3acsr03a9r75qtjh07nkxdh5yxslfd2c4hha6zf9pkx35pzkuy7lf7eprr9g2nht29cg4fq5fzj9m",
  recipientAddress: "addr_test1qqsdx4sacdr24285m8r3ndumqe8mmv3tkkngazqe22y0cjen2tgurprxyradk5qg6nnqgl3t05hur367jd086fg7u09qxgta0d",
  status: "AWAITING_RECIPIENT",
  disputeDeadline: "2025-12-12T23:12:33.000Z",
  recipientLockDeadline: "2025-12-07T23:13:21.000Z",
  contractIpfsHash: "bafkreig2x4rehzl6yfyadvbr52sav7pz7ige5n67wxsdkb762jvaa3u52m",
};

interface EscrowAnalysisCardProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any | null; // Ignoring passed data as requested
    mode?: 'cancel' | 'complete';
}

export const EscrowAnalysisCard = ({ data: propData, mode = 'cancel' }: EscrowAnalysisCardProps) => {
    const data = DUMMY_ESCROW_DATA;

    useEffect(() => {
        console.log("Escrow Analysis State:", data);
        if (propData) console.log("Passed Prop Data (Ignored):", propData);
    }, [propData, data]);

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="relative overflow-hidden border  rounded-md bg-white  shadow-orange-500/5">
                
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />

                {/* Header: Status & Type */}
                <div className="p-5 border-b border-orange-50 flex justify-between items-center bg-zinc-50">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                            <Lock className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-orange-600/60 uppercase tracking-widest">Vault Security</p>
                            <p className="text-xs font-bold text-zinc-900">{data.status.replace('_', ' ')}</p>
                        </div>
                    </div>
                    <Badge className="bg-primary hover:bg-primary text-white border-none px-3 py-1 rounded-full text-[10px] font-bold tracking-tight">
                        {mode === 'cancel' ? 'Refund Process' : 'Settlement'}
                    </Badge>
                </div>

                <div className="p-6 space-y-8">
                    {/* Main Amount Display */}
                    <div className="text-center py-4">
                        <p className="text-[10px] font-bold text-zinc-600/50 uppercase tracking-[0.2em] mb-1">Escrow Value</p>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-black text-zinc-900 tracking-tighter">{data.amountAda}</span>
                            <span className="text-sm font-bold text-primary">ADA</span>
                        </div>
                    </div>

                    {/* Parties Section */}
                    <div className="grid grid-cols-1 gap-6">
                        {/* Funder */}
                        <div className="group space-y-2">
                            <div className="flex items-center gap-2 text-zinc-400 group-hover:text-primary transition-colors">
                                <User className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Funder Address</span>
                            </div>
                            <div className="p-3 bg-zinc-50 rounded-md border border-zinc-100 flex items-center justify-between">
                                <code className="text-[11px] text-zinc-500 truncate max-w-[240px]">{data.funderAddress}</code>
                                <Fingerprint className="h-3 w-3 text-zinc-300" />
                            </div>
                        </div>

                        {/* Recipient */}
                        <div className="group space-y-2">
                            <div className="flex items-center gap-2 text-zinc-400 group-hover:text-primary transition-colors">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Recipient Address</span>
                            </div>
                            <div className="p-3 bg-zinc-50 rounded-md border border-zinc-100 flex items-center justify-between">
                                <code className="text-[11px] text-zinc-500 truncate max-w-[240px]">{data.recipientAddress}</code>
                                <ArrowUpRight className="h-3 w-3 text-zinc-300" />
                            </div>
                        </div>
                    </div>

                    {/* Deadlines Section */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-zinc-400">
                                <Clock className="h-3 w-3 text-orange-500" />
                                <span className="text-[10px] font-bold uppercase tracking-tighter">Lock Deadline</span>
                            </div>
                            <p className="text-xs font-bold text-zinc-800">
                                {format(new Date(data.recipientLockDeadline), "MMM d, HH:mm")}
                            </p>
                        </div>
                        <div className="space-y-2 border-l border-zinc-100 pl-4">
                            <div className="flex items-center gap-2 text-zinc-400">
                                <CalendarDays className="h-3 w-3 text-orange-500" />
                                <span className="text-[10px] font-bold uppercase tracking-tighter">Dispute Expiry</span>
                            </div>
                            <p className="text-xs font-bold text-zinc-800">
                                {format(new Date(data.disputeDeadline), "MMM d, HH:mm")}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-zinc-900 flex items-center justify-between mx-2 mb-2 rounded-md shadow-lg">
                    <div className="flex flex-col">
                        <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Transaction ID</span>
                        <span className="text-[10px] font-mono text-zinc-300 truncate w-32">{data.txHash}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-9 px-4 text-[10px] font-bold text-white bg-primary hover:bg-orange-600 rounded-md gap-2 transition-all" asChild>
                        <a href={`https://gateway.pinata.cloud/ipfs/${data.contractIpfsHash.split('/').pop()}`} target="_blank" rel="noreferrer">
                            VIEW CONTRACT <ExternalLink className="h-3 w-3" />
                        </a>
                    </Button>
                </div>
            </div>

            {/* Warning Context */}
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-md flex gap-4">
                <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-xs font-bold text-zinc-900">
                        {mode === 'cancel' ? 'Escrow Dissolution' : 'Atomic Settlement'}
                    </p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                        {mode === 'cancel' 
                            ? `Closing this will return ${data.amountAda} ADA to the funder. This action is recorded on the Cardano blockchain.`
                            : `Validating this swap will release ${data.amountAda} ADA to the recipient specified in the smart contract.`}
                    </p>
                </div>
            </div>
        </div>
    )
}