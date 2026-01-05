"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Loader2,
  ArrowRight,
  ShieldCheck,
  Info,
  HelpCircle,
  Calendar as CalendarIconSmall,
  DollarSign,
  UserPenIcon,
  AlertCircle,
} from "lucide-react";
import { Asset } from "@meshsdk/core";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { useWalletContext } from "@/contexts/WalletContext";
import { getScript, getTxBuilder } from "@/lib/aiken";
import { hashToByteArray } from "@/lib/utils";
import { adaToLovelace } from "@/utils";
import { getErrMsg, initiateEscrowDatum, stringifyPlutusData } from "@/utils/aiken";
import { ContractUploader } from "@/components/custom/ContractUploader";
import PersistentText from "@/components/custom/PersistentText";
import { useNewPaymentMutation } from "@/services/escrow.service";
import { toast } from "sonner";

const escrowFormSchema = z.object({
  amount: z
    .number({
      error: "Amount is required",
    })
    .min(1, "Minimum 1 ADA required"),
  recipientAddress: z.string().min(10, "Please enter a valid wallet address"),
  deadlineDate: z.date({
    error: "Expiration date is required",
  }),
  ipfsUrl: z.string().min(1, "Document upload is required to verify terms"),
});

type EscrowFormValues = z.infer<typeof escrowFormSchema>;

