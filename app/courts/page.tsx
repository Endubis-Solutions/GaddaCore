"use client";

import React, { useState, useMemo, KeyboardEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
  Filter,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import StatCard from "@/components/custom/StatCard";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

// --- Types & Schemas ---

type CaseStatus = "PENDING" | "ASSIGNED" | "IN_REVIEW" | "RESOLVED" | "EXPIRED";

interface DisputeCase {
  id: string;
  escrowId: string;
  title: string;
  stakeAmount: number; // ADA
  status: CaseStatus;
  createdAt: string;
  raisedBy: "FUNDER" | "RECIPIENT";
  requiredArbitratorCount: number;
  assignedArbitrators: number;
  evidence?: string;
}

interface ArbitratorStats {
  totalEarned: number; // ADA
  totalLost: number; // ADA
  totalCases: number;
  correctVotes: number;
  wrongVotes: number;
  reputationScore: number;
  lockedAmount: number; // ADA
}

const registerSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  bio: z.string().min(10, "Bio must be at least 10 characters"),
  expertise: z.array(z.string()).min(1, "Add at least one area of expertise"),
  acceptStake: z.boolean().refine((val) => val === true, {
    message: "You must accept the stake requirement",
  }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

// --- Constants ---
const REQUIRED_STAKE_AMOUNT = 100; // ADA

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
    evidence: "Contract fails to release funds after conditions met",
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
    evidence: "Screenshots showing incomplete delivery",
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
    assignedArbitrators: 1,
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
    assignedArbitrators: 3,
  },
];

const DUMMY_STATS: ArbitratorStats = {
  totalEarned: 4250, // ADA
  totalLost: 150, // ADA
  totalCases: 14,
  correctVotes: 12,
  wrongVotes: 2,
  reputationScore: 0.86,
  lockedAmount: 100, // ADA (staked amount)
};

const RegisterSheet = ({ onRegister }: { onRegister: (values: RegisterFormValues) => void }) => {
  const [tagInput, setTagInput] = useState("");
  const [open, setOpen] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      bio: "",
      expertise: [],
      acceptStake: false,
    },
  });

  const addTag = (
    e: KeyboardEvent<HTMLInputElement>,
    field: { value?: string[]; onChange: (val: string[]) => void }
  ) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!field.value?.includes(tagInput.trim())) {
        field.onChange([...(field.value || []), tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const handleFormSubmit = (values: RegisterFormValues) => {
    onRegister(values);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="lg" className="gap-2 px-8">
          <Plus className="h-4 w-4" /> Register as Arbitrator
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[500px]">
        <SheetHeader className="mb-0">
          <SheetTitle className="text-2xl font-semibold tracking-tight">
            Become an Arbitrator
          </SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Apply to join the arbitration panel. {REQUIRED_STAKE_AMOUNT} ADA stake required.
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-4">
          <Card className="bg-primary/5 border-primary/20 mb-4 rounded-md">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2">
                  <Coins className="text-primary h-5 w-5" />
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-semibold">Stake Requirement</h4>
                  <p className="text-muted-foreground text-sm">
                    You must stake <strong>{REQUIRED_STAKE_AMOUNT} ADA</strong> to become an
                    arbitrator. This stake may be slashed for incorrect rulings.
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
                  <FormLabel className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                    Username / Pseudonym
                  </FormLabel>
                  <div className="group relative">
                    <User className="text-muted-foreground group-focus-within:text-foreground absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 transition-colors" />
                    <FormControl>
                      <Input
                        placeholder="Jane Doe"
                        {...field}
                        className="focus-visible:border-primary h-10 rounded-none border-0 border-b border-zinc-300 bg-zinc-50 pl-8 shadow-none transition-all focus-visible:ring-0"
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
                  <FormLabel className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                    Areas of Expertise
                  </FormLabel>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {field.value?.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-secondary hover:bg-secondary/80 text-secondary-foreground gap-1 rounded-md border-none py-1 pr-1 pl-2"
                      >
                        {tag}
                        <X
                          className="hover:text-destructive h-3 w-3 cursor-pointer"
                          onClick={() => field.onChange(field.value?.filter((t) => t !== tag))}
                        />
                      </Badge>
                    ))}
                  </div>
                  <div className="group relative">
                    <Sparkles className="text-muted-foreground group-focus-within:text-foreground absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 transition-colors" />
                    <FormControl>
                      <Input
                        placeholder="Type skill & press Enter"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => addTag(e, field)}
                        className="focus-visible:border-primary h-10 rounded-none border-0 border-b border-zinc-300 bg-zinc-50 pl-8 shadow-none transition-all focus-visible:ring-0"
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
                  <FormLabel className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                    Professional Background
                  </FormLabel>
                  <div className="group relative">
                    <Briefcase className="text-muted-foreground absolute top-3 left-2 h-4 w-4" />
                    <FormControl>
                      <Textarea
                        placeholder="Detail your experience in smart contracts, legal tech, or dispute resolution..."
                        className="focus-visible:border-primary min-h-[120px] resize-none rounded-none border-0 border-b border-zinc-300 bg-zinc-50 pt-2.5 pl-8 shadow-none transition-all focus-visible:ring-0"
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
                <FormItem className="flex items-start space-y-0 space-x-3">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="border-input text-primary focus:ring-primary mt-1 h-4 w-4 rounded"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">
                      I agree to stake {REQUIRED_STAKE_AMOUNT} ADA
                    </FormLabel>
                    <p className="text-muted-foreground text-sm">
                      This stake may be slashed for incorrect rulings or misconduct.
                    </p>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="px-0 pt-8">
              <Button type="submit" className="h-12 w-full">
                Stake {REQUIRED_STAKE_AMOUNT} ADA & Register
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};

