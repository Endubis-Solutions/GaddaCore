import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // Assuming a Badge component exists
import { Calendar, Hash, Zap, XCircle, Trash2, Clock, CheckCircle } from 'lucide-react';
import { ContractAction, useContractActionLog } from '@/store/useLogger';

/**
 * Maps the log action type to a visual component (color and icon).
 */
const getActionMeta = (action: ContractAction['action']) => {
    switch (action) {
        case 'DEPLOY':
            return { icon: Zap, color: 'bg-blue-100 text-blue-800', label: 'Deploy' };
        case 'CALL':
            return { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Call' };
        case 'READ':
            return { icon: Clock, color: 'bg-gray-100 text-gray-800', label: 'Read' };
        case 'INIT':
            return { icon: Calendar, color: 'bg-indigo-100 text-indigo-800', label: 'Init' };
        case 'ERROR':
            return { icon: XCircle, color: 'bg-red-1100 text-red-800', label: 'Error' };
        default:
            return { icon: Hash, color: 'bg-yellow-100 text-yellow-800', label: 'Action' };
    }
};

/**
 * Renders a single, elegantly styled log entry.
 */
const LogEntry = ({ log }: { log: ContractAction }) => {
    const { icon: Icon, color, label } = getActionMeta(log.action);
    const date = new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const shortTxHash = log.txHash ? `${log.txHash.substring(0, 8)}...` : 'N/A';

    // Convert details object to a nicely formatted JSON string
    const detailsString = JSON.stringify(log.details, null, 2);

    return (
        <div className="flex items-start p-4 border-b border-gray-200 hover:bg-gray-50 transition duration-150">
            {/* Left Status Bar */}
            <div className={`shrink-0 w-1.5 h-full mr-4 rounded-full ${color.split(' ')[0].replace('-100', '-500')}`} />

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <Badge className={`${color} font-semibold flex items-center gap-1`}>
                            <Icon className="w-3 h-3" />
                            {log.contractName} ({log.method || label})
                        </Badge>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {date}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700">
                    <p className="font-mono text-xs truncate">
                        **TX Hash:** <span className="font-medium text-blue-600" title={log.txHash}>{shortTxHash}</span>
                    </p>
                    <p className="font-mono text-xs">
                        **Status:** <span className={`${color.split(' ')[1]}`}>{label}</span>
                    </p>
                </div>

                {/* Details Section (Hidden by default, shown via CSS or a state toggle in a real app) */}
                <details className="mt-2 text-xs bg-white p-3 rounded-lg border">
                    <summary className="font-semibold cursor-pointer text-gray-700 hover:text-gray-900">
                        View Details ({Object.keys(log.details).length} fields)
                    </summary>
                    <pre className="mt-2 overflow-x-auto text-gray-600">
                        {detailsString}
                    </pre>
                </details>
            </div>
        </div>
    );
};


const EscrowLogs = () => {
    const logs = useContractActionLog((state) => state.logs);
    const clearLogs = useContractActionLog((state) => state.clearLogs);

    return (
        <div className="">
            <div className="flex justify-between items-center p-5 border-b">
                <Button
                    onClick={clearLogs}
                    variant="destructive"
                    size="sm"
                    disabled={logs.length === 0}
                    className="flex items-center gap-1 bg-red-500 hover:bg-red-600"
                >
                    <Trash2 className="w-4 h-4" />
                    Clear Log ({logs.length})
                </Button>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
                {logs.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">
                        <p className="mb-2 text-lg font-semibold">No Contract Actions Logged Yet.</p>
                        <p>Perform an action (like initiation or calling a method) to see the history here.</p>
                    </div>
                ) : (
                    logs.map((log) => (
                        <LogEntry key={log.id} log={log} />
                    ))
                )}
            </div>
        </div>
    );
}

export default EscrowLogs;