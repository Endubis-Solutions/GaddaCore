import { EscrowStatus } from "@/types";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

export function getStatusIcon(status: EscrowStatus) {
  switch (status) {
    case "active":
      return <Clock className="h-3 w-3" />;
    case "approved":
      return <CheckCircle className="h-3 w-3" />;
    case "disputed":
      return <AlertCircle className="h-3 w-3" />;
    case "resolved":
      return <CheckCircle className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
}