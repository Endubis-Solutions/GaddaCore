// components/RecipientStakingDialog.tsx
"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, Check, Lock, Info, FileText, Download, Eye } from "lucide-react";
import { EscrowTransaction } from "@/types";
import { useWalletContext } from "@/contexts/WalletContext";
import { deserializeAddress, mConStr0, mConStr1, none, pubKeyAddress } from "@meshsdk/core";
import { getScript, getTxBuilder, getUtxoByTxHash } from "@/lib/aiken";
import { useUpdateEscrowMutation } from "@/services/escrow.service";
import { RECIPIENT_STAKE_AMOUNT } from "@/constants";
import { adaToLovelace, hexToString } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import FloatingDebugJson from "@/components/custom/DebugJson";
import { tr } from "date-fns/locale";

interface StakeDialogProps {
    transaction: EscrowTransaction;
    onSuccess?: () => void;
    children: React.ReactNode;
}

export default function StakeDialog({
    transaction,
    onSuccess,
    children
}: StakeDialogProps) {
    const [open, setOpen] = useState(false);
    const [termsConfirmed, setTermsConfirmed] = useState(false);
    const [contractConfirmed, setContractConfirmed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { connected, wallet, changeAddress, collateral, refreshBalance, balance } = useWalletContext();
    const updateEscrowMutation = useUpdateEscrowMutation();

    // Debug function to check escrow state
    const debugEscrowState = () => {
        try {
            const datum = JSON.parse(transaction.datum as string || "");
            console.log("=== ESCROW DEBUG ===");
            console.log("1. Datum constructor/alternative:", datum.alternative || datum.constructor);
            console.log("2. Fields count:", datum.fields?.length);

            if (datum.alternative === 0) {
                console.log("3. State: AwaitingRecipient ✓");
                console.log("4. Funder:", datum.fields[0]);
                console.log("5. Funder amount MValue:", datum.fields[1]);
                console.log("6. Project deadline:", new Date(datum.fields[2] * 1000));
                console.log("7. Created at:", new Date(datum.fields[4] * 1000));
                console.log("8. Recipient lock deadline:", new Date(datum.fields[5] * 1000));

                const currentTime = Math.floor(Date.now() / 1000);
                const timeLeft = datum.fields[5] - currentTime;
                console.log("9. Time left (hours):", Math.floor(timeLeft / 3600));
                console.log("10. Time window valid?", timeLeft > 0);
            } else {
                console.log("3. Wrong state:", datum.alternative);
            }

            console.log("11. Your address:", changeAddress);
            console.log("12. Intended recipient:", transaction.recipientAddress);
            console.log("13. Are you recipient?", changeAddress === transaction.recipientAddress);
            console.log("14. Required stake:", RECIPIENT_STAKE_AMOUNT, "ADA");
            console.log("15. Your balance:", balance, "ADA");
            console.log("=== END DEBUG ===");
        } catch (error) {
            console.error("Debug error:", error);
        }
    };

    const acceptWithStake = async (transaction: EscrowTransaction) => {
        // Fixed: Stake 5 ADA (5_000_000 lovelace) as per your contract
        const STAKE_AMOUNT = 5_000_000;
        if (!changeAddress || !wallet || !collateral?.length) {
            alert("Wallet or collateral missing");
            return;
        }
        setIsLoading(true);
        try {
            const utxos = await wallet.getUtxos();
            const { scriptCbor } = getScript();
            const recipientHash = deserializeAddress(changeAddress).pubKeyHash;
            const scriptUtxo = await getUtxoByTxHash(transaction.txHash);

            const stakeMValue = mConStr0([mConStr0(["", mConStr0([["", BigInt(STAKE_AMOUNT)]])])]);
            const redeemer = mConStr1([stakeMValue]);

            const txBuilder = getTxBuilder();
            await txBuilder
                .spendingPlutusScript("V3")
                .txIn(scriptUtxo.input.txHash, scriptUtxo.input.outputIndex, scriptUtxo.output.amount, scriptUtxo.output.address)
                .spendingReferenceTxInInlineDatumPresent()
                .txInScript(scriptCbor)
                .txInRedeemerValue(redeemer)
                .txOut(scriptUtxo.output.address, [{ unit: "lovelace", quantity: STAKE_AMOUNT.toString() }])
                .txInCollateral(collateral[0].input.txHash, collateral[0].input.outputIndex, collateral[0].output.amount, collateral[0].output.address)
                .requiredSignerHash(recipientHash)
                .changeAddress(changeAddress)
                .selectUtxosFrom(utxos)
                .complete();

            const txHash = await wallet.submitTx(await wallet.signTx(txBuilder.txHex));
            alert(`✅ Staked 5 ADA! Tx: ${txHash}`);
        } catch (error) {
            alert("❌ Accept failed: " + (error instanceof Error ? error.message : "Unknown"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleStake = async () => {
        console.log('Is called')
        if (!connected || !wallet || !changeAddress) {
            alert("Please connect your wallet first");
            return;
        }

        const STAKE_AMOUNT = adaToLovelace(RECIPIENT_STAKE_AMOUNT); // 5 ADA in lovelace

        setIsLoading(true);
        try {
            console.log("=== STARTING STAKE TRANSACTION ===");
            debugEscrowState();

            // 1. Get UTxOs
            const utxos = await wallet.getUtxos();
            console.log("UTxOs available:", utxos.length);

            // 2. Get script UTxO
            const scriptUtxo = await getUtxoByTxHash(transaction.txHash);
            console.log("Script UTxO:", scriptUtxo);

            if (!scriptUtxo.output.plutusData) {
                throw new Error("No datum found in script UTxO");
            }

            // 3. Parse existing datum
            const existingDatum = JSON.parse(transaction.datum as string || "");
            console.log("Parsed datum:", existingDatum);

            // Check if it's AwaitingRecipient (alternative 0)
            if (existingDatum.alternative !== 0) {
                throw new Error(`Escrow is not in AwaitingRecipient state. Current state: ${existingDatum.alternative}`);
            }

            // Check time window
            const currentTime = Math.floor(Date.now() / 1000);
            const recipientLockDeadline = existingDatum.fields[5];
            if (currentTime > recipientLockDeadline) {
                throw new Error("The 48-hour acceptance window has expired");
            }

            // Check if we're the recipient
            if (transaction.recipientAddress && transaction.recipientAddress !== changeAddress) {
                throw new Error("You are not the intended recipient of this escrow");
            }

            // 4. Create stake MValue - MUST MATCH VALIDATOR EXPECTATIONS
            // Based on your Aiken validator: has_minimum_ada checks for 5_000_000 lovelace
            // In your tests, MValue is empty array [] for 5 ADA? That seems wrong.
            // Let's create proper MValue structure:
            const stakeMValue = mConStr0([
                mConStr0([ // Policy pair
                    "", // ADA policy ID (empty)
                    mConStr0([ // Asset pairs
                        ["", Number(STAKE_AMOUNT)] // ADA asset name (empty), amount
                    ])
                ])
            ]);

            console.log("Stake MValue:", stakeMValue);

            console.log({ existingDatum })



            // 5. Create AcceptWithStake redeemer (constructor 1)
            const redeemer = mConStr1(
                [changeAddress, stakeMValue]);

            // 6. Calculate total amount
            const funderAmountLovelace = Number(transaction.amount);
            const totalAmountLovelace = funderAmountLovelace + Number(STAKE_AMOUNT);

            console.log(`Total calculation: ${funderAmountLovelace} + ${STAKE_AMOUNT} = ${totalAmountLovelace}`);

            // 7. Create new Active datum (constructor 1)
            const newDatum = mConStr1([
                existingDatum.fields[0], // funder
                existingDatum.fields[1], // funder_amount (keep as is)
                changeAddress, // recipient (you)
                stakeMValue, // recipient_stake
                existingDatum.fields[2], // project_deadline
                existingDatum.fields[3], // contract_ipfs_hash
                none, none
            ]);

            console.log("New Active datum:", newDatum);


            const txBuilder = getTxBuilder();

            // Get script address
            const { scriptAddr, scriptCbor } = getScript();

            console.log("Building transaction...");
            console.log("Script address:", scriptAddr);

            // Build step by step
            await txBuilder
                .spendingPlutusScript("V3")
                .txIn(
                    scriptUtxo.input.txHash,
                    scriptUtxo.input.outputIndex,
                    scriptUtxo.output.amount,
                    scriptUtxo.output.address
                )
                .spendingReferenceTxInInlineDatumPresent()
                .txInScript(scriptCbor)
                .txInRedeemerValue(redeemer)
                .txOut(
                    scriptAddr, // IMPORTANT: Use script address, not UTxO address
                    [
                        { unit: "lovelace", quantity: totalAmountLovelace.toString() }
                    ]
                ).txInCollateral(collateral[0].input.txHash, collateral[0].input.outputIndex, collateral[0].output.amount, collateral[0].output.address)
                .changeAddress(changeAddress)
                .selectUtxosFrom(utxos)
                .complete();

            // 9. Sign and submit
            const unsignedTx = txBuilder.txHex;
            console.log("Transaction built, signing...");

            const signedTx = await wallet.signTx(unsignedTx, undefined, true);
            console.log("Transaction signed, submitting...");

            const txHash = await wallet.submitTx(signedTx);
            console.log("✅ Transaction successful:", txHash);

            // 10. Update database
            updateEscrowMutation.mutate({
                status: 'ACTIVE',
                walletAddress: changeAddress,
                txHash,
                id: transaction.id
            });

            alert(`✅ Successfully staked ${RECIPIENT_STAKE_AMOUNT} ADA!\nTransaction: ${txHash.slice(0, 20)}...`);

            await refreshBalance();
            setOpen(false);
            if (onSuccess) onSuccess();

        } catch (error) {
            console.error("❌ Stake error details:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Contract display logic
    const contractInfo = transaction.contractIpfsHash ? {
        display: `Contract Hash: ${transaction.contractIpfsHash.slice(0, 12)}...`,
        url: `${hexToString(transaction.contractIpfsHash)}`,
        rawHash: transaction.contractIpfsHash
    } : null;

    const allConfirmed = termsConfirmed && contractConfirmed;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild onClick={debugEscrowState}>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Accept Escrow Contract
                    </DialogTitle>
                    <DialogDescription>
                        Review the contract and stake {RECIPIENT_STAKE_AMOUNT} ADA to accept
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <FloatingDebugJson data={{ url: hexToString(transaction.contractIpfsHash || "") }} />
                    {/* Summary Card */}
                    <Card>
                        <CardContent className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Escrow Amount</p>
                                    <p className="text-xl font-bold">{transaction.amountAda.toFixed(2)} ADA</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Your Stake</p>
                                    <p className="text-xl font-bold text-green-600">{RECIPIENT_STAKE_AMOUNT} ADA</p>
                                </div>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-medium">Total Locked</p>
                                <Badge variant="secondary" className="text-lg px-3 py-1">
                                    {(transaction.amountAda + RECIPIENT_STAKE_AMOUNT).toFixed(2)} ADA
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contract Display */}
                    {contractInfo && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Contract Document
                                </h3>
                            </div>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium">IPFS Hash</p>
                                                <p className="text-sm text-muted-foreground font-mono break-all">
                                                    {contractInfo.display}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => window.open(contractInfo.url, '_blank')}
                                                    className="gap-2"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    View
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Important Information */}
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="space-y-2">
                                <h4 className="font-medium text-amber-800">Important Information</h4>
                                <ul className="space-y-2 text-sm text-amber-700">
                                    <li className="flex items-start gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                                        <span><strong>Stake:</strong> {RECIPIENT_STAKE_AMOUNT} ADA will be locked with the escrow</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                                        <span><strong>Total Locked:</strong> {transaction.amountAda + RECIPIENT_STAKE_AMOUNT} ADA will be governed by smart contract</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                                        <span><strong>Time Limit:</strong> You must accept within 48 hours of creation</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Agreement Checkboxes */}
                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <input
                                type="checkbox"
                                id="terms-agreement"
                                checked={termsConfirmed}
                                onChange={(e) => setTermsConfirmed(e.target.checked)}
                                className="h-5 w-5 rounded border-gray-300 mt-0.5"
                            />
                            <div className="space-y-1">
                                <Label htmlFor="terms-agreement" className="text-sm font-medium">
                                    I understand the escrow terms
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    I acknowledge that {RECIPIENT_STAKE_AMOUNT} ADA will be staked and locked.
                                </p>
                            </div>
                        </div>

                        {contractInfo && (
                            <div className="flex items-start space-x-3">
                                <input
                                    type="checkbox"
                                    id="contract-agreement"
                                    checked={contractConfirmed}
                                    onChange={(e) => setContractConfirmed(e.target.checked)}
                                    className="h-5 w-5 rounded border-gray-300 mt-0.5"
                                />
                                <div className="space-y-1">
                                    <Label htmlFor="contract-agreement" className="text-sm font-medium">
                                        I accept the contract terms
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        I have reviewed and accept the contract document.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="flex-1"
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            // onClick={}
                            onClick={async () => {
                                console.log("HEY")
                                handleStake()
                            }}
                            disabled={!allConfirmed || isLoading || !connected}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                            {isLoading ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Check className="mr-2 h-4 w-4" />
                                    Stake {RECIPIENT_STAKE_AMOUNT} ADA
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Status Messages */}
                    {!connected && (
                        <div className="rounded-md bg-red-50 p-3 text-center">
                            <p className="text-sm text-red-600">
                                Please connect your wallet
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}