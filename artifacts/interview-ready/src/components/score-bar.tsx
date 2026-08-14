import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ScoreBarProps {
  label: string;
  score: number;
  className?: string;
  showValue?: boolean;
}

export function ScoreBar({
  label,
  score,
  className,
  showValue = true,
}: ScoreBarProps) {
  const clamped = Math.min(100, Math.max(0, score));

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs tracking-wide uppercase">
        <span className="text-[#0f2744] font-medium">{label}</span>
        {showValue && (
          <span className="text-[#0f2744]">{clamped}</span>
        )}
      </div>
      <div className="h-[2px] w-full bg-[#0f2744]/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="h-full bg-[#0f2744]"
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${clamped}/100`}
        />
      </div>
    </div>
  );
}
