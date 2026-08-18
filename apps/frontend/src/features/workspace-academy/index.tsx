// apps/frontend/src/features/workspace-academy/index.tsx
//
// Public surface of the Workspace Academy feature.
// <WorkspaceAcademyRoot> is mounted in AppLayout and EmbedShellLayout (FreightIQ /
// Create auction): provides context + welcome, checklist, help FAB, auto tours.
import { WorkspaceAcademyProvider } from "./context/WorkspaceAcademyProvider";
import { WelcomeModal } from "./components/WelcomeModal";
import { OnboardingChecklist } from "./components/OnboardingChecklist";
import { HelpCenterButton } from "./components/HelpCenter";
import { EducationalSuccessModal } from "./components/EducationalSuccessModal";

export { WorkspaceAcademyProvider } from "./context/WorkspaceAcademyProvider";
export { useWorkspaceAcademy } from "./context/WorkspaceAcademyProvider";
export { EmptyStateGuide } from "./components/EmptyStateGuide";
export {
  showPoIssuedSuccess,
  showShipmentBookedSuccess,
  showRfqSubmittedSuccess,
} from "./lib/educational-success.store";

export function WorkspaceAcademyRoot({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceAcademyProvider>
      {children}
      <WelcomeModal />
      <OnboardingChecklist />
      <HelpCenterButton />
      <EducationalSuccessModal />
    </WorkspaceAcademyProvider>
  );
}
