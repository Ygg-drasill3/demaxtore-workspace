import { useEffect, useRef, useState, type ReactNode } from "react";

/** Mount children when the wrapper enters the viewport (below-fold deferral). */
export function LazyMount({ children, rootMargin = "200px" }: { children: ReactNode; rootMargin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, rootMargin]);

  return <div ref={ref}>{visible ? children : null}</div>;
}
