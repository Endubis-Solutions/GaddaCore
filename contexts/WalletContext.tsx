"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useState,
  useRef,
} from "react";
import { Asset, IWallet, UTxO } from "@meshsdk/core"; // 👈 Import UTxO
import { useNetwork, useWallet } from "@meshsdk/react";
import { useUpsertUserMutation } from "@/services/user.service";

interface WalletState {
  connected: boolean;
  wallet: IWallet;
  walletName: string;
  network?: number;
  changeAddress: string;
  assets: Asset[];
  balance: number;
  isLoading: boolean;
  usedAddresses: string[];
  unusedAddresses: string[];
  rewardAddresses: string[];
  collateral: UTxO[];
  isUserSynced: boolean;
  isUserSyncing: boolean;
  userSyncError?: string;
}

interface WalletContextType extends WalletState {
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  refreshAddresses: () => Promise<void>;
  refreshCollateral: () => Promise<void>; // 👈 Add method
  nativeAssets: Asset[];
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { connected, wallet, disconnect: meshDisconnect, name: connectedWalletName } = useWallet();
  const network = useNetwork();
  const upsertUserMutation = useUpsertUserMutation();
  const isUserSyncedRef = useRef(false);

  const [changeAddress, setChangeAddress] = useState<string>("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [usedAddresses, setUsedAddresses] = useState<string[]>([]);
  const [unusedAddresses, setUnusedAddresses] = useState<string[]>([]);
  const [rewardAddresses, setRewardAddresses] = useState<string[]>([]);
  const [collateral, setCollateral] = useState<UTxO[]>([]); // 👈 State

  const balance = useMemo(() => {
    const lovelace = assets.find((a) => a.unit === "lovelace");
    return lovelace ? Number(lovelace.quantity) / 1_000_000 : 0;
  }, [assets]);

  const nativeAssets = useMemo(() => {
    return assets.filter((asset) => asset.unit !== "lovelace");
  }, [assets]);

  const refreshBalance = useCallback(async () => {
    if (!wallet) return;
    setIsLoading(true);
    try {
      const newBalance = await wallet.getBalance();
      setAssets(newBalance);
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    } finally {
      setIsLoading(false);
    }
  }, [wallet]);

  const refreshAddresses = useCallback(async () => {
    if (!wallet) return;
    try {
      const [changeAddr, usedAddrs, unusedAddrs, rewardAddrs] = await Promise.all([
        wallet.getChangeAddress(),
        wallet.getUsedAddresses(),
        wallet.getUnusedAddresses(),
        wallet.getRewardAddresses(),
      ]);
      setChangeAddress(changeAddr);
      setUsedAddresses(usedAddrs);
      setUnusedAddresses(unusedAddrs);
      setRewardAddresses(rewardAddrs);
    } catch (error) {
      console.error("Failed to fetch wallet info:", error);
    }
  }, [wallet]);

  // 👇 New: refresh collateral
  const refreshCollateral = useCallback(async () => {
    if (!wallet) return;
    try {
      const coll = await wallet.getCollateral();
      setCollateral(coll);
    } catch (error) {
      console.error("Failed to fetch collateral:", error);
      setCollateral([]);
    }
  }, [wallet]);

  const disconnect = useCallback(() => {
    meshDisconnect();
    setChangeAddress("");
    setAssets([]);
    setUsedAddresses([]);
    setUnusedAddresses([]);
    setRewardAddresses([]);
    setCollateral([]); // 👈 Reset
  }, [meshDisconnect]);

  useEffect(() => {
    if (connected && wallet) {
      refreshBalance();
      refreshAddresses();
      refreshCollateral(); // 👈 Fetch on connect
    } else {
      setAssets([]);
      setChangeAddress("");
      setUsedAddresses([]);
      setUnusedAddresses([]);
      setRewardAddresses([]);
      setCollateral([]); // 👈 Clear on disconnect
    }
  }, [connected, wallet, refreshBalance, refreshAddresses, refreshCollateral]);

  useEffect(() => {
    if (isUserSyncedRef.current) return;
    if (connected && changeAddress && network !== undefined) {
      upsertUserMutation.mutate({
        walletAddress: changeAddress,
        network: network ? (network === 1 ? "mainnet" : "preprod") : undefined,
        role: "USER",
      });

      isUserSyncedRef.current = true;
    }
  }, [connected, changeAddress, network, upsertUserMutation]);

  const value = useMemo<WalletContextType>(
    () => ({
      connected,
      wallet,
      walletName: connectedWalletName || "Unknown",
      network,
      changeAddress,
      assets,
      balance,
      isLoading,
      usedAddresses,
      unusedAddresses,
      rewardAddresses,
      collateral, // 👈 Expose
      disconnect,
      refreshBalance,
      refreshAddresses,
      refreshCollateral, // 👈 Expose
      nativeAssets,
      isUserSynced: upsertUserMutation.isSuccess,
      isUserSyncing: upsertUserMutation.isPending,
      userSyncError: (upsertUserMutation.error as Error)?.message,
    }),
    [
      connected,
      wallet,
      connectedWalletName,
      network,
      changeAddress,
      assets,
      balance,
      isLoading,
      usedAddresses,
      unusedAddresses,
      rewardAddresses,
      collateral,
      disconnect,
      refreshBalance,
      refreshAddresses,
      refreshCollateral,
      nativeAssets,
      upsertUserMutation,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context;
};
