type FulfillmentProduct = {
  slug: string;
  stock: number;
  amazonSellerSku: string | null;
  amazonFulfillableQuantity: number | null;
  amazonMcfEnabled: boolean | null;
};

type FulfillmentItemInput = {
  productSlug: string;
  quantity: number;
};

export type FulfillmentItemRoute = {
  productSlug: string;
  source: "LOCAL" | "AMAZON_MCF";
  amazonSellerSku: string | null;
};

export type FulfillmentPlan = {
  source: "LOCAL" | "AMAZON_MCF" | "MIXED";
  status: "READY" | "NEEDS_AMAZON_CONFIGURATION";
  items: FulfillmentItemRoute[];
  message: string;
};

export function isAmazonMcfConfigured() {
  return Boolean(
    process.env.AMAZON_SP_API_REFRESH_TOKEN
      && process.env.AMAZON_SP_API_CLIENT_ID
      && process.env.AMAZON_SP_API_CLIENT_SECRET
      && process.env.AMAZON_SP_API_AWS_ACCESS_KEY_ID
      && process.env.AMAZON_SP_API_AWS_SECRET_ACCESS_KEY
      && process.env.AMAZON_SP_API_ROLE_ARN
      && process.env.AMAZON_SP_API_MARKETPLACE_ID,
  );
}

export function buildFulfillmentPlan({
  items,
  productsBySlug,
}: {
  items: FulfillmentItemInput[];
  productsBySlug: Map<string, FulfillmentProduct>;
}): FulfillmentPlan {
  const routes = items.map((item) => {
    const product = productsBySlug.get(item.productSlug);
    const requestedQuantity = Math.max(1, Math.floor(item.quantity));
    const localStock = Math.max(0, product?.stock ?? 0);
    const amazonStock = Math.max(0, product?.amazonFulfillableQuantity ?? 0);
    const canUseAmazon =
      Boolean(product?.amazonMcfEnabled)
      && Boolean(product?.amazonSellerSku)
      && amazonStock >= requestedQuantity;

    if (localStock >= requestedQuantity || !canUseAmazon) {
      return {
        productSlug: item.productSlug,
        source: "LOCAL" as const,
        amazonSellerSku: null,
      };
    }

    return {
      productSlug: item.productSlug,
      source: "AMAZON_MCF" as const,
      amazonSellerSku: product?.amazonSellerSku ?? null,
    };
  });
  const hasLocal = routes.some((route) => route.source === "LOCAL");
  const hasAmazon = routes.some((route) => route.source === "AMAZON_MCF");
  const source = hasLocal && hasAmazon ? "MIXED" : hasAmazon ? "AMAZON_MCF" : "LOCAL";
  const amazonConfigured = !hasAmazon || isAmazonMcfConfigured();

  return {
    source,
    status: amazonConfigured ? "READY" : "NEEDS_AMAZON_CONFIGURATION",
    items: routes,
    message: amazonConfigured
      ? "Fulfillment route selected."
      : "Amazon MCF items are present, but SP-API credentials are not configured yet.",
  };
}
