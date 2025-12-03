"use client";

import { useWallet, useWalletList } from "@meshsdk/react";

import { Button } from "@/components/ui/button";
import { Wallet, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import Image from "next/image";

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { PropsWithChildren } from "react";



const ConnectWalletSheet = (props: PropsWithChildren) => {
    const { connect, connecting } = useWallet();
    const wallets = useWalletList();

    const popularWallets = [
        {
            name: "Eternl",
            url: "https://eternl.io/",
            description: "Most feature-rich browser wallet"
        },
        {
            name: "Nami",
            url: "https://namiwallet.io/",
            description: "Lightweight and simple wallet"
        },
        {
            name: "Flint",
            url: "https://flint-wallet.com/",
            description: "Secure and user-friendly wallet"
        },
        {
            name: "Yoroi",
            url: "https://yoroi-wallet.com/",
            description: "Official EMURGO wallet"
        }
    ];

    return (
        <Sheet>
            <SheetTrigger asChild>
                {props.children || <Button className="gap-2">
                    <Wallet className="h-4 w-4" />
                    Connect Wallet
                </Button>}
            </SheetTrigger>
            <SheetContent className="sm:max-w-md">
                <SheetHeader className="text-left">
                    <SheetTitle className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary/80 rounded flex items-center justify-center">
                            <Wallet className="h-3 w-3 text-white" />
                        </div>
                        Connect Your Wallet
                    </SheetTitle>
                    <SheetDescription>
                        Choose your preferred wallet to connect and start using TrustSeal
                    </SheetDescription>
                </SheetHeader>

                <div className="px-4">
                    {wallets.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground mb-4">
                                Available wallets in your browser:
                            </p>
                            {wallets.map((wallet) => (
                                <button
                                    key={wallet.id}
                                    onClick={() => connect(wallet.id, true)}
                                    disabled={connecting}
                                    className={cn(
                                        "w-full cursor-pointer flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group",
                                        "disabled:opacity-50 disabled:cursor-not-allowed"
                                    )}
                                >
                                    <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg border border-gray-100 flex items-center justify-center p-2 group-hover:scale-105 transition-transform">
                                        <Image
                                            src={wallet.icon}
                                            alt={wallet.name}
                                            width={32}
                                            height={32}
                                            className="rounded"
                                        />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-medium text-gray-900 group-hover:text-primary transition-colors">
                                            {wallet.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Browser extension
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Wallet className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">
                                No Wallets Detected
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                                It looks like you {`don't`} have a Cardano wallet installed. Choose one of the popular wallets below to get started.
                            </p>

                            <div className="space-y-3">
                                {popularWallets.map((wallet) => (
                                    <a
                                        key={wallet.name}
                                        href={wallet.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
                                    >
                                        <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg border border-gray-100 flex items-center justify-center">
                                            <div className="w-6 h-6 bg-gradient-to-br from-gray-400 to-gray-600 rounded flex items-center justify-center">
                                                <ExternalLink className="h-3 w-3 text-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="font-medium text-gray-900 group-hover:text-primary transition-colors">
                                                Install {wallet.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {wallet.description}
                                            </div>
                                        </div>
                                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                                    </a>
                                ))}
                            </div>

                            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-xs text-blue-700">
                                    After installing a wallet, refresh this page to see it here.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Connecting Overlay */}
                    {connecting && (
                        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-6 shadow-lg border text-center max-w-sm mx-4">
                                <Spinner className="w-8 h-8 mx-auto mb-4 text-primary" />
                                <h4 className="font-semibold text-gray-900 mb-2">Connecting...</h4>
                                <p className="text-sm text-muted-foreground">
                                    Please check your wallet for connection approval
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};


export default ConnectWalletSheet