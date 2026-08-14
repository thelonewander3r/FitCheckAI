import { cn } from "@/lib/utils";

interface DisclaimerBannerProps {
  text: string;
  className?: string;
}

export function DisclaimerBanner({ text, className }: DisclaimerBannerProps) {
  return (
    <div
      role="note"
      className={cn(
        "flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3",
        className,
      )}
    >
      <svg
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-xs text-amber-800 leading-relaxed">{text}</p>
    </div>
  );
}
