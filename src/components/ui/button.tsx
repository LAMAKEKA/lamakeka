import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 touch-manipulation min-h-10",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-campo)] text-white hover:opacity-90",
        secondary:
          "bg-white text-[var(--color-tierra)] border border-[rgba(212,197,169,0.8)] hover:bg-[rgba(240,237,230,0.6)]",
        outline:
          "border border-[rgba(212,197,169,0.8)] bg-transparent text-[var(--color-tierra)] hover:bg-white/60",
        ghost: "hover:bg-[rgba(58,74,50,0.08)] text-[var(--color-tierra)]",
        destructive: "bg-[#dc2626] text-white hover:bg-[#b91c1c]",
        link: "text-[var(--color-cuero)] underline-offset-4 hover:underline h-auto min-h-0 px-0",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6",
        icon: "h-10 w-10",
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

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
