"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Switch (toggle)
 * - Compatible con dark mode
 * - Accesible (role="switch")
 * - Controlado o no controlado
 */
const Switch = React.forwardRef(
  (
    {
      className,
      checked,
      defaultChecked,
      onCheckedChange,
      disabled,
      ...props
    },
    ref
  ) => {
    const [internalChecked, setInternalChecked] = React.useState(
      defaultChecked ?? false
    );

    const isControlled = typeof checked === "boolean";
    const isChecked = isControlled ? checked : internalChecked;

    const toggle = () => {
      if (disabled) return;
      const next = !isChecked;
      if (!isControlled) setInternalChecked(next);
      onCheckedChange?.(next);
    };

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isChecked}
        onClick={toggle}
        disabled={disabled}
        className={cn(
          `
          relative inline-flex h-6 w-11 shrink-0
          cursor-pointer items-center
          rounded-full border-2 border-transparent
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${isChecked ? "bg-purple-600" : "bg-slate-300 dark:bg-zinc-700"}
          `,
          className
        )}
        {...props}
      >
        <span
          className={cn(
            `
            pointer-events-none block h-5 w-5
            rounded-full bg-white
            shadow-lg ring-0
            transition-transform duration-200
            ${isChecked ? "translate-x-5" : "translate-x-0"}
            `
          )}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
