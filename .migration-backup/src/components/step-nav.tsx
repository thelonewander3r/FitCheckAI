import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Interview" },
  { id: 2, label: "Analysis" },
  { id: 3, label: "Try On" },
  { id: 4, label: "Final Plan" },
] as const;

interface StepNavProps {
  currentStep: 1 | 2 | 3 | 4;
  className?: string;
}

export function StepNav({ currentStep, className }: StepNavProps) {
  return (
    <nav
      aria-label="Preparation steps"
      className={cn("flex items-center justify-center gap-0", className)}
    >
      {STEPS.map((step, index) => {
        const isDone = step.id < currentStep;
        const isActive = step.id === currentStep;

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  {
                    "bg-[#0f2744] text-white": isActive,
                    "bg-[#2a6f7f] text-white": isDone,
                    "bg-[#e2e8f0] text-[#718096]": !isActive && !isDone,
                  },
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isDone ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <span
                className={cn("text-xs font-medium whitespace-nowrap", {
                  "text-[#0f2744]": isActive,
                  "text-[#2a6f7f]": isDone,
                  "text-[#718096]": !isActive && !isDone,
                })}
              >
                {step.label}
              </span>
            </div>

            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "mb-5 h-px w-12 sm:w-16 transition-colors",
                  isDone ? "bg-[#2a6f7f]" : "bg-[#e2e8f0]",
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
