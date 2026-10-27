import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white text-[var(--color-tierra)] shadow-[0_1px_3px_rgba(26,26,24,0.06)]",
        className
      )}
      style={{ borderColor: "rgba(212,197,169,0.5)" }}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1 px-4 pt-3.5 pb-2", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn("text-sm font-semibold leading-snug tracking-tight", className)}
      style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-xs leading-snug text-[rgba(26,26,24,0.5)]", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-4 pb-3.5", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-3 border-t",
        className
      )}
      style={{ borderColor: "rgba(212,197,169,0.4)" }}
      {...props}
    />
  );
}

/** Fila táctil para listados mobile (hacienda, lotes, etc.) */
function ListCard({
  className,
  active,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "w-full text-left rounded-2xl border bg-white px-4 py-3.5 min-h-[3.5rem]",
        "touch-manipulation transition-colors",
        "active:bg-[rgba(58,74,50,0.04)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        active && "ring-2 ring-[var(--color-campo)]/30",
        className
      )}
      style={{
        borderColor: "rgba(212,197,169,0.55)",
        boxShadow: "0 1px 3px rgba(26,26,24,0.05)",
      }}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  ListCard,
};
