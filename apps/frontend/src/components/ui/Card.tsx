// apps/frontend/src/components/ui/Card.tsx
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { MotionCard } from "@/motion/primitives/MotionCard";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ className, interactive = false, ...rest }: CardProps) {
  if (interactive) {
    return <MotionCard className={className} interactive {...rest} />;
  }
  return <div className={cn("dmx-card", className)} {...rest} />;
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pt-5 pb-3 flex items-start justify-between gap-3", className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-display text-base font-semibold tracking-tight", className)} {...rest} />;
}

export function CardEyebrow({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("dmx-eyebrow", className)} {...rest} />;
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-3 border-t border-paper-200 bg-paper-50/50 rounded-b-xl", className)} {...rest} />;
}
