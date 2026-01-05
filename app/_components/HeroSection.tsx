"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Scale, ArrowRight, Lock, Binary } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWalletList } from "@meshsdk/react";
import ConnectWalletSheet from "./ConnectWalletSheet";

export default function HeroSection() {
  const walletList = useWalletList();
  const hasWallets = walletList.length > 0;

  const fadeInUp = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  };

  return (
    <div className="relative flex min-h-[calc(100vh-5rem)] items-center overflow-hidden border-b border-zinc-100 bg-white">
      {/* Background Texture */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-0 h-full w-full bg-[radial-gradient(#f4f4f5_1px,transparent_1px)] bg-size-[24px_24px] opacity-40" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-16">
        <div className="grid items-start gap-16 lg:grid-cols-12">
          {/* --- LEFT: BRANDING & CTA --- */}
          <div className="space-y-10 lg:col-span-5">
            <motion.div
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-2.5 py-1 text-white">
                <Binary className="text-primary h-3 w-3" />
                <span className="text-[9px] font-bold tracking-[0.3em] uppercase">
                  Decentralized Justice
                </span>
              </div>

              <h1 className="text-6xl leading-[0.95] font-bold tracking-tighter text-zinc-900 md:text-7xl">
                Work <br />
                <span className="text-primary italic">Without</span> <br />
                Borders.
              </h1>

              <p className="max-w-sm text-base leading-relaxed font-medium text-zinc-500">
                Secure your capital in smart-locked vaults. Gadaa ensures you only pay when delivery
                is verified by on-chain consensus.
              </p>

              <div className="flex items-center gap-4 pt-4">
                {hasWallets ? (
                  <ConnectWalletSheet>
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary/90 shadow-primary/20 group h-14 gap-3 rounded-md px-8 text-white shadow-xl"
                    >
                      Get Started
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </ConnectWalletSheet>
                ) : (
                  <Button size="lg" className="bg-primary h-14 rounded-md px-8 text-white">
                    Install Wallet
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="h-14 rounded-md border-zinc-200 px-6 text-zinc-600 transition-all hover:bg-zinc-50 hover:text-zinc-900"
                >
                  How it works
                </Button>
              </div>
            </motion.div>
          </div>

          {/* --- RIGHT: CREATIVE FLOW ILLUSTRATION --- */}
          <div className="relative lg:col-span-7">
            <div className="relative grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Step 1: Neutral/Technical */}
              <motion.div
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                className="flex min-h-[200px] flex-col justify-between rounded-md border border-zinc-200 bg-zinc-50 p-8"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-md border border-zinc-100 bg-white p-3 shadow-sm">
                    <Lock className="h-5 w-5 text-zinc-400" />
                  </div>
                  <span className="text-[10px] font-black text-zinc-300">01</span>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-bold tracking-wide text-zinc-900 uppercase">
                    Secure Funds
                  </h3>
                  <p className="text-xs leading-relaxed font-medium text-zinc-500">
                    Funder locks assets into a Plutus script address.
                  </p>
                </div>
              </motion.div>

              {/* Step 2: Primary/Action */}
              <motion.div
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                className="bg-primary shadow-primary/20 flex min-h-[200px] flex-col justify-between rounded-md p-8 text-white shadow-2xl md:translate-y-12"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-md bg-white/10 p-3 backdrop-blur-md">
                    <ShieldCheck className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-[10px] font-black text-white/40">02</span>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-bold tracking-wide uppercase">Dual-Signature</h3>
                  <p className="text-primary-foreground/80 text-xs leading-relaxed font-medium">
                    Agreement is closed by mutual signature on-chain.
                  </p>
                </div>
              </motion.div>

              {/* Step 3: Creative Dispute Resolver */}
              <motion.div
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                className="flex min-h-[160px] flex-col items-center gap-8 rounded-md bg-zinc-900 p-8 text-white md:col-span-2 md:mt-12 md:flex-row"
              >
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2">
                    <Scale className="text-primary h-5 w-5" />
                    <h3 className="text-sm font-bold tracking-wide uppercase">
                      Community Arbitration
                    </h3>
                  </div>
                  <p className="text-xs leading-relaxed font-medium text-zinc-400">
                    In case of conflict, randomized nodes review hashed evidence to determine the
                    winner based on game theory incentives.
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-md border border-zinc-700 bg-zinc-800 p-4">
                  <div className="flex -space-x-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-600"
                      >
                        <span>{"wxy"[i - 1]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-right">
                    <p className="text-primary text-[10px] font-bold tracking-widest uppercase">
                      Verified
                    </p>
                    <p className="font-mono text-[9px] text-zinc-500">Quorum: 7/10</p>
                  </div>
                </div>
              </motion.div>

              {/* Creative Connection Line */}
              <div className="absolute top-1/2 -left-10 hidden h-0.5 w-12 bg-zinc-100 lg:block" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
