import { AnimatePresence, m } from "framer-motion";
import { contentSwapVariants } from "../motionVariants";

interface Props {
  stepKey: string;
  dir: 1 | -1;
  rtl: boolean;
  children: React.ReactNode;
}

export function GuideStepTransition({ stepKey, dir, rtl, children }: Props) {
  const variants = contentSwapVariants(dir, rtl);
  return (
    <div className="relative overflow-hidden min-h-[4.5rem]">
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={stepKey}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {children}
        </m.div>
      </AnimatePresence>
    </div>
  );
}
