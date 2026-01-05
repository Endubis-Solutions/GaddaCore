"use client";

import React, { useMemo, useState } from "react";
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
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWalletContext } from "@/contexts/WalletContext";
import { getScript, getTxBuilder, getUtxoByTxHash } from "@/lib/aiken";
import {
  deserializeAddress,
  deserializeDatum,
  mConStr2,
  MeshValue,
  serializeAddressObj,
} from "@meshsdk/core";
import { getErrMsg } from "@/utils/aiken";
import FloatingDebugJson from "@/components/custom/DebugJson";
import PersistentText from "@/components/custom/PersistentText";
import { EscrowAnalysisCard } from "@/components/custom/EscrowAnalysisCard";
import { useSearchParams } from "next/navigation";
import { useGetEscrowByIdQuery } from "@/services/escrow.service";

export default function CompleteEscrowPage() {
  const { wallet, changeAddress, collateral, refreshBalance } = useWalletContext();

  const searchParams = useSearchParams();
  const escrowId = searchParams.get("id");
  const getEscrowQuery = useGetEscrowByIdQuery({ id: escrowId || undefined, enabled: !!escrowId });
  const escrow = useMemo(() => getEscrowQuery.data || undefined, [getEscrowQuery.data]);

  // State
  const [depositTxHash, setDepositTxHash] = useState("");
  const [isCompletePending, setIsCompletePending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partialSignedTxCbor, setPartialSignedTxCbor] = useState("");
  const [submittedTxHash, setSubmittedTxHash] = useState("");
  const [copied, setCopied] = useState(false);

  // Preview Data
  const [refundPreview, setRefundPreview] = useState<{
    type: "Initiation" | "Active";
    funder: { address: string; amount: string };
    recipient?: { address: string; amount: string };
    ipfsHash: string;
    expiration?: Date;
  } | null>({
    type: "Active",
    funder: { address: "addr_test1qqqkfry...5fzj9m", amount: "100" },
    ipfsHash: "QmXoyp...789",
    expiration: new Date(Date.now() + 86400000 * 3),
    recipient: { address: "addr_test1qrxvj...9pzkuy", amount: "5" },
  });

  const handleCopyCbor = () => {
    navigator.clipboard.writeText(partialSignedTxCbor);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inspectEscrow = async (hash: string) => {
    if (!hash || hash.length < 10) return;
    try {
      const { scriptAddr } = getScript();
      const escrowUtxo = await getUtxoByTxHash(hash);
      if (!escrowUtxo || escrowUtxo.output.address !== scriptAddr) return;

      const datum = deserializeDatum(escrowUtxo.output.plutusData!);
      setRefundPreview({
        type: datum.constructor.toString() === "1" ? "Active" : "Initiation",
        funder: {
          address: serializeAddressObj(datum.fields[0]),
          amount: (
            Number(MeshValue.fromValue(datum.fields[1]).toAssets()[0].quantity) / 1_000_000
          ).toString(),
        },
        recipient: datum.fields[2]
          ? {
              address: serializeAddressObj(datum.fields[2]),
              amount: (
                Number(MeshValue.fromValue(datum.fields[3]).toAssets()[0].quantity) / 1_000_000
              ).toString(),
            }
          : undefined,
        ipfsHash: datum.fields[4] || "",
        expiration: new Date(Date.now() + 86400000 * 3),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePartialSign = async () => {
    if (!depositTxHash) return alert("Please enter the Escrow UTxO Hash.");
    try {
      setIsCompletePending(true);
      const utxos = await wallet.getUtxos();
      const { scriptAddr, scriptCbor } = getScript();
      const txBuilder = getTxBuilder();
      const escrowUtxo = await getUtxoByTxHash(depositTxHash);
      if (!escrowUtxo) throw new Error("UTxO not found.");

      const inputDatum = deserializeDatum(escrowUtxo.output.plutusData!);
      const recipientAddress = serializeAddressObj(inputDatum.fields[2]);

      const totalToRecipient = [
        ...MeshValue.fromValue(inputDatum.fields[1]).toAssets(),
        ...MeshValue.fromValue(inputDatum.fields[3]).toAssets(),
      ];

      await txBuilder
        .spendingPlutusScript("V3")
        .txIn(
          escrowUtxo.input.txHash,
          escrowUtxo.input.outputIndex,
          escrowUtxo.output.amount,
          scriptAddr
        )
        .spendingReferenceTxInInlineDatumPresent()
        .spendingReferenceTxInRedeemerValue(mConStr2([]))
        .txInScript(scriptCbor)
        .txOut(recipientAddress, totalToRecipient)
        .requiredSignerHash(deserializeAddress(recipientAddress).pubKeyHash)
        .requiredSignerHash(
          deserializeAddress(serializeAddressObj(inputDatum.fields[0])).pubKeyHash
        )
        .changeAddress(changeAddress)
        .txInCollateral(
          collateral[0].input.txHash,
          collateral[0].input.outputIndex,
          collateral[0].output.amount,
          collateral[0].output.address
        )
        .selectUtxosFrom(utxos)
        .complete();

      const signedTxUserA = await wallet.signTx(txBuilder.txHex, true, true);
      setPartialSignedTxCbor(signedTxUserA);
    } catch (error) {
      alert(getErrMsg(error));
    } finally {
      setIsCompletePending(false);
    }
  };

  const handleSubmitFinal = async () => {
    if (!partialSignedTxCbor) return alert("Partial CBOR required.");
    try {
      setIsSubmitting(true);
      const signedTxUserB = await wallet.signTx(partialSignedTxCbor, true, true);
      const newTxHash = await wallet.submitTx(signedTxUserB);
      setSubmittedTxHash(newTxHash);
      setPartialSignedTxCbor("");
      await refreshBalance();
    } catch (error) {
      alert(getErrMsg(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-white px-6 py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-14">
        <section>
          <FloatingDebugJson data={{ refundPreview, depositTxHash }} />

          <header className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="space-y-1">
              <div className="text-primary mb-1 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-bold tracking-[0.2em] uppercase">
                  Settlement Module
                </span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
                  Complete Agreement
                </h1>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-zinc-400"
                    >
                      <HelpCircle className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 border-zinc-100 p-5 shadow-2xl" align="start">
                    <div className="space-y-3">
                      <h3 className="text-primary flex items-center gap-2 text-sm font-bold tracking-wider uppercase">
                        <Info className="h-4 w-4" />
                        Completion Guide
                      </h3>
                      <p className="text-xs leading-relaxed text-zinc-600">
                        Completing the escrow triggers the final disbursement. The **Recipient**
                        receives both the project funds (Funder stake) and their own penalty stake.
                        Both signatures are required to authenticate the project delivery.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </header>

          <div className="lg:col-span-7">
            <Tabs defaultValue="initiate" className="w-full">
              <TabsList className="mb-4 grid w-full grid-cols-2 rounded-md bg-zinc-100/50 p-1">
                <TabsTrigger
                  value="initiate"
                  className="gap-2 rounded-md text-xs font-bold tracking-tight uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <UserPlus className="h-3 w-3" /> 1. Initiate
                </TabsTrigger>
                <TabsTrigger
                  value="finalize"
                  className="gap-2 rounded-md text-xs font-bold tracking-tight uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Zap className="h-3 w-3" /> 2. Finalize
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="initiate"
                className="animate-in fade-in slide-in-from-left-4 space-y-6"
              >
                <div className="space-y-6 py-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">
                      Active Escrow Hash
                    </label>
                    <div className="group relative">
                      <Hash
                        className="group-focus-within:text-primary absolute top-1/2 left-1 h-5 w-5 -translate-y-1/2 text-zinc-400 transition-colors"
                        strokeWidth={1.5}
                      />
                      <Input
                        placeholder="Paste transaction hash..."
                        value={depositTxHash}
                        onChange={(e) => setDepositTxHash(e.target.value)}
                        onBlur={() => inspectEscrow(depositTxHash)}
                        className="focus-visible:border-primary h-12 w-full rounded-none border-0 border-b border-zinc-300 bg-zinc-50 pl-9 font-mono text-sm focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handlePartialSign}
                    disabled={isCompletePending || !depositTxHash}
                    className="h-12 w-full gap-2 rounded-md text-sm"
                  >
                    {isCompletePending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Signature className="h-4 w-4" />
                    )}
                    <span>Sign First witness</span>
                  </Button>

                  {partialSignedTxCbor && (
                    <div className="animate-in zoom-in-95 rounded-md border border-emerald-100 bg-emerald-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest text-emerald-600 uppercase">
                          <Check className="h-3 w-3" /> Signature Ready
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyCbor}
                          className="h-6 gap-1.5 text-[10px] hover:bg-emerald-100"
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{" "}
                          Copy Data
                        </Button>
                      </div>
                      <p className="line-clamp-2 font-mono text-[9px] break-all text-emerald-700/70">
                        {partialSignedTxCbor}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent
                value="finalize"
                className="animate-in fade-in slide-in-from-right-4 space-y-6"
              >
                <div className="space-y-6 p-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">
                      Partial CBOR Data
                    </label>
                    <Textarea
                      value={partialSignedTxCbor}
                      onChange={(e) => setPartialSignedTxCbor(e.target.value)}
                      className="focus-visible:border-b-primary min-h-[150px] rounded-none border-0 border-b border-zinc-200 border-b-zinc-300 bg-zinc-50 p-4 font-mono text-[10px] shadow-inner outline-none focus-visible:ring-0"
                      placeholder="Paste the CBOR string provided by the initiator..."
                    />
                  </div>
                  <Button
                    onClick={handleSubmitFinal}
                    disabled={isSubmitting || !partialSignedTxCbor}
                    className="bg-primary h-14 w-full gap-2 rounded-md shadow-lg shadow-indigo-100"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span className="text-lg font-medium">Final Sign & Release Funds</span>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {submittedTxHash && (
              <div className="animate-in slide-in-from-bottom-4 mt-8 duration-500">
                <PersistentText
                  data={submittedTxHash}
                  storageKey="completeEscrowSubmittedTxHash"
                  label="Settlement Transaction"
                  description="The smart contract has been satisfied and funds have been released to the recipient."
                />
              </div>
            )}
          </div>
        </section>
        <section className="">
          <div className="sticky top-12 space-y-6">
            {/* <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Escrow Analysis</h2> */}
            <EscrowAnalysisCard data={escrow} mode="complete" />
          </div>
        </section>
      </div>
    </div>
  );
}
