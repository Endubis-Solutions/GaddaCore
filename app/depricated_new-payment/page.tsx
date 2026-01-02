// app/create-contract/page.tsx
"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Upload, FileText, Eye, AlertCircle } from "lucide-react";

// shadcn components
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { usePinataUploadMutation } from "@/services/pinata.service";
import FloatingDebugJson from "@/components/custom/DebugJson";
import { useWalletContext } from "@/contexts/WalletContext";
import {  adaToLovelaceSerialized } from "@/utils";
import { getScript, getTxBuilder } from "@/lib/aiken";
import { useCreateEscrowMutation } from "@/services/escrow.service";
import { hashToByteArray } from "@/lib/utils";
import { mConStr0 } from "@meshsdk/core";

// Constants
const VALID_FILE_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Define Zod schema for validation - document is now required
const formSchema = z.object({
    receiverAddress: z
        .string()
        .min(10, "Wallet address is too short"),
    amount: z
        .number()
        .min(0.1, "Amount must be greater than 0")
        .max(1000000, "Amount cannot exceed 1,000,000 ADA"),
    deadline: z.date().refine(
        (date) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return date >= today;
        },
        {
            message: "Deadline must be today or in the future",
        }
    ),
});

type FormData = z.infer<typeof formSchema>;

// Helper functions
const formatContract = (
    data: FormData,
    ipfsHash: string
): {
    formattedContract: string;
    finalContract: Record<string, unknown>;
} => {
    const formattedContract = `# ESCROW AGREEMENT

**Agreement ID:** ${Date.now()}
**Created:** ${new Date().toISOString()}
**IPFS Document Hash:** ${ipfsHash}

## PARTIES
**Funder:** [FUNDER'S ADDRESS]
**Recipient:** ${data.receiverAddress}

## CONTRACT DOCUMENT
**Document Reference:** IPFS: ${ipfsHash}
**Note:** The complete contract document is stored on IPFS and referenced by the above hash.

## FUNDING DETAILS
**Amount:** ${data.amount} ADA
**Deadline:** ${format(data.deadline, "PPP")}
**Release Condition:** Funds will be automatically released to the recipient if no dispute is raised by the funder before the deadline.

## DISPUTE RESOLUTION
Any disputes must be raised before ${format(data.deadline, "PPP")}. 
After this date, funds are irrevocably released to the recipient.

## SIGNATURES
---
Funder: ___________________________
Recipient: _________________________
Date: ${format(new Date(), "PPP")}`;

    const finalContract = {
        ...data,
        formattedContract,
        ipfsHash,
        deadline: format(data.deadline, "yyyy-MM-dd"),
        timestamp: new Date().toISOString(),
    };

    return { formattedContract, finalContract };
};

// Preview Component
const ContractPreview = ({
    previewContent,
}: {
    previewContent: {
        receiverAddress: string;
        amount: number;
        deadline: Date;
        documentFileName?: string;
        ipfsHash: string;
    };
}) => (
    <div className="mt-6">
        <div className="border rounded-lg overflow-hidden">
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <h4 className="font-medium text-sm text-gray-500 mb-2">
                            Recipient Address
                        </h4>
                        <p className="font-mono text-sm bg-gray-50 p-3 rounded break-all">
                            {previewContent.receiverAddress || "Not specified"}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-medium text-sm text-gray-500 mb-2">Amount</h4>
                            <div className="text-2xl font-bold text-blue-600">
                                {previewContent.amount || 0}{" "}
                                <span className="text-lg">ADA</span>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-medium text-sm text-gray-500 mb-2">
                                Deadline
                            </h4>
                            <div className="font-medium">
                                {previewContent.deadline
                                    ? format(previewContent.deadline, "PPP")
                                    : "Not set"}
                            </div>
                        </div>
                    </div>
                </div>

                <Separator className="my-6" />

                <div className="mb-6">
                    <h4 className="font-medium text-lg mb-4">Contract Document</h4>
                    {previewContent.documentFileName ? (
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <FileText className="h-6 w-6 text-gray-600" />
                            <div>
                                <p className="font-medium">{previewContent.documentFileName}</p>
                                <p className="text-sm text-gray-500">
                                    Uploaded contract document
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                            <p className="text-amber-800">No contract document uploaded</p>
                        </div>
                    )}
                </div>

                {previewContent.ipfsHash && (
                    <>
                        <Separator className="my-6" />
                        <div>
                            <h4 className="font-medium text-lg mb-4">IPFS Document</h4>
                            <p className="text-sm text-gray-600 mb-2">
                                Contract document stored on IPFS:
                            </p>
                            <code className="block bg-gray-50 p-3 rounded text-sm break-all">
                                {previewContent.ipfsHash}
                            </code>
                        </div>
                    </>
                )}
            </div>
        </div>
    </div>
);

