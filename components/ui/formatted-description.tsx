import { cn } from "@/lib/utils";

type DescriptionBlock =
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "list";
      items: string[];
    };

type FormattedDescriptionProps = {
  className?: string;
  compact?: boolean;
  text: string;
};

function parseDescription(text: string): DescriptionBlock[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks: DescriptionBlock[] = [];

  for (const line of lines) {
    const bulletMatch = line.match(/^(?:[-*+•‣▪–—]|\d+[.)])\s*(.+)$/u);

    if (bulletMatch) {
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock?.type === "list") {
        lastBlock.items.push(bulletMatch[1].trim());
      } else {
        blocks.push({ type: "list", items: [bulletMatch[1].trim()] });
      }
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
  }

  return blocks;
}

export function FormattedDescription({
  className,
  compact = false,
  text,
}: FormattedDescriptionProps) {
  const blocks = parseDescription(text);

  if (!blocks.length) {
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
      {blocks.map((block, index) =>
        block.type === "list" ? (
          <ul key={`list-${index}`}>
            {block.items.map((item, itemIndex) => (
              <li key={`${item}-${itemIndex}`}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={`paragraph-${index}`}>{block.text}</p>
        ),
      )}
    </div>
  );
}