// --- Main Page ---

export default function ArbitratorCourt() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [filter, setFilter] = useState<CaseStatus | "All">("All");
  const [selectedCase, setSelectedCase] = useState<DisputeCase | null>(null);

  const filteredCases = useMemo(() => {
    return filter === "All" ? DUMMY_DISPUTES : DUMMY_DISPUTES.filter((c) => c.status === filter);
  }, [filter]);

  const handleRegister = (values: RegisterFormValues) => {
    console.log("Registration Data:", values);
    setIsRegistered(true);
  };

  const handleViewCase = (caseItem: DisputeCase) => {
    setSelectedCase(caseItem);
  };

  const handleVote = (caseId: string, decision: "RELEASE" | "REFUND") => {
    console.log(`Voting ${decision} for case ${caseId}`);
    // Implement voting logic here
  };

  const getStatusColor = (status: CaseStatus) => {
    switch (status) {
      case "PENDING":
        return "bg-muted-foreground";
      case "ASSIGNED":
        return "bg-blue-500";
      case "IN_REVIEW":
        return "bg-warning";
      case "RESOLVED":
        return "bg-primary";
      case "EXPIRED":
        return "bg-destructive";
      default:
        return "bg-muted-foreground";
    }
  };

  const getStatusLabel = (status: CaseStatus) => {
    switch (status) {
      case "PENDING":
        return "Pending";
      case "ASSIGNED":
        return "Assigned";
      case "IN_REVIEW":
        return "In Review";
      case "RESOLVED":
        return "Resolved";
      case "EXPIRED":
        return "Expired";
      default:
        return status;
    }
  };

  const getRaisedByLabel = (raisedBy: "FUNDER" | "RECIPIENT") => {
    return raisedBy === "FUNDER" ? "Funder" : "Recipient";
  };

  const statusOptions = ["All", "PENDING", "ASSIGNED", "IN_REVIEW", "RESOLVED", "EXPIRED"];

  return (
    <div className="bg-background min-h-[calc(100vh-5rem)] px-6">
      <div className="mx-auto max-w-6xl space-y-12">
        {isRegistered ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-16 pt-10 duration-1000">
            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <h2 className="text-foreground flex items-center gap-3 text-2xl font-semibold tracking-tight">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 gap-2 border-zinc-200 bg-zinc-100/80"
                    >
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
                        onCheckedChange={() => setFilter(option as CaseStatus | "All")}
                      >
                        {option === "All" ? "All" : getStatusLabel(option as CaseStatus)}
                      </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="border-border bg-card overflow-hidden rounded-md border">
                <Table>
                  <TableHeader className="bg-zinc-100/50">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground py-5 pl-8 text-[10px] font-bold tracking-widest uppercase">
                        Case ID
                      </TableHead>
                      <TableHead className="text-muted-foreground py-5 text-[10px] font-bold tracking-widest uppercase">
                        Dispute Details
                      </TableHead>
                      <TableHead className="text-muted-foreground py-5 text-[10px] font-bold tracking-widest uppercase">
                        Stake Amount
                      </TableHead>
                      <TableHead className="text-muted-foreground py-5 text-[10px] font-bold tracking-widest uppercase">
                        Status
                      </TableHead>
                      <TableHead className="text-muted-foreground py-5 pr-8 text-right text-[10px] font-bold tracking-widest uppercase">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCases.map((c) => (
                      <TableRow
                        key={c.id}
                        className="group hover:bg-muted/30 border-border transition-colors"
                      >
                        <TableCell className="text-muted-foreground py-6 pl-8 font-mono text-xs">
                          {c.id}
                          <div className="text-muted-foreground/70 mt-1 text-[10px]">
                            Escrow: {c.escrowId}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-foreground font-medium">{c.title}</div>
                            <div className="text-muted-foreground flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="px-2 py-0 text-[10px]">
                                Raised by: {getRaisedByLabel(c.raisedBy)}
                              </Badge>
                              <span>•</span>
                              <span>
                                {c.assignedArbitrators}/{c.requiredArbitratorCount} arbitrators
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground font-medium">
                          {c.stakeAmount.toLocaleString()} ADA
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-1.5 w-1.5 rounded-full ${getStatusColor(c.status)}`}
                            />
                            <span className="text-muted-foreground text-xs font-medium">
                              {getStatusLabel(c.status)}
                            </span>
                          </div>
                          <div className="text-muted-foreground/70 mt-1 text-[10px]">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="pr-8 text-right">
                          <div className="flex flex-col justify-end gap-2 sm:flex-row">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 gap-2 transition-all"
                              onClick={() => handleViewCase(c)}
                            >
                              <Eye className="h-3.5 w-3.5" /> Details
                            </Button>

                            {["ASSIGNED", "IN_REVIEW"].includes(c.status) && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-9 gap-2 transition-all"
                                  onClick={() => handleVote(c.id, "RELEASE")}
                                >
                                  <Vote className="h-3.5 w-3.5" /> Vote Release
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-9 gap-2 transition-all"
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
          <div className="animate-in fade-in zoom-in-95 mx-auto max-w-3xl space-y-10 py-12 text-center duration-700">
            <div className="relative inline-flex">
              <div className="bg-muted absolute inset-0 animate-pulse rounded-full opacity-50 blur-2xl" />
              <div className="bg-card border-border relative flex h-24 w-24 items-center justify-center rounded-full border shadow-sm">
                <Gavel className="text-foreground h-10 w-10" />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-foreground text-4xl font-semibold tracking-tight">
                Arbitrator Registration
              </h2>
              <p className="text-muted-foreground mx-auto max-w-xl text-lg leading-relaxed">
                Join our decentralized arbitration panel. Earn rewards by resolving disputes while
                maintaining ecosystem integrity. {REQUIRED_STAKE_AMOUNT} ADA stake required.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-6 pt-6 sm:flex-row">
              <RegisterSheet onRegister={handleRegister} />
              <Button
                variant="link"
                className="text-muted-foreground hover:text-foreground gap-2 text-[10px] font-bold tracking-widest uppercase"
              >
                Read Arbitration Rules <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-12 pt-16 md:grid-cols-3">
              {[
                {
                  title: "Stake Required",
                  desc: `Secure ${REQUIRED_STAKE_AMOUNT} ADA stake ensures arbitrator accountability`,
                  icon: <Coins className="h-5 w-5" />,
                },
                {
                  title: "Earn Rewards",
                  desc: "Receive ADA rewards for correct rulings and active participation",
                  icon: <TrendingUp className="h-5 w-5" />,
                },
                {
                  title: "Risk of Slashing",
                  desc: "Incorrect rulings may result in stake slashing",
                  icon: <AlertTriangle className="h-5 w-5" />,
                },
              ].map((item, i) => (
                <div key={i} className="space-y-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary rounded-lg p-2">{item.icon}</div>
                    <div className="text-muted-foreground text-[10px] font-black tracking-[0.2em] uppercase">
                      0{i + 1}
                    </div>
                  </div>
                  <h4 className="text-foreground font-semibold">{item.title}</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Case Details Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-semibold">Case Details</h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCase(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-muted-foreground text-sm">Case ID</label>
                  <p className="font-mono">{selectedCase.id}</p>
                </div>

                <div>
                  <label className="text-muted-foreground text-sm">Escrow ID</label>
                  <p className="font-mono">{selectedCase.escrowId}</p>
                </div>

                <div>
                  <label className="text-muted-foreground text-sm">Title</label>
                  <p className="font-medium">{selectedCase.title}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-muted-foreground text-sm">Stake Amount</label>
                    <p className="font-medium">{selectedCase.stakeAmount.toLocaleString()} ADA</p>
                  </div>
                  <div>
                    <label className="text-muted-foreground text-sm">Status</label>
                    <Badge className={getStatusColor(selectedCase.status)}>
                      {getStatusLabel(selectedCase.status)}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-muted-foreground text-sm">Raised By</label>
                    <p>{getRaisedByLabel(selectedCase.raisedBy)}</p>
                  </div>
                  <div>
                    <label className="text-muted-foreground text-sm">Arbitrators</label>
                    <p>
                      {selectedCase.assignedArbitrators}/{selectedCase.requiredArbitratorCount}{" "}
                      assigned
                    </p>
                  </div>
                </div>

                {selectedCase.evidence && (
                  <div>
                    <label className="text-muted-foreground text-sm">Evidence</label>
                    <p className="text-sm">{selectedCase.evidence}</p>
                  </div>
                )}

                <div>
                  <label className="text-muted-foreground text-sm">Created</label>
                  <p>{new Date(selectedCase.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t pt-6">
                {["ASSIGNED", "IN_REVIEW"].includes(selectedCase.status) && (
                  <>
                    <Button
                      onClick={() => {
                        handleVote(selectedCase.id, "RELEASE");
                        setSelectedCase(null);
                      }}
                    >
                      Vote Release
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleVote(selectedCase.id, "REFUND");
                        setSelectedCase(null);
                      }}
                    >
                      Vote Refund
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => setSelectedCase(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
