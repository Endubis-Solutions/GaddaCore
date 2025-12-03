import { EscrowStatus } from "@/types";

// Utility functions from demo
export function formatAddress(address: string, startChars = 8, endChars = 8): string {
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

export function lovelaceToAda(lovelace: number): number {
  return lovelace / 1_000_000;
}

export function adaToLovelace(ada: number): number {
  return Math.floor(ada * 1_000_000);
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
