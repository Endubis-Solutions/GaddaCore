import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWalletContext } from "@/contexts/WalletContext";
import { getScript, getTxBuilder, getUtxoByTxHash } from "@/lib/aiken";
import {
  deserializeDatum,
  serializeAddressObj,
  deserializeAddress,
  DEFAULT_REDEEMER_BUDGET,
} from "@meshsdk/core";
import React, { useState, useCallback } from "react";
import {
  ActiveEscrowDatum,
  InitiatorDisputeDatum,
  getErrMsg,
  initiatorDisputeDatum,
  recipientDisputeDatum,
  raiseInitiatorDisputeRedeemer,
  submitRecipientEvidenceRedeemer,
  stringifyPlutusData,
} from "../utils";
import PersistentText from "./PersistentText";
import { useContractActionLog } from "@/store/useLogger";
import { ContractUploader } from "./ContractUploader";
import { hashToByteArray } from "@/lib/utils";

// ====================================================================
// 1. RaiseInitiatorDispute Component (ActiveEscrow -> InitiatorDispute)
// ====================================================================

const RaiseInitiatorDispute = () => {
  const { wallet, changeAddress, collateral, refreshBalance } = useWalletContext();
  const logAction = useContractActionLog((state) => state.logAction);

  const [activeEscrowTxHash, setActiveEscrowTxHash] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [submittedTxHash, setSubmittedTxHash] = useState<string>("");

  // IPFS State for Dispute Evidence
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [ipfsUrl, setIpfsUrl] = useState("");

  // --- Uploader Callbacks ---
  const handleFileChange = useCallback((file: File | null) => {
    setDocumentFile(file);
  }, []);

  const handleUploadSuccess = useCallback((hash: string) => {
    console.log(hash);
    setIpfsUrl(hash);
  }, []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logValues = (...args: any[]): void => {
    let undefinedCount = 0;
    const failureIndices: number[] = [];

    console.log("%c 🔍 Sequence Value Audit ", "background: #333; color: #00ff00;");

    args.forEach((val, index) => {
      // Determine the type and status
      const status = val === undefined ? "❌ UNDEFINED" : "✅ VALID";
      const type = typeof val;

      // Log the result with its position in your function call
      if (val === undefined) {
        undefinedCount++;
        failureIndices.push(index + 1); // 1-based index for easier reading
        console.error(`Arg [${index + 1}]: ${status} | Type: ${type}`);
      } else {
        // For objects (like UTxOs), we show a snippet, otherwise the raw value
        const displayValue = type === "object" ? stringifyPlutusData(val) + "..." : val;
        console.log(`Arg [${index + 1}]: ${status} | Value: ${displayValue}`);
      }
    });

    console.log("----------------------------------");
    if (undefinedCount > 0) {
      console.error(
        `🚨 Critical: ${undefinedCount} values are undefined at positions: ${failureIndices.join(", ")}`
      );
    }
  };

  const handleDispute = async () => {
    if (!activeEscrowTxHash) {
      alert("Please enter the Tx Hash of the active Escrow UTxO.");
      return;
    }
    if (!ipfsUrl) {
      alert("Please upload the dispute evidence document via the Uploader.");
      return;
    }

    const walletAddress = changeAddress;

    logAction({
      action: "INIT",
      contractName: "AikenEscrow",
      method: "RaiseInitiatorDispute",
      details: {
        signer: walletAddress,
        step: "Attempting to file dispute",
        activeUtxo: activeEscrowTxHash,
      },
    });

    try {
      setIsPending(true);
      const utxos = await wallet.getUtxos();
      const { scriptAddr, scriptCbor } = getScript();
      const txBuilder = getTxBuilder();
      const now = Date.now();

      const escrowUtxo = await getUtxoByTxHash(activeEscrowTxHash);
      if (!escrowUtxo || escrowUtxo.output.address !== scriptAddr) {
        throw new Error("Could not find the active script UTxO.");
      }

      // Input Datum (ActiveEscrow - ConStr1)
      const inputDatum = deserializeDatum<ActiveEscrowDatum>(escrowUtxo.output.plutusData!);

      console.log(stringifyPlutusData(inputDatum.fields));

      const initiatorAddress = serializeAddressObj(inputDatum.fields[0]);
      const initiatorPubHash = deserializeAddress(initiatorAddress).pubKeyHash;

      // 1. CREATE NEW DATUM (InitiatorDispute - ConStr2)
      const initiatorCaseIpfsHash = hashToByteArray(ipfsUrl);

      const newInitiatorDisputeDatum = initiatorDisputeDatum(
        inputDatum,
        now,
        initiatorCaseIpfsHash
      );

      console.log(
        "new Initiator Dispute Datum",
        stringifyPlutusData(newInitiatorDisputeDatum.fields)
      );

      // 2. CREATE REDEEMER (RaiseInitiatorDispute - ConStr3)
      const redeemer = raiseInitiatorDisputeRedeemer(now, initiatorCaseIpfsHash);

      console.log({ now, initiatorCaseIpfsHash });

      console.log("new Initiator Dispute Redeemer", stringifyPlutusData(redeemer.fields));

      // await txBuilder
      //     .txOut(scriptAddr, escrowAmount)
      //     .txOutInlineDatumValue(
      //         initiationDatum,
      //         "JSON",
      //     )
      //     .changeAddress(walletAddress)
      //     .selectUtxosFrom(utxos)
      //     .complete();

      // FIND Undefined input value provided

      logValues(
        escrowUtxo.input.txHash,
        escrowUtxo.input.outputIndex,
        escrowUtxo.output.amount,
        scriptAddr,
        scriptCbor,
        redeemer,
        newInitiatorDisputeDatum,
        initiatorPubHash,
        walletAddress,
        collateral[0].input.txHash,
        collateral[0].input.outputIndex,
        collateral[0].output.amount,
        collateral[0].output.address,
        utxos
      );

      await txBuilder
        .spendingPlutusScript("V3") // we used plutus v3
        .txIn(
          // spend the utxo from the script address
          escrowUtxo.input.txHash,
          escrowUtxo.input.outputIndex,
          escrowUtxo.output.amount,
          scriptAddr
        )
        .spendingReferenceTxInInlineDatumPresent()
        .txInRedeemerValue(redeemer, "JSON") // provide the required redeemer value `Hello, World!`
        .txInScript(scriptCbor)
        .requiredSignerHash(initiatorPubHash)
        .txOut(scriptAddr, escrowUtxo.output.amount)
        .txOutInlineDatumValue(newInitiatorDisputeDatum, "JSON")
        .changeAddress(walletAddress)
        .txInCollateral(
          collateral[0].input.txHash,
          collateral[0].input.outputIndex,
          collateral[0].output.amount,
          collateral[0].output.address
        )
        .selectUtxosFrom(utxos)
        .complete();

      // await txBuilder
      //     .spendingPlutusScript("V3")
      //     // --- RESTORED AND CORRECTED INPUT DEFINITION ---
      //     .txIn( // <--- RESTORED: Defines the UTxO to be spent
      //         escrowUtxo.input.txHash,
      //         escrowUtxo.input.outputIndex,
      //         escrowUtxo.output.amount,
      //         scriptAddr,
      //     )
      //     .spendingReferenceTxInInlineDatumPresent() // <--- RESTORED: Indicates the input has an inline datum
      //     .spendingReferenceTxInRedeemerValue(redeemer)
      //     .txInScript(scriptCbor)
      //     .txOut(
      //         scriptAddr,
      //         escrowUtxo.output.amount
      //     )
      //     .txOutInlineDatumValue(newInitiatorDisputeDatum, "JSON")
      //     .requiredSignerHash(initiatorPubHash) // <--- RESTORED: Required by the Aiken script
      //     .changeAddress(walletAddress)
      //     .txInCollateral(
      //         collateral[0].input.txHash,
      //         collateral[0].input.outputIndex,
      //         collateral[0].output.amount,
      //         collateral[0].output.address,
      //     )
      //     .selectUtxosFrom(utxos)
      //     .complete();

      const unsignedTx = txBuilder.txHex;
      const signedTx = await wallet.signTx(unsignedTx);
      const newTxHash = await wallet.submitTx(signedTx);

      setSubmittedTxHash(newTxHash);
      await refreshBalance();

      logAction({
        action: "CALL",
        contractName: "AikenEscrow",
        method: "RaiseInitiatorDispute",
        txHash: newTxHash,
        details: {
          signer: walletAddress,
          step: "Dispute filed successfully",
          newDatum: "InitiatorDispute",
          ipfsUrl,
        },
      });
    } catch (error) {
      console.error("Raise Initiator Dispute failed:", error);
      const errorMessage = getErrMsg(error);
      alert(errorMessage);

      logAction({
        action: "ERROR",
        contractName: "AikenEscrow",
        method: "RaiseInitiatorDispute",
        details: { signer: walletAddress, error: errorMessage, step: "Filing dispute failed" },
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section className="space-y-4 rounded-md border border-orange-300 bg-orange-50 p-4">
      <div className="text-xl font-bold text-orange-700">Step 1: Raise Initiator Dispute</div>
      <p className="text-muted-foreground text-sm">
        As the **Initiator**, file a dispute. Requires your signature.
      </p>

      <div className="space-y-4">
        <div>
          <Label className="mb-1 text-sm font-medium">Active Escrow UTxO Hash (ConStr1)</Label>
          <Input
            value={activeEscrowTxHash}
            onChange={(e) => setActiveEscrowTxHash(e.target.value)}
            className="h-10 w-full rounded-md p-2"
            placeholder="Tx Hash of the ActiveEscrow UTxO"
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Initiator Evidence Upload</h3>
          <ContractUploader
            onUploadSuccess={handleUploadSuccess}
            onFileChange={handleFileChange}
            currentFile={documentFile}
            ipfsHash={ipfsUrl}
            uniqueId={"initiatorEvidence"}
          />
        </div>
      </div>

      <Button
        onClick={handleDispute}
        disabled={isPending || !ipfsUrl}
        loading={isPending}
        className="mt-4 mb-2 h-10 w-full bg-orange-600 hover:bg-orange-700"
      >
        {isPending ? "Filing Dispute..." : "File Dispute"}
      </Button>

      <PersistentText data={submittedTxHash} isJson={false} storageKey="initiatorDisputeTxHash" />
    </section>
  );
};

// ======================================================================
// 2. SubmitRecipientEvidence Component (InitiatorDispute -> RecipientDispute)
// ======================================================================

const SubmitRecipientEvidence = () => {
  const { wallet, changeAddress, collateral, refreshBalance } = useWalletContext();
  const logAction = useContractActionLog((state) => state.logAction);

  const [initiatorDisputeTxHash, setInitiatorDisputeTxHash] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [submittedTxHash, setSubmittedTxHash] = useState<string>("");

  // IPFS State for Dispute Evidence
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [ipfsUrl, setIpfsUrl] = useState("");

  // --- Uploader Callbacks ---
  const handleFileChange = useCallback((file: File | null) => {
    setDocumentFile(file);
  }, []);

  const handleUploadSuccess = useCallback((hash: string) => {
    setIpfsUrl(hash);
  }, []);
  // -------------------------

  const handleSubmitEvidence = async () => {
    if (!initiatorDisputeTxHash) {
      alert("Please enter the Tx Hash of the Initiator Dispute UTxO.");
      return;
    }
    if (!ipfsUrl) {
      alert("Please upload the recipient evidence document via the Uploader.");
      return;
    }

    const walletAddress = changeAddress;

    logAction({
      action: "INIT",
      contractName: "AikenEscrow",
      method: "SubmitRecipientEvidence",
      details: {
        signer: walletAddress,
        step: "Attempting to submit evidence",
        activeUtxo: initiatorDisputeTxHash,
      },
    });

    try {
      setIsPending(true);
      const utxos = await wallet.getUtxos();
      const { scriptAddr, scriptCbor } = getScript();
      const txBuilder = getTxBuilder();
      const now = Date.now();

      const escrowUtxo = await getUtxoByTxHash(initiatorDisputeTxHash);
      if (!escrowUtxo || escrowUtxo.output.address !== scriptAddr) {
        throw new Error("Could not find the script UTxO.");
      }

      // Input Datum (InitiatorDispute - ConStr2)
      const inputDatum = deserializeDatum<InitiatorDisputeDatum>(escrowUtxo.output.plutusData!);

      const recipientAddress = serializeAddressObj(inputDatum.fields[2]); // Recipient is the 3rd field
      const recipientPubHash = deserializeAddress(recipientAddress).pubKeyHash;

      // 1. CREATE NEW DATUM (RecipientDispute - ConStr3)
      const recipientCaseIpfsHash = hashToByteArray(ipfsUrl);

      const newRecipientDisputeDatum = recipientDisputeDatum(
        inputDatum,
        now,
        recipientCaseIpfsHash
      );

      // 2. CREATE REDEEMER (SubmitRecipientEvidence - ConStr4)
      const redeemer = submitRecipientEvidenceRedeemer(now, recipientCaseIpfsHash);

      await txBuilder
        .spendingPlutusScript("V3")
        .txIn(
          escrowUtxo.input.txHash,
          escrowUtxo.input.outputIndex,
          escrowUtxo.output.amount,
          scriptAddr
        )
        .spendingReferenceTxInInlineDatumPresent()
        .txInRedeemerValue(redeemer, "JSON") // provide the required redeemer value `Hello, World!`
        .txInScript(scriptCbor)
        .requiredSignerHash(recipientPubHash)
        .txOut(scriptAddr, escrowUtxo.output.amount)
        .txOutInlineDatumValue(newRecipientDisputeDatum, "JSON")
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
      const signedTx = await wallet.signTx(unsignedTx);
      const newTxHash = await wallet.submitTx(signedTx);

      setSubmittedTxHash(newTxHash);
      await refreshBalance();

      logAction({
        action: "CALL",
        contractName: "AikenEscrow",
        method: "SubmitRecipientEvidence",
        txHash: newTxHash,
        details: {
          signer: walletAddress,
          step: "Evidence submitted successfully",
          newDatum: "RecipientDispute",
          ipfsUrl,
        },
      });
    } catch (error) {
      console.error("Submit Recipient Evidence failed:", error);
      const errorMessage = getErrMsg(error);
      alert(errorMessage);

      logAction({
        action: "ERROR",
        contractName: "AikenEscrow",
        method: "SubmitRecipientEvidence",
        details: { signer: walletAddress, error: errorMessage, step: "Submitting evidence failed" },
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section className="space-y-4 rounded-md border border-blue-300 bg-blue-50 p-4">
      <div className="text-xl font-bold text-blue-700">Step 2: Submit Recipient Evidence</div>
      <p className="text-muted-foreground text-sm">
        As the **Recipient**, submit your evidence in response. Requires your signature.
      </p>

      <div className="space-y-4">
        <div>
          <Label className="mb-1 text-sm font-medium">Initiator Dispute UTxO Hash (ConStr2)</Label>
          <Input
            value={initiatorDisputeTxHash}
            onChange={(e) => setInitiatorDisputeTxHash(e.target.value)}
            className="h-10 w-full rounded-md p-2"
            placeholder="Tx Hash from the previous step..."
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Recipient Evidence Upload</h3>
          <ContractUploader
            onUploadSuccess={handleUploadSuccess}
            onFileChange={handleFileChange}
            currentFile={documentFile}
            ipfsHash={ipfsUrl}
            uniqueId={"recipientEvidence"}
          />
        </div>
      </div>

      <Button
        onClick={handleSubmitEvidence}
        disabled={isPending || !ipfsUrl}
        loading={isPending}
        className="mt-4 mb-2 h-10 w-full bg-blue-600 hover:bg-blue-700"
      >
        {isPending ? "Submitting Evidence..." : "Submit Evidence"}
      </Button>

      <PersistentText data={submittedTxHash} isJson={false} storageKey="recipientEvidenceTxHash" />
    </section>
  );
};

// ======================================================================
// 3. Main Container Component
// ======================================================================

const DisputeActions = () => {
  return (
    <section className="space-y-6 rounded-lg border bg-gray-50 p-4">
      <h2 className="mb-4 text-2xl font-bold text-red-700">
        Dispute & Evidence Submission Workflow
      </h2>
      <p className="text-muted-foreground border-l-4 border-red-400 py-1 pl-3 text-sm">
        This process moves the escrow UTxO through the dispute states. The final state
        (`RecipientDispute`) requires a **Resolution** transaction to proceed, which is not yet
        implemented.
      </p>

      <RaiseInitiatorDispute />

      <div className="relative flex items-center justify-center py-4">
        <div className="absolute h-full w-px bg-gray-300"></div>
        <span className="relative z-10 rounded-full border border-gray-300 bg-gray-50 p-2 text-sm font-semibold text-gray-500">
          TRANSITION
        </span>
      </div>

      <SubmitRecipientEvidence />
    </section>
  );
};

export default DisputeActions;
