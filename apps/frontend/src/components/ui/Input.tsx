// apps/frontend/src/components/ui/Input.tsx
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FieldProps {
  label?: string;
  hint?:  ReactNode;
  error?: ReactNode;
  children: ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="dmx-eyebrow block">{label}</label>}
      {children}
      {error ? <div className="text-xs text-red-600">{error}</div>
             : hint && <div className="text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest }, ref,
) {
  return <input ref={ref} className={cn("dmx-input", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest }, ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "dmx-input h-auto py-2 resize-y min-h-[80px]",
        className,
      )}
      {...rest}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest }, ref,
) {
  return (
    <select ref={ref} className={cn("dmx-input pr-8 appearance-none bg-white", className)} {...rest}>
      {children}
    </select>
  );
});
