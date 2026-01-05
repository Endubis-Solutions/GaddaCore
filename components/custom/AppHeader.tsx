"use client";

import React, { useState } from "react";
import { useWalletContext } from "@/contexts/WalletContext";
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
  KeyIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConnectWalletSheet from "@/app/_components/ConnectWalletSheet";
import { useRouter } from "next/navigation";

const AppHeader = () => {
  const router = useRouter();
  const {
    connected,
    network,
    changeAddress,
    balance,
    isLoading,
    disconnect,
    refreshBalance,
    collateral,
  } = useWalletContext();
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
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        {/* Brand Identity */}
        <div
          className="group flex cursor-pointer items-center gap-3"
          onClick={() => router.push("/")}
        >
          <span className="relative h-10 w-10">
            <DnaIcon className="absolute h-10 w-10 text-black" />
            <KeyIcon className="absolute h-10 w-10 rotate-90 text-black" />
          </span>
          <div className="flex flex-col">
            <span className="text-xl leading-none font-semibold tracking-tight text-zinc-900">
              Gadaa
            </span>
            <span className="mt-1.5 text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase">
              Arbitration Protocol
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {connected ? (
            <>
              {/* Navigation - Clean & Modern */}
              <nav className="hidden items-center gap-2 lg:flex">
                <Button
                  variant="ghost"
                  className="h-10 rounded-md bg-zinc-50 px-4 text-[13px] font-medium transition-colors hover:bg-zinc-100/80"
                  onClick={() => router.push("/new-payment")}
                >
                  <PlusCircle className="mr-2 h-4 w-4 text-zinc-400" />
                  New Payment
                </Button>

                <Button
                  variant="ghost"
                  className="h-10 rounded-md bg-zinc-50 px-4 text-[13px] font-medium transition-colors hover:bg-zinc-100/80"
                  onClick={() => router.push("/courts")}
                >
                  <Scale className="mr-2 h-4 w-4 text-zinc-400" />
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
              <div className="flex h-10 items-center gap-4 border-l border-zinc-100 pl-6">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    {hasCollateral && (
                      <div className="flex items-center gap-1 rounded-sm border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold tracking-tighter text-emerald-600 uppercase">
                        <ShieldCheck className="h-2.5 w-2.5" /> Secured
                      </div>
                    )}
                    <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                      {network === 1 ? "Mainnet" : "Preprod"}
                    </span>
                  </div>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-4 w-16" />
                  ) : (
                    <p
                      className="mt-1 text-sm leading-none font-bold text-zinc-900"
                      onClick={refreshBalance}
                    >
                      {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                      <span className="ml-0.5 font-medium text-zinc-400">ADA</span>
                    </p>
                  )}
                </div>

                {/* Modern Address Card */}
                <div className="flex items-center gap-3 rounded-md bg-zinc-900 py-1.5 pr-1.5 pl-3 text-white shadow-lg shadow-zinc-200 transition-all hover:bg-zinc-800">
                  <span className="font-mono text-[12px] tracking-wider opacity-90">
                    {changeAddress?.slice(0, 5)}...{changeAddress?.slice(-5)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-sm text-white hover:bg-white/10 hover:text-white"
                      onClick={copyAddress}
                    >
                      {copied ? (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <CopyIcon className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <div className="mx-0.5 h-4 w-px bg-white/20" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-sm text-white hover:bg-red-500/20 hover:text-red-400"
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
              <nav className="hidden items-center gap-6 md:flex">
                <a
                  href="#"
                  className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
                >
                  Documentation
                </a>
                <a
                  href="#"
                  className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
                >
                  Safety
                </a>
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
