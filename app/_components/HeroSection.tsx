// components/custom/HeroSection.tsx
"use client";

import { motion } from "framer-motion";
import { Shield, Scale, Clock, CheckCircle, ArrowRight, Users, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWalletList } from "@meshsdk/react";
import ConnectWalletSheet from "./ConnectWalletSheet";


export default function HeroSection() {
    const walletList = useWalletList();
    const hasWallets = walletList.length > 0;

    const fadeInUp = {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: "easeOut" }
    };

    const staggerContainer = {
        animate: {
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const features = [
        {
            icon: Shield,
            title: "Secure Escrow",
            description: "ADA held in smart contract until work is completed satisfactorily"
        },
        {
            icon: Scale,
            title: "Fair Dispute Resolution",
            description: "Present your case to decentralized arbitrators for impartial judgment"
        },
        {
            icon: Users,
            title: "Community Governance",
            description: "Arbitrators rewarded for fair decisions, penalized for misconduct"
        },
        {
            icon: FileCheck,
            title: "Clear Agreements",
            description: "Define work scope and terms before starting any project"
        },
        {
            icon: Clock,
            title: "Timely Payments",
            description: "Automatic release of funds when work is approved by client"
        },
        {
            icon: CheckCircle,
            title: "Satisfaction Guaranteed",
            description: "Work doesn't get paid until you're happy with the results"
        }
    ];

    const workflowSteps = [
        {
            step: "1",
            title: "Create Agreement",
            description: "Client locks ADA in smart contract with clear work terms"
        },
        {
            step: "2",
            title: "Work Completion",
            description: "Worker delivers the agreed-upon work to client"
        },
        {
            step: "3",
            title: "Approval or Dispute",
            description: "Client approves payment or raises dispute for arbitration"
        },
        {
            step: "4",
            title: "Fair Resolution",
            description: "Decentralized arbitrators review evidence and make final decision"
        }
    ];

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
            <motion.div
                className="max-w-7xl mx-auto"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
            >
                {/* Main Heading */}
                <section className="h-[calc(100vh-15rem)] flex items-center justify-center">
                    <div className="text-center">
                        <motion.div variants={fadeInUp}>
                            <motion.div
                                //   variants={pulseGlow}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
                            >
                                <Shield className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium text-primary">
                                    Secure Escrow & Dispute Resolution on Cardano
                                </span>
                            </motion.div>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                                Work with{" "}
                                <motion.span
                                    className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent"
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                >
                                    Confidence
                                </motion.span>
                            </h1>

                            <motion.p
                                variants={fadeInUp}
                                className="text-xl text-neutral-500 max-w-3xl mx-auto leading-relaxed mb-8"
                            >
                                TrustSeal secures your work agreements with smart contract escrow.
                                Get paid fairly for your work or resolve disputes through our decentralized arbitration system.
                            </motion.p>
                        </motion.div>

                        {/* CTA Buttons */}
                        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                            {hasWallets ? (
                                <ConnectWalletSheet>
                                    <Button size="lg" className="gap-2 group">
                                        Start Secure Work
                                        <motion.div
                                            animate={{ x: [0, 4, 0] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        >
                                            <ArrowRight className="h-4 w-4" />
                                        </motion.div>
                                    </Button>
                                </ConnectWalletSheet>
                            ) : (
                                <Button size="lg" className="gap-2" asChild>
                                    <a href="https://eternl.io" target="_blank" rel="noopener noreferrer">
                                        Install Wallet to Start
                                        <ArrowRight className="h-4 w-4" />
                                    </a>
                                </Button>
                            )}

                            <Button variant="outline" size="lg">
                                How It Works
                            </Button>
                        </motion.div>
                    </div>
                </section>

                {/* Workflow Steps */}
                <motion.div variants={fadeInUp} className="mb-16">
                    <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
                        How TrustSeal Protects Your Work
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        {workflowSteps.map((step, index) => (
                            <motion.div
                                key={step.step}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.2 }}
                                whileHover={{ y: -5 }}
                                className="relative p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                            >
                                <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {step.step}
                                </div>
                                <h3 className="font-semibold text-gray-900 mb-3 text-lg">
                                    {step.title}
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {step.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Features Grid */}
                <motion.div variants={fadeInUp}>
                    <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
                        Why Choose TrustSeal?
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {features.map((feature) => (
                            <motion.div
                                key={feature.title}
                                variants={fadeInUp}
                                whileHover={{
                                    y: -5,
                                    transition: { duration: 0.2 }
                                }}
                                className="p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                            >
                                <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    transition={{ duration: 0.3 }}
                                    className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center mb-4"
                                >
                                    <feature.icon className="h-6 w-6 text-white" />
                                </motion.div>
                                <h3 className="font-semibold text-gray-900 mb-3">
                                    {feature.title}
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {feature.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Arbitration System Explanation */}
                <motion.div
                    variants={fadeInUp}
                    className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/60"
                >
                    <div className="max-w-4xl mx-auto text-center">
                        <Scale className="h-12 w-12 text-primary mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">
                            Fair Dispute Resolution System
                        </h3>
                        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                            Our decentralized arbitration ensures fair outcomes. Arbitrators are incentivized to make correct judgments
                            and penalized for going against the consensus, creating a self-regulating system of justice.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                            <div className="text-center">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                </div>
                                <p className="font-medium text-gray-900">Evidence-Based</p>
                                <p className="text-muted-foreground">Both sides present their case</p>
                            </div>
                            <div className="text-center">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <Users className="h-4 w-4 text-blue-600" />
                                </div>
                                <p className="font-medium text-gray-900">Community Driven</p>
                                <p className="text-muted-foreground">Multiple arbitrators review</p>
                            </div>
                            <div className="text-center">
                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <Shield className="h-4 w-4 text-purple-600" />
                                </div>
                                <p className="font-medium text-gray-900">Incentivized Fairness</p>
                                <p className="text-muted-foreground">Good arbitrators earn, bad ones lose</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Floating Elements */}
                <motion.div
                    className="absolute top-1/4 left-10 w-4 h-4 bg-blue-400 rounded-full opacity-20"
                    animate={{
                        y: [0, -20, 0],
                        opacity: [0.2, 0.5, 0.2],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                />
                <motion.div
                    className="absolute bottom-1/4 right-10 w-6 h-6 bg-primary rounded-full opacity-30"
                    animate={{
                        y: [0, 30, 0],
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                />
            </motion.div>
        </div>
    );
}