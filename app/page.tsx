"use client";

import { useState, useEffect } from "react";
import { deserializeAddress, mConStr0, mConStr1, mConStr2 } from "@meshsdk/core";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import FloatingDebugJson from "@/components/custom/DebugJson";
import HeroSection from "./_components/HeroSection";
import { getScript, getTxBuilder, getUtxoByTxHash } from "@/lib/aiken";
import AppHeader from "@/components/custom/AppHeader";
import { Shield, Lock, CheckCircle, Clock, Plus, Wallet, ExternalLink, AlertCircle } from "lucide-react";
import { useWalletContext } from "@/contexts/WalletContext";
import { EscrowTransaction } from "@/types";
import { formatAddress, getStatusColor, lovelaceToAda } from "@/utils";
import { getStatusIcon } from "@/components/utils";
import QrCodeDialog from "./_components/QrCodeDialog";
import useNow from "@/hooks/useNow";
import { useUpsertUserMutation } from "@/services/user.service";
import { Spinner } from "@/components/ui/spinner";
import CreateEscrow from "./_components/CreateEscrow";
import { useGetUsersEscrowQuery } from "@/services/escrow.service";

const recipientAddress = "addr_test1qqsdx4sacdr24285m8r3ndumqe8mmv3tkkngazqe22y0cjen2tgurprxyradk5qg6nnqgl3t05hur367jd086fg7u09qxgta0d";




// Transaction Row Component from demo
interface TransactionRowProps {
  transaction: EscrowTransaction;
  onApprove: (tx: EscrowTransaction) => void;
  onDispute: (tx: EscrowTransaction) => void;
  onResolve: (tx: EscrowTransaction, resolution: 'release' | 'refund') => void;
  isLoading: boolean;
}

