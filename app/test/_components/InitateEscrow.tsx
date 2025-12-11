import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWalletContext } from "@/contexts/WalletContext"
import { getScript, getTxBuilder } from "@/lib/aiken"
import { adaToLovelace } from "@/utils"
import { Asset } from "@meshsdk/core"
import { useState, useCallback } from "react" // Import useCallback
import { getErrMsg, initiateEscrowDatum, stringifyPlutusData } from "../utils"
import PersistentText from "./PersistentText"
import { useContractActionLog } from "@/store/useLogger"
// Components for the new fields
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { ContractUploader } from "./ContractUploader"
import { hashToByteArray } from "@/lib/utils"
import { de } from "date-fns/locale"



const InitateEscrow = () => {
    const { changeAddress, wallet, refreshBalance } = useWalletContext()
    const logAction = useContractActionLog((state) => state.logAction);

    // STATE FOR THE FIVE DATUM FIELDS
    const [amount, setAmount] = useState(0) // Initiator Assets
    const [recipientAddress, setRecipientAddress] = useState("") // Recipient Address
    const [deadlineDate, setDeadlineDate] = useState<Date | undefined>(new Date()) // Deadline (Date object)

    // Uploader State
    const [documentFile, setDocumentFile] = useState<File | null>(null); // To track file presence
    const [ipfsUrl, setIpfsUrl] = useState(""); // Contract IPFS URL

    // UI/TX State
    const [isPending, setIsPending] = useState(false)
    const [txHash, setTxHash] = useState("")

    // --- Uploader Callbacks ---
    const handleFileChange = useCallback((file: File | null) => {
        setDocumentFile(file);
    }, []);

    const handleUploadSuccess = useCallback((hash: string) => {
        setIpfsUrl(hash);
    }, []);
    // -------------------------


    const handleInitateEscrow = async () => {
        const depositAda = amount
        const walletAddress = changeAddress;

        // --- Validation Update to check document/hash ---
        if (isNaN(depositAda) || depositAda <= 0) return alert("Please enter a valid ADA amount.");
        if (!recipientAddress) return alert("Please enter a Recipient Address.");
        if (!deadlineDate) return alert("Please select a deadline.");
        if (!ipfsUrl) return alert("Please upload the contract document via the Uploader.");
        // ------------------------------------------------

        // Convert deadline date to POSIX timestamp in miliseconds (as Int)
        const deadlineTimestamp = deadlineDate.getTime()
        // Note: The previous example used number, using BigInt is safer for large timestamps

        logAction({
            action: 'INIT',
            contractName: 'AikenEscrow',
            method: 'initiateEscrow',
            details: { initiator: walletAddress, recipient: recipientAddress, depositAmountADA: depositAda, deadline: deadlineTimestamp.toString(), status: 'Attempting submission' }
        });

        try {
            setIsPending(true)

            const escrowAmount: Asset[] = [{ unit: "lovelace", quantity: adaToLovelace(depositAda).toString() }]
            const utxos = await wallet.getUtxos();
            const { scriptAddr } = getScript();
            const txBuilder = getTxBuilder();

            const contractIpfsHash = hashToByteArray(ipfsUrl)

            // 1. CALL UPDATED DATUM HELPER WITH ALL FIVE FIELDS
            const initiationDatum = initiateEscrowDatum(
                walletAddress,
                escrowAmount,
                recipientAddress,
                deadlineTimestamp,
                contractIpfsHash // Use the hash obtained from the Uploader
            );

            console.log("Output Datum (Initiation):", stringifyPlutusData(initiationDatum));

            await txBuilder
                .txOut(scriptAddr, escrowAmount)
                .txOutInlineDatumValue(
                    initiationDatum,
                    "JSON",
                )
                .changeAddress(walletAddress)
                .selectUtxosFrom(utxos)
                .complete();

            const unsignedTx = txBuilder.txHex;
            const signedTx = await wallet.signTx(unsignedTx, undefined, true);
            const newTxHash = await wallet.submitTx(signedTx);
            await refreshBalance()

            setTxHash(newTxHash)

            // LOG SUCCESS
            logAction({
                action: 'CALL',
                contractName: 'AikenEscrow',
                method: 'initiateEscrow',
                txHash: newTxHash,
                details: { initiator: walletAddress, recipient: recipientAddress, deposit: `${depositAda} ADA`, scriptAddress: scriptAddr, status: 'Transaction Submitted Successfully', deadline: deadlineTimestamp.toString(), ipfsUrl, contractHash: contractIpfsHash }
            });

        } catch (error) {
            console.error("Error initiating escrow:", error);
            const errorMessage = getErrMsg(error);
            alert(errorMessage)

            // LOG ERROR
            logAction({
                action: 'ERROR',
                contractName: 'AikenEscrow',
                method: 'initiateEscrow',
                details: { initiator: walletAddress, error: errorMessage, depositAttempted: `${depositAda} ADA` }
            });

        } finally {
            setIsPending(false)
        }
    }

    return (
        <section className="flex flex-col border p-4 rounded-md">
            {/* Elegant Title Added */}
            <h2 className="text-2xl font-bold mb-2 text-primary">
                Initiate Escrow Funding
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
                Lock the deposit and define the terms using the contract document.
            </p>

            <div className="space-y-6">
                {/* 1. FUNDER DEPOSIT */}
                <div>
                    <Label className="text-sm font-medium mb-1">Funder Deposit (ADA)</Label>
                    <Input
                        type="number"
                        value={amount || 0}
                        onChange={(e) => setAmount(e.target.valueAsNumber)}
                        className="p-2 border rounded-md w-full h-10"
                        min="1"
                    />
                </div>

                {/* 2. RECIPIENT ADDRESS */}
                <div>
                    <Label className="text-sm font-medium mb-1">Recipient Wallet Address</Label>
                    <Input
                        type="text"
                        value={recipientAddress || ''}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        className="p-2 border rounded-md w-full h-10"
                        placeholder="addr_test..."
                    />
                </div>

                {/* 3. DEADLINE (Calendar) */}
                <div>
                    <Label className="text-sm font-medium mb-1 block">Contract Deadline</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={"w-full justify-start text-left font-normal h-10"}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {deadlineDate ? format(deadlineDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={deadlineDate}
                                onSelect={setDeadlineDate}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* 4. IPFS HASH - Replaced with Uploader Component */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Contract Document Upload</h3>
                    <p className="text-sm text-muted-foreground">Upload the legally binding document to Pinata (IPFS) to generate the immutable hash required by the contract.</p>

                    <ContractUploader
                        onUploadSuccess={handleUploadSuccess}
                        onFileChange={handleFileChange}
                        currentFile={documentFile}
                        ipfsHash={ipfsUrl}
                    />
                </div>
            </div>

            <Button
                onClick={handleInitateEscrow}
                disabled={isPending || !documentFile || !ipfsUrl} // Disable if hash is missing
                className="mt-6 h-10 mb-2">
                {isPending ? 'Pending...' : 'Lock Funds and Initate Escrow'}
            </Button>
            <PersistentText data={txHash} isJson={false} storageKey="funderDepositTxHash" />
        </section>
    )
}

export default InitateEscrow