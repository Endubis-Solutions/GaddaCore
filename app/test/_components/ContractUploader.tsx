// components/custom/ContractUploader.tsx
import React, { useState, useCallback, useEffect } from "react";
import { Upload, AlertCircle, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePinataUploadMutation } from "@/services/pinata.service";
import { Label } from "@/components/ui/label";

// Constants (Copied from CreateContractPage.tsx)
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
}

export const ContractUploader: React.FC<ContractUploaderProps> = ({
  onUploadSuccess,
  onFileChange,
  currentFile,
  ipfsHash,
  uniqueId,
}) => {
  const [uploadError, setUploadError] = useState<string>("");
  const pinataUploadMutation = usePinataUploadMutation();
  const isUploading = pinataUploadMutation.isPending;
  const isSuccess = pinataUploadMutation.isSuccess;

  const handleDocumentUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      console.log("called");
      const file = event.target.files?.[0];
      if (!file) {
        alert("Please select a file");
        return;
      }

      // Reset previous state
      setUploadError("");
      onUploadSuccess(""); // Clear hash in parent state
      console.log({ file });

      // 1. Validation
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

      onFileChange(file); // Notify parent component about file change

      try {
        // 2. Upload to IPFS
        const hash = await pinataUploadMutation.mutateAsync(file);
        onUploadSuccess(hash); // Provide hash to parent
        setUploadError("");
      } catch (error) {
        setUploadError("Failed to upload document to IPFS");
        console.error("IPFS Upload Error:", error);
        onFileChange(null); // Clear file state on failure
        onUploadSuccess("");
      }
    },
    [pinataUploadMutation, onUploadSuccess, onFileChange]
  );

  useEffect(() => {
    if (uploadError) {
      alert(uploadError);
    }
  }, [uploadError]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Upload Contract Document</Label>
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-blue-400">
          <Input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleDocumentUpload}
            className="hidden"
            id={uniqueId}
            required
          />
          <label htmlFor={uniqueId} className="flex cursor-pointer flex-col items-center">
            {currentFile ? (
              <FileText className="mb-4 h-12 w-12 text-blue-500" />
            ) : (
              <Upload className="mb-4 h-12 w-12 text-gray-400" />
            )}
            <p className="text-sm text-gray-600">
              {currentFile ? `Selected: ${currentFile.name}` : "Click to upload contract document"}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              PDF, DOC, DOCX or TXT • Max 10MB • Required
            </p>
            {isUploading && <p className="mt-2 text-xs text-blue-500">Uploading to IPFS...</p>}
          </label>
        </div>

        {/* Status/Error Messages */}
        {uploadError && (
          <p className="flex items-center gap-1 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" />
            {uploadError}
          </p>
        )}
        {isUploading && <p className="text-sm text-blue-500">Uploading document to IPFS...</p>}
        {isSuccess && !uploadError && (
          <p className="text-sm text-green-500">Document successfully uploaded to IPFS</p>
        )}
      </div>

      {/* IPFS Hash Display */}
      {ipfsHash && (
        <Alert>
          <AlertDescription className="font-mono text-sm break-all">
            <strong className="mb-1 block">IPFS URL:</strong>
            {ipfsHash}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
