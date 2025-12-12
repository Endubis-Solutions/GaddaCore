"use client";

import { useState, useEffect, useMemo } from "react";
import { deserializeAddress, mConStr0, mConStr1, mConStr2 } from "@meshsdk/core";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import FloatingDebugJson from "@/components/custom/DebugJson";
import HeroSection from "./_components/HeroSection";
import { getScript, getTxBuilder, getUtxoByTxHash } from "@/lib/aiken";
import {
  Shield,
  Lock,
  CheckCircle,
  Clock,
  Plus,
  Wallet,
  AlertCircle,
  User,
  Rocket,
  Hourglass,
  FileText,
} from "lucide-react";
import { useWalletContext } from "@/contexts/WalletContext";
import { EscrowTransaction } from "@/types";
import { lovelaceToAda, formatAddress } from "@/utils";
import QrCodeDialog from "./_components/QrCodeDialog";
import { useUpsertUserMutation } from "@/services/user.service";
import { Spinner } from "@/components/ui/spinner";
// import CreateEscrow from "./_components/CreateEscrow";
import { useGetUsersEscrowQuery } from "@/services/escrow.service";
import StakeDialog from "./_components/RecipientStakingDialog";
import { RECIPIENT_STAKE_AMOUNT } from "@/constants";

// Transaction Row Component
interface TransactionRowProps {
  transaction: EscrowTransaction;
  role: "funder" | "recipient";
  onApprove: (tx: EscrowTransaction) => void;
  onDispute: (tx: EscrowTransaction) => void;
  onResolve: (tx: EscrowTransaction, resolution: "release" | "refund") => void;
  onAcceptWithStake: (tx: EscrowTransaction) => void;
  onSubmitEvidence: (tx: EscrowTransaction, who: "funder" | "recipient") => void;
  isLoading: boolean;
}

