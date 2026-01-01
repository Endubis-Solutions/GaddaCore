"use client"

import React, { useState } from 'react'
import {
    Loader2,
    ShieldCheck,
    Hash,
    Signature,
    Send,
    Copy,
    Check,
    UserPlus,
    Zap,
    HelpCircle,
    Info
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useWalletContext } from '@/contexts/WalletContext'
import { getScript, getTxBuilder, getUtxoByTxHash } from '@/lib/aiken'
import {
    deserializeAddress,
    deserializeDatum,
    mConStr2,
    MeshValue,
    serializeAddressObj
} from "@meshsdk/core"
import { getErrMsg } from "@/utils/aiken"
import FloatingDebugJson from "@/components/custom/DebugJson"
import PersistentText from '@/components/custom/PersistentText'
import { EscrowAnalysisCard } from '@/components/custom/EscrowAnalysisCard'

export default function CompleteEscrowPage() {
    const { wallet, changeAddress, collateral, refreshBalance } = useWalletContext()

    // State
    const [depositTxHash, setDepositTxHash] = useState("")
    const [isCompletePending, setIsCompletePending] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [partialSignedTxCbor, setPartialSignedTxCbor] = useState('')
    const [submittedTxHash, setSubmittedTxHash] = useState('')
    const [copied, setCopied] = useState(false)

    // Preview Data
    const [refundPreview, setRefundPreview] = useState<{
        type: 'Initiation' | 'Active',
        funder: { address: string, amount: string },
        recipient?: { address: string, amount: string },
        ipfsHash: string,
        expiration?: Date
    } | null>({
        type: 'Active',
        funder: { address: 'addr_test1qqqkfry...5fzj9m', amount: '100' },
        ipfsHash: 'QmXoyp...789',
        expiration: new Date(Date.now() + 86400000 * 3),
        recipient: { address: 'addr_test1qrxvj...9pzkuy', amount: '5' },
    })

    const handleCopyCbor = () => {
        navigator.clipboard.writeText(partialSignedTxCbor)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const inspectEscrow = async (hash: string) => {
        if (!hash || hash.length < 10) return;
        try {
            const { scriptAddr } = getScript()
            const escrowUtxo = await getUtxoByTxHash(hash)
            if (!escrowUtxo || escrowUtxo.output.address !== scriptAddr) return;

            const datum = deserializeDatum(escrowUtxo.output.plutusData!);
            setRefundPreview({
                type: datum.constructor.toString() === '1' ? 'Active' : 'Initiation',
                funder: {
                    address: serializeAddressObj(datum.fields[0]),
                    amount: (Number(MeshValue.fromValue(datum.fields[1]).toAssets()[0].quantity) / 1_000_000).toString()
                },
                recipient: datum.fields[2] ? {
                    address: serializeAddressObj(datum.fields[2]),
                    amount: (Number(MeshValue.fromValue(datum.fields[3]).toAssets()[0].quantity) / 1_000_000).toString()
                } : undefined,
                ipfsHash: datum.fields[4] || "",
                expiration: new Date(Date.now() + 86400000 * 3)
            })
        } catch (e) { console.error(e) }
    }

    const handlePartialSign = async () => {
        if (!depositTxHash) return alert("Please enter the Escrow UTxO Hash.")
        try {
            setIsCompletePending(true)
            const utxos = await wallet.getUtxos()
            const { scriptAddr, scriptCbor } = getScript()
            const txBuilder = getTxBuilder()
            const escrowUtxo = await getUtxoByTxHash(depositTxHash)
            if (!escrowUtxo) throw new Error("UTxO not found.")

            const inputDatum = deserializeDatum(escrowUtxo.output.plutusData!)
            const recipientAddress = serializeAddressObj(inputDatum.fields[2])

            const totalToRecipient = [
                ...MeshValue.fromValue(inputDatum.fields[1]).toAssets(),
                ...MeshValue.fromValue(inputDatum.fields[3]).toAssets()
            ];

            await txBuilder
                .spendingPlutusScript("V3")
                .txIn(escrowUtxo.input.txHash, escrowUtxo.input.outputIndex, escrowUtxo.output.amount, scriptAddr)
                .spendingReferenceTxInInlineDatumPresent()
                .spendingReferenceTxInRedeemerValue(mConStr2([]))
                .txInScript(scriptCbor)
                .txOut(recipientAddress, totalToRecipient)
                .requiredSignerHash(deserializeAddress(recipientAddress).pubKeyHash)
                .requiredSignerHash(deserializeAddress(serializeAddressObj(inputDatum.fields[0])).pubKeyHash)
                .changeAddress(changeAddress)
                .txInCollateral(collateral[0].input.txHash, collateral[0].input.outputIndex, collateral[0].output.amount, collateral[0].output.address)
                .selectUtxosFrom(utxos)
                .complete()

            const signedTxUserA = await wallet.signTx(txBuilder.txHex, true, true)
            setPartialSignedTxCbor(signedTxUserA)
        } catch (error) { alert(getErrMsg(error)) } finally { setIsCompletePending(false) }
    }

    const handleSubmitFinal = async () => {
        if (!partialSignedTxCbor) return alert("Partial CBOR required.")
        try {
            setIsSubmitting(true)
            const signedTxUserB = await wallet.signTx(partialSignedTxCbor, true, true)
            const newTxHash = await wallet.submitTx(signedTxUserB)
            setSubmittedTxHash(newTxHash)
            setPartialSignedTxCbor('')
            await refreshBalance()
        } catch (error) { alert(getErrMsg(error)) } finally { setIsSubmitting(false) }
    }

    return (
        <div className="min-h-screen bg-white py-12 px-6">
            <div className="max-w-6xl mx-auto">
                <FloatingDebugJson data={{ refundPreview, depositTxHash }} />

                <header className="mb-12 border-b border-zinc-100 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-indigo-600 mb-1">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-[0.2em]">Settlement Module</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">Complete Agreement</h1>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-zinc-400">
                                        <HelpCircle className="h-5 w-5" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-5 shadow-2xl border-zinc-100" align="start">
                                    <div className="space-y-3">
                                        <h3 className="font-bold flex items-center gap-2 text-indigo-600 text-sm uppercase tracking-wider">
                                            <Info className="h-4 w-4" />
                                            Completion Guide
                                        </h3>
                                        <p className="text-xs text-zinc-600 leading-relaxed">
                                            Completing the escrow triggers the final disbursement. The **Recipient** receives both the project funds (Funder stake) and their own penalty stake. Both signatures are required to authenticate the project delivery.
                                        </p>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    <div className="lg:col-span-7">
                        <Tabs defaultValue="initiate" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-8 bg-zinc-100/50 p-1 rounded-md">
                                <TabsTrigger value="initiate" className="rounded-md gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs uppercase font-bold tracking-tight">
                                    <UserPlus className="h-3 w-3" /> 1. Initiate
                                </TabsTrigger>
                                <TabsTrigger value="finalize" className="rounded-md gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs uppercase font-bold tracking-tight">
                                    <Zap className="h-3 w-3" /> 2. Finalize
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="initiate" className="space-y-6 animate-in fade-in slide-in-from-left-4">
                                <div className="bg-zinc-50/50 p-8 rounded-md border border-zinc-100 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Active Escrow Hash</label>
                                        <div className="relative group max-w-md">
                                            <Hash className="absolute left-1 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-indigo-600 transition-colors" strokeWidth={1.5} />
                                            <Input
                                                placeholder="Paste transaction hash..."
                                                value={depositTxHash}
                                                onChange={(e) => setDepositTxHash(e.target.value)}
                                                onBlur={() => inspectEscrow(depositTxHash)}
                                                className="border-0 border-b border-zinc-300 rounded-none pl-9 h-12 focus-visible:ring-0 focus-visible:border-indigo-600 font-mono text-sm bg-transparent"
                                            />
                                        </div>
                                    </div>
                                    <Button onClick={handlePartialSign} disabled={isCompletePending || !depositTxHash} className="w-full h-12 bg-zinc-900 rounded-md gap-2 hover:bg-zinc-800 text-sm">
                                        {isCompletePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Signature className="h-4 w-4" />}
                                        <span>Sign First witness</span>
                                    </Button>

                                    {partialSignedTxCbor && (
                                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-md animate-in zoom-in-95">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                                    <Check className="h-3 w-3" /> Signature Ready
                                                </span>
                                                <Button variant="ghost" size="sm" onClick={handleCopyCbor} className="h-6 text-[10px] gap-1.5 hover:bg-emerald-100">
                                                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy Data
                                                </Button>
                                            </div>
                                            <p className="text-[9px] font-mono text-emerald-700/70 break-all line-clamp-2">
                                                {partialSignedTxCbor}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="finalize" className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div className="bg-indigo-50/30 p-8 rounded-md border border-indigo-100 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Partial CBOR Data</label>
                                        <Textarea
                                            value={partialSignedTxCbor}
                                            onChange={(e) => setPartialSignedTxCbor(e.target.value)}
                                            className="min-h-[150px] bg-white border-zinc-200 focus-visible:ring-indigo-600 font-mono text-[10px] rounded-md p-4 shadow-inner"
                                            placeholder="Paste the CBOR string provided by the initiator..."
                                        />
                                    </div>
                                    <Button onClick={handleSubmitFinal} disabled={isSubmitting || !partialSignedTxCbor} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-lg shadow-indigo-100 gap-2">
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        <span className="text-lg font-medium">Final Sign & Release Funds</span>
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {submittedTxHash && (
                            <div className="mt-8 animate-in slide-in-from-bottom-4 duration-500">
                                <PersistentText data={submittedTxHash} storageKey="completeEscrowSubmittedTxHash" label="Settlement Transaction" description="The smart contract has been satisfied and funds have been released to the recipient." />
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-5">
                        <div className="sticky top-12 space-y-6">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Escrow Analysis</h2>
                            <EscrowAnalysisCard data={refundPreview} mode="complete" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}