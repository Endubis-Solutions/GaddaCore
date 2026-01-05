import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWalletContext } from "@/contexts/WalletContext";
import { getScript, getTxBuilder, getUtxoByTxHash } from "@/lib/aiken";
import {
  deserializeAddress,
  deserializeDatum,
  mConStr2,
  MeshValue,
  serializeAddressObj,
} from "@meshsdk/core";
import React, { useState } from "react";
import { ActiveEscrowDatum, getErrMsg } from "../utils";
import PersistentText from "./PersistentText";
import { Textarea } from "@/components/ui/textarea";
// 1. IMPORT THE LOGGER STORE
import { useContractActionLog } from "@/store/useLogger";

const CompleteEscrow = () => {
  const { wallet, changeAddress, collateral, refreshBalance } = useWalletContext();
  const [depositTxHash, setDepositTxHash] = useState("");
  const [isCompleteEscrowPending, setIsCompleteEscrowPending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [partialSignedTxCbor, setPartialSignedTxCbor] = useState<string>("");
  const [submittedTxHash, setSubmittedTxHash] = useState<string>("");

  // 2. ACCESS THE LOGGING FUNCTION
  const logAction = useContractActionLog((state) => state.logAction);

  // --- STEP 1: USER A PARTIAL SIGN ---
  const completeEscrow = async () => {
    if (!depositTxHash) {
      alert("Please enter the Tx Hash of the active Escrow UTxO.");
      return;
    }

    const walletAddress = changeAddress;

    // Log attempt
    logAction({
      action: "INIT",
      contractName: "AikenEscrow",
      method: "completeEscrow (Partial Sign)",
      details: { signer: walletAddress, step: "User A attempting partial sign" },
    });

    try {
      setIsCompleteEscrowPending(true);
      const utxos = await wallet.getUtxos();
      const { scriptAddr, scriptCbor } = getScript();
      const txBuilder = getTxBuilder();

      const escrowUtxo = await getUtxoByTxHash(depositTxHash);
      if (!escrowUtxo || escrowUtxo.output.address !== scriptAddr) {
        throw new Error("Could not find the active script UTxO.");
      }

      const inputDatum = deserializeDatum<ActiveEscrowDatum>(escrowUtxo.output.plutusData!);

      const [initiatorAddressObj, initiatorAmount, recipientAddressObj, recipientAmount] =
        inputDatum.fields;

      const initiatorAddress = serializeAddressObj(initiatorAddressObj);
      const recipientAddress = serializeAddressObj(recipientAddressObj);

      // SWAP LOGIC
      const initiatorToReceive = MeshValue.fromValue(recipientAmount).toAssets();
      const recipientToReceive = MeshValue.fromValue(initiatorAmount).toAssets();

      const initiatorPubHash = deserializeAddress(initiatorAddress).pubKeyHash;
      const recipientPubHash = deserializeAddress(recipientAddress).pubKeyHash;

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
        .txOut(initiatorAddress, initiatorToReceive)
        .txOut(recipientAddress, recipientToReceive)
        .requiredSignerHash(recipientPubHash)
        .requiredSignerHash(initiatorPubHash)
        .changeAddress(walletAddress)
        .txInCollateral(
          collateral[0].input.txHash,
          collateral[0].input.outputIndex,
          collateral[0].output.amount,
          collateral[0].output.address
        )
        .selectUtxosFrom(utxos)
        .complete();

      const unsignedTx = txBuilder.txHex;
      const signedTxUserA = await wallet.signTx(unsignedTx, true, true);

      setPartialSignedTxCbor(signedTxUserA);

      // 3. LOG SUCCESS
      logAction({
        action: "CALL",
        contractName: "AikenEscrow",
        method: "completeEscrow (Partial Sign)",
        details: {
          signer: walletAddress,
          step: "Partial sign successful",
          partialCbor: signedTxUserA.substring(0, 50) + "...",
        },
      });
    } catch (error) {
      console.error("Complete Escrow (User A) failed:", error);
      const errorMessage = getErrMsg(error);
      alert(errorMessage);

      // 4. LOG ERROR
      logAction({
        action: "ERROR",
        contractName: "AikenEscrow",
        method: "completeEscrow (Partial Sign)",
        details: { signer: walletAddress, error: errorMessage, step: "Partial sign failed" },
      });
    } finally {
      setIsCompleteEscrowPending(false);
    }
  };

  // --- STEP 2: USER B FINAL SIGN AND SUBMIT ---
  const submitPartiallySignedTx = async () => {
    if (!partialSignedTxCbor) {
      alert("Please complete Step 1 (Partial Sign) first, or paste the signed CBOR.");
      return;
    }

    const walletAddress = changeAddress;

    // Log attempt
    logAction({
      action: "INIT",
      contractName: "AikenEscrow",
      method: "completeEscrow (Final Submit)",
      details: { signer: walletAddress, step: "User B attempting final sign and submit" },
    });

    try {
      setIsSubmitting(true);
      const partiallySignedTx = partialSignedTxCbor;

      const signedTxUserB = await wallet.signTx(partiallySignedTx, true, true);

      const newTxHash = await wallet.submitTx(signedTxUserB);

      setSubmittedTxHash(newTxHash);
      setDepositTxHash(newTxHash);
      setPartialSignedTxCbor("");
      await refreshBalance();

      // 5. LOG FINAL SUCCESS
      logAction({
        action: "CALL",
        contractName: "AikenEscrow",
        method: "completeEscrow (Final Submit)",
        txHash: newTxHash,
        details: { signer: walletAddress, step: "Final submission successful" },
      });
    } catch (error) {
      console.error("Complete Escrow (User B) failed:", error);
      const errorMessage = getErrMsg(error);
      alert(errorMessage);

      // 6. LOG FINAL ERROR
      logAction({
        action: "ERROR",
        contractName: "AikenEscrow",
        method: "completeEscrow (Final Submit)",
        details: { signer: walletAddress, error: errorMessage, step: "Final submission failed" },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-4 rounded-md border p-4">
      <div className="text-sm font-semibold text-indigo-700">
        Multi-Signature Swap: Two steps required.
      </div>

      <section className="flex flex-col gap-4 rounded-md border border-dashed p-4">
        <h3 className="text-lg font-bold text-gray-800">Step 1: User A Partial Sign</h3>
        <div>
          <Label className="mb-1 text-sm font-medium">Active Escrow UTxO Hash</Label>
          <Input
            value={depositTxHash}
            onChange={(e) => setDepositTxHash(e.target.value)}
            className="h-10 w-64 rounded-md p-2"
            placeholder="a18c3f...d6b3"
          />
        </div>

        <Button
          onClick={completeEscrow}
          disabled={isCompleteEscrowPending}
          loading={isCompleteEscrowPending}
          className="mt-4 mb-2 h-10"
        >
          Partial Sign (User A)
        </Button>

        <PersistentText
          data={partialSignedTxCbor}
          isJson={false}
          storageKey="partiallySignedTxCbor"
        />
      </section>

      <section className="flex flex-col gap-4 rounded-md border border-dashed p-4">
        <h3 className="text-lg font-bold text-gray-800">Step 2: User B Final Sign & Submit</h3>
        <div>
          <Label className="mb-1 text-sm font-medium">Partial Signed CBOR</Label>
          <Textarea
            value={partialSignedTxCbor}
            onChange={(e) => setPartialSignedTxCbor(e.target.value)}
            className="h-28 w-full overflow-y-scroll rounded-md border p-2 font-mono text-xs"
            placeholder="Paste CBOR from Step 1 here..."
          />
        </div>

        <Button
          onClick={submitPartiallySignedTx}
          disabled={isSubmitting || !partialSignedTxCbor}
          loading={isSubmitting}
          className="mt-4 mb-2 h-10 bg-purple-600 hover:bg-purple-700"
        >
          Final Sign & Submit (User B)
        </Button>

        <PersistentText
          data={submittedTxHash}
          isJson={false}
          storageKey="completeEscrowSubmittedTxHash"
        />
      </section>
    </section>
  );
};

export default CompleteEscrow;
