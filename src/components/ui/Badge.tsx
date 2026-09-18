import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "outline" | "amber" | "live";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-[var(--color-foreground)] text-[var(--color-background)]",
    destructive: "border-transparent bg-red-500 text-white",
    outline: "text-[var(--color-foreground)] border-gray-700 bg-transparent",
    amber: "border-transparent bg-[var(--color-kinetic-amber)] text-white font-bold",
    live: "border-transparent bg-transparent text-[var(--color-kinetic-amber)] flex items-center gap-1.5 uppercase font-mono tracking-widest text-[10px]",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
