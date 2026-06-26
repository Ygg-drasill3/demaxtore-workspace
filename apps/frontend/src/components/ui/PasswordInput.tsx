import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useT";

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement> & {
  "data-testid"?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, "data-testid": testId, ...rest }, ref) {
    const { t } = useT();
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("dmx-input pr-10", className)}
          data-testid={testId}
          {...rest}
        />
        <button
          type="button"
          data-testid={testId ? `${testId}-toggle` : "password-toggle"}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
