'use client'

import { EscrowTransaction } from "@/types";
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
import { CheckCircle, Copy, QrCode } from "lucide-react";
import { Label } from "@radix-ui/react-label";
import Image from "next/image";
import { generateQrCodeUrl, lovelaceToAda } from "@/utils";
import { Input } from "@/components/ui/input";

// QR Code Dialog Component from demo
interface QrCodeDialogProps {
    transaction: EscrowTransaction;
}

function QrCodeDialog({ transaction }: QrCodeDialogProps) {
    const [copied, setCopied] = useState(false);

    const shareUrl = `https://preprod.cardanoscan.io/transaction/${transaction.txHash}`;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <QrCode className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Escrow Details</DialogTitle>
                    <DialogDescription>Share this QR code with the recipient to view the locked funds.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="rounded-lg border bg-white p-4">
                        <Image width={48} height={48} src={generateQrCodeUrl(shareUrl)} alt="QR Code" className="h-48 w-48" />
                    </div>
                    <div className="w-full space-y-2">
                        <Label className="text-muted-foreground text-sm">Amount Locked</Label>
                        <p className="text-2xl font-semibold">{lovelaceToAda(transaction.amount).toFixed(2)} ADA</p>
                    </div>
                    <div className="w-full space-y-2">
                        <Label className="text-muted-foreground text-sm">Share Link</Label>
                        <div className="flex gap-2">
                            <Input value={shareUrl} readOnly className="text-sm" />
                            <Button variant="outline" size="sm" onClick={handleCopy}>
                                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default QrCodeDialog