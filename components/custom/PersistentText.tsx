"use client"

import { useEffect, useState, useMemo } from 'react'
import { CopyCheck, Copy, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { isClient } from '@/utils/aiken'

type PersistentTextProps = {
    data: unknown
    isJson?: boolean
    storageKey?: string
    label?: string
    description?: string
}

const PersistentText = ({ data, isJson = false, storageKey, label = "Reference", description }: PersistentTextProps) => {
    const [isCopied, setIsCopied] = useState(false)
    const [persistedData, setPersistedData] = useState<string | null>()

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (storageKey && isClient) setPersistedData(localStorage.getItem(storageKey));
    }, [storageKey]);

    const displayData = useMemo(() => {
        const raw = data || persistedData;
        if (!raw) return 'N/A';
        return isJson ? JSON.stringify(typeof raw === 'string' ? JSON.parse(raw) : raw, null, 2) : String(raw);
    }, [data, persistedData, isJson]);

    const handleCopy = () => {
        navigator.clipboard.writeText(displayData)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    if (displayData === 'N/A') return null;

    return (
        <div className="w-full space-y-2">
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">{label}</span>
                {description && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="text-zinc-300 hover:text-zinc-500 transition-colors"><Info className="h-3 w-3" /></button>
                        </PopoverTrigger>
                        <PopoverContent className="text-xs p-3 border-zinc-200 shadow-xl">{description}</PopoverContent>
                    </Popover>
                )}
            </div>
            <div className="flex items-center gap-3 bg-white border border-zinc-200 rounded-lg p-3 hover:border-zinc-300 transition-all group">
                <code className="flex-1 text-xs font-mono text-zinc-600 truncate">{displayData}</code>
                <Button variant="ghost" size="icon" onClick={handleCopy} className="h-6 w-6 text-zinc-400 hover:text-zinc-900">
                    {isCopied ? <CopyCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
            </div>
        </div>
    )
}

export default PersistentText;