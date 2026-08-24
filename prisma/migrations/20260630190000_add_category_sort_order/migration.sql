ALTER TABLE "Category"
ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Category_parentId_sortOrder_idx"
ON "Category"("parentId", "sortOrder");
