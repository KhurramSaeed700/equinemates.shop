# Codex UI Preferences

Use this file as the quick taste reference before making frontend or admin UI changes in this repo.

## How To Maintain This File

- Update this file proactively when user feedback reveals a repeatable preference.
- Do not wait for an explicit request to add a preference here.
- Treat screenshot annotations and correction notes as durable taste signals when they repeat across UI tasks.
- Keep new notes concise and practical so they remain useful before future edits.
- If the same visual correction repeats, prefer a structural fix over stacking more CSS overrides.

## Core Style

- Keep admin and operational screens compact, practical, and scan-friendly.
- Prefer flat layouts over stacked cards or decorative panels.
- Avoid low-value admin header stats. Keep only the stat/action the user actually needs in that area.
- In dark mode, avoid unnecessary filled backgrounds. Inputs and previews should feel integrated with the canvas unless a frame is clearly needed.
- Alignment matters: related controls should share the same left edge, width, height, and row rhythm.
- Avoid adding dividers or separators unless they solve a clear readability issue. Remove them if they make the layout feel boxed in.
- Do not add explanatory UI text unless it is real user-facing content.
- Avoid opening visible local helper windows while running commands. Prefer direct terminal commands such as `pnpm.cmd` on Windows when needed.

## Admin Panel

- The product search bar should be as wide as the Product Name field area.
- The search input and its button should align cleanly with the field row below.
- Paired controls such as a search input plus Search button should combine into one clean footprint that matches the related field width.
- Keep the admin product finder focused on search. Do not add an `Open Product` toolbar button beside the Search button unless explicitly requested.
- Search bar height should match the side menu item height when those elements visually sit in the same band.
- Toolbar buttons should not float above or below nearby fields.
- When a screenshot says a button should line up with the field below, move it to that visual row or a clearly lower aligned row instead of leaving it cramped in the top toolbar.
- The side rail should stay compact and quiet. Do not add a vertical divider beside it by default.
- Product form inputs should sit in a tight grid with consistent vertical spacing.
- SKU input controls should sit higher in the row, with the SKU preview below them.
- Treat previews such as Base Price Preview as supporting information. In dark mode, avoid a separate filled block background unless explicitly requested.
- Upload section headings need enough top and bottom spacing so they do not feel cramped against the form above.
- Admin text-formatting helpers should be compact and field-adjacent, with icon-led buttons rather than a large rich-text toolbar.
- Long-description formatting should keep the site font and fixed text size. Include only useful inline/list controls such as bold, italic, underline, numbered list, and bulleted list; skip font, text-size, and alignment controls.
- Rich text fields should be true live-preview/WYSIWYG editors when formatting is requested. Do not show raw markers such as `**bold**` in the editable field.
- Prefer a proven editor library for rich text behavior, undo history, selection handling, and toggle commands instead of hand-rolling textarea string manipulation.
- List formatting buttons should be dual-function toggles: apply the list style when it is absent, and remove the same list style when it is already applied.
- Bullets and numbers in rich text fields must be visibly inside the editable area, including in dark mode and while text is selected.
- Admin form validation should be visual and immediate after a failed save attempt: add a clear red outline to each missed required field, and outline grouped requirements such as category selection or image upload at the panel/card level.
- For missing required fields, highlight the exact thing the user needs to fix. Do not rely only on generic status text.

## Mobile Navigation

- Mobile drawer headers should stay compact. Do not show redundant labels like `Account` or `Browse categories` when the avatar/menu context already explains the area.
- Mobile drawer utility controls should be icon-sized and left-aligned, not stretched into full-width buttons.
- Avoid extra square borders around icon controls unless the user explicitly asks for framed buttons.
- When framed mobile utility controls are requested, use compact square icon buttons in a row, similar to wishlist/cart/theme controls with small count badges.
- Category rows in the mobile drawer should be flat with square corners.
- Do not add internal divider lines between category labels and their chevron toggles.

## Footer

- On mobile, footer utility link groups can be arranged in a compact two-column layout when the content is short and scannable, while broader sections such as social links and newsletter signup should remain full width.

## Copy

- Empty category product pages should say exactly: `No products found in this category`
- Prefer direct, specific wording over generic filter language when the page context is a category.

## Visual Checks

- Check dark mode specifically for admin UI changes.
- Compare neighboring elements visually, not just by CSS values.
- Watch for hidden grid columns, unused optional buttons, or reserved layout space that makes fields look shorter than they should.
- If a change is made from a screenshot note, match the visible intent first: spacing, alignment, width, height, and visual weight.
