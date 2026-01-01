"use client"

import React, { useState, useMemo } from 'react'
import { 
    Loader2, 
    ArrowRight, 
    ShieldCheck, 
    CheckCircle2, 
    Info, 
    HelpCircle, 
    DollarSign, 
    Hash, 
    FileSearch, 
    ExternalLink,
    Lock
} from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useWalletContext } from '@/contexts/WalletContext'
import { getScript, getTxBuilder, getUtxoByTxHash } from '@/lib/aiken'
import { adaToLovelace } from '@/utils'
import { DEFAULT_REDEEMER_BUDGET, deserializeDatum, MeshValue, mergeAssets } from '@meshsdk/core'
import { 
    activeEscrowDatum, 
    getErrMsg, 
    InitiationDatum, 
    recipientDepositRedeemer, 
    stringifyPlutusData 
} from '@/utils/aiken'


import { useContractActionLog } from "@/store/useLogger"
import FloatingDebugJson from "@/components/custom/DebugJson"
import PersistentText from '@/components/custom/PersistentText'

export default function RecipientDepositPage() {
    const { wallet, changeAddress, collateral, refreshBalance } = useWalletContext()
    const logAction = useContractActionLog((state) => state.logAction)

    // State
    const [amount, setAmount] = useState<number>(0)
    const [funderTxHash, setFunderTxHash] = useState("")
    const [depositTxHash, setDepositTxHash] = useState("")
    const [isPending, setIsPending] = useState(false)
    
    // Contract Visualization State
    const [contractData, setContractData] = useState<{ipfsHash: string, amount: string} | null>(null)
    const [isFetchingContract, setIsFetchingContract] = useState(false)

    const handleFetchContract = async () => {
        if (!funderTxHash || funderTxHash.length < 10) return;
        try {
            setIsFetchingContract(true)
            const escrowUtxo = await getUtxoByTxHash(funderTxHash)
            if (escrowUtxo) {
                const inputDatum = deserializeDatum<InitiationDatum>(escrowUtxo.output.plutusData!)
                // In InitiationDatum, fields[4] is usually the IPFS hash, fields[1] is amount
                setContractData({
                    ipfsHash: String(inputDatum.fields[4] || ""),
                    amount: (Number(MeshValue.fromValue(inputDatum.fields[1]).toAssets()[0].quantity) / 1_000_000).toString()
                })
            }
        } catch (e) {
            console.error("Preview error", e)
        } finally {
            setIsFetchingContract(false)
        }
    }

    const handleRecipientDeposit = async () => {
        if (!amount || amount <= 0) return alert("Enter a valid deposit amount.");
        if (!funderTxHash) return alert("Funder Transaction Hash is required.");

        const walletAddress = changeAddress;
        logAction({
            action: 'INIT',
            contractName: 'AikenEscrow',
            method: 'recipientDeposit',
            details: { recipient: walletAddress, depositAmountADA: amount, funderTxHash }
        });

        try {
            setIsPending(true)
            const depositAmount = [{ unit: "lovelace", quantity: adaToLovelace(amount).toString() }];
            const utxos = await wallet.getUtxos();
            const { scriptAddr, scriptCbor } = getScript();
            const txBuilder = getTxBuilder();

            const escrowUtxo = await getUtxoByTxHash(funderTxHash);
            if (!escrowUtxo) throw new Error("Could not find script UTxO.");

            const inputDatum = deserializeDatum<InitiationDatum>(escrowUtxo.output.plutusData!);
            const outputDatum = activeEscrowDatum(inputDatum, walletAddress, depositAmount);
            const redeemerValue = recipientDepositRedeemer(walletAddress, depositAmount);

            const inputAssets = MeshValue.fromValue(inputDatum.fields[1]).toAssets();
            const totalEscrowAmount = mergeAssets([...depositAmount, ...inputAssets]);

            await txBuilder
                .spendingPlutusScript('V3')
                .txIn(escrowUtxo.input.txHash, escrowUtxo.input.outputIndex, escrowUtxo.output.amount, scriptAddr)
                .spendingReferenceTxInInlineDatumPresent()
                .txInRedeemerValue(redeemerValue, "JSON", DEFAULT_REDEEMER_BUDGET)
                .txInScript(scriptCbor)
                .txOut(scriptAddr, totalEscrowAmount)
                .txOutInlineDatumValue(outputDatum, "JSON")
                .changeAddress(walletAddress)
                .txInCollateral(
                    collateral[0].input.txHash,
                    collateral[0].input.outputIndex,
                    collateral[0].output.amount,
                    collateral[0].output.address
                )
                .selectUtxosFrom(utxos)
                .complete();

            const signedTx = await wallet.signTx(txBuilder.txHex, undefined, true);
            const newTxHash = await wallet.submitTx(signedTx);
            
            setDepositTxHash(newTxHash);
            await refreshBalance();

            logAction({
                action: 'CALL',
                contractName: 'AikenEscrow',
                method: 'recipientDeposit',
                txHash: newTxHash,
                details: { status: 'Success', deposit: `${amount} ADA` }
            });
        } catch (error) {
            alert(getErrMsg(error));
        } finally {
            setIsPending(false)
        }
    }

    return (
        <div className="min-h-screen bg-white py-12 px-6">
            <div className="max-w-6xl mx-auto">
                <FloatingDebugJson data={{ amount, funderTxHash, contractData }} />

                {/* Header */}
                <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-primary/80 mb-1">
                            <Lock className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-[0.2em]">Active Protection</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">Join Agreement</h1>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-zinc-500">
                                        <HelpCircle className="h-5 w-5" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-5 shadow-2xl border-zinc-100" align="start">
                                    <div className="space-y-3">
                                        <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                                            <Info className="h-4 w-4 text-primary" />
                                            Counter-Deposit
                                        </h3>
                                        <p className="text-sm text-zinc-600 leading-relaxed">
                                            As the recipient, you must match the agreed deposit to activate the contract. Both {`parties'`} funds are held safely by the protocol.
                                        </p>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
                    
                    {/* LEFT COLUMN: FORM */}
                    <div className="lg:col-span-6 space-y-12">
                        <div className="space-y-8">
                            {/* Funder Tx Hash Input */}
                            <div className="space-y-2">
                                <Label className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Agreement Reference (Tx Hash)</Label>
                                <div className="relative group">
                                    <Hash className="absolute left-1 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-primary transition-colors" strokeWidth={1.5} />
                                    <Input 
                                        placeholder="Paste original funding hash..." 
                                        value={funderTxHash}
                                        onChange={(e) => setFunderTxHash(e.target.value)}
                                        onBlur={handleFetchContract}
                                        className="border-0 border-b border-zinc-300 rounded-none pl-9 h-12 focus-visible:ring-0 focus-visible:border-primary font-mono text-base placeholder:text-zinc-200" 
                                    />
                                    {isFetchingContract && <Loader2 className="absolute right-2 top-3 h-4 w-4 animate-spin text-zinc-400" />}
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div className="space-y-2">
                                <Label className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Your Security Deposit (ADA)</Label>
                                <div className="relative group">
                                    <DollarSign className="absolute left-1 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-primary transition-colors" strokeWidth={1.5} />
                                    <Input 
                                        type="number" 
                                        placeholder="0.00" 
                                        value={amount || ""}
                                        onChange={(e) => setAmount(e.target.valueAsNumber || 0)}
                                        className="border-0 border-b border-zinc-300 rounded-none pl-9 h-12 focus-visible:ring-0 focus-visible:border-primary text-lg transition-all placeholder:text-zinc-200" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button
                                onClick={handleRecipientDeposit}
                                disabled={isPending || !funderTxHash}
                                className="w-full h-14 text-lg font-medium transition-all active:scale-[0.98] rounded-md shadow-lg shadow-primary/10"
                            >
                                {isPending ? (
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Submitting Deposit...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span>Confirm & Deposit</span>
                                        <ArrowRight className="h-5 w-5" />
                                    </div>
                                )}
                            </Button>
                        </div>

                        {depositTxHash && (
                            <div className="p-8 bg-emerald-50/30 border border-emerald-100 rounded-2xl animate-in fade-in slide-in-from-bottom-3 duration-700">
                                <div className="flex items-center gap-2 text-emerald-600 mb-6">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Agreement Fully Activated</span>
                                </div>
                                <PersistentText
                                    data={depositTxHash}
                                    storageKey="depositTxHash"
                                    label="Activation Receipt"
                                    description="This transaction hash confirms your deposit and the activation of the escrow."
                                />
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: CONTRACT VISUALIZATION */}
                    <div className="lg:col-span-6">
                        <div className="sticky top-12 space-y-6">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Contract Preview</h2>
                            
                            {contractData ? (
                                <div className="border border-zinc-200 rounded-md p-0 overflow-hidden bg-zinc-50/30 transition-all animate-in zoom-in-95">
                                    <div className="p-6 border-b border-zinc-100 bg-white flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                                <FileSearch className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-zinc-900 leading-tight">Agreed Document</p>
                                                <p className="text-[10px] text-zinc-400 uppercase tracking-tighter">Locked on IPFS</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="h-8 gap-2 rounded-lg text-xs" asChild>
                                            <a href={`https://gateway.pinata.cloud/ipfs/${contractData.ipfsHash}`} target="_blank" rel="noreferrer">
                                                Open <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </Button>
                                    </div>
                                    
                                    <div className="p-8 space-y-6">
                                        <div className="flex justify-between items-end border-b border-zinc-100 pb-4">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{`Funder's`} Stake</span>
                                            <span className="text-2xl font-semibold text-zinc-900">{contractData.amount} ADA</span>
                                        </div>
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Immutable Terms</span>
                                            <p className="text-[11px] font-mono text-zinc-500 break-all bg-zinc-100/50 p-3 rounded-lg border border-zinc-200/50 leading-relaxed">
                                                {contractData.ipfsHash}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="border border-dashed border-zinc-200 rounded-md h-64 flex flex-col items-center justify-center text-center p-8">
                                    <div className="h-12 w-12 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                                        <Hash className="h-6 w-6 text-zinc-200" />
                                    </div>
                                    <p className="text-sm font-medium text-zinc-400">Enter a Transaction Hash</p>
                                    <p className="text-[11px] text-zinc-300 mt-1 max-w-[200px]">Provide the reference hash to load the contract details and terms.</p>
                                </div>
                            )}

                            <div className="flex items-start gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                                <Info className="h-4 w-4 text-zinc-400 mt-0.5" />
                                <p className="text-[11px] text-zinc-500 leading-relaxed">
                                    By depositing, you acknowledge the terms stored in the IPFS hash above. The contract becomes <strong>active</strong> once your transaction is confirmed on-chain.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}