import { Button } from "@/components/ui/button";
import { CopyCheck, CopyIcon } from "lucide-react";
import React, { useEffect, useState, useMemo } from "react";
import { isClient } from "../utils";

type PersistentTextProps = {
  data: unknown;
  isJson?: boolean;
  storageKey?: string; // Renamed from 'key'
};

const PersistentText = ({ data, isJson = false, storageKey }: PersistentTextProps) => {
  const [isCopied, setIsCopied] = useState(false);

  // FIX APPLIED HERE: Lazy initialization to read from localStorage only once on mount.
  const [persistedData, setPersistedData] = useState<string | null>();

  useEffect(() => {
    if (storageKey) {
      if (!isClient) {
        return;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPersistedData(localStorage.getItem(storageKey));
    }
  }, [storageKey]);

  // Format the current data prop for display and persistence
  const formattedData = useMemo(() => {
    if (data === null || data === undefined) return "";
    if (isJson) {
      try {
        // Ensure we handle objects or strings that are JSON
        const obj = typeof data === "string" ? JSON.parse(data) : data;
        return JSON.stringify(obj, null, 2);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        return String(data);
      }
    }
    return String(data);
  }, [data, isJson]);

  // Determine the content to display and copy (prioritize current data > persisted data)
  const displayData = formattedData || persistedData || "N/A";

  const handleCopy = () => {
    if (displayData === "N/A") return;
    navigator.clipboard.writeText(displayData);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Effect for SAVING data whenever the `data` prop changes
  useEffect(() => {
    if (!storageKey || !data) return;

    const dataToSave = isJson ? formattedData : String(data);

    try {
      localStorage.setItem(storageKey, dataToSave);
      // Optionally update state here if you want the display to reflect
      // the saved version if 'data' becomes null/undefined later
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPersistedData(dataToSave);
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  }, [data, storageKey, formattedData, isJson]);

  if (isJson) {
    return (
      <div className="relative rounded-lg border bg-neutral-50 p-4 shadow-sm">
        <pre className="max-h-96 overflow-x-auto text-xs whitespace-pre-wrap">{displayData}</pre>
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 h-8 w-8 text-gray-500 hover:text-indigo-600"
          onClick={handleCopy}
          disabled={displayData === "N/A"}
        >
          {isCopied ? (
            <CopyCheck className="h-4 w-4 text-green-600" />
          ) : (
            <CopyIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  // Default String/Hash Display
  return (
    <div className="flex items-center justify-between rounded-lg border bg-neutral-100 px-3 py-2">
      <p className="line-clamp-1 truncate text-sm font-bold" title={displayData}>
        {displayData}
      </p>
      <Button
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={handleCopy}
        disabled={displayData === "N/A"}
      >
        {isCopied ? <CopyCheck className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
      </Button>
    </div>
  );
};

export default PersistentText;
