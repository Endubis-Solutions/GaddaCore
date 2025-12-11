import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWalletContext } from "@/contexts/WalletContext"
import { getScript, getTxBuilder, getUtxoByTxHash } from "@/lib/aiken"
import { deserializeAddress, deserializeDatum, mConStr1, MeshValue, serializeAddressObj } from "@meshsdk/core"
import { ActiveEscrowDatum, getErrMsg, InitiationDatum, stringifyPlutusData } from "../utils"
import PersistentText from "./PersistentText"
import { useContractActionLog } from "@/store/useLogger"

const CancelEscrow = () => {
    const { changeAddress, wallet, refreshBalance, collateral } = useWalletContext()
    const [isPending, setIsPending] = useState(false)
    const [txHash, setTxHash] = useState("")
    const [depositTxHash, setDepositTxHash] = useState("")

    // 2. ACCESS THE LOGGING FUNCTION
    const logAction = useContractActionLog((state) => state.logAction);

    const handleCancelEscrow = async () => {
        if (!depositTxHash) {
            alert("Please enter the Tx Hash of the active Escrow UTxO.");
            return;
        }

        const walletAddress = changeAddress;
        let actionDetails: Record<string, unknown> = {
            signer: walletAddress,
            utxoHash: depositTxHash,
            status: 'Attempting submission'
        };

        // Log the initiation attempt immediately
        logAction({
            action: 'INIT',
            contractName: 'AikenEscrow',
            method: 'cancelEscrow',
            details: actionDetails,
        });

        try {
            setIsPending(true)
            const utxos = await wallet.getUtxos();
            const { scriptAddr, scriptCbor } = getScript();
            const txBuilder = getTxBuilder();
            const currentWalletPubHash = deserializeAddress(walletAddress).pubKeyHash;

            // 1. Fetch the UTxO
            const escrowUtxo = await getUtxoByTxHash(depositTxHash);
            if (!escrowUtxo || escrowUtxo.output.address !== scriptAddr) {
                throw new Error("Could not find the script UTxO with the given transaction hash at the script address.");
            }

            // 2. Deserialize Datum
            const inputDatum = deserializeDatum<InitiationDatum | ActiveEscrowDatum>(
                escrowUtxo.output.plutusData!,
            );

            const redeemer = mConStr1([]);
            let stateDescription = 'Initiation (Full Refund to Initiator)';
            
            // 3. Determine Refund Action based on Datum constructor
            if (inputDatum.constructor.toString() === '1') {
                // ActiveEscrowDatum: Refund both parties
                const [
                    initiatorAddressObj,
                    initiatorAmount,
                    recipientAddressObj,
                    recipientAmount,
                ] = inputDatum.fields;

                const initiatorAddress = serializeAddressObj(initiatorAddressObj);
                const recipientAddress = serializeAddressObj(recipientAddressObj!);

                const initiatorToReceive = MeshValue.fromValue(initiatorAmount).toAssets();
                const recipientToReceive = MeshValue.fromValue(recipientAmount!).toAssets();

                txBuilder
                    .txOut(initiatorAddress, initiatorToReceive)
                    .txOut(recipientAddress, recipientToReceive);

                stateDescription = 'Active (Refund to Initiator and Recipient)';
                actionDetails.refunds = { initiator: initiatorToReceive, recipient: recipientToReceive };

            } else {
                // InitiationDatum: Refund only Initiator
                const [
                    initiatorAddressObj,
                    initiatorAmount,
                ] = inputDatum.fields;

                const initiatorAddress = serializeAddressObj(initiatorAddressObj);
                const initiatorToReceive = MeshValue.fromValue(initiatorAmount).toAssets();

                txBuilder
                    .txOut(initiatorAddress, initiatorToReceive);
                
                actionDetails.refunds = { initiator: initiatorToReceive };
            }

            // Update details for logging before building
            actionDetails = { 
                ...actionDetails, 
                state: stateDescription, 
                redeemer: stringifyPlutusData(redeemer) 
            };

            // 4. Build Transaction
            await txBuilder
                .spendingPlutusScript('V3')
                .txIn(
                    escrowUtxo.input.txHash,
                    escrowUtxo.input.outputIndex,
                    escrowUtxo.output.amount,
                    scriptAddr,
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
                    collateral[0].output.address,
                )
                .selectUtxosFrom(utxos)
                .complete();

            const unsignedTx = txBuilder.txHex;
            const signedTx = await wallet.signTx(unsignedTx, undefined, true);
            const newTxHash = await wallet.submitTx(signedTx);
            await refreshBalance()

            setTxHash(newTxHash)
            
            // 5. LOG SUCCESS
            logAction({
                action: 'CALL',
                contractName: 'AikenEscrow',
                method: 'cancelEscrow',
                txHash: newTxHash,
                details: { ...actionDetails, status: 'Transaction Submitted Successfully' }
            });

        } catch (error) {
            console.error("Cancel Escrow failed:", error);
            const errorMessage = getErrMsg(error);
            alert(errorMessage);
            
            // 6. LOG ERROR
            logAction({
                action: 'ERROR',
                contractName: 'AikenEscrow',
                method: 'cancelEscrow',
                details: { ...actionDetails, error: errorMessage, status: 'Failed to Submit Transaction' }
            });

        } finally {
            setIsPending(false)
        }
    }
    return (
        <section className="flex flex-col border p-4 rounded-md">
            <div>
                <Label className="text-sm font-medium mb-1">Deposit Tx Hash</Label>
                <Input
                    value={depositTxHash}
                    onChange={(e) => setDepositTxHash(e.target.value)}
                    className="p-2 border rounded-md w-64 h-10"
                    placeholder="a18c3f..d74c"
                />
            </div>

            <Button
                onClick={handleCancelEscrow}
                disabled={isPending}
                loading={isPending}
                variant={"destructive"}
                className="mt-4 h-10 mb-2">
                Cancel Escrow
            </Button>
            <PersistentText data={txHash} isJson={false} storageKey="cancelEscrowTxHash" />
        </section>
    )
}

export default CancelEscrow