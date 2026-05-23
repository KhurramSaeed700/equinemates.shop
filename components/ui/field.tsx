import * as React from "react";

import { cn } from "@/lib/utils";

function Field({
  className,
  dataInvalid,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "vertical" | "horizontal" | "responsive";
  dataInvalid?: boolean;
}) {
  return (
    <div
      className={cn("field", `field-${orientation}`, className)}
      data-invalid={dataInvalid || undefined}
      role="group"
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("field-group", className)} {...props} />;
}

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return <fieldset className={cn("field-set", className)} {...props} />;
}

function FieldLegend({ className, ...props }: React.ComponentProps<"legend">) {
  return <legend className={cn("field-legend", className)} {...props} />;
}

function FieldLabel({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("field-label", className)} {...props} />;
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("field-content", className)} {...props} />;
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("field-title", className)} {...props} />;
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("field-description", className)} {...props} />;
}

function FieldSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("field-separator", className)} {...props} />;
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>;
}) {
  const messages = errors?.map((error) => error?.message).filter(Boolean) ?? [];

  if (!children && messages.length === 0) {
    return null;
  }

  return (
    <div className={cn("field-error", className)} {...props}>
      {children ??
        (messages.length === 1 ? (
          messages[0]
        ) : (
          <ul>
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ))}
    </div>
  );
}

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
};