export default function CreateContractPage() {
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string>("");
    const [ipfsHash, setIpfsHash] = useState<string>("");
    const [showPreview, setShowPreview] = useState(false);

    const pinataUploadMutation = usePinataUploadMutation();
    const createEscrowMutation = useCreateEscrowMutation()
    const [isLockingFund, setIsLockingFund] = useState(false)

    const {
        wallet,
        changeAddress,
        collateral,
        refreshBalance,
        refreshAddresses,
        balance
    } = useWalletContext();

    // Initialize form
    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            receiverAddress: "",
            amount: 0,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 7 days from now
        },
    });

    // Compute hasContent based on form values
    const formValues = form.watch();

    const hasContent = useMemo(() => {
        const hasReceiverAddress =
            formValues.receiverAddress && formValues.receiverAddress.length >= 10;
        const hasAmount = formValues.amount && formValues.amount > 0;
        const hasDocument = !!documentFile;

        return !!hasReceiverAddress || !!hasAmount || !!hasDocument;
    }, [formValues, documentFile]);

    // Handle document upload
    const handleDocumentUpload = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            // Reset previous errors
            setUploadError("");

            // Validate file type
            if (!VALID_FILE_TYPES.includes(file.type)) {
                setUploadError("Please upload a valid document (PDF, DOC, DOCX, TXT)");
                return;
            }

            // Validate file size
            if (file.size > MAX_FILE_SIZE) {
                setUploadError("File size must be less than 10MB");
                return;
            }

            setDocumentFile(file);

            try {
                // Upload to IPFS
                const hash = await pinataUploadMutation.mutateAsync(file);
                setIpfsHash(hash);
                setUploadError("");
            } catch (error) {
                setUploadError("Failed to upload document to IPFS");
                console.error(error);
                setDocumentFile(null);
            }
        },
        [pinataUploadMutation]
    );


    const funderLockAda = async (data: FormData) => {
        if (!changeAddress || !wallet) {
            alert("Wallet not connected properly");
            return;
        }

        if (!collateral || collateral.length === 0) {
            alert("Please set up collateral in your wallet settings first");
            return;
        }

        const amountInLovelace = adaToLovelaceSerialized(data.amount);
        if (data.amount > balance) {
            alert("Insufficient balance");
            return;
        }

        setIsLockingFund(true);
        try {
            // Convert IPFS hash to hex ByteArray
            const contractIpfsHash = hashToByteArray(ipfsHash)

            // Convert deadline to seconds
            const projectDeadline = Math.floor(data.deadline.getTime() / 1000);

            // Current time in seconds
            const currentTime = Math.floor(Date.now() / 1000);
            const recipientLockDeadline = currentTime + (48 * 60 * 60); // 48 hours in seconds

            // Create the AwaitingRecipient datum using mConStr0 format
            // Match the Aiken structure: AwaitingRecipient constructor with 6 fields
            const escrowDatum = mConStr0([
                changeAddress, // funder: Address
                mConStr0([ // funder_amount: MValue as Pairs
                    mConStr0([ // First policy pair
                        "", // PolicyId (empty for ADA)
                        mConStr0([ // Pairs<AssetName, Int>
                            ["", amountInLovelace] // AssetName (empty), Amount
                        ])
                    ])
                ]),
                // projectDeadline, // project_deadline: Int
                // contractIpfsHash, // contract_ipfs_hash: ByteArray
                // currentTime, // created_at: Int
                // recipientLockDeadline // recipient_lock_deadline: Int
            ]);

            console.log("Datum created with mConStr0:", escrowDatum);

            const asset = [{
                unit: "lovelace",
                quantity: amountInLovelace.toString()
            }];

            const utxos = await wallet.getUtxos();
            const { scriptAddr } = getScript();

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

            alert(`✅ ${data.amount} ADA locked successfully!\nTransaction: ${txHash}`);

            // Store in backend
            createEscrowMutation.mutate({
                amount: amountInLovelace,               // BigInt (handled by backend)
                amountAda: data.amount,     // Float
                recipientAddress: data.receiverAddress,
                txHash: txHash,
                datum: JSON.stringify(escrowDatum),                     // JSON-serializable object
                contractIpfsHash: contractIpfsHash,
                disputeDeadline: new Date(projectDeadline * 1000),
                recipientLockDeadline: new Date(recipientLockDeadline * 1000),
                funderAddress: changeAddress,
                status: 'AWAITING_RECIPIENT',
                scriptAddress: scriptAddr
                // scriptAddress must also be provided by backend or frontend
            });

            await refreshBalance();
            await refreshAddresses();
        } catch (error) {
            console.error("Lock ADA failed:", error);
            console.error("Full error details:", error);

            const errMsg = error instanceof Error ? error.message : "Unknown error";
            alert("❌ Failed to lock ADA: " + errMsg);
        } finally {
            setIsLockingFund(false);
        }
    };


    // Handle form submission
    const onSubmit = useCallback(
        async (data: FormData) => {
            // Validate that a document has been uploaded
            if (!documentFile) {
                setUploadError("Please upload a contract document");
                return;
            }

            // Validate that IPFS upload is complete
            if (!ipfsHash) {
                setUploadError("Contract document is still uploading to IPFS. Please wait.");
                return;
            }

            try {
                const { formattedContract, finalContract } = formatContract(
                    data,
                    ipfsHash
                );

                console.log("Form submitted:", finalContract, formattedContract);

                // Here you would typically:
                // 1. Save contract details to your backend
                // 2. Create smart contract interaction
                // 3. Handle ADA transfer

                funderLockAda(data)
                alert("Contract created successfully!");

                // Reset form
                form.reset();
                setDocumentFile(null);
                setIpfsHash("");
                setUploadError("");
            } catch (error) {
                console.error("Submission error:", error);
                alert("Failed to create contract");
            }
        },
        [form, ipfsHash, documentFile]
    );

    // Preview content
    const previewContent = useMemo(
        () => ({
            receiverAddress: form.watch("receiverAddress"),
            amount: form.watch("amount"),
            deadline: form.watch("deadline"),
            documentFileName: documentFile?.name,
            ipfsHash,
        }),
        [form, documentFile, ipfsHash]
    );

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <FileText className="h-8 w-8" />
                        Create Escrow Contract
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Create a time-locked funding agreement with a contract document
                    </p>
                </div>

                <FloatingDebugJson data={{ data: pinataUploadMutation.data, hash: hashToByteArray(ipfsHash),  collateral}} />

                {/* Preview Sheet Trigger */}
                <Sheet open={showPreview} onOpenChange={setShowPreview}>
                    <SheetTrigger asChild>
                        <Button variant="outline" className="gap-2" disabled={!hasContent}>
                            <Eye className="h-4 w-4" />
                            Preview Contract
                            {hasContent && (
                                <Badge variant="secondary" className="ml-1">
                                    Live
                                </Badge>
                            )}
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-xl lg:max-w-2xl overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle>Contract Preview</SheetTitle>
                        </SheetHeader>
                        <ContractPreview previewContent={previewContent} />
                    </SheetContent>
                </Sheet>
            </div>

            <Card className="shadow-none border">
                <CardContent className="pt-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            {/* Basic Information */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold">Basic Information</h3>

                                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                                    <FormField
                                        control={form.control}
                                        name="receiverAddress"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Recipient Cardano Wallet Address</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="addr1q9x..."
                                                        {...field}
                                                        className="font-mono"
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    The Cardano address where funds will be sent after the
                                                    deadline
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="amount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Amount (ADA)</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            step="0.1"
                                                            placeholder="100"
                                                            value={field.value || ""}
                                                            onChange={(e) =>
                                                                field.onChange(parseFloat(e.target.value) || 0)
                                                            }
                                                            className="pl-8"
                                                        />
                                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                                                            ₳
                                                        </div>
                                                    </div>
                                                </FormControl>
                                                <FormDescription>
                                                    Amount of ADA to be locked in escrow
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="deadline"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Deadline Date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant="outline"
                                                            className="w-full pl-3 text-left font-normal"
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "PPP")
                                                            ) : (
                                                                <span>Pick a date</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date: Date) => date < new Date()}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormDescription>
                                                Funds will be automatically released after this date if
                                                no dispute is raised
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Separator />

                            {/* Contract Document Upload - Now Required */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Contract Document</h3>

                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <FormLabel>Upload Contract Document</FormLabel>
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                                            <Input
                                                type="file"
                                                accept=".pdf,.doc,.docx,.txt"
                                                onChange={handleDocumentUpload}
                                                className="hidden"
                                                id="document-upload"
                                                required
                                            />
                                            <label
                                                htmlFor="document-upload"
                                                className="cursor-pointer flex flex-col items-center"
                                            >
                                                <Upload className="h-12 w-12 text-gray-400 mb-4" />
                                                <p className="text-sm text-gray-600">
                                                    {documentFile
                                                        ? `Selected: ${documentFile.name}`
                                                        : "Click to upload contract document"}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    PDF, DOC, DOCX or TXT • Max 10MB • Required
                                                </p>
                                                {pinataUploadMutation.isPending && (
                                                    <p className="text-xs text-blue-500 mt-2">
                                                        Uploading to IPFS...
                                                    </p>
                                                )}
                                            </label>
                                        </div>

                                        {/* Upload Error */}
                                        {uploadError && (
                                            <p className="text-sm text-red-500 flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4" />
                                                {uploadError}
                                            </p>
                                        )}

                                        {/* Upload Status */}
                                        {pinataUploadMutation.isPending && (
                                            <p className="text-sm text-blue-500">
                                                Uploading document to IPFS...
                                            </p>
                                        )}
                                        {pinataUploadMutation.isSuccess && (
                                            <p className="text-sm text-green-500">
                                                Document successfully uploaded to IPFS
                                            </p>
                                        )}
                                    </div>

                                    {/* IPFS Hash Display */}
                                    {ipfsHash && (
                                        <Alert>
                                            <AlertDescription className="font-mono text-sm break-all">
                                                <strong className="block mb-1">IPFS URL:</strong>
                                                {ipfsHash}
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Submit Button */}
                            <div className="flex justify-end gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowPreview(true)}
                                    disabled={!hasContent}
                                >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Preview
                                </Button>
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="bg-linear-to-r from-primary/90 to-primary"
                                    disabled={form.formState.isSubmitting || !documentFile || !ipfsHash}
                                >
                                    {form.formState.isSubmitting
                                        ? "Creating Contract..."
                                        : "Create Escrow Agreement"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}