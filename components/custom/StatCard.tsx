import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { ElementType } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ElementType;
  trend?: "up" | "down";
  description?: string;
}

const StatCard = ({ label, value, icon: Icon, trend, description }: StatCardProps) => {
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
        "group rounded-md border border-zinc-100 bg-white p-6",
        "shadow-none transition-all duration-300 hover:border-zinc-200",
        ""
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className={cn("text-[10px] font-black tracking-[0.2em] uppercase", "text-zinc-400")}>
          {label}
        </span>
        <div
          className={cn("rounded-lg p-2 transition-colors duration-300", config.bg, config.text)}
        >
          <TrendIcon className="h-4 w-4" />
        </div>
      </div>
      <div
        className={cn(
          "text-3xl font-semibold tracking-tight",
          "text-zinc-900 transition-colors group-hover:text-zinc-950"
        )}
      >
        {value}
      </div>

      {description && <p>{description}</p>}
    </div>
  );
};

export default StatCard;
