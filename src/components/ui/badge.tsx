import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-none whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-[rgba(58,74,50,0.10)] text-[var(--color-campo)]",
        secondary: "bg-[rgba(212,197,169,0.45)] text-[var(--color-tierra)]",
        success: "bg-[rgba(22,163,74,0.10)] text-[#16a34a]",
        warning: "bg-[rgba(217,119,6,0.12)] text-[#d97706]",
        danger: "bg-[rgba(220,38,38,0.08)] text-[#dc2626]",
        info: "bg-[rgba(37,99,235,0.10)] text-[#2563eb]",
        muted: "bg-[rgba(107,114,128,0.12)] text-[#6b7280]",
        outline:
          "border border-[rgba(212,197,169,0.8)] bg-transparent text-[var(--color-tierra)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
