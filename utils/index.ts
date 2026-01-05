import { EscrowStatus } from "@/types";
import { deserializeAddress } from "@meshsdk/core";
import { format } from "date-fns";

// Utility functions from demo
export function formatAddress(address: string, startChars = 8, endChars = 8): string {
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

export const hexToString = (hex: string) => Buffer.from(hex, "hex").toString("utf-8");

export const formatDate = (date: Date) => {
  return format(date, "PPpp");
};

export const calculateTimeRemaining = (deadline: Date) => {
  const now = new Date();
  const timeRemaining = deadline.getTime() - now.getTime();
  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
};

export function lovelaceToAda(lovelace: number | bigint): number {
  if (typeof lovelace === "bigint") {
    return Number(lovelace) / 1_000_000;
  }
  return lovelace / 1_000_000;
}

export function adaToLovelace(ada: number): bigint {
  return BigInt(Math.round(ada * 1_000_000));
}
export function adaToLovelaceSerialized(ada: number): number {
  return Number(adaToLovelace(ada));
}

export function getStatusColor(status: EscrowStatus): string {
  switch (status) {
    case "ACTIVE":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "APPROVED":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "DISPUTED":
      return "bg-red-100 text-red-800 border-red-200";
    case "RESOLVED":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function generateQrCodeUrl(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
}

export function getAddressPlutusData(addressString: string) {
  const meshAddress = deserializeAddress(addressString);
  return meshAddress;
}
