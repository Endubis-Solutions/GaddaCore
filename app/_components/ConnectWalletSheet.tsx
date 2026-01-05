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
      color: "bg-pink-500", // Just for fallback visuals
    },
    {
      name: "Eternl",
      url: "https://eternl.io/",
      description: "Power user & DApp focused",
      color: "bg-orange-500",
    },
    {
      name: "Vespr",
      url: "https://vespr.xyz/",
      description: "Best mobile experience",
      color: "bg-indigo-500",
    },
    {
      name: "Yoroi",
      url: "https://yoroi-wallet.com/",
      description: "Trusted EMURGO wallet",
      color: "bg-blue-500",
    },
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
      <SheetContent className="border-border/50 bg-background/95 w-full border-l backdrop-blur-xl sm:max-w-md">
        <SheetHeader className="border-border/40 border-b pb-6 text-left">
          <SheetTitle className="sr-only flex items-center gap-2.5">
            <div className="bg-primary/10 border-primary/20 flex h-8 w-8 items-center justify-center rounded-lg border">
              <Wallet className="text-primary h-4 w-4" />
            </div>
            <span className="text-xl">Connect Wallet</span>
          </SheetTitle>
          <SheetDescription className="text-base">
            Link your Cardano wallet to access{" "}
            <span className="text-foreground font-semibold">Gadda Protocol</span> features.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-0 flex h-full flex-col px-4">
          {wallets.length > 0 ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-3 duration-500">
              <div className="flex items-center justify-between px-1">
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Detected Wallets
                </p>
                <span className="bg-success/10 text-success border-success/20 rounded-full border px-2 py-0.5 text-[10px]">
                  {wallets.length} Available
                </span>
              </div>

              {wallets.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => connect(wallet.id)}
                  disabled={connecting}
                  className={cn(
                    "border-border hover:bg-accent/25 hover:border-primary/30 group relative flex w-full cursor-pointer items-center gap-4 overflow-hidden rounded-md border p-4 transition-all duration-200",
                    "disabled:hover:border-border disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center p-2 transition-transform duration-200 group-hover:scale-105">
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
                    <div className="text-foreground font-semibold">
                      {wallet.name
                        .split(" ")
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ")}
                    </div>
                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                      <ShieldCheck className="h-3 w-3" />
                      SIP-30 Compatible
                    </div>
                  </div>
                  <ChevronRight className="text-muted-foreground/50 group-hover:text-primary relative h-5 w-5 transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in-95 flex flex-1 flex-col items-center justify-center py-8 duration-300">
              <div className="relative mb-6">
                <div className="bg-primary/20 absolute inset-0 rounded-full blur-xl" />
                <div className="bg-card border-border relative flex h-20 w-20 items-center justify-center rounded-2xl border shadow-lg">
                  <Wallet className="text-muted-foreground/50 h-10 w-10" />
                </div>
              </div>

              <h3 className="text-foreground mb-2 text-lg font-semibold">No Wallet Detected</h3>
              <p className="text-muted-foreground mb-8 max-w-[280px] text-center text-sm">
                To use Athena Protocol, you need a Cardano wallet extension installed in your
                browser.
              </p>

              <div className="w-full space-y-3">
                <p className="text-muted-foreground px-1 text-xs font-semibold tracking-wider uppercase">
                  Recommended Wallets
                </p>
                {popularWallets.map((wallet) => (
                  <a
                    key={wallet.name}
                    href={wallet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-border/60 bg-card/30 hover:bg-accent/50 hover:border-primary/20 group flex items-center gap-3 rounded-lg border p-3 transition-all"
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-sm",
                        wallet.color || "bg-gray-500"
                      )}
                    >
                      <ExternalLink className="h-5 w-5 opacity-80" />
                    </div>
                    <div className="flex-1">
                      <div className="group-hover:text-primary text-sm font-medium transition-colors">
                        Get {wallet.name}
                      </div>
                      <div className="text-muted-foreground text-[10px]">{wallet.description}</div>
                    </div>
                    <ExternalLink className="text-muted-foreground group-hover:text-primary h-3.5 w-3.5 transition-colors" />
                  </a>
                ))}
              </div>

              <div className="mt-8 w-full rounded-lg border border-blue-500/10 bg-blue-500/5 p-3 text-center">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Installed a wallet?{" "}
                  <button
                    onClick={() => window.location.reload()}
                    className="font-medium underline hover:text-blue-700"
                  >
                    Refresh the page
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Connecting Overlay with Glassmorphism */}
        {connecting && (
          <div className="bg-background/60 animate-in fade-in absolute inset-0 z-50 flex items-center justify-center backdrop-blur-md duration-300">
            <div className="bg-card border-border/50 mx-6 flex max-w-sm flex-col items-center rounded-2xl border p-8 text-center shadow-2xl">
              <div className="relative mb-4">
                <div className="bg-primary/30 absolute inset-0 animate-pulse rounded-full blur-lg" />
                <Spinner className="text-primary relative h-10 w-10" />
              </div>
              <h4 className="mb-2 text-lg font-semibold">Connecting Wallet</h4>
              <p className="text-muted-foreground text-sm">
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
