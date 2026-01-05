"use client";

import { useEffect, useState, useMemo } from "react";
import { CopyCheck, Copy, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isClient } from "@/utils/aiken";

type PersistentTextProps = {
  data: unknown;
  isJson?: boolean;
  storageKey?: string;
  label?: string;
  description?: string;
};

const PersistentText = ({
  data,
  isJson = false,
  storageKey,
  label = "Reference",
  description,
}: PersistentTextProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const [persistedData, setPersistedData] = useState<string | null>();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (storageKey && isClient) setPersistedData(localStorage.getItem(storageKey));
  }, [storageKey]);

  const displayData = useMemo(() => {
    const raw = data || persistedData;
    if (!raw) return "N/A";
    return isJson
      ? JSON.stringify(typeof raw === "string" ? JSON.parse(raw) : raw, null, 2)
      : String(raw);
  }, [data, persistedData, isJson]);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayData);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (displayData === "N/A") return null;

  return (
    <div className="w-full space-y-2 rounded-md">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold tracking-[0.15em] text-zinc-500 uppercase">
          {label}
        </span>
        {description && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="cursor-pointer text-zinc-400 transition-colors hover:text-zinc-300">
                <Info className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="border-zinc-200 p-3 text-xs shadow-xl">
              {description}
            </PopoverContent>
          </Popover>
        )}
      </div>
      <div className="group flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-900 p-3 transition-all hover:border-zinc-300">
        <code className="flex-1 truncate font-mono text-xs text-zinc-400">{displayData}</code>
        <Button
          variant="ghost"
          type="button"
          size="icon"
          onClick={handleCopy}
          className="h-6 w-6 text-zinc-400 hover:text-zinc-900"
        >
          {isCopied ? <CopyCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
};

export default PersistentText;
