import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded border border-transparent px-1.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      colorScheme: {
        neutral:
          "bg-neutral-500/10 text-neutral-500 dark:bg-neutral-400/20 dark:text-neutral-400",
        red: "bg-red-500/10 text-red-500 dark:bg-red-400/20 dark:text-red-400",
        green:
          "bg-green-500/10 text-green-500 dark:bg-green-400/20 dark:text-green-400",
      },
    },

    defaultVariants: {
      colorScheme: "neutral",
    },
  }
);

function Badge({
  className,
  colorScheme,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ colorScheme }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
