"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Hash,
  Lock,
  Clock,
  Shield,
  AlertTriangle,
  Wallet,
  HelpCircleIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWalletContext } from "@/contexts/WalletContext";
import { getScript, getTxBuilder, getUtxoByTxHash } from "@/lib/aiken";
import { adaToLovelace, calculateTimeRemaining, formatDate } from "@/utils";
import { DEFAULT_REDEEMER_BUDGET, deserializeDatum, MeshValue, mergeAssets } from "@meshsdk/core";
import {
  activeEscrowDatum,
  getErrMsg,
  InitiationDatum,
  recipientDepositRedeemer,
  stringifyPlutusData,
} from "@/utils/aiken";

import PersistentText from "@/components/custom/PersistentText";
import { useGetEscrowByIdQuery, useRecipientStakeMutation } from "@/services/escrow.service";
import { useSearchParams } from "next/navigation";
import { EscrowAnalysisCard } from "@/components/custom/EscrowAnalysisCard";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

export default function RecipientDepositPage() {
  const { wallet, changeAddress, collateral, refreshBalance } = useWalletContext();

  const searchParams = useSearchParams();
  const escrowId = searchParams.get("id");
  const getEscrowQuery = useGetEscrowByIdQuery({ id: escrowId || undefined, enabled: !!escrowId });
  const escrow = useMemo(() => getEscrowQuery.data || undefined, [getEscrowQuery.data]);

  const recipientDepositMutation = useRecipientStakeMutation();

  // State
  const [funderTxHash, setFunderTxHash] = useState("");
  const [depositTxHash, setDepositTxHash] = useState("");
  const [isPending, setIsPending] = useState(false);

  // Constants
  const COLLATERAL_AMOUNT = 5; // Fixed 5 ADA collateral
  const now = new Date();
  const deadline = escrow?.recipientLockDeadline ? new Date(escrow.recipientLockDeadline) : null;
  const isExpired = deadline ? deadline < now : false;
  const timeRemaining = deadline ? calculateTimeRemaining(deadline) : null;

  const handleRecipientDeposit = async () => {
    if (!funderTxHash) return alert("Funder Transaction Hash is required.");

    if (isExpired) {
      return alert(
        "The deadline for accepting this agreement has expired. You can no longer deposit collateral."
      );
    }

    if (!escrow) {
      toast.error("Escrow not found.");
      return;
    }

    const walletAddress = changeAddress;

    try {
      setIsPending(true);
      const depositAmount = [
        { unit: "lovelace", quantity: adaToLovelace(COLLATERAL_AMOUNT).toString() },
      ];
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
        .spendingPlutusScript("V3")
        .txIn(
          escrowUtxo.input.txHash,
          escrowUtxo.input.outputIndex,
          escrowUtxo.output.amount,
          scriptAddr
        )
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

      recipientDepositMutation.mutate({
        escrowId: escrow.id,
        recipientStakeInAda: COLLATERAL_AMOUNT,
        transaction: {
          datum: stringifyPlutusData(outputDatum),
          txHash: newTxHash,
        },
      });
    } catch (error) {
      let errMsg = getErrMsg(error);
      if (errMsg.includes("already been spent")) {
        errMsg = "Escrow has already been cancelled.";
      } else if (errMsg.includes("The requested component has not been found")) {
        errMsg = "The requested component has not been found";
      } else if (errMsg.includes("they leave a collateral value as compensation")) {
        errMsg = "Add collateral value as compensation";
      }
      console.log({ error });
      toast.error(errMsg);
    } finally {
      setIsPending(false);
    }
  };

  useEffect(() => {
    if (escrow) {
      const latestTnx = escrow.transactions.find((tnx) => tnx.type === "CREATE_ESCROW");

      if (latestTnx) {
        setFunderTxHash(latestTnx.txHash);
      }
    }
  }, [escrow]);

  useEffect(() => {
    if (recipientDepositMutation.isSuccess) {
      toast.success("Recipient deposit successful");
      getEscrowQuery.refetch();
    } else if (recipientDepositMutation.isError) {
      const errMsg = getErrMsg(recipientDepositMutation.error);
      toast.error(errMsg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    recipientDepositMutation.isSuccess,
    recipientDepositMutation.isError,
    recipientDepositMutation.error,
  ]);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-white px-6 py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-14">
        <section>
          <header className="mb-10 space-y-2">
            <div className="text-primary/80 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="text-xs font-bold tracking-[0.2em] uppercase">Escrow Protocol</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                Accept Agreement
              </h1>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-zinc-400"
                  >
                    <HelpCircleIcon className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 border-zinc-100 p-5 shadow-2xl" align="start">
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 font-bold text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      Safety Notice
                    </h3>
                    <p className="text-sm leading-relaxed text-zinc-600">
                      Review requirements and deposit collateral to activate the contract.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </header>

          <div className="flex flex-col gap-8">
            {/* Unified Agreement Terms Card */}
            <Card
              className={`overflow-hidden rounded-none border-none py-0 shadow-none ${isExpired ? "border-red-200" : "border-zinc-200"}`}
            >
              {/* Top Section: Stats Split */}
              <div className="flex divide-x divide-zinc-100">
                {/* Time Limit */}
                <div className="flex-1 p-5">
                  <div className="mb-2 flex items-center gap-2 text-zinc-500">
                    <Clock className="h-4 w-4" />
                    <span className="text-[10px] font-bold tracking-wider uppercase">
                      Time Limit
                    </span>
                  </div>
                  <div
                    className={`text-2xl font-bold ${isExpired ? "text-red-600" : "text-zinc-900"}`}
                  >
                    {isExpired
                      ? "Expired"
                      : `${timeRemaining?.days || 0}d ${timeRemaining?.hours || 0}h`}
                  </div>
                  <div className="mt-1 truncate text-xs font-medium text-zinc-400">
                    Due by {deadline ? formatDate(deadline) : "N/A"}
                  </div>
                </div>

                {/* Required Deposit */}
                <div className="flex-1 bg-zinc-50/50 p-5">
                  <div className="mb-2 flex items-center gap-2 text-zinc-500">
                    <Shield className="h-4 w-4" />
                    <span className="text-[10px] font-bold tracking-wider uppercase">
                      Required Deposit
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 text-2xl font-bold text-zinc-900">
                    {COLLATERAL_AMOUNT}{" "}
                    <span className="text-sm font-medium text-zinc-500">ADA</span>
                  </div>
                  <div className="mt-1 truncate text-xs font-medium text-emerald-600">
                    Refundable upon completion
                  </div>
                </div>
              </div>

              {/* Bottom Section: Warning */}
              <div className="border-t border-amber-100 bg-amber-50 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold tracking-wide text-amber-800 uppercase">
                      Forfeiture Warning
                    </p>
                    <p className="text-xs leading-relaxed text-amber-700">
                      Your <strong>{COLLATERAL_AMOUNT} ADA</strong> will be forfeited to the funder
                      if you fail to fulfill the agreed terms. It serves as your bond of good faith.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Input & Action */}
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-xs font-medium text-zinc-500">
                  Agreement Reference Hash
                </Label>
                <div className="relative">
                  <Hash className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    placeholder="Paste original funding hash..."
                    value={funderTxHash}
                    onChange={(e) => setFunderTxHash(e.target.value)}
                    className="h-12 rounded-none border-0 border-b border-zinc-300 pl-9 font-mono text-base transition-all focus-visible:border-red-500 focus-visible:ring-0"
                    disabled={!!escrow}
                  />
                </div>
              </div>

              <Button
                onClick={handleRecipientDeposit}
                disabled={isPending || !funderTxHash || isExpired}
                className="h-12 w-full text-base font-medium shadow-md transition-all active:scale-[0.99]"
              >
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing Deposit...</span>
                  </div>
                ) : isExpired ? (
                  <span>Deadline Expired</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    <span>Deposit {COLLATERAL_AMOUNT} ADA & Start</span>
                  </div>
                )}
              </Button>
            </div>

            {/* Success Receipt */}
            {depositTxHash && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <PersistentText
                  data={depositTxHash}
                  storageKey="depositTxHash"
                  label="Agreement Active"
                  description="Collateral deposited. You may now proceed with the work."
                />
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Analysis */}
        <section>
          <EscrowAnalysisCard data={escrow} mode="recipient-deposit" />
        </section>
      </div>
    </div>
  );
}
