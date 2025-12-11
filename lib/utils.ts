import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const hashToByteArray = (hash: string): string => {
  return Buffer.from(hash).toString('hex');
};
