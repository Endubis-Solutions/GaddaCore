import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { ElementType } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ElementType;
  trend?: "up" | "down";
}

const StatCard = ({ label, value, icon: Icon, trend }: StatCardProps) => {
  const trendConfig = {
    up: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      icon: TrendingUp,
    },
    down: {
      bg: "bg-rose-50",
      text: "text-rose-600",
      icon: TrendingDown,
    },
    neutral: {
      bg: "bg-zinc-50",
      text: "text-zinc-400",
      icon: Icon,
    },
  };

  const config = trend ? trendConfig[trend] : trendConfig.neutral;
  const TrendIcon = trend ? trendConfig[trend].icon : Icon;

  return (
    <div
      className={cn(
        "group p-6 bg-white border border-zinc-100 rounded-md",
        "shadow-none hover:border-zinc-200 transition-all duration-300",
        ""
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className={cn(
            "text-[10px] font-black uppercase tracking-[0.2em]",
            "text-zinc-400"
          )}
        >
          {label}
        </span>
        <div
          className={cn(
            "p-2 rounded-lg transition-colors duration-300",
            config.bg,
            config.text
          )}
        >
          <TrendIcon className="h-4 w-4" />
        </div>
      </div>
      <div
        className={cn(
          "text-3xl font-semibold tracking-tight",
          "text-zinc-900 group-hover:text-zinc-950 transition-colors"
        )}
      >
        {value}
      </div>
    </div>
  );
};

export default StatCard;