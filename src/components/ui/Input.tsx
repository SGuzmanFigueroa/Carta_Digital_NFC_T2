import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startIcon, endIcon, ...props }, ref) => {
    return (
      <div className="relative flex w-full items-center">
        {startIcon && (
          <div className="absolute left-3 text-gray-400">
            {startIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-12 w-full rounded-xl border border-[var(--color-obsidian-lighter)] bg-[var(--color-obsidian-light)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-kinetic-amber)] disabled:cursor-not-allowed disabled:opacity-50",
            startIcon && "pl-10",
            endIcon && "pr-10",
            className
          )}
          ref={ref}
          {...props}
        />
        {endIcon && (
          <div className="absolute right-3 text-gray-400">
            {endIcon}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
