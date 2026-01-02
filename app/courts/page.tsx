"use client"

import React, { useState, useMemo, KeyboardEvent } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
    Gavel,
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle2,
    Eye,
    Plus,
    X,
    Sparkles,
    ChevronRight,
    Briefcase,
    User,
    Vote,
    AlertTriangle,
    Coins,
    ChevronDown,
    Filter
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import StatCard from "@/components/custom/StatCard"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu"

// --- Types & Schemas ---

type CaseStatus = "PENDING" | "ASSIGNED" | "IN_REVIEW" | "RESOLVED" | "EXPIRED"

interface DisputeCase {
    id: string
    escrowId: string
    title: string
    stakeAmount: number // ADA
    status: CaseStatus
    createdAt: string
    raisedBy: "FUNDER" | "RECIPIENT"
    requiredArbitratorCount: number
    assignedArbitrators: number
    evidence?: string
}

interface ArbitratorStats {
    totalEarned: number // ADA
    totalLost: number // ADA
    totalCases: number
    correctVotes: number
    wrongVotes: number
    reputationScore: number
    lockedAmount: number // ADA
}

const registerSchema = z.object({
    fullName: z.string().min(2, "Name is required"),
    bio: z.string().min(10, "Bio must be at least 10 characters"),
    expertise: z.array(z.string()).min(1, "Add at least one area of expertise"),
    acceptStake: z.boolean().refine(val => val === true, {
        message: "You must accept the stake requirement",
    }),
})

type RegisterFormValues = z.infer<typeof registerSchema>

// --- Constants ---
const REQUIRED_STAKE_AMOUNT = 100 // ADA

// --- Dummy Data based on your schema ---
const DUMMY_DISPUTES: DisputeCase[] = [
    {
        id: "dsp_001",
        escrowId: "esc_901",
        title: "Smart Contract Logic Dispute",
        stakeAmount: 450,
        status: "ASSIGNED",
        createdAt: "2024-05-15",
        raisedBy: "FUNDER",
        requiredArbitratorCount: 3,
        assignedArbitrators: 2,
        evidence: "Contract fails to release funds after conditions met"
    },
    {
        id: "dsp_002",
        escrowId: "esc_442",
        title: "Asset Delivery Failure",
        stakeAmount: 1200,
        status: "IN_REVIEW",
        createdAt: "2024-05-10",
        raisedBy: "RECIPIENT",
        requiredArbitratorCount: 3,
        assignedArbitrators: 3,
        evidence: "Screenshots showing incomplete delivery"
    },
    {
        id: "dsp_003",
        escrowId: "esc_109",
        title: "Frontend Implementation Bug",
        stakeAmount: 300,
        status: "PENDING",
        createdAt: "2024-05-18",
        raisedBy: "FUNDER",
        requiredArbitratorCount: 3,
        assignedArbitrators: 1
    },
    {
        id: "dsp_004",
        escrowId: "esc_882",
        title: "Unpaid Milestone: Design",
        stakeAmount: 800,
        status: "RESOLVED",
        createdAt: "2024-04-28",
        raisedBy: "RECIPIENT",
        requiredArbitratorCount: 3,
        assignedArbitrators: 3
    },
]

const DUMMY_STATS: ArbitratorStats = {
    totalEarned: 4250, // ADA
    totalLost: 150, // ADA
    totalCases: 14,
    correctVotes: 12,
    wrongVotes: 2,
    reputationScore: 0.86,
    lockedAmount: 100, // ADA (staked amount)
}

