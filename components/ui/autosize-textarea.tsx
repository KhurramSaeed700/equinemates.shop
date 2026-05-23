"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type AutosizeTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const AutosizeTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AutosizeTextareaProps
>(({ className, onInput, value, ...props }, forwardedRef) => {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const setRefs = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef],
  );

  const resize = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  React.useLayoutEffect(() => {
    resize();
  }, [resize, value]);

  return (
    <textarea
      className={cn("ui-textarea autosize-textarea", className)}
      onInput={(event) => {
        resize();
        onInput?.(event);
      }}
      ref={setRefs}
      value={value}
      {...props}
    />
  );
});

AutosizeTextarea.displayName = "AutosizeTextarea";
