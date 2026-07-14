import { useEffect, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

/**
 * Desktop cursor glow — soft accent follows pointer on dashboard.
 * Disabled on touch devices and reduced-motion.
 */
export function CursorGlow() {
  const reduced = useReducedMotion();
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reduced || window.matchMedia("(pointer: coarse)").matches) return;

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };
    const onLeave = () => setVisible(false);

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [reduced]);

  if (reduced || !visible) return null;

  return (
    <div
      className="dmx-cursor-glow pointer-events-none fixed z-[1] h-64 w-64 rounded-full opacity-30 mix-blend-multiply"
      style={{
        left: pos.x - 128,
        top: pos.y - 128,
        background: "radial-gradient(circle, rgba(57,73,171,0.18) 0%, transparent 70%)",
        transition: "left 0.15s cubic-bezier(0.16,1,0.3,1), top 0.15s cubic-bezier(0.16,1,0.3,1)",
      }}
      aria-hidden
    />
  );
}
