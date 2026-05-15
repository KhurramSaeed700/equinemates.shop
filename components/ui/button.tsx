import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "icon" | "unstyled";
type ButtonSize = "default" | "compact" | "icon";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "ui-button-ghost",
  icon: "ui-button-icon",
  unstyled: "",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "",
  compact: "compact",
  icon: "ui-button-size-icon",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      size = "default",
      type = "button",
      variant = "secondary",
      ...props
    },
    ref,
  ) => (
    <button
      className={cn(variantClasses[variant], sizeClasses[size], className)}
      ref={ref}
      type={type}
      {...props}
    />
  ),
);

Button.displayName = "Button";
