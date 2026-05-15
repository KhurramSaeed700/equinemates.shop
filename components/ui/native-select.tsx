import * as React from "react";

import { cn } from "@/lib/utils";

type NativeSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, ...props }, ref) => (
    <select className={cn("ui-select", className)} ref={ref} {...props} />
  ),
);

NativeSelect.displayName = "NativeSelect";
