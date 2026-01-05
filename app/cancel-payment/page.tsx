"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, XCircle, ShieldAlert, HelpCircle, Hash, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWalletContext } from "@/contexts/WalletContext";
import { getScript, getTxBuilder, getUtxoByTxHash } from "@/lib/aiken";
import {
  deserializeAddress,
  deserializeDatum,
  mConStr1,
  MeshValue,
  serializeAddressObj,
} from "@meshsdk/core";
import { getErrMsg, stringifyPlutusData } from "@/utils/aiken";

import FloatingDebugJson from "@/components/custom/DebugJson";
import PersistentText from "@/components/custom/PersistentText";
import { EscrowAnalysisCard } from "@/components/custom/EscrowAnalysisCard";
import { useSearchParams } from "next/navigation";
import { useCancelPaymentMutation, useGetEscrowByIdQuery } from "@/services/escrow.service";
import { toast } from "sonner";
import { get } from "http";

export default function CancelEscrowPage() {
  const { changeAddress, wallet, refreshBalance, collateral } = useWalletContext();

  const searchParams = useSearchParams();
  const escrowId = searchParams.get("id");
  const getEscrowQuery = useGetEscrowByIdQuery({ id: escrowId || undefined, enabled: !!escrowId });
  const escrow = useMemo(() => getEscrowQuery.data || undefined, [getEscrowQuery.data]);

  const cancelPaymentMutation = useCancelPaymentMutation();

  // State
  const [depositTxHash, setDepositTxHash] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [txHash, setTxHash] = useState("");

  const handleCancelEscrow = async () => {
    if (!depositTxHash) {
      toast.warning("Please enter the Tx Hash of the active Escrow UTxO.");
      return;
    }
    const walletAddress = changeAddress;

    if (!escrow) {
      toast.error("Escrow not found.");
      return;
    }

    try {
      setIsPending(true);
      const utxos = await wallet.getUtxos();
      const { scriptAddr, scriptCbor } = getScript();
      const txBuilder = getTxBuilder();
      const currentWalletPubHash = deserializeAddress(walletAddress).pubKeyHash;

      const escrowUtxo = await getUtxoByTxHash(depositTxHash);
      if (!escrowUtxo) throw new Error("UTxO not found.");

      const inputDatum = deserializeDatum(escrowUtxo.output.plutusData!);
      const redeemer = mConStr1([]);

      if (inputDatum.constructor.toString() === "1") {
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
        .spendingPlutusScript("V3")
        .txIn(
          escrowUtxo.input.txHash,
          escrowUtxo.input.outputIndex,
          escrowUtxo.output.amount,
          scriptAddr
        )
        .spendingReferenceTxInInlineDatumPresent()
        .txInRedeemerValue(redeemer)
        .txInScript(scriptCbor)
        .requiredSignerHash(currentWalletPubHash)
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
      setTxHash(newTxHash);

      cancelPaymentMutation.mutate({
        escrowId: escrow.id,
        walletAddress,
        transaction: {
          txHash: newTxHash,
          datum: stringifyPlutusData(inputDatum),
        },
      });

      await refreshBalance();
    } catch (error) {
      let errMsg = getErrMsg(error);
      if (errMsg.includes("already been spent")) {
        errMsg = "Escrow has already been cancelled.";
      }
      toast.error(errMsg);
    } finally {
      setIsPending(false);
    }
  };

  useEffect(() => {
    if (getEscrowQuery.isSuccess) {
      const latestTx = getEscrowQuery.data?.transactions[0].txHash;
      setDepositTxHash(latestTx || "");
    }
  }, [getEscrowQuery.data?.transactions, getEscrowQuery.isSuccess]);

  useEffect(() => {
    if (cancelPaymentMutation.isSuccess) {
      toast.success("Escrow cancelled successfully.");
      setDepositTxHash("");
      getEscrowQuery.refetch();
    } else if (cancelPaymentMutation.isError) {
      const errMsg = getErrMsg(cancelPaymentMutation.error);
      toast.error(errMsg);
    }
  }, [
    cancelPaymentMutation.isSuccess,
    cancelPaymentMutation.error,
    cancelPaymentMutation.isError,
    getEscrowQuery,
  ]);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-white px-6 py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-14">
        <section>
          <FloatingDebugJson data={{ data: getEscrowQuery.data }} />

          <header className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="space-y-1">
              <div className="mb-1 flex items-center gap-2 text-red-500">
                <ShieldAlert className="h-4 w-4" />
                <span className="text-xs font-bold tracking-[0.2em] uppercase">
                  Termination Protocol
                </span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
                  Cancel Agreement
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
                      <h3 className="flex items-center gap-2 font-bold text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        Safety Notice
                      </h3>
                      <p className="text-sm leading-relaxed text-zinc-600">
                        Cancelling will trigger the smart {`contract's`} refund logic. If the
                        agreement is active, both parties are refunded their respective stakes.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </header>

          {/* Left Column: Form */}
          <div className="space-y-10 lg:col-span-6">
            <div className="space-y-6">
              <Label className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                Active Escrow Reference (Tx Hash)
              </Label>
              <div className="group relative">
                <Hash
                  className="absolute top-1/2 left-1 h-5 w-5 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-red-500"
                  strokeWidth={1.5}
                />
                <Input
                  placeholder={
                    getEscrowQuery.isLoading ? "Loading..." : "Paste the escrow transaction hash..."
                  }
                  value={depositTxHash}
                  onChange={(e) => setDepositTxHash(e.target.value)}
                  className="h-12 rounded-none border-0 border-b border-zinc-300 pl-9 font-mono text-base transition-all focus-visible:border-red-500 focus-visible:ring-0"
                />
                {getEscrowQuery.isLoading && (
                  <Loader2 className="absolute top-3 right-2 h-4 w-4 animate-spin text-zinc-400" />
                )}
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleCancelEscrow}
                disabled={isPending || !depositTxHash || cancelPaymentMutation.isPending}
                variant="destructive"
                loading={cancelPaymentMutation.isPending || isPending}
                className="h-14 w-full rounded-md text-lg font-medium shadow-lg shadow-red-100 transition-all active:scale-[0.98]"
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
              <PersistentText
                data={txHash}
                storageKey="cancelEscrowTxHash"
                label="Termination Receipt"
                description="This hash verifies the smart contract has released the funds back to the original wallets."
              />
            )}
          </div>
        </section>

        <section>
          <EscrowAnalysisCard data={escrow} mode="cancel" />
        </section>
      </div>
    </div>
  );
}