export default function InitiateEscrowPage() {
  const { changeAddress, wallet, refreshBalance } = useWalletContext();
  const newPaymentMutation = useNewPaymentMutation();

  const [isPending, setIsPending] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const form = useForm<EscrowFormValues>({
    resolver: zodResolver(escrowFormSchema),
    defaultValues: { amount: 0, recipientAddress: "", deadlineDate: undefined, ipfsUrl: "" },
  });

  const handleFileChange = useCallback((file: File | null) => setDocumentFile(file), []);

  const handleUploadSuccess = useCallback(
    (hash: string) => {
      form.setValue("ipfsUrl", hash, { shouldValidate: true });
    },
    [form]
  );

  async function onSubmit(values: EscrowFormValues) {
    const walletAddress = changeAddress;
    if (!walletAddress) return alert("Please connect your wallet first.");

    try {
      setIsPending(true);
      const escrowAmount: Asset[] = [
        { unit: "lovelace", quantity: adaToLovelace(values.amount).toString() },
      ];
      const utxos = await wallet.getUtxos();
      const { scriptAddr } = getScript();
      const txBuilder = getTxBuilder();
      const contractIpfsHash = hashToByteArray(values.ipfsUrl);

      const initiationDatum = initiateEscrowDatum(
        walletAddress,
        escrowAmount,
        values.recipientAddress,
        values.deadlineDate.getTime(),
        contractIpfsHash
      );

      await txBuilder
        .txOut(scriptAddr, escrowAmount)
        .txOutInlineDatumValue(initiationDatum, "JSON")
        .changeAddress(walletAddress)
        .selectUtxosFrom(utxos)
        .complete();

      const signedTx = await wallet.signTx(txBuilder.txHex, undefined, true);
      const newTxHash = await wallet.submitTx(signedTx);
      newPaymentMutation.mutate({
        funderAddress: walletAddress,
        recipientAddress: values.recipientAddress,
        funderStakeInAda: values.amount,
        scriptAddress: scriptAddr,
        contractIpfsHash: contractIpfsHash,
        recipientLockDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
        submissionDeadline: values.deadlineDate,

        transaction: {
          txHash: newTxHash,
          datum: stringifyPlutusData(initiationDatum),
        },
      });

      await refreshBalance();
      setTxHash(newTxHash);
    } catch (error) {
      const errMsg = getErrMsg(error);
      toast.error(errMsg);
    } finally {
      setIsPending(false);
    }
  }

  useEffect(() => {
    if (newPaymentMutation.isSuccess) {
      toast.success("Payment initiated successfully");
      form.reset();
    } else if (newPaymentMutation.isError) {
      const errMsg = getErrMsg(newPaymentMutation.error);
      toast.error(errMsg);
    }
  }, [newPaymentMutation.isError, newPaymentMutation.error, newPaymentMutation.isSuccess, form]);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-white px-6 py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-16 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="space-y-1">
            <div className="text-primary/80 mb-1 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-bold tracking-[0.2em] uppercase">Escrow Protocol</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">New Agreement</h1>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-zinc-500 transition-colors hover:bg-zinc-100"
                  >
                    <HelpCircle className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 border-zinc-100 p-5 shadow-2xl" align="start">
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 font-bold text-zinc-900">
                      <Info className="text-primary h-4 w-4" />
                      System Guide
                    </h3>
                    <div className="space-y-3 text-sm leading-relaxed text-zinc-600">
                      <p>
                        This creates a secure vault on the blockchain that only releases funds when
                        the terms are met or the time expires.
                      </p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </header>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 gap-20 lg:grid-cols-12"
          >
            {/* LEFT COLUMN */}
            <div className="space-y-10 lg:col-span-6">
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  {/* Amount Field */}
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                          Amount (ADA)
                        </FormLabel>
                        <div className="group relative">
                          <DollarSign
                            className="group-focus-within:text-primary absolute top-1/2 left-1 h-5 w-5 -translate-y-1/2 text-zinc-400 transition-colors"
                            strokeWidth={1.5}
                          />
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                              className="focus-visible:border-primary h-12 rounded-none border-0 border-b border-zinc-300 bg-zinc-50/10 pl-[34px] text-lg! shadow-none transition-all placeholder:text-zinc-200 focus-visible:ring-0"
                            />
                          </FormControl>
                        </div>
                        {fieldState.error?.message}
                        <FormMessage className="pt-1 text-[11px] font-medium text-red-500" />
                      </FormItem>
                    )}
                  />

                  {/* Expiration Field */}
                  <FormField
                    control={form.control}
                    name="deadlineDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                          Task Deadline
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="group relative cursor-pointer">
                              <CalendarIconSmall
                                className="group-hover:text-primary absolute top-1/2 left-1 h-5 w-5 -translate-y-1/2 text-zinc-400 transition-colors"
                                strokeWidth={1.5}
                              />
                              <FormControl>
                                <Button
                                  variant="ghost"
                                  type="button"
                                  className="h-12 w-full justify-start rounded-none border-b border-zinc-300 bg-zinc-50/10 pr-0 pl-8 text-lg! font-normal hover:bg-transparent"
                                >
                                  {field.value ? (
                                    format(field.value, "PP")
                                  ) : (
                                    <span className="text-base text-zinc-200">Select Date</span>
                                  )}
                                </Button>
                              </FormControl>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto border-zinc-100 p-0 shadow-2xl"
                            align="end"
                          >
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(d) => d < new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage className="pt-1 text-[11px] font-medium text-red-500" />
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
                      <FormLabel className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                        Recipient Address
                      </FormLabel>
                      <div className="group relative">
                        <UserPenIcon
                          className="group-focus-within:text-primary absolute top-1/2 left-1 h-5 w-5 -translate-y-1/2 text-zinc-400 transition-colors"
                          strokeWidth={1.5}
                        />
                        <FormControl>
                          <Input
                            placeholder="addr_test..."
                            {...field}
                            className="focus-visible:border-primary h-12 rounded-none border-0 border-b border-zinc-300 bg-zinc-50/10 pl-[34px] font-mono text-lg! shadow-none placeholder:text-zinc-200 focus-visible:ring-0"
                          />
                        </FormControl>
                      </div>
                      {fieldState.error?.message}
                      <FormMessage className="pt-1 text-[11px] font-medium text-red-500" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Success State */}
              {txHash && (
                <PersistentText
                  data={txHash}
                  storageKey="funderDepositTxHash"
                  label="Transaction Hash"
                  description="The permanent blockchain identifier for this escrow transaction."
                />
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-6">
              <div className="space-y-4">
                <h2 className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase">
                  Legal Reference
                </h2>
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
                    <div className="mt-2 flex items-center gap-1.5 text-red-500">
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
                  disabled={isPending || newPaymentMutation.isPending}
                  loading={isPending || newPaymentMutation.isPending}
                  className="h-14 w-full text-lg font-medium transition-all active:scale-[0.98] disabled:opacity-30"
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
                <p className="mt-6 text-center text-[10px] font-bold tracking-[0.15em] text-zinc-400 uppercase">
                  Secured by Cardano Smart Contracts
                </p>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
