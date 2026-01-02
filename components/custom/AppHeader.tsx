'use client'

import React, { useState } from 'react'
import { useWalletContext } from '@/contexts/WalletContext';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    LogOut,
    CopyIcon,
    PlusCircle,
    CheckCircle,
    Scale,
    ChevronDown,
    LayoutGrid,
    ShieldCheck,
    DnaIcon,
    KeyIcon
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConnectWalletSheet from '@/app/_components/ConnectWalletSheet';
import { useRouter } from 'next/navigation';

const AppHeader = () => {
    const router = useRouter()
    const { connected, network, changeAddress, balance, isLoading, disconnect, refreshBalance, collateral } = useWalletContext();
    const [copied, setCopied] = useState(false);

    const copyAddress = async () => {
        if (changeAddress) {
            await navigator.clipboard.writeText(changeAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const hasCollateral = collateral && collateral.length > 0;

    return (
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

                {/* Brand Identity */}
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => router.push("/")}
                >
                    <span className='relative h-10 w-10'>
                        <DnaIcon className="h-10 w-10 absolute text-black" />
                        <KeyIcon className="h-10 w-10 absolute rotate-90 text-black" />
                    </span>
                    <div className="flex flex-col">
                        <span className="text-xl font-semibold tracking-tight text-zinc-900 leading-none">Gadaa</span>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1.5">Arbitration Protocol</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {connected ? (
                        <>
                            {/* Navigation - Clean & Modern */}
                            <nav className="hidden lg:flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    className="text-[13px] font-medium h-10 px-4 rounded-md bg-zinc-50 hover:bg-zinc-100/80 transition-colors"
                                    onClick={() => router.push("/new-payment")}
                                >
                                    <PlusCircle className="h-4 w-4 mr-2 text-zinc-400" />
                                    New Payment
                                </Button>

                                <Button
                                    variant="ghost"
                                    className="text-[13px] font-medium h-10 px-4 rounded-md bg-zinc-50 hover:bg-zinc-100/80 transition-colors"
                                    onClick={() => router.push("/courts")}
                                >
                                    <Scale className="h-4 w-4 mr-2 text-zinc-400" />
                                    Courts
                                </Button>

                                {/* <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="text-[13px] font-medium h-10 px-4 rounded-md hover:bg-zinc-50">
                                            <LayoutGrid className="h-4 w-4 mr-2 text-zinc-400" />
                                            Operations
                                            <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-40" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 p-2 rounded-md shadow-2xl border-zinc-100">
                                        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-zinc-400 px-2 py-2">Management</DropdownMenuLabel>
                                        <DropdownMenuItem className="rounded-md py-2.5 cursor-pointer" onClick={() => router.push("/recipient-deposit")}>Recipient Deposit</DropdownMenuItem>
                                        <DropdownMenuItem className="rounded-md py-2.5 cursor-pointer" onClick={() => router.push("/complete-escrow")}>Complete Settlement</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="rounded-md py-2.5 text-red-500 focus:text-red-500 cursor-pointer" onClick={() => router.push("/cancel-escrow")}>Cancel Agreement</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu> */}
                            </nav>

                            {/* Wallet & Status Section */}
                            <div className="h-10 flex items-center gap-4 pl-6 border-l border-zinc-100">
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-2">
                                        {hasCollateral && (
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm uppercase tracking-tighter border border-emerald-100">
                                                <ShieldCheck className="h-2.5 w-2.5" /> Secured
                                            </div>
                                        )}
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                            {network === 1 ? "Mainnet" : "Preprod"}
                                        </span>
                                    </div>
                                    {isLoading ? <Skeleton className="h-4 w-16 mt-1" /> : (
                                        <p className="text-sm font-bold text-zinc-900 leading-none mt-1" onClick={refreshBalance}>
                                            {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-zinc-400 font-medium ml-0.5">ADA</span>
                                        </p>
                                    )}
                                </div>

                                {/* Modern Address Card */}
                                <div className="flex items-center gap-3 bg-zinc-900 text-white rounded-md py-1.5 pl-3 pr-1.5 shadow-lg shadow-zinc-200 transition-all hover:bg-zinc-800">
                                    <span className="text-[12px] font-mono tracking-wider opacity-90">
                                        {changeAddress?.slice(0, 5)}...{changeAddress?.slice(-5)}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-sm hover:bg-white/10 text-white hover:text-white"
                                            onClick={copyAddress}
                                        >
                                            {copied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <CopyIcon className="h-3.5 w-3.5" />}
                                        </Button>
                                        <div className="w-px h-4 bg-white/20 mx-0.5" />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-sm hover:bg-red-500/20 text-white hover:text-red-400"
                                            onClick={disconnect}
                                        >
                                            <LogOut className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-8">
                            <nav className="hidden md:flex items-center gap-6">
                                <a href="#" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">Documentation</a>
                                <a href="#" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">Safety</a>
                            </nav>
                            <ConnectWalletSheet />
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default AppHeader;