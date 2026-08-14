import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const STEPS = [
  { id: 1, label: "Intake" },
  { id: 2, label: "Analysis" },
  { id: 3, label: "Try On" },
  { id: 4, label: "Plan" },
] as const;

interface StepNavProps {
  currentStep: 1 | 2 | 3 | 4;
  className?: string;
}

export function StepNav({ currentStep, className }: StepNavProps) {
  return (
    <nav
      aria-label="Preparation steps"
      className={cn("flex items-center justify-center gap-4 sm:gap-8", className)}
    >
      {STEPS.map((step, index) => {
        const isDone = step.id < currentStep;
        const isActive = step.id === currentStep;

        return (
          <div key={step.id} className="flex items-center gap-4 sm:gap-8">
            <div className="flex flex-col items-center gap-2">
              <span
                className={cn("text-[10px] sm:text-xs tracking-widest uppercase transition-colors duration-500", {
                  "text-[#0f2744] font-medium": isActive,
                  "text-[#0f2744] opacity-50": isDone,
                  "text-[#0f2744] opacity-30": !isActive && !isDone,
                })}
              >
                {step.label}
              </span>
              <motion.div 
                className={cn("h-[1px] transition-all duration-500", {
                  "w-8 bg-[#0f2744]": isActive,
                  "w-4 bg-[#0f2744] opacity-30": !isActive
                })}
                layoutId={isActive ? "activeStepLine" : undefined}
              />
            </div>
          </div>
        );
      })}
    </nav>
  );
}
