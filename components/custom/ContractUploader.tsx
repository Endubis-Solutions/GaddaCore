"use client"

import React, { useState, useCallback } from "react";
import { Upload, AlertCircle, FileText, Info, Copy, Check, Loader2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePinataUploadMutation } from "@/services/pinata.service";
import { Label } from "@/components/ui/label";

const VALID_FILE_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface ContractUploaderProps {
    onUploadSuccess: (hash: string) => void;
    onFileChange: (file: File | null) => void;
    currentFile: File | null;
    ipfsHash: string;
    uniqueId: string;
    withLabel?: boolean;
}

export const ContractUploader: React.FC<ContractUploaderProps> = ({
    onUploadSuccess,
    onFileChange,
    currentFile,
    ipfsHash,
    uniqueId,
    withLabel = true
}) => {
    const [uploadError, setUploadError] = useState<string>("");
    const [isCopied, setIsCopied] = useState(false);
    const pinataUploadMutation = usePinataUploadMutation();
    const isUploading = pinataUploadMutation.isPending;

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleDocumentUpload = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            setUploadError("");
            onUploadSuccess("");

            if (!VALID_FILE_TYPES.includes(file.type)) {
                setUploadError("Please upload a valid document (PDF, DOC, DOCX, TXT)");
                onFileChange(null);
                return;
            }
            if (file.size > MAX_FILE_SIZE) {
                setUploadError("File size must be less than 10MB");
                onFileChange(null);
                return;
            }

            onFileChange(file);

            try {
                const hash = await pinataUploadMutation.mutateAsync(file);
                onUploadSuccess(hash);
                setUploadError("");
            } catch (error) {
                setUploadError("Failed to upload document to IPFS");
                onFileChange(null);
                onUploadSuccess("");
            }
        },
        [pinataUploadMutation, onUploadSuccess, onFileChange]
    );

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    {withLabel && <Label className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Upload Contract</Label>}


                </div>

                <div className="border border-dashed border-zinc-200 bg-zinc-50/50 rounded-md p-8 text-center hover:border-primary transition-all group relative">
                    <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleDocumentUpload}
                        className="hidden"
                        id={uniqueId}
                    />
                    <label
                        htmlFor={uniqueId}
                        className="cursor-pointer flex flex-col items-center"
                    >
                        {isUploading ? (
                            <Loader2Icon className="h-10 w-10 text-primary mb-4 animate-spin" />
                        ) : currentFile ? (
                            <FileText className="h-10 w-10 text-primary mb-4" />
                        ) : (
                            <Upload className="h-10 w-10 text-zinc-300 group-hover:text-primary mb-4 transition-colors" />
                        )}

                        <p className="text-sm font-medium text-zinc-600">
                            {currentFile ? currentFile.name : "Select document"}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-1">
                            {currentFile ? `${(currentFile.size / 1024 / 1024).toFixed(2)} MB` : "PDF, DOCX, or TXT up to 10MB"}
                        </p>
                    </label>
                </div>


                {/* Compact Popover for IPFS Link */}
                {ipfsHash && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2">
                                <Info className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-tighter">View Storage Info</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4 border-zinc-100 shadow-2xl" align="end">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">IPFS Reference</h4>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleCopy(ipfsHash)}
                                    >
                                        {isCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                    </Button>
                                </div>
                                <div className="bg-zinc-50 p-2 rounded border border-zinc-100">
                                    <p className="text-[11px] font-mono break-all text-zinc-600 leading-relaxed">
                                        {ipfsHash}
                                    </p>
                                </div>
                                <p className="text-[10px] text-zinc-400 leading-tight">
                                    This hash is permanently linked to your contract on the decentralized web.
                                </p>
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                {uploadError && (
                    <div className="flex items-center gap-1.5 text-red-500 mt-2">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <p className="text-[11px] font-medium tracking-wide">{uploadError}</p>
                    </div>
                )}
            </div>
        </div>
    );
};