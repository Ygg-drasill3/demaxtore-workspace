import { m } from "framer-motion";
import { introLabelVariants } from "../motionVariants";
import { Z_GUIDE } from "../motionTokens";

interface Props {
  title: string;
  subtitle: string;
}

export function GuideIntroLabel({ title, subtitle }: Props) {
  return (
    <div
      className="absolute inset-0 grid place-items-center pointer-events-none"
      style={{ zIndex: Z_GUIDE.intro }}
    >
      <m.div
        variants={introLabelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="mx-6 max-w-sm rounded-2xl border border-zinc-200 bg-white px-6 py-5 text-center shadow-[0_24px_48px_-16px_rgba(11,16,32,0.4)]"
        data-testid="academy-guide-intro"
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
          Page guide
        </div>
        <h2 className="mt-1.5 font-[Fraunces,serif] text-xl font-semibold tracking-tight text-[#0b1020]">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{subtitle}</p>
      </m.div>
    </div>
  );
}
