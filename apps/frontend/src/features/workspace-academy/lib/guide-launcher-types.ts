export interface LaunchCallbacks {
  onStepViewed?: (stepIndex: number) => void;
  onCompleted?: () => void;
  /** Permanent dismiss ("don't show this page guide again"). */
  onDismissed?: (lastStepIndex: number) => void;
  /** Session-only skip — does not persist DISMISSED. */
  onSkipped?: (lastStepIndex: number) => void;
}
