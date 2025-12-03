'use client'

import React from 'react'
import { useWalletContext } from '@/contexts/WalletContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, Coins, CopyIcon, Shield, FileText, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import ConnectWalletSheet from '@/app/_components/ConnectWalletSheet';
import { useRouter } from 'next/navigation';

const Logo = () => {
    return <div className="flex items-center gap-3">
        <div className="relative">
            <div className="w-10 h-10 bg-linear-to-br from-primary/80 to-primary rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        </div>
        <div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-primary/80 to-primary bg-clip-text text-transparent">
                TrustSeal
            </h1>
            <p className="text-xs text-muted-foreground">Secure Cardano Payments</p>
        </div>
    </div>
}

const AppHeader = () => {
    const router = useRouter()
    const {
        connected,
        walletName,
        network,
        changeAddress,
        balance,
        isLoading,
        disconnect,
        refreshBalance,
    } = useWalletContext();

    const [copied, setCopied] = React.useState(false);

    const copyToClipboard = async () => {
        if (changeAddress) {
            await navigator.clipboard.writeText(changeAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <header className="py-2 px-4 md:px-6 max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                <Logo />

                {connected && (
                    <div className="flex gap-3 p-2 bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/60">
                        {/* <Button variant="ghost" className="gap-2 hover:bg-blue-50 hover:text-blue-600">
                            <FileText className="h-4 w-4" />
                            New Invoice
                        </Button> */}
                        <Button variant="ghost" className="gap-2 hover:bg-green-50 hover:text-green-600" onClick={() => {
                            router.push("/new-payment")
                        }}>
                            <CreditCard className="h-4 w-4" />
                            New Payment
                        </Button>
                    </div>
                )}

                {connected && (
                    <div className="flex items-center gap-4 p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-gray-200/60">
                        {/* Wallet Badge */}
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-normal gap-1.5 py-1.5">
                                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                                {walletName}
                            </Badge>
                        </div>

                        {/* Network Badge */}
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-normal gap-1.5 py-1.5">
                                <div className={cn("h-2 w-2 rounded-full bg-red-500 animate-pulse", {
                                    "bg-green-500": network === 1
                                })} />
                                {network === 1 ? "Mainnet" : "Testnet"}
                            </Badge>
                        </div>


                        {/* Balance */}
                        <div className="flex items-center gap-2">
                            {isLoading ? (
                                <Skeleton className="h-6 w-24 rounded-lg" />
                            ) : (
                                <>
                                    <div className="w-8 h-8 bg-linear-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                                        <Coins className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-gray-900">
                                            {balance.toLocaleString()}
                                            <span className="text-xs font-medium text-muted-foreground ml-1">ADA</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Address */}

                        <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border">
                            <span className='text-sm font-mono'>
                                {changeAddress?.slice(0, 9)}...{changeAddress?.slice(-3)}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={copyToClipboard}
                                className={`h-8 w-8 transition-all ${copied ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <CopyIcon className="h-4 w-4" />
                            </Button>
                        </div>


                        {/* Refresh Buttons */}
                        {/* <Button
                            variant="ghost"
                            size="icon"
                            onClick={refreshBalance}
                            className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Refresh Balance"
                        >
                            <Coins className="h-4 w-4" />
                        </Button> */}

                        {/* Disconnect */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={disconnect}
                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        >
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {!connected && (
                    <div className="flex items-center gap-4">
                        <Button variant={"link"}>About Us</Button>
                        <ConnectWalletSheet />
                    </div>
                )}
            </div>
        </header>
    );
};

export default AppHeader;