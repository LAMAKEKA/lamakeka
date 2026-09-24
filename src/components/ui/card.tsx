import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white text-[var(--color-tierra)] shadow-sm",
        className
      )}
      style={{ borderColor: "rgba(212,197,169,0.5)" }}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 px-4 pt-3 pb-2", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn("text-sm font-semibold leading-none", className)}
      style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-xs text-[rgba(26,26,24,0.45)]", className)} {...props} />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-4 pb-3", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