const RegisterSheet = ({ onRegister }: { onRegister: (values: RegisterFormValues) => void }) => {
    const [tagInput, setTagInput] = useState("")
    const [open, setOpen] = useState(false)

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            fullName: "",
            bio: "",
            expertise: [],
            acceptStake: false
        }
    })

    const addTag = (e: KeyboardEvent<HTMLInputElement>, field: { value?: string[], onChange: (val: string[]) => void }) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault()
            if (!field.value?.includes(tagInput.trim())) {
                field.onChange([...(field.value || []), tagInput.trim()])
            }
            setTagInput("")
        }
    }

    const handleFormSubmit = (values: RegisterFormValues) => {
        onRegister(values)
        setOpen(false)
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button size="lg" className="px-8 gap-2">
                    <Plus className="h-4 w-4" /> Register as Arbitrator
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
                <SheetHeader className="mb-0">
                    <SheetTitle className="text-2xl font-semibold tracking-tight">Become an Arbitrator</SheetTitle>
                    <SheetDescription className="text-muted-foreground">
                        Apply to join the arbitration panel. {REQUIRED_STAKE_AMOUNT} ADA stake required.
                    </SheetDescription>
                </SheetHeader>

                <div className="px-6 py-4">
                    <Card className="mb-4 bg-primary/5 border-primary/20 rounded-md">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <div className="bg-primary/10 p-2">
                                    <Coins className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm mb-1">Stake Requirement</h4>
                                    <p className="text-sm text-muted-foreground">
                                        You must stake <strong>{REQUIRED_STAKE_AMOUNT} ADA</strong> to become an arbitrator.
                                        This stake may be slashed for incorrect rulings.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8 px-6">
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Username / Pseudonym</FormLabel>
                                    <div className="relative group">
                                        <User className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                                        <FormControl>
                                            <Input
                                                placeholder="Jane Doe"
                                                {...field}
                                                className="border-0 border-b border-zinc-300 rounded-none bg-zinc-50 shadow-none pl-8 h-10 focus-visible:ring-0 focus-visible:border-primary transition-all"
                                            />
                                        </FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="expertise"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Areas of Expertise</FormLabel>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {field.value?.map((tag) => (
                                            <Badge
                                                key={tag}
                                                variant="secondary"
                                                className="pl-2 pr-1 py-1 gap-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground border-none rounded-md"
                                            >
                                                {tag}
                                                <X
                                                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                                                    onClick={() => field.onChange(field.value?.filter((t) => t !== tag))}
                                                />
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="relative group">
                                        <Sparkles className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                                        <FormControl>
                                            <Input
                                                placeholder="Type skill & press Enter"
                                                value={tagInput}
                                                onChange={(e) => setTagInput(e.target.value)}
                                                onKeyDown={(e) => addTag(e, field)}
                                                className="border-0 border-b border-zinc-300 rounded-none bg-zinc-50 shadow-none pl-8 h-10 focus-visible:ring-0 focus-visible:border-primary transition-all"
                                            />
                                        </FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Professional Background</FormLabel>
                                    <div className="relative group">
                                        <Briefcase className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                                        <FormControl>
                                            <Textarea
                                                placeholder="Detail your experience in smart contracts, legal tech, or dispute resolution..."
                                                className="border-0 border-b border-zinc-300 rounded-none bg-zinc-50 shadow-none pl-8 pt-2.5 min-h-[120px] resize-none focus-visible:ring-0 focus-visible:border-primary transition-all"
                                                {...field}
                                            />
                                        </FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="acceptStake"
                            render={({ field }) => (
                                <FormItem className="flex items-start space-x-3 space-y-0">
                                    <FormControl>
                                        <input
                                            type="checkbox"
                                            checked={field.value}
                                            onChange={field.onChange}
                                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary mt-1"
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel className="text-sm font-medium">
                                            I agree to stake {REQUIRED_STAKE_AMOUNT} ADA
                                        </FormLabel>
                                        <p className="text-sm text-muted-foreground">
                                            This stake may be slashed for incorrect rulings or misconduct.
                                        </p>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <SheetFooter className="pt-8 px-0">
                            <Button type="submit" className="w-full h-12">
                                Stake {REQUIRED_STAKE_AMOUNT} ADA & Register
                            </Button>
                        </SheetFooter>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    )
}

// --- Main Page ---

export default function ArbitratorCourt() {
    const [isRegistered, setIsRegistered] = useState(false)
    const [filter, setFilter] = useState<CaseStatus | "All">("All")
    const [selectedCase, setSelectedCase] = useState<DisputeCase | null>(null)

    const filteredCases = useMemo(() => {
        return filter === "All" ? DUMMY_DISPUTES : DUMMY_DISPUTES.filter(c => c.status === filter)
    }, [filter])

    const handleRegister = (values: RegisterFormValues) => {
        console.log("Registration Data:", values)
        setIsRegistered(true)
    }

    const handleViewCase = (caseItem: DisputeCase) => {
        setSelectedCase(caseItem)
    }

    const handleVote = (caseId: string, decision: "RELEASE" | "REFUND") => {
        console.log(`Voting ${decision} for case ${caseId}`)
        // Implement voting logic here
    }

    const getStatusColor = (status: CaseStatus) => {
        switch (status) {
            case "PENDING": return "bg-muted-foreground"
            case "ASSIGNED": return "bg-blue-500"
            case "IN_REVIEW": return "bg-warning"
            case "RESOLVED": return "bg-primary"
            case "EXPIRED": return "bg-destructive"
            default: return "bg-muted-foreground"
        }
    }

    const getStatusLabel = (status: CaseStatus) => {
        switch (status) {
            case "PENDING": return "Pending"
            case "ASSIGNED": return "Assigned"
            case "IN_REVIEW": return "In Review"
            case "RESOLVED": return "Resolved"
            case "EXPIRED": return "Expired"
            default: return status
        }
    }

    const getRaisedByLabel = (raisedBy: "FUNDER" | "RECIPIENT") => {
        return raisedBy === "FUNDER" ? "Funder" : "Recipient"
    }

    const statusOptions = ["All", "PENDING", "ASSIGNED", "IN_REVIEW", "RESOLVED", "EXPIRED"]

    return (
        <div className="min-h-[calc(100vh-5rem)] bg-background px-6">
            <div className="max-w-6xl mx-auto space-y-12">
                {isRegistered ? (
                    <div className="space-y-16 pt-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        {/* Stats Dashboard */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                label="Total Earned"
                                value={`${DUMMY_STATS.totalEarned.toLocaleString()} ADA`}
                                icon={TrendingUp}
                                trend="up"
                            />
                            <StatCard
                                label="Total Slashed"
                                value={`${DUMMY_STATS.totalLost} ADA`}
                                icon={TrendingDown}
                                trend="down"
                            />
                            <StatCard
                                label="Current Stake"
                                value={`${DUMMY_STATS.lockedAmount} ADA`}
                                icon={Coins}
                            />
                            <StatCard
                                label="Reputation Score"
                                value={`${(DUMMY_STATS.reputationScore * 100).toFixed(0)}%`}
                                icon={CheckCircle2}
                            />
                        </div>

                        {/* Case List Section */}
                        <div className="space-y-8 pb-10">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-3 text-foreground">
                                    Assigned Disputes
                                    <Badge
                                        variant="secondary"
                                        className="bg-secondary text-secondary-foreground rounded-md font-mono"
                                    >
                                        {filteredCases.length}
                                    </Badge>
                                </h2>

                                {/* Minimalist Filter Bar */}

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-10 gap-2 border-zinc-200 bg-zinc-100/80">
                                            <Filter className="h-4 w-4" />
                                            Filter Status
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                        <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {statusOptions.map((option) => (
                                            <DropdownMenuCheckboxItem
                                                key={option}
                                                checked={filter === option}
                                                onCheckedChange={() => setFilter(option as CaseStatus | 'All')}
                                            >
                                                {option === "All" ? "All" : getStatusLabel(option as CaseStatus)}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                        <DropdownMenuSeparator />

                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="border border-border rounded-md overflow-hidden bg-card">
                                <Table>
                                    <TableHeader className="bg-zinc-100/50">
                                        <TableRow className="hover:bg-transparent border-border">
                                            <TableHead className="text-[10px] uppercase font-bold tracking-widest py-5 pl-8 text-muted-foreground">
                                                Case ID
                                            </TableHead>
                                            <TableHead className="text-[10px] uppercase font-bold tracking-widest py-5 text-muted-foreground">
                                                Dispute Details
                                            </TableHead>
                                            <TableHead className="text-[10px] uppercase font-bold tracking-widest py-5 text-muted-foreground">
                                                Stake Amount
                                            </TableHead>
                                            <TableHead className="text-[10px] uppercase font-bold tracking-widest py-5 text-muted-foreground">
                                                Status
                                            </TableHead>
                                            <TableHead className="text-[10px] uppercase font-bold tracking-widest py-5 text-right pr-8 text-muted-foreground">
                                                Actions
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredCases.map((c) => (
                                            <TableRow
                                                key={c.id}
                                                className="group hover:bg-muted/30 transition-colors border-border"
                                            >
                                                <TableCell className="font-mono text-xs text-muted-foreground pl-8 py-6">
                                                    {c.id}
                                                    <div className="text-[10px] text-muted-foreground/70 mt-1">
                                                        Escrow: {c.escrowId}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="font-medium text-foreground">
                                                            {c.title}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Badge variant="outline" className="text-[10px] px-2 py-0">
                                                                Raised by: {getRaisedByLabel(c.raisedBy)}
                                                            </Badge>
                                                            <span>•</span>
                                                            <span>{c.assignedArbitrators}/{c.requiredArbitratorCount} arbitrators</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-foreground font-medium">
                                                    {c.stakeAmount.toLocaleString()} ADA
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`h-1.5 w-1.5 rounded-full ${getStatusColor(c.status)}`} />
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            {getStatusLabel(c.status)}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground/70 mt-1">
                                                        {new Date(c.createdAt).toLocaleDateString()}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-8">
                                                    <div className="flex flex-col sm:flex-row gap-2 justify-end">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="transition-all gap-2 h-9"
                                                            onClick={() => handleViewCase(c)}
                                                        >
                                                            <Eye className="h-3.5 w-3.5" /> Details
                                                        </Button>

                                                        {["ASSIGNED", "IN_REVIEW"].includes(c.status) && (
                                                            <>
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    className="transition-all gap-2 h-9 "
                                                                    onClick={() => handleVote(c.id, "RELEASE")}
                                                                >
                                                                    <Vote className="h-3.5 w-3.5" /> Vote Release
                                                                </Button>
                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    className="transition-all gap-2 h-9 "
                                                                    onClick={() => handleVote(c.id, "REFUND")}
                                                                >
                                                                    <Vote className="h-3.5 w-3.5" /> Vote Refund
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Empty State / Welcome Info */
                    <div className="max-w-3xl mx-auto py-12 text-center space-y-10 animate-in fade-in zoom-in-95 duration-700">
                        <div className="relative inline-flex">
                            <div className="absolute inset-0 bg-muted rounded-full blur-2xl opacity-50 animate-pulse" />
                            <div className="relative h-24 w-24 rounded-full bg-card border border-border flex items-center justify-center shadow-sm">
                                <Gavel className="h-10 w-10 text-foreground" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-4xl font-semibold tracking-tight text-foreground">Arbitrator Registration</h2>
                            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
                                Join our decentralized arbitration panel. Earn rewards by resolving disputes while maintaining
                                ecosystem integrity. {REQUIRED_STAKE_AMOUNT} ADA stake required.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                            <RegisterSheet onRegister={handleRegister} />
                            <Button
                                variant="link"
                                className="text-muted-foreground hover:text-foreground gap-2 font-bold uppercase text-[10px] tracking-widest"
                            >
                                Read Arbitration Rules <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-16">
                            {[
                                {
                                    title: "Stake Required",
                                    desc: `Secure ${REQUIRED_STAKE_AMOUNT} ADA stake ensures arbitrator accountability`,
                                    icon: <Coins className="h-5 w-5" />
                                },
                                {
                                    title: "Earn Rewards",
                                    desc: "Receive ADA rewards for correct rulings and active participation",
                                    icon: <TrendingUp className="h-5 w-5" />
                                },
                                {
                                    title: "Risk of Slashing",
                                    desc: "Incorrect rulings may result in stake slashing",
                                    icon: <AlertTriangle className="h-5 w-5" />
                                }
                            ].map((item, i) => (
                                <div key={i} className="text-left space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                            {item.icon}
                                        </div>
                                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">0{i + 1}</div>
                                    </div>
                                    <h4 className="font-semibold text-foreground">{item.title}</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Case Details Modal */}
            {selectedCase && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold">Case Details</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedCase(null)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-muted-foreground">Case ID</label>
                                    <p className="font-mono">{selectedCase.id}</p>
                                </div>

                                <div>
                                    <label className="text-sm text-muted-foreground">Escrow ID</label>
                                    <p className="font-mono">{selectedCase.escrowId}</p>
                                </div>

                                <div>
                                    <label className="text-sm text-muted-foreground">Title</label>
                                    <p className="font-medium">{selectedCase.title}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-muted-foreground">Stake Amount</label>
                                        <p className="font-medium">{selectedCase.stakeAmount.toLocaleString()} ADA</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted-foreground">Status</label>
                                        <Badge className={getStatusColor(selectedCase.status)}>
                                            {getStatusLabel(selectedCase.status)}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-muted-foreground">Raised By</label>
                                        <p>{getRaisedByLabel(selectedCase.raisedBy)}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted-foreground">Arbitrators</label>
                                        <p>{selectedCase.assignedArbitrators}/{selectedCase.requiredArbitratorCount} assigned</p>
                                    </div>
                                </div>

                                {selectedCase.evidence && (
                                    <div>
                                        <label className="text-sm text-muted-foreground">Evidence</label>
                                        <p className="text-sm">{selectedCase.evidence}</p>
                                    </div>
                                )}

                                <div>
                                    <label className="text-sm text-muted-foreground">Created</label>
                                    <p>{new Date(selectedCase.createdAt).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
                                {["ASSIGNED", "IN_REVIEW"].includes(selectedCase.status) && (
                                    <>
                                        <Button
                                            onClick={() => {
                                                handleVote(selectedCase.id, "RELEASE")
                                                setSelectedCase(null)
                                            }}
                                        >
                                            Vote Release
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => {
                                                handleVote(selectedCase.id, "REFUND")
                                                setSelectedCase(null)
                                            }}
                                        >
                                            Vote Refund
                                        </Button>
                                    </>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={() => setSelectedCase(null)}
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}