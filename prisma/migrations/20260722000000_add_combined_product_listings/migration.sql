ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "parentListingId" TEXT;

CREATE INDEX IF NOT EXISTS "Product_parentListingId_idx"
ON "Product"("parentListingId");

DO $$
BEGIN
  ALTER TABLE "Product"
  ADD CONSTRAINT "Product_parentListingId_fkey"
  FOREIGN KEY ("parentListingId") REFERENCES "Product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
