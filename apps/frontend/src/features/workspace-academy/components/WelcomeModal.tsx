// apps/frontend/src/features/workspace-academy/components/WelcomeModal.tsx
//
// Branded first-login welcome. Shows once per user (backend persisted),
// never over another modal, restartable from the Help Center.
// Primary CTA enters the product (dashboard) so page guides can auto-start.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { m } from "framer-motion";
import { Compass } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n/useT";
import { useTelemetry } from "@/features/telemetry/useTelemetry";
import { useAuth } from "@/store/auth.store";
import { ROLE_DASHBOARD } from "@dmx/contracts/auth";
import { useReducedMotion } from "@/motion";
import { fadeUpVariants, springSnappy } from "@/motion/tokens";
import { useWorkspaceAcademy } from "../context/WorkspaceAcademyProvider";
import { WorkspaceChain } from "./ProcessOverview";

function otherOverlayOpen(): boolean {
  const dialogs = document.querySelectorAll('[role="dialog"]');
  return dialogs.length > 0;
}

export function WelcomeModal() {
  const { t } = useT();
  const { track } = useTelemetry();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const reduced = useReducedMotion();
  const { state, isLoading, completeWelcome, dismissWelcome } = useWorkspaceAcademy();
  const [open, setOpen] = useState(false);
  const [tracked, setTracked] = useState(false);

  const eligible = Boolean(
    user && state && !isLoading &&
    !state.welcomeCompletedAt && !state.welcomeDismissedAt,
  );

  useEffect(() => {
    if (!eligible) { setOpen(false); return; }
    const timer = window.setTimeout(() => {
      if (!otherOverlayOpen()) {
        setOpen(true);
        if (!tracked) {
          track("academy.welcome_viewed", { meta: { role: user?.role ?? null } });
          setTracked(true);
        }
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [eligible, track, tracked, user?.role]);

  if (!eligible || !open) return null;

  const goToDashboard = () => {
    completeWelcome();
    setOpen(false);
    if (user) navigate(ROLE_DASHBOARD[user.role] ?? "/");
  };

  const goToOverview = () => {
    completeWelcome();
    setOpen(false);
    navigate("/help/getting-started");
  };

  const neverShow = () => {
    dismissWelcome();
    setOpen(false);
  };

  return (
    <Modal
      open={open}
      onClose={neverShow}
      size="lg"
      testId="academy-welcome-modal"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={neverShow} data-testid="welcome-dismiss">
            {t("wa.welcome.never")}
          </Button>
          <Button variant="secondary" size="sm" onClick={goToOverview} data-testid="welcome-overview">
            {t("wa.welcome.overview")}
          </Button>
          <Button size="sm" onClick={goToDashboard} data-testid="welcome-start">
            {t("wa.welcome.cta")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center py-4 gap-5">
        <m.div
          className="h-14 w-14 rounded-2xl bg-accent-900 text-white grid place-items-center shadow-modal"
          initial={reduced ? false : { scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springSnappy}
        >
          <Compass className="h-7 w-7" aria-hidden="true" />
        </m.div>

        <m.div
          className="space-y-2"
          variants={reduced ? undefined : fadeUpVariants}
          initial={reduced ? false : "hidden"}
          animate="visible"
          custom={0}
        >
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {t("wa.welcome.title")}
          </h2>
          <p className="text-sm text-zinc-600 max-w-md leading-relaxed mx-auto">
            {t("wa.welcome.body")}
          </p>
        </m.div>

        <m.div
          className="w-full max-w-lg rounded-2xl border border-paper-200 bg-gradient-to-b from-accent-50/80 to-white px-4 py-4 space-y-2.5 text-start"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSnappy, delay: reduced ? 0 : 0.12 }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {t("wa.chain.title")}
          </div>
          <WorkspaceChain animated />
          <p className="text-xs text-zinc-500 leading-relaxed">
            {t("wa.welcome.chainHint")}
          </p>
        </m.div>

        <p className="text-xs text-zinc-400 max-w-md">
          {t("wa.welcome.hint")}
        </p>
      </div>
    </Modal>
  );
}
