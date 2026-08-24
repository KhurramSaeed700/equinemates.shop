ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "amazonSellerSku" TEXT,
  ADD COLUMN IF NOT EXISTS "amazonAsin" TEXT,
  ADD COLUMN IF NOT EXISTS "amazonStoreUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "amazonFulfillableQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "amazonInventoryUpdatedAt" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "amazonMcfEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentProviderSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentProviderPaymentIntentId" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentCheckoutUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "fulfillmentSource" TEXT,
  ADD COLUMN IF NOT EXISTS "fulfillmentStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "amazonFulfillmentOrderId" TEXT;

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "fulfillmentSource" TEXT,
  ADD COLUMN IF NOT EXISTS "amazonSellerSku" TEXT;

CREATE INDEX IF NOT EXISTS "Product_amazonSellerSku_idx" ON "Product"("amazonSellerSku");
CREATE INDEX IF NOT EXISTS "Order_paymentProviderSessionId_idx" ON "Order"("paymentProviderSessionId");
CREATE INDEX IF NOT EXISTS "Order_fulfillmentSource_idx" ON "Order"("fulfillmentSource");
