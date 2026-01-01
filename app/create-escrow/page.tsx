"use client"

import { useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import {
    Loader2,
    ArrowRight,
    ShieldCheck,
    CheckCircle2,
    Info,
    HelpCircle,
    Calendar as CalendarIconSmall,
    DollarSign,
    UserPenIcon,
    AlertCircle
} from "lucide-react"
import { Asset } from "@meshsdk/core"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"

import { useWalletContext } from "@/contexts/WalletContext"
import { getScript, getTxBuilder } from "@/lib/aiken"
import { hashToByteArray } from "@/lib/utils"
import { adaToLovelace } from "@/utils"
import { getErrMsg, initiateEscrowDatum } from "@/utils/aiken"
import { ContractUploader } from "@/components/custom/ContractUploader"
import PersistentText from "@/components/custom/PersistentText"
import FloatingDebugJson from "@/components/custom/DebugJson"

const escrowFormSchema = z.object({
    amount: z.number({
        error: "Amount is required",
    }).min(1, "Minimum 1 ADA required"),
    recipientAddress: z.string().min(10, "Please enter a valid wallet address"),
    deadlineDate: z.date({
        error: "Expiration date is required"
    }),
    ipfsUrl: z.string().min(1, "Document upload is required to verify terms"),
})

type EscrowFormValues = z.infer<typeof escrowFormSchema>

export default function InitiateEscrowPage() {
    const { changeAddress, wallet, refreshBalance } = useWalletContext()

    const [isPending, setIsPending] = useState(false)
    const [txHash, setTxHash] = useState("")
    const [documentFile, setDocumentFile] = useState<File | null>(null)

    const form = useForm<EscrowFormValues>({
        resolver: zodResolver(escrowFormSchema),
        defaultValues: { amount: 0, recipientAddress: "", deadlineDate: undefined, ipfsUrl: "" },
    })

    const handleFileChange = useCallback((file: File | null) => setDocumentFile(file), [])

    const handleUploadSuccess = useCallback((hash: string) => {
        form.setValue("ipfsUrl", hash, { shouldValidate: true })
    }, [form])

    async function onSubmit(values: EscrowFormValues) {
        const walletAddress = changeAddress;
        if (!walletAddress) return alert("Please connect your wallet first.");

        try {
            setIsPending(true)
            const escrowAmount: Asset[] = [{ unit: "lovelace", quantity: adaToLovelace(values.amount).toString() }]
            const utxos = await wallet.getUtxos()
            const { scriptAddr } = getScript()
            const txBuilder = getTxBuilder()
            const contractIpfsHash = hashToByteArray(values.ipfsUrl)

            const initiationDatum = initiateEscrowDatum(
                walletAddress, escrowAmount, values.recipientAddress, values.deadlineDate.getTime(), contractIpfsHash
            )

            await txBuilder
                .txOut(scriptAddr, escrowAmount)
                .txOutInlineDatumValue(initiationDatum, "JSON")
                .changeAddress(walletAddress)
                .selectUtxosFrom(utxos)
                .complete()

            const signedTx = await wallet.signTx(txBuilder.txHex, undefined, true)
            const newTxHash = await wallet.submitTx(signedTx)
            await refreshBalance()
            setTxHash(newTxHash)
        } catch (error) {
            console.error(error)
            alert(getErrMsg(error))
        } finally {
            setIsPending(false)
        }
    }

    return (
        <div className="min-h-screen bg-white py-12 px-6">
            <div className="max-w-6xl mx-auto">

                <FloatingDebugJson data={{ formData: form.getValues() }} />

                {/* Header */}
                <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-primary/80 mb-1">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-[0.2em]">Escrow Protocol</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">New Agreement</h1>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-zinc-500 hover:bg-zinc-100 transition-colors">
                                        <HelpCircle className="h-5 w-5" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-5 shadow-2xl border-zinc-100" align="start">
                                    <div className="space-y-3">
                                        <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                                            <Info className="h-4 w-4 text-primary" />
                                            System Guide
                                        </h3>
                                        <div className="text-sm text-zinc-600 space-y-3 leading-relaxed">
                                            <p>This creates a secure vault on the blockchain that only releases funds when the terms are met or the time expires.</p>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </header>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-20">

                        {/* LEFT COLUMN */}
                        <div className="lg:col-span-6 space-y-10">
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-8">
                                    {/* Amount Field */}
                                    <FormField
                                        control={form.control}
                                        name="amount"
                                        render={({ field, fieldState }) => (
                                            <FormItem>
                                                <FormLabel className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Amount (ADA)</FormLabel>
                                                <div className="relative group">
                                                    <DollarSign className="absolute left-1 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-primary transition-colors" strokeWidth={1.5} />
                                                    <FormControl>
                                                        <Input type="number" placeholder="0.00" {...field}
                                                            onChange={e => field.onChange(e.target.valueAsNumber || 0)}
                                                            className="border-0 border-b border-zinc-300 rounded-none pl-[34px] h-12 focus-visible:ring-0 focus-visible:border-primary text-lg! transition-all placeholder:text-zinc-200" />
                                                    </FormControl>
                                                </div>
                                                {fieldState.error?.message}
                                                <FormMessage className="text-[11px] font-medium pt-1 text-red-500" />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Expiration Field */}
                                    <FormField
                                        control={form.control}
                                        name="deadlineDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Expiration</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <div className="relative group cursor-pointer">
                                                            <CalendarIconSmall className="absolute left-1 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-hover:text-primary transition-colors" strokeWidth={1.5} />
                                                            <FormControl>
                                                                <Button variant="ghost" className="w-full justify-start border-b border-zinc-300 rounded-none pl-8 pr-0 h-12 hover:bg-transparent text-lg! font-normal">
                                                                    {field.value ? format(field.value, "PP") : <span className="text-zinc-200">Select Date</span>}
                                                                </Button>
                                                            </FormControl>
                                                        </div>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 border-zinc-100 shadow-2xl" align="end">
                                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(d) => d < new Date()} />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage className="text-[11px] font-medium pt-1 text-red-500" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Recipient Field */}
                                <FormField
                                    control={form.control}
                                    name="recipientAddress"
                                    render={({ field, fieldState }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Recipient Address</FormLabel>
                                            <div className="relative group">
                                                <UserPenIcon className="absolute left-1 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-primary transition-colors" strokeWidth={1.5} />
                                                <FormControl>
                                                    <Input placeholder="addr_test..." {...field} className="border-0 border-b border-zinc-300 rounded-none pl-[34px] h-12 focus-visible:ring-0 focus-visible:border-primary font-mono text-lg! placeholder:text-zinc-200" />
                                                </FormControl>
                                            </div>
                                            {fieldState.error?.message}
                                            <FormMessage className="text-[11px] font-medium pt-1 text-red-500" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Success State */}
                            {txHash && (
                                <div className="p-8 bg-zinc-50/80 border border-zinc-100 rounded-2xl animate-in fade-in slide-in-from-bottom-3 duration-700">
                                    <div className="flex items-center gap-2 text-emerald-600 mb-6">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Transaction Broadcasted</span>
                                    </div>
                                    <PersistentText
                                        data={txHash}
                                        storageKey="funderDepositTxHash"
                                        label="Agreement ID"
                                        description="The permanent blockchain identifier for this escrow transaction."
                                    />
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="lg:col-span-6">
                            <div className="space-y-4">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Legal Reference</h2>
                                <div className="space-y-2">
                                    <ContractUploader
                                        onUploadSuccess={handleUploadSuccess}
                                        onFileChange={handleFileChange}
                                        currentFile={documentFile}
                                        ipfsHash={form.watch("ipfsUrl")}
                                        uniqueId={"contractDocument"}
                                        withLabel={false}
                                    />
                                    {/* Specific Error for File Upload */}
                                    {form.formState.errors.ipfsUrl && (
                                        <div className="flex items-center gap-1.5 text-red-500 mt-2">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            <p className="text-[11px] font-medium tracking-wide">
                                                {form.formState.errors.ipfsUrl.message}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-12">
                                <Button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full h-14 text-lg font-medium transition-all active:scale-[0.98] disabled:opacity-30"
                                >
                                    {isPending ? (
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span className="tracking-tight">Verifying & Sending...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span>Secure Agreement</span>
                                            <ArrowRight className="h-5 w-5" />
                                        </div>
                                    )}
                                </Button>
                                <p className="text-[10px] text-zinc-400 text-center mt-6 uppercase tracking-[0.15em] font-bold">
                                    Secured by Cardano Smart Contracts
                                </p>
                            </div>
                        </div>

                    </form>
                </Form>
            </div>
        </div>
    )
}