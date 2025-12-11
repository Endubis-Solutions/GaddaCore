import { EscrowStatus } from "@/types";
import { deserializeAddress } from "@meshsdk/core";

// Utility functions from demo
export function formatAddress(address: string, startChars = 8, endChars = 8): string {
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

export const hexToString = (hex: string) => Buffer.from(hex, "hex").toString("utf-8");

export function lovelaceToAda(lovelace: number | bigint): number {
  if (typeof lovelace === 'bigint') {
    return Number(lovelace) / 1_000_000;
  }
  return lovelace / 1_000_000;
}

export function adaToLovelace(ada: number): bigint {
  return BigInt(Math.round(ada * 1_000_000));
}
export function adaToLovelaceSerialized(ada: number): number {
  return Number(adaToLovelace(ada))
}

export function getStatusColor(status: EscrowStatus): string {
  switch (status) {
    case "active":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "approved":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "disputed":
      return "bg-red-100 text-red-800 border-red-200";
    case "resolved":
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
  return meshAddress
}
