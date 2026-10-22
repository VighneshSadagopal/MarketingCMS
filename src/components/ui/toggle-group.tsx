"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

import { cn } from "@/lib/utils";

function ToggleGroup({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    />
  );
}

function ToggleGroupItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-input bg-white px-4 text-sm font-bold text-navy-800 data-[state=on]:border-2 data-[state=on]:border-blue-600 data-[state=on]:bg-ice-100",
        className
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
