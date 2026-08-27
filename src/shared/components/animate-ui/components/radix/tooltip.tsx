import {
  TooltipProvider as TooltipProviderPrimitive,
  Tooltip as TooltipPrimitive,
  TooltipTrigger as TooltipTriggerPrimitive,
  TooltipContent as TooltipContentPrimitive,
  TooltipArrow as TooltipArrowPrimitive,
  TooltipPortal as TooltipPortalPrimitive,
  type TooltipProviderProps as TooltipProviderPrimitiveProps,
  type TooltipProps as TooltipPrimitiveProps,
  type TooltipTriggerProps as TooltipTriggerPrimitiveProps,
  type TooltipContentProps as TooltipContentPrimitiveProps,
} from "@/shared/components/animate-ui/primitives/radix/tooltip";
import { cn } from "@/lib/utils";

type TooltipProviderProps = TooltipProviderPrimitiveProps;

function TooltipProvider({
  delayDuration = 0,
  ...props
}: TooltipProviderProps) {
  return <TooltipProviderPrimitive delayDuration={delayDuration} {...props} />;
}

type TooltipProps = TooltipPrimitiveProps & {
  delayDuration?: TooltipPrimitiveProps["delayDuration"];
};

function Tooltip({ delayDuration = 0, ...props }: TooltipProps) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipPrimitive {...props} />
    </TooltipProvider>
  );
}

type TooltipTriggerProps = TooltipTriggerPrimitiveProps;

function TooltipTrigger({ ...props }: TooltipTriggerProps) {
  return <TooltipTriggerPrimitive {...props} />;
}

type TooltipContentProps = TooltipContentPrimitiveProps;

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPortalPrimitive>
      <TooltipContentPrimitive
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md bg-[#1d1d1f] px-3 py-1.5 text-xs text-balance text-white shadow-md",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipArrowPrimitive className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-[#1d1d1f] fill-[#1d1d1f]" />
      </TooltipContentPrimitive>
    </TooltipPortalPrimitive>
  );
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  type TooltipProps,
  type TooltipTriggerProps,
  type TooltipContentProps,
};
