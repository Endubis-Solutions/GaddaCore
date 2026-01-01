"use client";

import { useWallet, useWalletList } from "@meshsdk/react";
import { Button } from "@/components/ui/button";
import { Wallet, ChevronRight, ExternalLink, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner"; // Ensure you have this component or use a Loader2 from lucide
import Image from "next/image";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { PropsWithChildren } from "react";

const ConnectWalletSheet = (props: PropsWithChildren) => {
    const { connect, connecting } = useWallet();
    const wallets = useWalletList();

    const popularWallets = [
        {
            name: "Lace",
            url: "https://www.lace.io/",
            description: "Official IOG lightweight wallet",
            color: "bg-pink-500" // Just for fallback visuals
        },
        {
            name: "Eternl",
            url: "https://eternl.io/",
            description: "Power user & DApp focused",
            color: "bg-orange-500"
        },
        {
            name: "Vespr",
            url: "https://vespr.xyz/",
            description: "Best mobile experience",
            color: "bg-indigo-500"
        },
        {
            name: "Yoroi",
            url: "https://yoroi-wallet.com/",
            description: "Trusted EMURGO wallet",
            color: "bg-blue-500"
        }
    ];

    return (
        <Sheet>
            <SheetTrigger asChild>
                {props.children || (
                    <Button className="gap-2 shadow-sm">
                        <Wallet className="h-4 w-4" />
                        Connect Wallet
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md border-l border-border/50 bg-background/95 backdrop-blur-xl">
                <SheetHeader className="text-left pb-6 border-b border-border/40">
                    <SheetTitle className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                            <Wallet className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-xl">Connect Wallet</span>
                    </SheetTitle>
                    <SheetDescription className="text-base">
                        Link your Cardano wallet to access <span className="font-semibold text-foreground">Athena Protocol</span> features.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-0 px-4 flex flex-col h-full">
                    {wallets.length > 0 ? (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between px-1">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Detected Wallets
                                </p>
                                <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full border border-success/20">
                                    {wallets.length} Available
                                </span>
                            </div>
                            
                            {wallets.map((wallet) => (
                                <button
                                    key={wallet.id}
                                    onClick={() => connect(wallet.id)}
                                    disabled={connecting}
                                    className={cn(
                                        "relative w-full cursor-pointer flex items-center gap-4 p-4 rounded-xl border border-border bg-card/50 hover:bg-accent hover:border-primary/30 transition-all duration-200 group overflow-hidden",
                                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border"
                                    )}
                                >
                                    {/* Hover gradient effect */}
                                    <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="relative shrink-0 w-12 h-12 bg-white rounded-xl border border-border/50 flex items-center justify-center p-2 shadow-sm group-hover:scale-105 transition-transform duration-200">
                                        {/* Ensure you have domain permissions for these icons in next.config.js */}
                                        <Image
                                            src={wallet.icon}
                                            alt={wallet.name}
                                            width={40}
                                            height={40}
                                            className="object-contain"
                                        />
                                    </div>
                                    <div className="relative flex-1 text-left">
                                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                            {wallet.name
                                                .split(' ')
                                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                .join(' ')}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <ShieldCheck className="w-3 h-3" />
                                            SIP-30 Compatible
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors relative" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in-95 duration-300">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                                <div className="relative w-20 h-20 bg-card rounded-2xl border border-border flex items-center justify-center shadow-lg">
                                    <Wallet className="h-10 w-10 text-muted-foreground/50" />
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                No Wallet Detected
                            </h3>
                            <p className="text-sm text-center text-muted-foreground max-w-[280px] mb-8">
                                To use Athena Protocol, you need a Cardano wallet extension installed in your browser.
                            </p>

                            <div className="w-full space-y-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                                    Recommended Wallets
                                </p>
                                {popularWallets.map((wallet) => (
                                    <a
                                        key={wallet.name}
                                        href={wallet.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card/30 hover:bg-accent/50 hover:border-primary/20 transition-all group"
                                    >
                                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm", wallet.color || "bg-gray-500")}>
                                            <ExternalLink className="h-5 w-5 opacity-80" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium group-hover:text-primary transition-colors">
                                                Get {wallet.name}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {wallet.description}
                                            </div>
                                        </div>
                                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </a>
                                ))}
                            </div>
                            
                            <div className="mt-8 p-3 bg-blue-500/5 rounded-lg border border-blue-500/10 text-center w-full">
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                    Installed a wallet? <button onClick={() => window.location.reload()} className="underline font-medium hover:text-blue-700">Refresh the page</button>
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Connecting Overlay with Glassmorphism */}
                {connecting && (
                    <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
                        <div className="bg-card p-8 rounded-2xl shadow-2xl border border-border/50 text-center max-w-sm mx-6 flex flex-col items-center">
                            <div className="relative mb-4">
                                <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full animate-pulse" />
                                <Spinner className="relative w-10 h-10 text-primary" />
                            </div>
                            <h4 className="text-lg font-semibold mb-2">Connecting Wallet</h4>
                            <p className="text-sm text-muted-foreground">
                                Please check your wallet extension to approve the connection request.
                            </p>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
};

export default ConnectWalletSheet;