function TransactionRow({ transaction, onApprove, onDispute, onResolve, isLoading }: TransactionRowProps) {
  const now = useNow()
  const daysRemaining = Math.ceil((transaction.disputeDeadline * 1000 - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <TableRow>
      <TableCell className="font-mono text-sm">
        <a
          href={`https://preprod.cardanoscan.io/transaction/${transaction.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:underline"
        >
          {formatAddress(transaction.txHash, 6, 6)}
          <ExternalLink className="h-3 w-3" />
        </a>
      </TableCell>
      <TableCell className="font-medium">{lovelaceToAda(transaction.amount).toFixed(2)} ADA</TableCell>
      <TableCell className="font-mono text-sm">{formatAddress(transaction.recipientAddress, 8, 6)}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`flex w-fit items-center gap-1 ${getStatusColor(transaction.status)}`}>
          {getStatusIcon(transaction.status)}
          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {daysRemaining > 0 ? `${daysRemaining} days` : "Expired"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <QrCodeDialog transaction={transaction} />
          {transaction.status === "active" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onApprove(transaction)}
                disabled={isLoading}
                className="h-8"
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDispute(transaction)}
                disabled={isLoading}
                className="h-8"
              >
                <AlertCircle className="mr-1 h-3 w-3" />
                Dispute
              </Button>
            </>
          )}
          {transaction.status === "disputed" && (
            <>
              <Button
                size="sm"
                onClick={() => onResolve(transaction, 'release')}
                disabled={isLoading}
                className="h-8"
              >
                Release
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResolve(transaction, 'refund')}
                disabled={isLoading}
                className="h-8"
              >
                Refund
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// Stat Card Component from demo
interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, description, icon }: StatCardProps) {
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
  const {
    connected,
    wallet,
    changeAddress,
    collateral,
    refreshBalance,
    refreshAddresses,
    balance
  } = useWalletContext();

  const upsertUserMutation = useUpsertUserMutation()

  const [isLoading, setIsLoading] = useState(false);
  const [lockAmount, setLockAmount] = useState("10");
  const [lockedFunds, setLockedFunds] = useState<EscrowTransaction[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const getUsersEscrowQuery = useGetUsersEscrowQuery(changeAddress)
  const escrows = getUsersEscrowQuery.data

  useEffect(() => {
    if (connected && changeAddress) {
      upsertUserMutation.mutate({
        role: "USER",
        walletAddress: changeAddress
      })
    }
  }, [connected, changeAddress])

  // Load locked funds from localStorage
  useEffect(() => {
    const savedLockedFunds = localStorage.getItem('trustseal_locked_funds');
    if (savedLockedFunds) {
      setLockedFunds(JSON.parse(savedLockedFunds));
    }
  }, []);

  // Save locked funds to localStorage
  useEffect(() => {
    localStorage.setItem('trustseal_locked_funds', JSON.stringify(lockedFunds));
  }, [lockedFunds]);

  // Computed statistics
  const stats = {
    totalLocked: lockedFunds.filter(t => t.status === 'active' || t.status === 'disputed').reduce((sum, t) => sum + t.amount, 0),
    activeCount: lockedFunds.filter(t => t.status === 'active').length,
    completedCount: lockedFunds.filter(t => t.status === 'approved' || t.status === 'resolved').length,
    disputedCount: lockedFunds.filter(t => t.status === 'disputed').length,
  };

  const approveAction = async (transaction: EscrowTransaction) => {
    if (!changeAddress || !wallet) {
      alert("Wallet not connected properly");
      return;
    }

    if (!collateral || collateral.length === 0) {
      alert("Please set up collateral in your wallet settings first");
      return;
    }

    setIsLoading(true);
    try {
      const utxos = await wallet.getUtxos();
      const { scriptCbor } = getScript();
      const funderHash = deserializeAddress(changeAddress).pubKeyHash;

      const scriptUtxo = await getUtxoByTxHash(transaction.txHash);

      if (!scriptUtxo.output.plutusData) {
        alert("No plutus data found in the UTXO");
        return;
      }

      const approveRedeemer = mConStr0([]);
      const collateralInput = collateral[0].input;
      const collateralOutput = collateral[0].output;

      const txBuilder = getTxBuilder();
      await txBuilder
        .spendingPlutusScript("V3")
        .txIn(
          scriptUtxo.input.txHash,
          scriptUtxo.input.outputIndex,
          scriptUtxo.output.amount,
          scriptUtxo.output.address
        )
        .spendingReferenceTxInInlineDatumPresent()
        .txInScript(scriptCbor)
        .txInRedeemerValue(approveRedeemer)
        .txOut(recipientAddress, scriptUtxo.output.amount)
        .txInCollateral(
          collateralInput.txHash,
          collateralInput.outputIndex,
          collateralOutput.amount,
          collateralOutput.address
        )
        .requiredSignerHash(funderHash)
        .changeAddress(changeAddress)
        .selectUtxosFrom(utxos)
        .complete();

      const unsignedTx = txBuilder.txHex;
      const signedTx = await wallet.signTx(unsignedTx);
      const txHash = await wallet.submitTx(signedTx);

      // Update transaction status
      setLockedFunds(prev => prev.map(tx =>
        tx.id === transaction.id ? { ...tx, status: 'approved' } : tx
      ));

      alert(`✅ Funds approved and released to recipient!\nTransaction: ${txHash}`);
      await refreshBalance();

    } catch (error) {
      console.error("Approve action failed:", error);
      alert("❌ Failed to approve: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const raiseDispute = async (transaction: EscrowTransaction) => {
    if (!changeAddress || !wallet) {
      alert("Wallet not connected properly");
      return;
    }

    if (!collateral || collateral.length === 0) {
      alert("Please set up collateral in your wallet settings first");
      return;
    }

    setIsLoading(true);
    try {
      const utxos = await wallet.getUtxos();
      const { scriptCbor } = getScript();
      const userHash = deserializeAddress(changeAddress).pubKeyHash;

      const scriptUtxo = await getUtxoByTxHash(transaction.txHash);

      const disputeRedeemer = mConStr1([]);
      const collateralInput = collateral[0].input;
      const collateralOutput = collateral[0].output;

      const txBuilder = getTxBuilder();
      await txBuilder
        .spendingPlutusScript("V3")
        .txIn(
          scriptUtxo.input.txHash,
          scriptUtxo.input.outputIndex,
          scriptUtxo.output.amount,
          scriptUtxo.output.address
        )
        .spendingReferenceTxInInlineDatumPresent()
        .txInScript(scriptCbor)
        .txInRedeemerValue(disputeRedeemer)
        .txInCollateral(
          collateralInput.txHash,
          collateralInput.outputIndex,
          collateralOutput.amount,
          collateralOutput.address
        )
        .requiredSignerHash(userHash)
        .changeAddress(changeAddress)
        .selectUtxosFrom(utxos)
        .complete();

      const unsignedTx = txBuilder.txHex;
      const signedTx = await wallet.signTx(unsignedTx);
      const txHash = await wallet.submitTx(signedTx);

      // Update transaction status
      setLockedFunds(prev => prev.map(tx =>
        tx.id === transaction.id ? { ...tx, status: 'disputed' } : tx
      ));

      alert(`⚠️ Dispute raised successfully!\nTransaction: ${txHash}`);

    } catch (error) {
      console.error("Raise dispute failed:", error);
      alert("❌ Failed to raise dispute: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const resolveDispute = async (transaction: EscrowTransaction, resolution: 'release' | 'refund') => {
    if (!changeAddress || !wallet) {
      alert("Wallet not connected properly");
      return;
    }

    if (!collateral || collateral.length === 0) {
      alert("Please set up collateral in your wallet settings first");
      return;
    }

    setIsLoading(true);
    try {
      const utxos = await wallet.getUtxos();
      const { scriptCbor } = getScript();
      const userHash = deserializeAddress(changeAddress).pubKeyHash;

      const scriptUtxo = await getUtxoByTxHash(transaction.txHash);

      const resolutionValue = resolution === 'release' ? mConStr0([]) : mConStr1([]);
      const resolveRedeemer = mConStr2([resolutionValue]);

      const collateralInput = collateral[0].input;
      const collateralOutput = collateral[0].output;

      const txBuilder = getTxBuilder();
      await txBuilder
        .spendingPlutusScript("V3")
        .txIn(
          scriptUtxo.input.txHash,
          scriptUtxo.input.outputIndex,
          scriptUtxo.output.amount,
          scriptUtxo.output.address
        )
        .spendingReferenceTxInInlineDatumPresent()
        .txInScript(scriptCbor)
        .txInRedeemerValue(resolveRedeemer)
        .txOut(
          resolution === 'release' ? recipientAddress : changeAddress,
          scriptUtxo.output.amount
        )
        .txInCollateral(
          collateralInput.txHash,
          collateralInput.outputIndex,
          collateralOutput.amount,
          collateralOutput.address
        )
        .requiredSignerHash(userHash)
        .changeAddress(changeAddress)
        .selectUtxosFrom(utxos)
        .complete();

      const unsignedTx = txBuilder.txHex;
      const signedTx = await wallet.signTx(unsignedTx);
      const txHash = await wallet.submitTx(signedTx);

      // Update transaction status
      setLockedFunds(prev => prev.map(tx =>
        tx.id === transaction.id ? { ...tx, status: 'resolved' } : tx
      ));

      alert(`✅ Dispute resolved! Funds ${resolution === 'release' ? 'released to recipient' : 'refunded to you'}.\nTransaction: ${txHash}`);
      await refreshBalance();

    } catch (error) {
      console.error("Resolve dispute failed:", error);
      alert("❌ Failed to resolve dispute: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  console.log({ getUsersEscrowQuery })

  // Filter transactions for different tabs
  const activeTransactions = lockedFunds.filter(t => t.status === 'active');
  const disputedTransactions = lockedFunds.filter(t => t.status === 'disputed');

  const allTransactions = lockedFunds;

  return (
    <main className="min-h-screen bg-background px-4">
      {upsertUserMutation.isPending && <Spinner className="size-20" />}

      <FloatingDebugJson data={{ collateral, lockedFunds }} />

      {!connected && <HeroSection />}

      {connected && (
        <div className="container mx-auto px-4 py-6">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <StatCard
              title="Total Locked"
              value={`${lovelaceToAda(stats.totalLocked).toFixed(2)} ADA`}
              description="Currently in escrow"
              icon={<Lock className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Active Escrows"
              value={stats.activeCount.toString()}
              description="Pending approval"
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Disputed"
              value={stats.disputedCount.toString()}
              description="Needs resolution"
              icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Your Balance"
              value={`${balance.toFixed(2)} ADA`}
              description="Available to lock"
              icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="create">Create New</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Active Escrows
                  </CardTitle>
                  <CardDescription>Escrows waiting for approval or in dispute period</CardDescription>
                </CardHeader>
                <CardContent>
                  {activeTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <Lock className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground mb-4">No active escrows</p>
                      <Button variant="outline" onClick={() => setActiveTab("create")}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Escrow
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Transaction</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Deadline</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeTransactions.map((tx) => (
                            <TransactionRow
                              key={tx.id}
                              transaction={tx}
                              onApprove={approveAction}
                              onDispute={raiseDispute}
                              onResolve={resolveDispute}
                              isLoading={isLoading}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Disputed Transactions */}
              {disputedTransactions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      Disputed Escrows
                    </CardTitle>
                    <CardDescription>Escrows that require resolution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Transaction</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Deadline</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {disputedTransactions.map((tx) => (
                            <TransactionRow
                              key={tx.id}
                              transaction={tx}
                              onApprove={approveAction}
                              onDispute={raiseDispute}
                              onResolve={resolveDispute}
                              isLoading={isLoading}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Create New Tab */}
            <TabsContent value="create">
              <CreateEscrow />
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>All your escrow transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {allTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <Shield className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">No transaction history yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Transaction</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Deadline</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allTransactions.map((tx) => (
                            <TransactionRow
                              key={tx.id}
                              transaction={tx}
                              onApprove={approveAction}
                              onDispute={raiseDispute}
                              onResolve={resolveDispute}
                              isLoading={isLoading}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </main>
  );
}