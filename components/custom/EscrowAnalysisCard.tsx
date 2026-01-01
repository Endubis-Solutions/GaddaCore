"use client"

import React from 'react'
import { 
    User, 
    ArrowRightLeft, 
    CalendarDays, 
    Clock, 
    Lock, 
    ExternalLink, 
    AlertTriangle, 
    Hash,
    ArrowLeftRight
} from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"

export type EscrowPreviewData = {
    type: 'Initiation' | 'Active',
    funder: { address: string, amount: string },
    recipient?: { address: string, amount: string },
    ipfsHash: string,
    expiration?: Date
}

interface EscrowAnalysisCardProps {
    data: EscrowPreviewData | null;
    mode?: 'cancel' | 'complete';
}

export const EscrowAnalysisCard = ({ data, mode = 'cancel' }: EscrowAnalysisCardProps) => {
    if (!data) {
        return (
            <div className="border border-dashed border-zinc-200 rounded-2xl h-80 flex flex-col items-center justify-center text-center p-8 bg-zinc-50/30">
                <div className="h-12 w-12 bg-zinc-100 rounded-full flex items-center justify-center mb-4 text-zinc-300">
                    <Hash className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-zinc-400 tracking-tight">Inspect Escrow State</p>
                <p className="text-[11px] text-zinc-300 mt-2 max-w-[220px] leading-relaxed uppercase tracking-wider font-bold">
                    Enter the transaction hash to unlock details about funder locks, recipient deposits, and deadlines.
                </p>
            </div>
        )
    }

    const isCancel = mode === 'cancel';
    const totalAda = Number(data.funder.amount) + (data.recipient ? Number(data.recipient.amount) : 0);

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="border border-zinc-200 rounded-md overflow-hidden bg-white shadow-none">
                {/* Header Section */}
                <div className="p-4 bg-zinc-50 border-b border-zinc-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Lock className="h-3 w-3 text-zinc-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Vault State: {data.type}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-tighter ${
                        isCancel ? 'bg-red-50 text-red-600 border-red-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                    }`}>
                        {isCancel ? 'Refund Active' : 'Atomic Swap'}
                    </span>
                </div>

                <div className="p-6 space-y-8">
                    {/* Financials Section */}
                    <div className="space-y-4">
                        {/* Funder Stake / Initiator Receive */}
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-zinc-500">
                                    <User className="h-3 w-3" />
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">
                                        {isCancel ? "Funder Stake" : "Initiator Receives"}
                                    </span>
                                </div>
                                <p className="text-[10px] font-mono text-zinc-400 truncate w-48">{data.funder.address}</p>
                            </div>
                            <span className="text-xl font-semibold text-zinc-900">
                                {isCancel ? data.funder.amount : (data.recipient?.amount || '0')} ADA
                            </span>
                        </div>

                        {/* Middle Arrow for Swap Mode */}
                        {!isCancel && (
                            <div className="flex justify-center -my-3 relative z-10">
                                <div className="bg-white p-1 rounded-full border border-zinc-100 shadow-sm">
                                    <ArrowLeftRight className="h-4 w-4 text-zinc-300" />
                                </div>
                            </div>
                        )}

                        {/* Recipient Stake / Recipient Receive */}
                        <div className={`flex justify-between items-start pt-4 ${isCancel ? 'border-t border-zinc-50' : ''}`}>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-zinc-500">
                                    <ArrowRightLeft className="h-3 w-3" />
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">
                                        {isCancel ? "Recipient Stake" : "Recipient Receives"}
                                    </span>
                                </div>
                                <p className="text-[10px] font-mono text-zinc-400 truncate w-48">
                                    {data.recipient ? data.recipient.address : "No Deposit Found"}
                                </p>
                            </div>
                            <span className="text-xl font-semibold text-zinc-900">
                                {isCancel 
                                    ? (data.recipient ? `+${data.recipient.amount}` : "0.00") 
                                    : (data.funder.amount)
                                } ADA
                            </span>
                        </div>
                    </div>

                    {/* Expiration Section */}
                    <div className="pt-6 border-t border-zinc-100">
                        <div className="flex items-center gap-2 text-zinc-500 mb-3">
                            <CalendarDays className="h-3 w-3" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Contract Expiry</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-zinc-900">
                                {data.expiration ? format(data.expiration, "PPPP") : "No expiry set"}
                            </span>
                            <div className="flex items-center gap-1.5 text-zinc-400">
                                <Clock className="h-3 w-3" />
                                <span className="text-[10px] font-bold">12:00 PM</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="p-4 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">Legal Artifact</span>
                        <span className="text-[10px] font-mono text-zinc-500 truncate w-32">{data.ipfsHash || 'No Artifact'}</span>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 text-[10px] gap-2 rounded-lg border-zinc-200" asChild disabled={!data.ipfsHash}>
                        <a href={`https://gateway.pinata.cloud/ipfs/${data.ipfsHash}`} target="_blank" rel="noreferrer">
                            Preview Contract <ExternalLink className="h-3 w-3" />
                        </a>
                    </Button>
                </div>
            </div>

            {/* Warning Box */}
            <div className={`${isCancel ? 'bg-zinc-900' : 'bg-indigo-900'} p-4 rounded-xl flex gap-3 shadow-xl`}>
                <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${isCancel ? 'text-red-500' : 'text-indigo-400'}`} />
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                    <strong>{isCancel ? 'Refund Notice' : 'Atomic Guarantee'}:</strong> {isCancel 
                        ? `Dissolving this contract will return ${totalAda} ADA to original stakeholders.` 
                        : "Smart contract ensures both parties receive funds simultaneously or the tx fails."}
                </p>
            </div>
        </div>
    )
}