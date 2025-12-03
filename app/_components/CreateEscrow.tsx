"use client";

import { useState } from "react";
import { deserializeAddress, mConStr0 } from "@meshsdk/core";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { getScript, getTxBuilder } from "@/lib/aiken";
import { Lock, Plus, RefreshCw } from "lucide-react";
import { useWalletContext } from "@/contexts/WalletContext";
import { EscrowTransaction } from "@/types";
import { adaToLovelace } from "@/utils";
import { useCreateEscrowMutation } from "@/services/escrow.service";

const CreateEscrow = () => {
    const {
        wallet,
        changeAddress,
        collateral,
        refreshBalance,
        refreshAddresses,
        balance
    } = useWalletContext();

    const [isLoading, setIsLoading] = useState(false);
    const [lockAmount, setLockAmount] = useState("10");
    const [_, setLockedFunds] = useState<EscrowTransaction[]>([]);
    const [recipientAddress, setRecipientAddress] = useState("addr_test1qqsdx4sacdr24285m8r3ndumqe8mmv3tkkngazqe22y0cjen2tgurprxyradk5qg6nnqgl3t05hur367jd086fg7u09qxgta0d");

    const createEscrowMutation = useCreateEscrowMutation()

    const lockAda = async () => {
        if (!changeAddress || !wallet) {
            alert("Wallet not connected properly");
            return;
        }

        if (!collateral || collateral.length === 0) {
            alert("Please set up collateral in your wallet settings first");
            return;
        }

        const amountInLovelace = adaToLovelace(parseFloat(lockAmount));
        if (parseFloat(lockAmount) > balance) {
            alert("Insufficient balance");
            return;
        }

        setIsLoading(true);
        try {
            const asset = [{
                unit: "lovelace",
                quantity: amountInLovelace.toString()
            }];

            const utxos = await wallet.getUtxos();
            const { scriptAddr } = getScript();

            const funderHash = deserializeAddress(changeAddress).pubKeyHash;
            const recipientHash = deserializeAddress(recipientAddress).pubKeyHash;

            // Calculate dispute deadline (e.g., 7 days from now)
            const disputeDeadline = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);

            // Create the complete datum
            const escrowDatum = mConStr0([
                funderHash,
                recipientHash,
                amountInLovelace,
                mConStr0([]), // status: Active
                disputeDeadline
            ]);

            const txBuilder = getTxBuilder();

            await txBuilder
                .txOut(scriptAddr, asset)
                .txOutInlineDatumValue(escrowDatum)
                .selectUtxosFrom(utxos)
                .changeAddress(changeAddress)
                .complete();

            const unsignedTx = txBuilder.txHex;
            const signedTx = await wallet.signTx(unsignedTx, undefined, true);
            const txHash = await wallet.submitTx(signedTx);

            // Add to locked funds list
            const newTransaction: EscrowTransaction = {
                id: crypto.randomUUID(),
                txHash,
                amount: amountInLovelace,
                recipientAddress,
                status: 'active',
                createdAt: new Date(),
                disputeDeadline,
                datum: JSON.stringify(escrowDatum)
            };

            setLockedFunds(prev => [newTransaction, ...prev]);
            alert(`✅ ${lockAmount} ADA locked successfully!\nTransaction: ${txHash}`);
            createEscrowMutation.mutate({
                amount: amountInLovelace,
                amountAda: +lockAmount,
                recipientAddress: recipientAddress,
                txHash: txHash,
                datum: JSON.stringify(escrowDatum),
                disputeDeadline: new Date(disputeDeadline),
                funderAddress: changeAddress,
                funderPubKeyHash: funderHash,
                recipientPubKeyHash: recipientHash,
                scriptAddress: scriptAddr,
                status: 'ACTIVE'
            })

            await refreshBalance();
            await refreshAddresses();
        } catch (error) {
            console.error("Lock ADA failed:", error);
            alert("❌ Failed to lock ADA: " + (error instanceof Error ? error.message : "Unknown error"));
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Lock ADA in Escrow
                    </CardTitle>
                    <CardDescription>Secure your transaction by locking ADA in a smart contract</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount (ADA)</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.1"
                                min="1"
                                placeholder="10.00"
                                className="h-12"
                                value={lockAmount}
                                onChange={(e) => setLockAmount(e.target.value)}
                            />
                            <p className="text-muted-foreground text-sm">
                                Available: {balance.toFixed(2)} ADA
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="recipient">Recipient Address</Label>
                            <Input
                                id="recipient"
                                type="text"
                                value={recipientAddress}
                                onChange={(ev) => {
                                    setRecipientAddress(ev.target.value);
                                }}
                                readOnly
                                className="font-mono text-sm h-12"

                            />
                            <p className="text-muted-foreground text-sm">
                                Currently using a fixed testnet address
                            </p>
                        </div>

                        <Button
                            onClick={lockAda}
                            disabled={isLoading || !lockAmount || parseFloat(lockAmount) <= 0}
                            className="w-full h-12"
                        >
                            {isLoading && createEscrowMutation.isPending ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Lock ADA in Escrow
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                            1
                        </div>
                        <div>
                            <p className="font-medium">Lock Funds</p>
                            <p className="text-muted-foreground text-sm">
                                Enter the amount to lock ADA in the smart contract with a 7-day dispute period.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                            2
                        </div>
                        <div>
                            <p className="font-medium">Share with Recipient</p>
                            <p className="text-muted-foreground text-sm">
                                Use the QR code to share the escrow details with your recipient.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                            3
                        </div>
                        <div>
                            <p className="font-medium">Release or Dispute</p>
                            <p className="text-muted-foreground text-sm">
                                Approve to release funds, or raise a dispute if needed within 7 days.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default CreateEscrow