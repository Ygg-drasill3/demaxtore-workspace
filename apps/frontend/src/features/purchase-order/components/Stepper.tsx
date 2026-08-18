import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS } from "../lib/direct-po-wizard.types";

interface StepperProps {
  currentStep: number;
  maxCompletedStep: number;
  onStepClick: (index: number) => void;
}

export function Stepper({ currentStep, maxCompletedStep, onStepClick }: StepperProps) {
  return (
    <nav
      aria-label="Purchase order wizard progress"
      className="flex flex-wrap items-center gap-1 border-b border-paper-200 bg-paper-50/60 px-4 py-3"
      data-testid="direct-po-stepper"
    >
      {WIZARD_STEPS.map((step, index) => {
        const completed = index <= maxCompletedStep;
        const current = index === currentStep;
        const clickable = index <= maxCompletedStep;
        return (
          <div key={step.key} className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick(index)}
              aria-current={current ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-left transition-colors dmx-focus-ring",
                clickable ? "cursor-pointer hover:bg-paper-100" : "cursor-default opacity-70",
              )}
              data-testid={`direct-po-step-${step.key}`}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  completed && !current && "bg-emerald-600 text-white",
                  current && "bg-accent-900 text-white",
                  !completed && !current && "bg-paper-200 text-zinc-500",
                )}
                aria-hidden
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  current ? "text-ink-900" : completed ? "text-zinc-700" : "text-zinc-500",
                )}
              >
                {step.title}
              </span>
            </button>
            {index < WIZARD_STEPS.length - 1 && (
              <ChevronRight className="mx-0.5 h-3 w-3 shrink-0 text-zinc-300" aria-hidden />
            )}
          </div>
        );
      })}
    </nav>
  );
}
