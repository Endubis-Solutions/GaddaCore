// app/create-contract/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Upload, FileText, Eye } from "lucide-react";


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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ContractRichTextEditor } from "@/components/custom/RichTextEditor";
import { usePinataUploadMutation } from "@/services/pinata.service";
import FloatingDebugJson from "@/components/custom/DebugJson";

// Define Zod schema for validation
const formSchema = z.object({
    receiverAddress: z
        .string()
        .min(10, "Wallet address is too short")
        .regex(/^addr[a-zA-Z0-9]+$/, "Invalid Cardano address format"),
    amount: z
        .number()
        .refine((val) => val > 0, "Amount must be greater than 0")
        .refine((val) => val <= 1000000, "Amount cannot exceed 1,000,000 ADA"),
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
    contract: z
        .string()
        .min(50, "Contract terms must be at least 50 characters")
        .max(50000, "Contract terms too long"),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateContractPage() {
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [ipfsHash, setIpfsHash] = useState<string>("");
    const [showPreview, setShowPreview] = useState(false);
    const [hasContent, setHasContent] = useState(false);

    const pinataUploadMutation = usePinataUploadMutation()

    // Initialize form
    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            receiverAddress: "",
            amount: 0,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 7 days from now
            contract: "<p></p>",
        },
    });

    // Watch for content changes
    form.watch((value) => {
        const hasContract = value.contract && value.contract !== "<p></p>" && value.contract.length > 50;
        const hasReceiverAddress = value.receiverAddress && value.receiverAddress.length >= 10;
        const hasAmount = value.amount && value.amount > 0;

        setHasContent(!!hasContract || !!hasReceiverAddress || !!hasAmount);
    });



    // Function to upload document to IPFS
    const uploadToIPFS = async (file: File) => {
        pinataUploadMutation.mutate(file)
    };

    useEffect(() => {
        if (pinataUploadMutation.isSuccess) {
            alert("Document uploaded to IPFS successfully");
        }

        if (pinataUploadMutation.isError) {
            alert("Error uploading document to IPFS");
        }
    }, [pinataUploadMutation.isSuccess, pinataUploadMutation.isError])

    // Handle document file selection
    const handleDocumentUpload = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
        ];

        if (!validTypes.includes(file.type)) {
            alert("Please upload a valid document (PDF, DOC, DOCX, TXT)");
            return;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            alert("File size must be less than 10MB");
            return;
        }

        setDocumentFile(file);

        try {
            const hash = await uploadToIPFS(file);
            console.log("Document uploaded to IPFS:", hash);
        } catch (error) {
            alert("Failed to upload document to IPFS");
            console.log(error)
        }
    };

    // Convert HTML to plain text for validation
    const htmlToPlainText = (html: string) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    };

    // Handle form submission
    const onSubmit = async (data: FormData) => {
        // Validate contract terms length (plain text)
        const plainTextTerms = htmlToPlainText(data.contract);
        if (plainTextTerms.length < 50) {
            form.setError("contract", {
                type: "manual",
                message: "Contract terms must be at least 50 characters",
            });
            return;
        }

        if (plainTextTerms.length > 50000) {
            form.setError("contract", {
                type: "manual",
                message: "Contract terms cannot exceed 50,000 characters",
            });
            return;
        }

        if (!ipfsHash && !documentFile) {
            alert("Please upload a contract document");
            return;
        }

        try {
            // Format contract
            const formattedContract = `
# ESCROW AGREEMENT

**Agreement ID:** ${Date.now()}
**Created:** ${new Date().toISOString()}
**IPFS Document Hash:** ${ipfsHash}

## PARTIES
**Funder:** [FUNDER'S ADDRESS]
**Recipient:** ${data.receiverAddress}

## TERMS
${data.contract}

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

            // Create final contract document
            const finalContract = {
                ...data,
                formattedContract,
                ipfsHash,
                deadline: format(data.deadline, "yyyy-MM-dd"),
                timestamp: new Date().toISOString(),
            };

            console.log("Form submitted:", finalContract);

            // Here you would typically:
            // 1. Save contract details to your backend
            // 2. Create smart contract interaction
            // 3. Handle ADA transfer

            alert("Contract created successfully!");

            // Reset form
            form.reset();
            setDocumentFile(null);
            setIpfsHash("");
        } catch (error) {
            console.error("Submission error:", error);
            alert("Failed to create contract");
        }
    };

    // Preview content
    const previewContent = {
        receiverAddress: form.watch("receiverAddress"),
        amount: form.watch("amount"),
        deadline: form.watch("deadline"),
        contract: form.watch("contract"),
        ipfsHash,
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <FileText className="h-8 w-8" />
                        Create Escrow Contract
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Create a time-locked funding agreement that automatically releases funds after the deadline
                    </p>
                </div>

                <FloatingDebugJson data={{ data: pinataUploadMutation.data }} />

                {/* Preview Sheet Trigger */}
                <Sheet open={showPreview} onOpenChange={setShowPreview}>
                    <SheetTrigger asChild>
                        <Button
                            variant="outline"
                            className="gap-2"
                            disabled={!hasContent}
                        >
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

                        <div className="mt-6">
                            <div className="border rounded-lg overflow-hidden">
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <h4 className="font-medium text-sm text-gray-500 mb-2">Recipient Address</h4>
                                            <p className="font-mono text-sm bg-gray-50 p-3 rounded break-all">
                                                {previewContent.receiverAddress || "Not specified"}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <h4 className="font-medium text-sm text-gray-500 mb-2">Amount</h4>
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {previewContent.amount || 0} <span className="text-lg">ADA</span>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-sm text-gray-500 mb-2">Deadline</h4>
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
                                        <h4 className="font-medium text-lg mb-4">Contract</h4>
                                        {previewContent.contract && previewContent.contract !== "<p></p>" ? (
                                            <div
                                                className="prose prose-sm max-w-none"
                                                dangerouslySetInnerHTML={{ __html: previewContent.contract }}
                                            />
                                        ) : (
                                            <p className="text-gray-500 italic">No contract terms entered yet</p>
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
                                                    The Cardano address where funds will be sent after the deadline
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
                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                                                Funds will be automatically released after this date if no dispute is raised
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Separator />

                            {/* Contract Details */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold">Contract Details</h3>

                                <FormField
                                    control={form.control}
                                    name="contract"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Contract</FormLabel>
                                            <FormControl>
                                                <ContractRichTextEditor
                                                    value={field.value || ""}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Detailed terms that both parties agree to. Use the toolbar to format your text.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Separator />

                            {/* Document Upload */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold">Supporting Documents</h3>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <FormLabel>Upload Contract Document (Optional)</FormLabel>
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                                            <Input
                                                type="file"
                                                accept=".pdf,.doc,.docx,.txt"
                                                onChange={handleDocumentUpload}
                                                className="hidden"
                                                id="document-upload"
                                            />
                                            <label
                                                htmlFor="document-upload"
                                                className="cursor-pointer flex flex-col items-center"
                                            >
                                                <Upload className="h-12 w-12 text-gray-400 mb-4" />
                                                <p className="text-sm text-gray-600">
                                                    {documentFile
                                                        ? `Selected: ${documentFile.name}`
                                                        : "Click to upload or drag & drop"}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    PDF, DOC, DOCX or TXT • Max 10MB
                                                </p>
                                            </label>
                                        </div>
                                    </div>


                                    {/* IPFS Hash Display */}
                                    {ipfsHash && (
                                        <Alert>
                                            <AlertDescription className="font-mono text-sm break-all">
                                                <strong className="block mb-1">IPFS Hash:</strong>
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
                                    disabled={form.formState.isSubmitting}
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