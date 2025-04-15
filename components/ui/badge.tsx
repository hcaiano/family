import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        solid: "border-transparent",
        outline: "border-input bg-transparent",
      },
      colorScheme: {
        neutral: "",
        red: "",
        green: "",
      },
    },

    compoundVariants: [
      {
        variant: "solid",
        colorScheme: "neutral",
        className:
          "bg-neutral-500 text-white dark:bg-neutral-300 dark:text-neutral-900",
      },
      {
        variant: "outline",
        colorScheme: "neutral",
        className:
          "border-neutral-300 text-neutral-800 bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-200 dark:border-neutral-700",
      },
      {
        variant: "solid",
        colorScheme: "red",
        className: "bg-red-500 text-red-50 dark:bg-red-400 dark:text-black",
      },
      {
        variant: "outline",
        colorScheme: "red",
        className:
          "border-red-500 text-red-500 bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50",
      },
      {
        variant: "solid",
        colorScheme: "green",
        className:
          "bg-green-500 text-green-50 dark:bg-green-400 dark:text-black",
      },
      {
        variant: "outline",
        colorScheme: "green",
        className:
          "border-green-500 text-green-500 bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50",
      },
    ],

    defaultVariants: {
      variant: "solid",
      colorScheme: "neutral",
    },
  }
);

function Badge({
  className,
  variant,
  colorScheme,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, colorScheme }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
