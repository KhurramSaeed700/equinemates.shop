import parse from "html-react-parser";
import sanitizeHtml from "sanitize-html";

import { cn } from "@/lib/utils";
import { normalizeRichTextInput } from "@/lib/rich-text";

type FormattedDescriptionProps = {
  className?: string;
  compact?: boolean;
  text: string;
};

const allowedRichTextTags = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
];

export function FormattedDescription({
  className,
  compact = false,
  text,
}: FormattedDescriptionProps) {
  const html = normalizeRichTextInput(text);

  if (!html) {
    return null;
  }

  const sanitizedHtml = sanitizeHtml(html, {
    allowedAttributes: {},
    allowedTags: allowedRichTextTags,
  });

  if (!sanitizedHtml.trim()) {
    return null;
  }

  return (
    <div
      className={cn(
        "formatted-description",
        compact && "formatted-description-compact",
        className,
      )}
    >
      {parse(sanitizedHtml)}
    </div>
  );
}
