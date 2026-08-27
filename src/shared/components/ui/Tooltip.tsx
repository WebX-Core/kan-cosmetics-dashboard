import React from "react";
import {
  Tooltip as TooltipRoot,
  TooltipTrigger,
  TooltipContent,
} from "@/shared/components/animate-ui/components/radix/tooltip";

interface TooltipProps {
  text: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

/** Convenience wrapper around the animate-ui radix tooltip. */
export const Tooltip: React.FC<TooltipProps> = ({
  text,
  children,
  side = "top",
  className,
}) => (
  <TooltipRoot>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side={side} className={className ?? "max-w-xs"}>
      {text}
    </TooltipContent>
  </TooltipRoot>
);
