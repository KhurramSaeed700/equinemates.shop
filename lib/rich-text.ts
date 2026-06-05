const supportedHtmlPattern = /<\/?(?:p|br|strong|b|em|i|u|ul|ol|li)\b/iu;
const unorderedPrefixPattern = /^(?:[-*+\u2022\u2023\u25AA\u2013\u2014])\s*(.+)$/u;
const orderedPrefixPattern = /^(\d+)[.)]\s*(.+)$/u;
const inlineFormatPattern = /(<u>(.*?)<\/u>|\*\*(.*?)\*\*|\*(.*?)\*)/giu;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function renderLegacyInlineFormat(value: string): string {
  let html = "";
  let lastIndex = 0;

  for (const match of value.matchAll(inlineFormatPattern)) {
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      html += escapeHtml(value.slice(lastIndex, matchIndex));
    }

    const [rawValue, , underlinedText, boldText, italicText] = match;

    if (underlinedText) {
      html += `<u>${escapeHtml(underlinedText)}</u>`;
    } else if (boldText) {
      html += `<strong>${escapeHtml(boldText)}</strong>`;
    } else if (italicText) {
      html += `<em>${escapeHtml(italicText)}</em>`;
    }

    lastIndex = matchIndex + rawValue.length;
  }

  if (lastIndex < value.length) {
    html += escapeHtml(value.slice(lastIndex));
  }

  return html;
}

function shouldTreatLinesAsList(lines: string[]): boolean {
  if (lines.length < 2) {
    return false;
  }

  return lines.every((line) => line.length <= 160);
}

function getListMatch(
  line: string,
): { item: string; style: "ordered" | "unordered" } | null {
  const orderedMatch = line.match(orderedPrefixPattern);

  if (orderedMatch) {
    return { item: orderedMatch[2].trim(), style: "ordered" };
  }

  const unorderedMatch = line.match(unorderedPrefixPattern);

  if (unorderedMatch) {
    return { item: unorderedMatch[1].trim(), style: "unordered" };
  }

  return null;
}

function renderList(style: "ordered" | "unordered", items: string[]): string {
  const tag = style === "ordered" ? "ol" : "ul";
  const listItems = items
    .map((item) => `<li><p>${renderLegacyInlineFormat(item)}</p></li>`)
    .join("");

  return `<${tag}>${listItems}</${tag}>`;
}

export function descriptionTextToHtml(value: string): string {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const hasExplicitList = lines.some((line) => getListMatch(line));
  const blocks: string[] = [];
  let pendingListStyle: "ordered" | "unordered" | null = null;
  let pendingListItems: string[] = [];

  if (!lines.length) {
    return "";
  }

  if (!hasExplicitList && shouldTreatLinesAsList(lines)) {
    return renderList("unordered", lines);
  }

  const flushList = () => {
    if (!pendingListStyle || !pendingListItems.length) {
      return;
    }

    blocks.push(renderList(pendingListStyle, pendingListItems));
    pendingListStyle = null;
    pendingListItems = [];
  };

  for (const line of lines) {
    const listMatch = getListMatch(line);

    if (listMatch) {
      if (pendingListStyle && pendingListStyle !== listMatch.style) {
        flushList();
      }

      pendingListStyle = listMatch.style;
      pendingListItems.push(listMatch.item);
      continue;
    }

    flushList();
    blocks.push(`<p>${renderLegacyInlineFormat(line)}</p>`);
  }

  flushList();

  return blocks.join("");
}

export function normalizeRichTextInput(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  return supportedHtmlPattern.test(trimmedValue)
    ? trimmedValue
    : descriptionTextToHtml(trimmedValue);
}

export function getRichTextPlainText(value: string): string {
  const normalizedValue = normalizeRichTextInput(value);

  return decodeHtmlEntities(
    normalizedValue
      .replace(/<br\s*\/?>/giu, "\n")
      .replace(/<\/(?:p|li)>/giu, "\n")
      .replace(/<\/?(?:p|ul|ol|li|strong|b|em|i|u|br)[^>]*>/giu, "")
      .replace(/<[^>]+>/gu, "")
      .replace(/\n{3,}/g, "\n\n"),
  ).trim();
}

export function normalizeRichTextForStorage(value: string): string {
  const normalizedValue = normalizeRichTextInput(value);

  return getRichTextPlainText(normalizedValue) ? normalizedValue : "";
}
