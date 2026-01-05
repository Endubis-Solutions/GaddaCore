import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWalletContext } from "@/contexts/WalletContext";
import { getScript, getTxBuilder, getUtxoByTxHash } from "@/lib/aiken";
import { adaToLovelace } from "@/utils";
import {
  Asset,
  DEFAULT_REDEEMER_BUDGET,
  deserializeDatum,
  mergeAssets,
  MeshValue,
} from "@meshsdk/core";
import React, { useState } from "react";
import {
  activeEscrowDatum,
  getErrMsg,
  InitiationDatum,
  recipientDepositRedeemer,
  stringifyPlutusData,
} from "../utils";
import PersistentText from "./PersistentText";
import { useContractActionLog } from "@/store/useLogger";

const RecipientDeposit = () => {
  const { wallet, changeAddress, collateral } = useWalletContext();
  const [amount, setAmount] = useState(0);
  const [depositTxHash, setDepositTxHash] = useState("");
  const [funderTxHash, setFunderTxHash] = useState("");
  const [isPending, setIsPending] = useState(false);

  // 2. ACCESS THE LOGGING FUNCTION
  const logAction = useContractActionLog((state) => state.logAction);

  const handleRecipientDeposit = async () => {
    const depositAda = amount;
    if (isNaN(depositAda) || depositAda <= 0) {
      alert("Please enter a valid amount for the Recipient Deposit.");
      return;
    }
    if (!funderTxHash) {
      alert("Please enter the Tx Hash of the previous Funding transaction.");
      return;
    }

    const walletAddress = changeAddress;

    // Log attempt
    logAction({
      action: "INIT",
      contractName: "AikenEscrow",
      method: "recipientDeposit",
      details: {
        recipient: walletAddress,
        depositAmountADA: depositAda,
        funderTxHash: funderTxHash,
        status: "Attempting submission",
      },
    });

    try {
      setIsPending(true);
      const depositAmount: Asset[] = [
        { unit: "lovelace", quantity: adaToLovelace(depositAda).toString() },
      ];
      const utxos = await wallet.getUtxos();
      const { scriptAddr, scriptCbor } = getScript();
      const txBuilder = getTxBuilder();

      // 1. Fetch the UTxO explicitly by hash
      const escrowUtxo = await getUtxoByTxHash(funderTxHash);
      if (!escrowUtxo || escrowUtxo.output.address !== scriptAddr) {
        throw new Error(
          "Could not find the script UTxO with the given transaction hash at the script address."
        );
      }

      // 2. Parse Input Datum (InitiationDatum)
      const inputDatum = deserializeDatum<InitiationDatum>(escrowUtxo.output.plutusData!);

      console.log(stringifyPlutusData(inputDatum));

      // 3. Create Output Datum (ActiveEscrowDatum)
      const outputDatum = activeEscrowDatum(
        inputDatum,
        walletAddress, // This is the recipient's address
        depositAmount
      );

      // 4. Create Redeemer
      const redeemerValue = recipientDepositRedeemer(walletAddress, depositAmount);

      // 5. Calculate new total assets (Funder's assets + Recipient's deposit)
      const inputAssets = MeshValue.fromValue(inputDatum.fields[1]).toAssets();
      const escrowAmount = mergeAssets([...depositAmount, ...inputAssets]);

      console.log();

      // Prepare details for successful log
      const logDetails = {
        recipient: walletAddress,
        deposit: `${depositAda} ADA`,
        inputUTxO: `${escrowUtxo.input.txHash}#${escrowUtxo.input.outputIndex}`,
        newEscrowAmount: stringifyPlutusData(escrowAmount),
        outputDatum: stringifyPlutusData(outputDatum),
        redeemer: stringifyPlutusData(redeemerValue),
      };

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
        .txOut(scriptAddr, escrowAmount) // New output UTxO
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

      const unsignedTx = txBuilder.txHex;
      const signedTx = await wallet.signTx(unsignedTx, undefined, true);
      const newTxHash = await wallet.submitTx(signedTx);

      setDepositTxHash(newTxHash);

      // 3. LOG SUCCESS
      logAction({
        action: "CALL",
        contractName: "AikenEscrow",
        method: "recipientDeposit",
        txHash: newTxHash,
        details: { ...logDetails, status: "Transaction Submitted Successfully" },
      });
    } catch (error) {
      console.error("Recipient Deposit failed:", error);
      const errorMessage = getErrMsg(error);
      alert(errorMessage);

      // 4. LOG ERROR
      logAction({
        action: "ERROR",
        contractName: "AikenEscrow",
        method: "recipientDeposit",
        details: {
          recipient: walletAddress,
          depositAttempted: `${depositAda} ADA`,
          funderTxHash: funderTxHash,
          error: errorMessage,
        },
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-md border p-4">
      <div>
        <Label className="mb-1 text-sm font-medium">Recipient Deposit(ADA)</Label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.valueAsNumber)}
          className="h-10 w-64 rounded-md border p-2"
          min="1"
        />
      </div>
      <div>
        <Label className="mb-1 text-sm font-medium">Funder TxHash (Initiation UTxO)</Label>
        <Input
          value={funderTxHash}
          onChange={(e) => setFunderTxHash(e.target.value)}
          className="h-10 w-64 rounded-md border p-2"
          placeholder="a18c3f...d6b3"
        />
      </div>

      <Button
        onClick={handleRecipientDeposit}
        disabled={isPending}
        loading={isPending}
        className="mt-4 mb-2 h-10"
      >
        Recipient Deposit
      </Button>

      <PersistentText data={depositTxHash} isJson={false} storageKey="depositTxHash" />
    </section>
  );
};

export default RecipientDeposit;
