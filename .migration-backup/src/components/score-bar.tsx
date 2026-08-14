import { cn } from "@/lib/utils";

interface ScoreBarProps {
  label: string;
  score: number;
  className?: string;
  showValue?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-[#2a6f7f]";
  if (score >= 60) return "bg-[#0f2744]";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-400";
}

export function ScoreBar({
  label,
  score,
  className,
  showValue = true,
}: ScoreBarProps) {
  const clamped = Math.min(100, Math.max(0, score));

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#4a5568] font-medium">{label}</span>
        {showValue && (
          <span className="font-semibold text-[#0f2744]">{clamped}</span>
        )}
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#e2e8f0] overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", getScoreColor(clamped))}
          style={{ width: `${clamped}%` }}
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
