import { EscrowStatus } from "@/types";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

export function getStatusIcon(status: EscrowStatus) {
  switch (status) {
    case "ACTIVE":
      return <Clock className="h-3 w-3" />;
    case "APPROVED":
      return <CheckCircle className="h-3 w-3" />;
    case "DISPUTED":
      return <AlertCircle className="h-3 w-3" />;
    case "RESOLVED":
      return <CheckCircle className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
}