"use client";

import { motion } from "framer-motion";
import { 
    ShieldCheck, 
    Scale, 
    ArrowRight, 
    Lock,
    Users,
    ChevronRight,
    MousePointer2,
    Binary
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWalletList } from "@meshsdk/react";
import ConnectWalletSheet from "./ConnectWalletSheet";

export default function HeroSection() {
    const walletList = useWalletList();
    const hasWallets = walletList.length > 0;

    const fadeInUp = {
        initial: { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    };

    return (
        <div className="relative min-h-[70vh] flex items-center bg-white overflow-hidden border-b border-zinc-100">
            {/* Background Texture */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#f4f4f5_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 w-full py-16">
                <div className="grid lg:grid-cols-12 gap-16 items-start">
                    
                    {/* --- LEFT: BRANDING & CTA --- */}
                    <div className="lg:col-span-5 space-y-10">
                        <motion.div variants={fadeInUp} initial="initial" animate="animate" className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 text-white">
                                <Binary className="h-3 w-3 text-primary" />
                                <span className="text-[9px] font-bold uppercase tracking-[0.3em]">
                                    Decentralized Justice
                                </span>
                            </div>

                            <h1 className="text-6xl md:text-7xl font-bold tracking-tighter text-zinc-900 leading-[0.95]">
                                Work <br />
                                <span className="text-primary italic">Without</span> <br />
                                Borders.
                            </h1>

                            <p className="text-base text-zinc-500 max-w-sm leading-relaxed font-medium">
                                Secure your capital in smart-locked vaults. Gadaa ensures you only pay when delivery is verified by on-chain consensus.
                            </p>

                            <div className="flex items-center gap-4 pt-4">
                                {hasWallets ? (
                                    <ConnectWalletSheet>
                                        <Button size="lg" className="h-14 px-8 rounded-md bg-primary hover:bg-primary/90 text-white gap-3 shadow-xl shadow-primary/20 group">
                                            Get Started
                                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </Button>
                                    </ConnectWalletSheet>
                                ) : (
                                    <Button size="lg" className="h-14 px-8 rounded-md bg-primary text-white">Install Wallet</Button>
                                )}
                                <Button variant="outline" className="h-14 px-6 rounded-md border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-all">
                                    How it works
                                </Button>
                            </div>
                        </motion.div>
                    </div>

                    {/* --- RIGHT: CREATIVE FLOW ILLUSTRATION --- */}
                    <div className="lg:col-span-7 relative">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                            
                            {/* Step 1: Neutral/Technical */}
                            <motion.div 
                                variants={fadeInUp} initial="initial" animate="animate"
                                className="p-8 rounded-md bg-zinc-50 border border-zinc-200 flex flex-col justify-between min-h-[200px]"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="p-3 bg-white rounded-md border border-zinc-100 shadow-sm">
                                        <Lock className="h-5 w-5 text-zinc-400" />
                                    </div>
                                    <span className="text-[10px] font-black text-zinc-300">01</span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-900 mb-2 uppercase tracking-wide">Secure Funds</h3>
                                    <p className="text-xs text-zinc-500 leading-relaxed font-medium">Funder locks assets into a Plutus script address.</p>
                                </div>
                            </motion.div>

                            {/* Step 2: Primary/Action */}
                            <motion.div 
                                variants={fadeInUp} initial="initial" animate="animate"
                                className="p-8 rounded-md bg-primary text-white shadow-2xl shadow-primary/20 flex flex-col justify-between min-h-[200px] md:translate-y-12"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="p-3 bg-white/10 rounded-md backdrop-blur-md">
                                        <ShieldCheck className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="text-[10px] font-black text-white/40">02</span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold mb-2 uppercase tracking-wide">Dual-Signature</h3>
                                    <p className="text-xs text-primary-foreground/80 leading-relaxed font-medium">Agreement is closed by mutual signature on-chain.</p>
                                </div>
                            </motion.div>

                            {/* Step 3: Creative Dispute Resolver */}
                            <motion.div 
                                variants={fadeInUp} initial="initial" animate="animate"
                                className="md:col-span-2 p-8 rounded-md bg-zinc-900 text-white flex flex-col md:flex-row items-center gap-8 min-h-[160px] md:mt-12"
                            >
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Scale className="h-5 w-5 text-primary" />
                                        <h3 className="text-sm font-bold uppercase tracking-wide">Community Arbitration</h3>
                                    </div>
                                    <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                                        In case of conflict, randomized nodes review hashed evidence to determine the winner based on game theory incentives.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 bg-zinc-800 p-4 rounded-md border border-zinc-700">
                                    <div className="flex -space-x-3">
                                        {[1,2,3].map(i => (
                                            <div key={i} className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-zinc-600" />
                                        ))}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-primary tracking-widest uppercase">Verified</p>
                                        <p className="text-[9px] text-zinc-500 font-mono">Quorum: 7/10</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Creative Connection Line */}
                            <div className="absolute hidden lg:block top-1/2 left-[-40px] w-12 h-[2px] bg-zinc-100" />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}