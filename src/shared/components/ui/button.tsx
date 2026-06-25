/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[8px] border text-[14px] font-semibold tracking-[-0.01em] transition-[background-color,border-color,color,transform,box-shadow,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/25 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-[var(--primary)] bg-[var(--primary)] px-4 text-white shadow-none hover:border-[var(--primary-strong)] hover:bg-[var(--primary-strong)] active:scale-[0.985]",
        destructive: "border-[#f3b3b8] bg-[#fff2f3] px-4 text-[#b42318] hover:bg-[#ffe4e7] active:scale-[0.985]",
        outline: "border-[var(--line)] bg-white px-4 text-[var(--text)] hover:bg-[var(--surface-soft)] active:scale-[0.985]",
        secondary: "border-transparent bg-[var(--surface-soft)] px-4 text-[var(--text)] hover:bg-[var(--surface-strong)] active:scale-[0.985]",
        ghost: "border-transparent bg-transparent px-3 text-[var(--text)] hover:bg-[var(--surface-soft)] active:scale-[0.985]",
        link: "h-auto border-transparent bg-transparent px-1 py-0 text-blue-500 underline-offset-4 hover:underline",
        contrast: "border-[#1d1d1f] bg-[#1d1d1f] px-4 text-white hover:bg-black active:scale-[0.985]",
      },
      size: {
        default: "h-10",
        sm: "h-8 px-3 text-[12px]",
        lg: "h-11 px-5 text-[15px]",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
