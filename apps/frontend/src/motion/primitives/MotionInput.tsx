import { forwardRef, type InputHTMLAttributes, useState } from "react";
import { m } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { springMicro } from "@/motion/tokens";

/**
 * Input with focus glow + subtle scale — communicates active field state.
 */
export const MotionInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function MotionInput({ className, onFocus, onBlur, ...rest }, ref) {
    const reduced = useReducedMotion();
    const [focused, setFocused] = useState(false);

    if (reduced) {
      return <input ref={ref} className={cn("dmx-input", className)} {...rest} />;
    }

    return (
      <m.input
        ref={ref}
        className={cn("dmx-input", className)}
        animate={{
          boxShadow: focused
            ? "0 0 0 3px rgba(26, 35, 126, 0.12)"
            : "0 0 0 0px rgba(26, 35, 126, 0)",
          scale: focused ? 1.005 : 1,
        }}
        transition={springMicro}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        type={rest.type}
        name={rest.name}
        value={rest.value}
        defaultValue={rest.defaultValue}
        placeholder={rest.placeholder}
        disabled={rest.disabled}
        readOnly={rest.readOnly}
        autoComplete={rest.autoComplete}
        id={rest.id}
        required={rest.required}
        min={rest.min}
        max={rest.max}
        step={rest.step}
        pattern={rest.pattern}
        onChange={rest.onChange}
      />
    );
  },
);
