import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useOnboardingTour, useCompleteTour, useOnboardingProgress } from "../hooks";

export function ProductTour() {
  const { data: tour } = useOnboardingTour();
  const { data: progress } = useOnboardingProgress();
  const complete = useCompleteTour();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || progress?.tourCompleted || !tour?.steps?.length) return null;

  const current = tour.steps[step];
  if (!current) return null;
  const isLast = step >= tour.steps.length - 1;

  const finish = () => {
    complete.mutate(undefined, { onSuccess: () => setDismissed(true) });
  };

  const next = () => {
    if (isLast) {
      finish();
      if (current.route) navigate(current.route);
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div
      data-testid="product-tour"
      className="fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-2xl border border-paper-200 bg-white shadow-xl p-5 animate-fade-in"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="dmx-eyebrow text-accent-900">Platform Tour</div>
          <h3 data-testid="tour-step-title" className="font-display text-lg font-semibold mt-1">
            {current.title}
          </h3>
        </div>
        <button
          type="button"
          aria-label="Dismiss tour"
          onClick={finish}
          className="text-zinc-400 hover:text-zinc-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p data-testid="tour-step-body" className="text-sm text-zinc-600 mt-2">{current.body}</p>
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-zinc-400">{step + 1} / {tour.steps.length}</span>
        <Button data-testid="tour-next-btn" onClick={next} loading={complete.isPending}>
          {isLast ? "Get started" : "Next"}
        </Button>
      </div>
    </div>
  );
}
