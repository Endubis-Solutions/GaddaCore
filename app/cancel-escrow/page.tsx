"use client"

import { useState } from 'react'
import {
    Loader2,
    XCircle,
    ShieldAlert,
    HelpCircle,
    Hash,
    Undo2,
    AlertTriangle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useWalletContext } from '@/contexts/WalletContext'
import { getScript, getTxBuilder, getUtxoByTxHash } from '@/lib/aiken'
import {
    deserializeAddress,
    deserializeDatum,
    mConStr1,
    MeshValue,
    serializeAddressObj
} from "@meshsdk/core"
import {
    getErrMsg,
} from "@/utils/aiken"

import FloatingDebugJson from "@/components/custom/DebugJson"
import PersistentText from '@/components/custom/PersistentText'
import { EscrowAnalysisCard } from '@/components/custom/EscrowAnalysisCard'

export default function CancelEscrowPage() {
    const { changeAddress, wallet, refreshBalance, collateral } = useWalletContext()

    // State
    const [depositTxHash, setDepositTxHash] = useState("")
    const [isPending, setIsPending] = useState(false)
    const [txHash, setTxHash] = useState("")

    // Contract Inspection State
    const [isInspecting, setIsInspecting] = useState(false)
    const [refundPreview, setRefundPreview] = useState<{
        type: 'Initiation' | 'Active',
        funder: { address: string, amount: string },
        recipient?: { address: string, amount: string },
        ipfsHash: string,
        expiration?: Date
    } | null>({
        type: 'Initiation',
        funder: { address: 'addr_test1qqqkfry0esl4jrq0879uu3acsr03a9r75qtjh07nkxdh5yxslfd2c4hha6zf9pkx35pzkuy7lf7eprr9g2nht29cg4fq5fzj9m', amount: '100' },
        ipfsHash: '',
        expiration: new Date(Date.now() + 86400000 * 3),
        recipient: { address: 'addr_test1qqqkfry0esl4jrq0879uu3acsr03a9r75qtjh07nkxdh5yxslfd2c4hha6zf9pkx35pzkuy7lf7eprr9g2nht29cg4fq5fzj9m', amount: '5' },
    })

    const inspectEscrow = async (hash: string) => {
        if (!hash || hash.length < 10) return;
        try {
            setIsInspecting(true)
            const { scriptAddr } = getScript()
            const escrowUtxo = await getUtxoByTxHash(hash)

            if (!escrowUtxo || escrowUtxo.output.address !== scriptAddr) return setRefundPreview(null);

            const datum = deserializeDatum(escrowUtxo.output.plutusData!);

            // Extract common fields (indices based on standard Aiken Escrow patterns)
            const funderAddr = serializeAddressObj(datum.fields[0]);
            const funderAmt = (Number(MeshValue.fromValue(datum.fields[1]).toAssets()[0].quantity) / 1_000_000).toString();
            const ipfsLink = datum.fields[4] || "";
            // Dummy expiration extraction (typically datum.fields[3] or [5] in Aiken)
            const expiryDate = new Date(Date.now() + 86400000 * 3); // Dummy: 3 days from now

            if (datum.constructor.toString() === '1') {
                // Active Escrow
                setRefundPreview({
                    type: 'Active',
                    funder: { address: funderAddr, amount: funderAmt },
                    recipient: {
                        address: serializeAddressObj(datum.fields[2]),
                        amount: (Number(MeshValue.fromValue(datum.fields[3]).toAssets()[0].quantity) / 1_000_000).toString()
                    },
                    ipfsHash: ipfsLink,
                    expiration: expiryDate
                })
            } else {
                // Initiation Only
                setRefundPreview({
                    type: 'Initiation',
                    funder: { address: funderAddr, amount: funderAmt },
                    ipfsHash: ipfsLink,
                    expiration: expiryDate
                })
            }
        } catch (e) {
            console.error("Inspection failed", e)
        } finally {
            setIsInspecting(false)
        }
    }

    const handleCancelEscrow = async () => {
        if (!depositTxHash) return alert("Enter the Tx Hash.");
        const walletAddress = changeAddress;

        try {
            setIsPending(true)
            const utxos = await wallet.getUtxos();
            const { scriptAddr, scriptCbor } = getScript();
            const txBuilder = getTxBuilder();
            const currentWalletPubHash = deserializeAddress(walletAddress).pubKeyHash;

            const escrowUtxo = await getUtxoByTxHash(depositTxHash);
            if (!escrowUtxo) throw new Error("UTxO not found.");

            const inputDatum = deserializeDatum(escrowUtxo.output.plutusData!);
            const redeemer = mConStr1([]);

            if (inputDatum.constructor.toString() === '1') {
                const initiatorToReceive = MeshValue.fromValue(inputDatum.fields[1]).toAssets();
                const recipientToReceive = MeshValue.fromValue(inputDatum.fields[3]).toAssets();
                txBuilder
                    .txOut(serializeAddressObj(inputDatum.fields[0]), initiatorToReceive)
                    .txOut(serializeAddressObj(inputDatum.fields[2]), recipientToReceive);
            } else {
                const initiatorToReceive = MeshValue.fromValue(inputDatum.fields[1]).toAssets();
                txBuilder.txOut(serializeAddressObj(inputDatum.fields[0]), initiatorToReceive);
            }

            await txBuilder
                .spendingPlutusScript('V3')
                .txIn(escrowUtxo.input.txHash, escrowUtxo.input.outputIndex, escrowUtxo.output.amount, scriptAddr)
                .spendingReferenceTxInInlineDatumPresent()
                .txInRedeemerValue(redeemer)
                .txInScript(scriptCbor)
                .requiredSignerHash(currentWalletPubHash)
                .changeAddress(walletAddress)
                .txInCollateral(
                    collateral[0].input.txHash,
                    collateral[0].input.outputIndex,
                    collateral[0].output.amount,
                    collateral[0].output.address,
                )
                .selectUtxosFrom(utxos)
                .complete();

            const signedTx = await wallet.signTx(txBuilder.txHex, undefined, true);
            const newTxHash = await wallet.submitTx(signedTx);
            setTxHash(newTxHash);
            await refreshBalance();
        } catch (error) {
            alert(getErrMsg(error));
        } finally {
            setIsPending(false)
        }
    }

    return (
        <div className="min-h-screen bg-white py-12 px-6">
            <div className="max-w-6xl mx-auto">
                <FloatingDebugJson data={{ refundPreview, depositTxHash }} />

                {/* Header */}
                <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-red-500 mb-1">
                            <ShieldAlert className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-[0.2em]">Termination Protocol</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">Cancel Agreement</h1>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-zinc-400">
                                        <HelpCircle className="h-5 w-5" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-5 shadow-2xl border-zinc-100" align="start">
                                    <div className="space-y-3">
                                        <h3 className="font-bold flex items-center gap-2 text-red-600">
                                            <AlertTriangle className="h-4 w-4" />
                                            Safety Notice
                                        </h3>
                                        <p className="text-sm text-zinc-600 leading-relaxed">
                                            Cancelling will trigger the smart {`contract's`} refund logic. If the agreement is active, both parties are refunded their respective stakes.
                                        </p>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">

                    {/* Left Column: Form */}
                    <div className="lg:col-span-6 space-y-10">
                        <div className="space-y-6">
                            <Label className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Active Escrow Reference (Tx Hash)</Label>
                            <div className="relative group">
                                <Hash className="absolute left-1 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-red-500 transition-colors" strokeWidth={1.5} />
                                <Input
                                    placeholder="Paste the escrow transaction hash..."
                                    value={depositTxHash}
                                    onChange={(e) => setDepositTxHash(e.target.value)}
                                    onBlur={() => inspectEscrow(depositTxHash)}
                                    className="border-0 border-b border-zinc-300 rounded-none pl-9 h-12 focus-visible:ring-0 focus-visible:border-red-500 font-mono text-base transition-all"
                                />
                                {isInspecting && <Loader2 className="absolute right-2 top-3 h-4 w-4 animate-spin text-zinc-400" />}
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button
                                onClick={handleCancelEscrow}
                                disabled={isPending || !depositTxHash}
                                variant="destructive"
                                className="w-full h-14 text-lg font-medium transition-all active:scale-[0.98] rounded-md shadow-lg shadow-red-100"
                            >
                                {isPending ? (
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Executing Termination...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <XCircle className="h-5 w-5" />
                                        <span>Abort & Refund Escrow</span>
                                    </div>
                                )}
                            </Button>
                        </div>

                        {txHash && (
                            <div className="p-8 bg-zinc-50 border border-zinc-100 rounded-2xl animate-in fade-in slide-in-from-bottom-3 duration-700">
                                <div className="flex items-center gap-2 text-zinc-600 mb-6">
                                    <Undo2 className="h-4 w-4" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Funds Returned</span>
                                </div>
                                <PersistentText
                                    data={txHash}
                                    storageKey="cancelEscrowTxHash"
                                    label="Termination Receipt"
                                    description="This hash verifies the smart contract has released the funds back to the original wallets."
                                />
                            </div>
                        )}
                    </div>

                    {/* Right Column: Refund Inspector */}
                    <div className="lg:col-span-6">
                        <div className="lg:col-span-6">
                            <div className="sticky top-12 space-y-6">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Escrow Analysis</h2>
                                <EscrowAnalysisCard data={refundPreview} mode="cancel" />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}