function TransactionRow({
  transaction,
  role,
  onApprove,
  onDispute,
  onResolve,
  onAcceptWithStake,
  onSubmitEvidence,
  isLoading,
}: TransactionRowProps) {
  const isRecipientAction = role === "recipient";
  const isFunderAction = role === "funder";

  const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    AWAITING_RECIPIENT: { label: "Pending Acceptance", color: "bg-yellow-100 text-yellow-800", icon: <Hourglass className="h-3 w-3" /> },
    ACTIVE: { label: "In Progress", color: "bg-blue-100 text-blue-800", icon: <Rocket className="h-3 w-3" /> },
    DISPUTED: { label: "Disputed", color: "bg-red-100 text-red-800", icon: <AlertCircle className="h-3 w-3" /> },
    APPROVED: { label: "Completed", color: "bg-green-100 text-green-800", icon: <CheckCircle className="h-3 w-3" /> },
    RESOLVED: { label: "Resolved", color: "bg-purple-100 text-purple-800", icon: <FileText className="h-3 w-3" /> },
  };

  const statusInfo = statusMap[transaction.status] || { label: transaction.status, color: "bg-gray-100 text-gray-800", icon: <Clock className="h-3 w-3" /> };

  return (
    <TableRow>
      <TableCell className="font-mono text-sm w-48">
        <a
          href={`https://preprod.cardanoscan.io/transaction/${transaction.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:underline"
        >
          {formatAddress(transaction.txHash, 6, 6)}
        </a>
      </TableCell>
      <TableCell className="font-medium">{transaction.amountAda.toFixed(2)} ADA</TableCell>
      <TableCell className="font-mono text-sm w-40">
        {formatAddress(transaction.recipientAddress, 6, 4)}
      </TableCell>
      <TableCell>
        <Badge className={`flex items-center gap-1 ${statusInfo.color}`}>
          {statusInfo.icon}
          {statusInfo.label}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm w-32">
        {transaction.disputeDeadline && new Date(transaction.disputeDeadline).toLocaleDateString()}
      </TableCell>
      <TableCell className="w-64">
        <div className="flex items-center gap-2 flex-wrap">
          <QrCodeDialog transaction={transaction} />

          {transaction.status === "AWAITING_RECIPIENT" && isRecipientAction && (
            <StakeDialog transaction={transaction} onSuccess={() => {
              alert("Staking done")
            }} >
              <Button size="sm" disabled={isLoading}>
                <Plus className="mr-1 h-3 w-3" />
                Stake {RECIPIENT_STAKE_AMOUNT} ADA
              </Button>
            </StakeDialog>
          )}


          {["AWAITING_RECIPIENT", "ACTIVE"].includes(transaction.status) && isFunderAction && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onApprove(transaction)}
                disabled={isLoading}
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDispute(transaction)}
                disabled={isLoading}
              >
                <AlertCircle className="mr-1 h-3 w-3" />
                Dispute
              </Button>
            </>
          )}

          {transaction.status === "ACTIVE" && isRecipientAction && (
            <Button variant="outline" size="sm" onClick={() => onDispute(transaction)} disabled={isLoading}>
              <AlertCircle className="mr-1 h-3 w-3" />
              Dispute Work
            </Button>
          )}

          {transaction.status === "DISPUTED" && (
            <Button size="sm" onClick={() => onSubmitEvidence(transaction, isFunderAction ? "funder" : "recipient")} disabled={isLoading}>
              Submit Evidence
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// Stat Card Component
function StatCard({ title, value, description, icon }: { title: string; value: string; description: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-muted-foreground text-xs">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { connected, wallet, changeAddress, collateral, refreshBalance, balance } = useWalletContext();
  const upsertUserMutation = useUpsertUserMutation();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { data, isLoading: escrowsLoading } = useGetUsersEscrowQuery(changeAddress);

  const escrows = useMemo(() => data || [], [data]);

  useEffect(() => {
    if (connected && changeAddress) {
      upsertUserMutation.mutate({ role: "USER", walletAddress: changeAddress });
    }
  }, [connected, changeAddress]);

  // Split escrows by user role
  const pendingForRecipient = escrows.filter(
    (tx) => tx.status === "AWAITING_RECIPIENT" && tx.recipientAddress === changeAddress
  );
  const fundedByMe = escrows.filter(
    (tx) => ["AWAITING_RECIPIENT", "ACTIVE", "DISPUTED"].includes(tx.status) && tx.funderAddress === changeAddress
  );
  const disputed = escrows.filter((tx) => tx.status === "DISPUTED");
  const history = escrows;

  // Stats
  const stats = {
    totalLocked: fundedByMe.reduce((sum, t) => sum + t.amountAda, 0),
    awaitingAcceptance: pendingForRecipient.length,
    myActiveEscrows: fundedByMe.filter((t) => t.status === "ACTIVE").length,
    disputedCount: disputed.length,
  };

  // === ACTION HANDLERS ===
  const approveAction = async (transaction: EscrowTransaction) => {
    if (!changeAddress || !wallet || !collateral?.length) {
      alert("Wallet or collateral missing");
      return;
    }
    setIsLoading(true);
    try {
      const utxos = await wallet.getUtxos();
      const { scriptCbor } = getScript();
      const funderHash = deserializeAddress(changeAddress).pubKeyHash;
      const scriptUtxo = await getUtxoByTxHash(transaction.txHash);
      if (!scriptUtxo.output.plutusData) throw new Error("No plutus data");

      const txBuilder = getTxBuilder();
      await txBuilder
        .spendingPlutusScript("V3")
        .txIn(scriptUtxo.input.txHash, scriptUtxo.input.outputIndex, scriptUtxo.output.amount, scriptUtxo.output.address)
        .spendingReferenceTxInInlineDatumPresent()
        .txInScript(scriptCbor)
        .txInRedeemerValue(mConStr0([]))
        .txOut(transaction.recipientAddress, scriptUtxo.output.amount)
        .txInCollateral(collateral[0].input.txHash, collateral[0].input.outputIndex, collateral[0].output.amount, collateral[0].output.address)
        .requiredSignerHash(funderHash)
        .changeAddress(changeAddress)
        .selectUtxosFrom(utxos)
        .complete();

      const txHash = await wallet.submitTx(await wallet.signTx(txBuilder.txHex));
      alert(`✅ Approved! Tx: ${txHash}`);
      await refreshBalance();
    } catch (error) {
      alert("❌ Approve failed: " + (error instanceof Error ? error.message : "Unknown"));
    } finally {
      setIsLoading(false);
    }
  };

  const raiseDispute = async (transaction: EscrowTransaction) => {
    if (!changeAddress || !wallet || !collateral?.length) {
      alert("Wallet or collateral missing");
      return;
    }
    setIsLoading(true);
    try {
      const utxos = await wallet.getUtxos();
      const { scriptCbor } = getScript();
      const userHash = deserializeAddress(changeAddress).pubKeyHash;
      const scriptUtxo = await getUtxoByTxHash(transaction.txHash);

      const txBuilder = getTxBuilder();
      await txBuilder
        .spendingPlutusScript("V3")
        .txIn(scriptUtxo.input.txHash, scriptUtxo.input.outputIndex, scriptUtxo.output.amount, scriptUtxo.output.address)
        .spendingReferenceTxInInlineDatumPresent()
        .txInScript(scriptCbor)
        .txInRedeemerValue(mConStr1([]))
        .txInCollateral(collateral[0].input.txHash, collateral[0].input.outputIndex, collateral[0].output.amount, collateral[0].output.address)
        .requiredSignerHash(userHash)
        .changeAddress(changeAddress)
        .selectUtxosFrom(utxos)
        .complete();

      const txHash = await wallet.submitTx(await wallet.signTx(txBuilder.txHex));
      alert(`⚠️ Dispute raised! Tx: ${txHash}`);
    } catch (error) {
      alert("❌ Dispute failed: " + (error instanceof Error ? error.message : "Unknown"));
    } finally {
      setIsLoading(false);
    }
  };

  const resolveDispute = async (transaction: EscrowTransaction, resolution: "release" | "refund") => {
    // Implementation same as before (omitted for brevity)
  };

  const acceptWithStake = async (transaction: EscrowTransaction) => {
    // Fixed: Stake 5 ADA (5_000_000 lovelace) as per your contract
    const STAKE_AMOUNT = 5_000_000;
    if (!changeAddress || !wallet || !collateral?.length) {
      alert("Wallet or collateral missing");
      return;
    }
    setIsLoading(true);
    try {
      const utxos = await wallet.getUtxos();
      const { scriptCbor } = getScript();
      const recipientHash = deserializeAddress(changeAddress).pubKeyHash;
      const scriptUtxo = await getUtxoByTxHash(transaction.txHash);

      const stakeMValue = mConStr0([mConStr0(["", mConStr0([["", BigInt(STAKE_AMOUNT)]])])]);
      const redeemer = mConStr1([stakeMValue]);

      const txBuilder = getTxBuilder();
      await txBuilder
        .spendingPlutusScript("V3")
        .txIn(scriptUtxo.input.txHash, scriptUtxo.input.outputIndex, scriptUtxo.output.amount, scriptUtxo.output.address)
        .spendingReferenceTxInInlineDatumPresent()
        .txInScript(scriptCbor)
        .txInRedeemerValue(redeemer)
        .txOut(scriptUtxo.output.address, [{ unit: "lovelace", quantity: STAKE_AMOUNT.toString() }])
        .txInCollateral(collateral[0].input.txHash, collateral[0].input.outputIndex, collateral[0].output.amount, collateral[0].output.address)
        .requiredSignerHash(recipientHash)
        .changeAddress(changeAddress)
        .selectUtxosFrom(utxos)
        .complete();

      const txHash = await wallet.submitTx(await wallet.signTx(txBuilder.txHex));
      alert(`✅ Staked 5 ADA! Tx: ${txHash}`);
    } catch (error) {
      alert("❌ Accept failed: " + (error instanceof Error ? error.message : "Unknown"));
    } finally {
      setIsLoading(false);
    }
  };

  const submitEvidence = (tx: EscrowTransaction, who: "funder" | "recipient") => {
    alert(`Evidence submission for ${who} not implemented yet`);
  };

  if (!connected) return <HeroSection />;
  if (escrowsLoading || upsertUserMutation.isPending) return <Spinner className="size-20 m-auto mt-20" />;

  return (
    <main className="min-h-screen bg-background px-4">
      <FloatingDebugJson data={{ escrows, changeAddress }} />

      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <StatCard
            title="Total Locked"
            value={`${stats.totalLocked.toFixed(2)} ADA`}
            description="Funded by you"
            icon={<Lock className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="Pending Acceptance"
            value={stats.awaitingAcceptance.toString()}
            description="Waiting for your stake"
            icon={<User className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="Active Projects"
            value={stats.myActiveEscrows.toString()}
            description="In progress"
            icon={<Rocket className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="Your Balance"
            value={`${balance.toFixed(2)} ADA`}
            description="Available to use"
            icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Dashboard</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Pending Recipient Acceptance */}
            {pendingForRecipient.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-600">
                    <User className="h-5 w-5" />
                    Pending Your Acceptance
                  </CardTitle>
                  <CardDescription>
                    You’ve been invited to join these projects. Stake 5 ADA to accept.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>TX ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Funder</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingForRecipient.map((tx) => (
                        <TransactionRow
                          key={tx.id}
                          transaction={tx}
                          role="recipient"
                          onApprove={approveAction}
                          onDispute={raiseDispute}
                          onResolve={resolveDispute}
                          onAcceptWithStake={acceptWithStake}
                          onSubmitEvidence={submitEvidence}
                          isLoading={isLoading}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Funded by Me */}
            {fundedByMe.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Your Funded Escrows
                  </CardTitle>
                  <CardDescription>Projects you’ve funded. Approve work or raise disputes.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>TX ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fundedByMe.map((tx) => (
                        <TransactionRow
                          key={tx.id}
                          transaction={tx}
                          role="funder"
                          onApprove={approveAction}
                          onDispute={raiseDispute}
                          onResolve={resolveDispute}
                          onAcceptWithStake={acceptWithStake}
                          onSubmitEvidence={submitEvidence}
                          isLoading={isLoading}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {pendingForRecipient.length === 0 && fundedByMe.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No active escrows yet</p>
                  <Button onClick={() => setActiveTab("create")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Escrow
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Full Transaction History</CardTitle>
                <CardDescription>All escrows involving your wallet</CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No history yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>TX ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Counterparty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="font-mono text-sm">
                            {formatAddress(tx.txHash, 6, 6)}
                          </TableCell>
                          <TableCell>{tx.amountAda.toFixed(2)} ADA</TableCell>
                          <TableCell className="font-mono text-sm">
                            {tx.funderAddress === changeAddress
                              ? formatAddress(tx.recipientAddress, 6, 4)
                              : formatAddress(tx.funderAddress, 6, 4)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {tx.status.replace("_", " ").toLowerCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{tx.disputeDeadline && new Date(tx.disputeDeadline).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {tx.funderAddress === changeAddress ? "Funder" : "Recipient"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}