"use client";

import Link from "next/link";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiSearch,
  FiStar,
  FiTrash2,
} from "react-icons/fi";

import {
  R2ImageUploadForm,
  type R2ImageUploadFormHandle,
} from "@/components/forms/r2-image-upload-form";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ProductMedia } from "@/components/ui/product-media";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { getProductImageSrc } from "@/lib/image-utils";
import {
  getRichTextPlainText,
  normalizeRichTextForStorage,
} from "@/lib/rich-text";
import { useToast } from "@/lib/use-toast";
import {
  CurrencyCode,
  Product,
  ProductCategory,
  ProductVariant,
} from "@/lib/types";

type CategoryNode = {
  name: string;
  children: CategoryNode[];
};

type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  category: ProductCategory;
  primaryImage: string | null;
  parentListingId?: string;
};

type ProductDraft = {
  originalSlug: string;
  slug: string;
  name: string;
  sku: string;
  skuPrefix: string;
  skuItemNumber: string;
  category: ProductCategory;
  categoryPath: string;
  shortDescription: string;
  longDescription: string;
  basePriceUsd: string;
  stock: string;
  amazonSellerSku: string;
  amazonAsin: string;
  amazonStoreUrl: string;
  amazonFulfillableQuantity: string;
  amazonInventoryUpdatedAt: string;
  amazonMcfEnabled: boolean;
  tags: string;
  images: string[];
  bannerImages: string[];
  variants: ProductVariant[];
  isBestSeller: boolean;
  isNewArrival: boolean;
  careInstructions: string;
  shippingInfo: string;
};

type AdminProductEditorProps = {
  categoryTree: CategoryNode[];
  categoryOptions: ProductCategory[];
  initialMode?: "edit" | "duplicate";
  initialProduct: Product | null;
  initialProducts: ProductSummary[];
  ratesFromPkr: Record<CurrencyCode, number>;
};

type ProductResponse = {
  message?: string;
  product?: Product;
  products?: ProductSummary[];
};

type ProductDeleteResponse = {
  message?: string;
  name?: string;
  deleted?: boolean;
  deactivated?: boolean;
};

type ImageDeleteResponse = {
  message?: string;
  deletedKeys?: string[];
  failed?: Array<{
    key: string;
    message: string;
  }>;
  skippedSharedKeys?: string[];
  skippedSources?: string[];
};

type SkuAvailabilityResponse = {
  message?: string;
  sku?: string;
  available?: boolean;
  product?: {
    id: string;
    slug: string;
    sku: string;
    name: string;
  } | null;
};

type SkuAvailabilityState = {
  state: "idle" | "checking" | "available" | "duplicate" | "error";
  checkedSku: string;
  message: string;
};

type AdminValidationField =
  | "name"
  | "sku"
  | "basePriceUsd"
  | "stock"
  | "category"
  | "shortDescription"
  | "longDescription"
  | "careInstructions"
  | "images";

type CategoryPathMatch = {
  key: string;
  path: string[];
};

const SKU_PREFIX_OPTIONS = ["EQM", "HOR", "PET", "RID", "STA"];
const DEFAULT_SKU_PREFIX = SKU_PREFIX_OPTIONS[0];
const SKU_ITEM_NUMBER_MAX_LENGTH = 24;
const SUCCESS_REDIRECT_DELAY_MS = 10_000;
const VARIANT_PRESETS: ProductVariant[] = [
  { id: "size", label: "Size", options: ["Small", "Medium", "Large"] },
  { id: "color", label: "Color", options: ["White", "Black", "Brown"] },
  { id: "style", label: "Style", options: [] },
  { id: "hand-orientation", label: "Hand Orientation", options: ["Left", "Right"] },
];

function createSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\/+/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSku(value: string): string {
  return value.trim().toUpperCase();
}

function sanitizeSkuPrefix(value: string): string {
  const normalizedPrefix = normalizeSku(value).replace(/[^A-Z0-9]/g, "");
  return normalizedPrefix || DEFAULT_SKU_PREFIX;
}

function sanitizeSkuItemNumber(value: string): string {
  return normalizeSku(value)
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .slice(0, SKU_ITEM_NUMBER_MAX_LENGTH);
}

function buildSku(prefix: string, itemNumber: string): string {
  const safePrefix = sanitizeSkuPrefix(prefix);
  const safeItemNumber = sanitizeSkuItemNumber(itemNumber);

  return safeItemNumber ? `${safePrefix}-${safeItemNumber}` : "";
}

function createVariantId(label: string): string {
  const slug = createSlug(label);
  return slug || `custom-${Date.now().toString(36)}`;
}

function parseVariantOptions(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((option) => option.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeProductVariants(variants: ProductVariant[]): ProductVariant[] {
  return variants
    .map((variant) => {
      const label = variant.label.trim();
      const options = parseVariantOptions(variant.options.join("\n"));

      return {
        id: variant.id.trim() || createVariantId(label),
        label,
        options,
      };
    })
    .filter((variant) => variant.label && variant.options.length > 0);
}

function parseSkuParts(value: string): Pick<ProductDraft, "sku" | "skuPrefix" | "skuItemNumber"> {
  const normalizedSku = normalizeSku(value);
  const [prefix, ...itemParts] = normalizedSku.split("-");
  const itemNumber = itemParts.length > 0 ? itemParts.join("-") : normalizedSku;
  const skuPrefix = itemParts.length > 0 ? sanitizeSkuPrefix(prefix) : DEFAULT_SKU_PREFIX;
  const skuItemNumber = sanitizeSkuItemNumber(itemNumber);

  return {
    sku: buildSku(skuPrefix, skuItemNumber),
    skuPrefix,
    skuItemNumber,
  };
}

function splitCategoryPath(value: string): string[] {
  return value
    .split(">")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function buildUploadFolder(categoryPath: string[], itemNumber: string): string {
  const safeCategoryPath = categoryPath
    .map((segment) => segment.trim())
    .filter(Boolean);
  const safeItemNumber = sanitizeSkuItemNumber(itemNumber);

  if (!safeCategoryPath.length || !safeItemNumber) {
    return "";
  }

  return ["Products", ...safeCategoryPath, safeItemNumber].join("/");
}

function flattenCategoryPaths(
  nodes: CategoryNode[],
  basePath: string[] = [],
): CategoryPathMatch[] {
  const paths: CategoryPathMatch[] = [];

  for (const node of nodes) {
    const nextPath = [...basePath, node.name];
    paths.push({
      key: nextPath.join(" > "),
      path: nextPath,
    });

    if (node.children.length > 0) {
      paths.push(...flattenCategoryPaths(node.children, nextPath));
    }
  }

  return paths;
}

function getCategoryNodesAtLevel(
  categoryTree: CategoryNode[],
  selectedPath: string[],
): CategoryNode[] {
  let currentNodes = categoryTree;

  for (const segment of selectedPath) {
    const nextNode = currentNodes.find((node) => node.name === segment);
    if (!nextNode) {
      return [];
    }
    currentNodes = nextNode.children;
  }

  return currentNodes;
}

function getNodeForPath(
  categoryTree: CategoryNode[],
  selectedPath: string[],
): CategoryNode | null {
  let currentNodes = categoryTree;
  let currentNode: CategoryNode | null = null;

  for (const segment of selectedPath) {
    currentNode = currentNodes.find((node) => node.name === segment) ?? null;
    if (!currentNode) {
      return null;
    }
    currentNodes = currentNode.children;
  }

  return currentNode;
}

function parseDecimalInput(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function convertUsdToPkr(
  amountUsd: number | null,
  ratesFromPkr: Partial<Record<CurrencyCode, number>>,
): number | null {
  if (amountUsd === null) {
    return null;
  }

  const usdRate = ratesFromPkr.USD;
  if (typeof usdRate !== "number" || !Number.isFinite(usdRate) || usdRate <= 0) {
    return null;
  }

  return amountUsd / usdRate;
}

function formatCurrency(amount: number | null, currency: "PKR" | "EUR"): string {
  if (amount === null) {
    return "--";
  }

  return new Intl.NumberFormat(currency === "PKR" ? "en-PK" : "de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "PKR" ? 0 : 2,
  }).format(amount);
}

function normalizeAmazonAsin(value: string): string {
  const trimmedValue = value.trim();
  const dpMatch = trimmedValue.match(/\/dp\/([a-z0-9]{10})/i);

  if (dpMatch?.[1]) {
    return dpMatch[1].toUpperCase();
  }

  return trimmedValue.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function buildAmazonListingUrl(asin: string): string {
  const normalizedAsin = normalizeAmazonAsin(asin);

  return normalizedAsin ? `https://www.amazon.com/dp/${normalizedAsin}` : "";
}

function createEmptyDraft(): ProductDraft {
  return {
    originalSlug: "",
    slug: "",
    name: "",
    sku: "",
    skuPrefix: DEFAULT_SKU_PREFIX,
    skuItemNumber: "",
    category: "",
    categoryPath: "",
    shortDescription: "",
    longDescription: "",
    basePriceUsd: "",
    stock: "",
    amazonSellerSku: "",
    amazonAsin: "",
    amazonStoreUrl: "",
    amazonFulfillableQuantity: "",
    amazonInventoryUpdatedAt: "",
    amazonMcfEnabled: false,
    tags: "",
    images: [],
    bannerImages: [],
    variants: [],
    isBestSeller: false,
    isNewArrival: false,
    careInstructions: "",
    shippingInfo: "",
  };
}

function toDraft(product: Product): ProductDraft {
  const skuParts = parseSkuParts(product.sku);

  return {
    originalSlug: product.slug,
    slug: product.slug,
    name: product.name,
    ...skuParts,
    category: product.category,
    categoryPath: product.categoryPath.join(" > "),
    shortDescription: product.shortDescription,
    longDescription: product.longDescription,
    basePriceUsd: String(product.basePriceUsd),
    stock: String(product.stock),
    amazonSellerSku: product.amazonSellerSku ?? "",
    amazonAsin: product.amazonAsin ?? "",
    amazonStoreUrl: product.amazonStoreUrl ?? "",
    amazonFulfillableQuantity: String(product.amazonFulfillableQuantity ?? 0),
    amazonInventoryUpdatedAt: product.amazonInventoryUpdatedAt ?? "",
    amazonMcfEnabled: product.amazonMcfEnabled,
    tags: product.tags.join(", "),
    images: [...product.images],
    bannerImages: [...product.bannerImages],
    variants: normalizeProductVariants(product.variants),
    isBestSeller: product.isBestSeller,
    isNewArrival: product.isNewArrival,
    careInstructions: product.careInstructions ?? "",
    shippingInfo: product.shippingInfo ?? "",
  };
}

function toSimilarDraft(product: Product): ProductDraft {
  const sourceDraft = toDraft(product);
  const similarName = `${product.name} Copy`;

  return {
    ...sourceDraft,
    originalSlug: "",
    slug: createSlug(similarName),
    name: similarName,
    sku: buildSku(sourceDraft.skuPrefix, ""),
    skuItemNumber: "",
    images: [...sourceDraft.images],
    variants: [...sourceDraft.variants],
  };
}

function toSummary(product: Product): ProductSummary {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    category: product.category,
    primaryImage: product.images[0] ?? null,
    parentListingId: product.parentListingId,
  };
}

function sortProducts(products: ProductSummary[]): ProductSummary[] {
  return [...products].sort((left, right) => left.name.localeCompare(right.name));
}

export function AdminProductEditor({
  categoryTree,
  categoryOptions,
  initialMode = "edit",
  initialProduct,
  initialProducts,
  ratesFromPkr,
}: AdminProductEditorProps) {
  const toast = useToast();
  const [products, setProducts] = useState(() => sortProducts(initialProducts));
  const [draft, setDraft] = useState<ProductDraft>(() =>
    initialProduct
      ? initialMode === "duplicate"
        ? toSimilarDraft(initialProduct)
        : toDraft(initialProduct)
      : createEmptyDraft(),
  );
  const [productSearch, setProductSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [isCategoryEditing, setIsCategoryEditing] = useState(
    () => !(initialProduct?.categoryPath.length),
  );
  const [status, setStatus] = useState(() =>
    initialProduct && initialMode === "duplicate"
      ? "Duplicate draft ready. Update the SKU and details before uploading."
      : "",
  );
  const [validationFields, setValidationFields] = useState<
    Set<AdminValidationField>
  >(() => new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isWaitingForImages, setIsWaitingForImages] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [loadingProductSlug, setLoadingProductSlug] = useState("");
  const [deletingProductSlug, setDeletingProductSlug] = useState<string | null>(null);
  const [deletingImageUrl, setDeletingImageUrl] = useState("");
  const [productPendingDelete, setProductPendingDelete] =
    useState<ProductSummary | null>(null);
  const [productDeleteError, setProductDeleteError] = useState("");
  const [savedProductAction, setSavedProductAction] = useState<Product | null>(null);
  const [uploadResetSignal, setUploadResetSignal] = useState(0);
  const [listingGroupSearch, setListingGroupSearch] = useState("");
  const [selectedListingIds, setSelectedListingIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isUpdatingListingGroup, setIsUpdatingListingGroup] = useState(false);
  const [listingGroupStatus, setListingGroupStatus] = useState("");
  const [skuAvailability, setSkuAvailability] = useState<SkuAvailabilityState>({
    state: "idle",
    checkedSku: "",
    message: "",
  });
  const skuCheckRequestRef = useRef(0);
  const uploadFormRef = useRef<R2ImageUploadFormHandle>(null);
  const bannerUploadFormRef = useRef<R2ImageUploadFormHandle>(null);
  const adminPanelLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!savedProductAction) {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      adminPanelLinkRef.current?.click();
    }, SUCCESS_REDIRECT_DELAY_MS);

    return () => window.clearTimeout(redirectTimer);
  }, [savedProductAction]);

  const selectedCategoryPath = splitCategoryPath(draft.categoryPath);
  const categoryPaths = flattenCategoryPaths(categoryTree);
  const normalizedCategorySearch = categorySearch.trim().toLowerCase();
  const matchingCategoryPaths = normalizedCategorySearch
    ? categoryPaths
        .filter(({ key, path }) => {
          const label = key.toLowerCase();
          return (
            label.includes(normalizedCategorySearch) ||
            path[path.length - 1]?.toLowerCase().includes(normalizedCategorySearch)
          );
        })
        .slice(0, 8)
    : [];
  const activeCategoryOptions = getCategoryNodesAtLevel(categoryTree, selectedCategoryPath);
  const activeCategoryNode = getNodeForPath(categoryTree, selectedCategoryPath);
  const categorySelectionComplete =
    selectedCategoryPath.length > 0 &&
    (selectedCategoryPath.length >= 3 || (activeCategoryNode?.children.length ?? 0) === 0);
  const normalizedProductSearch = productSearch.trim().toLowerCase();
  const filteredProducts = normalizedProductSearch
    ? products.filter((product) => {
        const label = `${product.name} ${product.sku} ${product.category}`.toLowerCase();
        return label.includes(normalizedProductSearch);
      })
    : [];
  const visibleProductResults = filteredProducts.slice(0, 8);
  const currentProductSummary = products.find(
    (product) => product.slug === draft.originalSlug,
  );
  const listingParentSummary = currentProductSummary?.parentListingId
    ? products.find(
        (product) => product.id === currentProductSummary.parentListingId,
      )
    : currentProductSummary;
  const listingChildren = listingParentSummary
    ? products.filter(
        (product) => product.parentListingId === listingParentSummary.id,
      )
    : [];
  const listingParentIds = new Set(
    products
      .map((product) => product.parentListingId)
      .filter((id): id is string => Boolean(id)),
  );
  const normalizedListingGroupSearch = listingGroupSearch.trim().toLowerCase();
  const listingCandidates =
    currentProductSummary &&
    !currentProductSummary.parentListingId &&
    normalizedListingGroupSearch
      ? products
          .filter((product) => {
            if (
              product.id === currentProductSummary.id ||
              product.parentListingId ||
              listingParentIds.has(product.id)
            ) {
              return false;
            }

            return `${product.name} ${product.sku} ${product.category}`
              .toLowerCase()
              .includes(normalizedListingGroupSearch);
          })
          .slice(0, 8)
      : [];
  const basePricePkrPreview = convertUsdToPkr(
    parseDecimalInput(draft.basePriceUsd),
    ratesFromPkr,
  );
  const normalizedDraftSku = normalizeSku(draft.sku);
  const skuIsKnownDuplicate =
    skuAvailability.state === "duplicate" &&
    skuAvailability.checkedSku === normalizedDraftSku;
  const skuIsKnownAvailable =
    skuAvailability.state === "available" &&
    skuAvailability.checkedSku === normalizedDraftSku;
  const skuPrefixOptions = SKU_PREFIX_OPTIONS.includes(draft.skuPrefix)
    ? SKU_PREFIX_OPTIONS
    : [draft.skuPrefix, ...SKU_PREFIX_OPTIONS];
  const uploadFolder = buildUploadFolder(
    selectedCategoryPath,
    draft.skuItemNumber,
  );
  const uploadDisabledMessage = !selectedCategoryPath.length
    ? "Select the product category path before uploading images."
    : !draft.skuItemNumber.trim()
      ? "Enter the product item number before uploading images."
      : "";
  const isEditingProduct = Boolean(draft.originalSlug);
  const saveButtonLabel = isWaitingForImages
    ? "Waiting for images..."
    : isSaving
    ? isEditingProduct
      ? "Updating..."
      : "Uploading..."
    : isEditingProduct
      ? "Update Product"
      : "Upload Product";
  const basePriceIsValid = parseDecimalInput(draft.basePriceUsd) !== null;
  const stockNumber = Number(draft.stock);
  const stockIsValid =
    draft.stock.trim().length > 0 &&
    Number.isFinite(stockNumber) &&
    stockNumber >= 0;
  const hasImagesReady =
    draft.images.length > 0 || Boolean(uploadFormRef.current?.hasPendingImages());
  const missingName =
    validationFields.has("name") && !draft.name.trim();
  const missingSku =
    validationFields.has("sku") &&
    (!draft.sku.trim() || !draft.skuItemNumber.trim());
  const missingBasePrice =
    validationFields.has("basePriceUsd") && !basePriceIsValid;
  const missingStock =
    validationFields.has("stock") && !stockIsValid;
  const missingCategory =
    validationFields.has("category") && !categorySelectionComplete;
  const missingShortDescription =
    validationFields.has("shortDescription") &&
    !getRichTextPlainText(draft.shortDescription);
  const missingLongDescription =
    validationFields.has("longDescription") &&
    !getRichTextPlainText(draft.longDescription);
  const missingCareInstructions =
    validationFields.has("careInstructions") &&
    !getRichTextPlainText(draft.careInstructions);
  const missingImages =
    validationFields.has("images") && !hasImagesReady;

  const updateDraft = (
    field: keyof ProductDraft,
    value: string | boolean | string[] | ProductVariant[],
  ) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  };

  const updateSkuParts = (nextParts: Partial<Pick<ProductDraft, "skuPrefix" | "skuItemNumber">>) => {
    resetSkuAvailability();
    setDraft((currentDraft) => {
      const skuPrefix = nextParts.skuPrefix ?? currentDraft.skuPrefix;
      const skuItemNumber = nextParts.skuItemNumber ?? currentDraft.skuItemNumber;

      return {
        ...currentDraft,
        sku: buildSku(skuPrefix, skuItemNumber),
        skuPrefix,
        skuItemNumber,
      };
    });
  };

  const resetSkuAvailability = useCallback(() => {
    skuCheckRequestRef.current += 1;
    setSkuAvailability({
      state: "idle",
      checkedSku: "",
      message: "",
    });
  }, []);

  const checkSkuAvailability = useCallback(async (): Promise<boolean> => {
    const sku = normalizeSku(draft.sku);

    if (!sku || !draft.skuItemNumber.trim()) {
      setSkuAvailability({
        state: "idle",
        checkedSku: "",
        message: "",
      });
      return false;
    }

    const requestId = skuCheckRequestRef.current + 1;
    skuCheckRequestRef.current = requestId;
    setSkuAvailability({
      state: "checking",
      checkedSku: sku,
      message: "Checking SKU availability...",
    });

    try {
      const searchParams = new URLSearchParams({ sku });
      if (draft.originalSlug) {
        searchParams.set("originalSlug", draft.originalSlug);
      }

      const response = await fetch(`/api/admin/products?${searchParams.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as SkuAvailabilityResponse;

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not check SKU availability.");
      }

      if (skuCheckRequestRef.current !== requestId) {
        return false;
      }

      if (payload.available) {
        setSkuAvailability({
          state: "available",
          checkedSku: payload.sku ?? sku,
          message: "SKU is available.",
        });
        return true;
      }

      const productName = payload.product?.name ?? "another product";
      setSkuAvailability({
        state: "duplicate",
        checkedSku: payload.sku ?? sku,
        message: `SKU is already used by ${productName}. Choose a unique SKU.`,
      });
      return false;
    } catch (error) {
      if (skuCheckRequestRef.current !== requestId) {
        return false;
      }

      setSkuAvailability({
        state: "error",
        checkedSku: sku,
        message:
          error instanceof Error
            ? error.message
            : "Could not check SKU availability.",
      });
      return false;
    }
  }, [draft.originalSlug, draft.sku, draft.skuItemNumber]);

  useEffect(() => {
    if (!draft.skuItemNumber.trim()) {
      resetSkuAvailability();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void checkSkuAvailability();
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [checkSkuAvailability, draft.skuItemNumber, resetSkuAvailability]);

  const onTextChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.currentTarget;

    if (name === "name") {
      setDraft((currentDraft) => ({
        ...currentDraft,
        name: value,
        slug: createSlug(value),
      }));
      return;
    }

    if (name === "sku") {
      resetSkuAvailability();
      setDraft((currentDraft) => ({
        ...currentDraft,
        ...parseSkuParts(value),
      }));
      return;
    }

    if (name === "amazonAsin") {
      const amazonAsin = normalizeAmazonAsin(value);

      setDraft((currentDraft) => ({
        ...currentDraft,
        amazonAsin,
        amazonStoreUrl: buildAmazonListingUrl(amazonAsin),
      }));
      return;
    }

    updateDraft(name as keyof ProductDraft, value);
  };

  useEffect(() => {
    setListingGroupSearch("");
    setSelectedListingIds(new Set());
    setListingGroupStatus("");
  }, [draft.originalSlug]);

  const toggleListingSelection = (productId: string) => {
    setSelectedListingIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(productId)) {
        nextIds.delete(productId);
      } else {
        nextIds.add(productId);
      }
      return nextIds;
    });
  };

  const updateListingGroup = async (
    action: "combine-listings" | "uncombine-listings",
    childProductIds: string[],
  ) => {
    if (!listingParentSummary || !childProductIds.length) {
      const message =
        action === "combine-listings"
          ? "Select at least one listing to combine."
          : "Select a variation to separate.";
      setListingGroupStatus(message);
      toast.error("No listings selected", message);
      return;
    }

    setIsUpdatingListingGroup(true);
    setListingGroupStatus(
      action === "combine-listings"
        ? "Combining listings..."
        : "Separating listing...",
    );

    try {
      const response = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          parentProductId: listingParentSummary.id,
          childProductIds,
        }),
      });
      const payload = (await response.json()) as ProductResponse;

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not update the listing group.");
      }

      if (payload.products) {
        setProducts(sortProducts(payload.products));
      }
      setSelectedListingIds(new Set());
      setListingGroupSearch("");
      const message = payload.message ?? "Listing group updated.";
      setListingGroupStatus(message);
      toast.success("Listing group updated", message);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not update the listing group.";
      setListingGroupStatus(message);
      toast.error("Listing group update failed", message);
    } finally {
      setIsUpdatingListingGroup(false);
    }
  };

  const onCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateDraft(event.currentTarget.name as keyof ProductDraft, event.currentTarget.checked);
  };

  const addVariantPreset = (preset: ProductVariant) => {
    setDraft((currentDraft) => {
      const alreadyAdded = currentDraft.variants.some(
        (variant) =>
          variant.id === preset.id ||
          variant.label.trim().toLowerCase() === preset.label.toLowerCase(),
      );

      if (alreadyAdded) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        variants: [...currentDraft.variants, { ...preset, options: [...preset.options] }],
      };
    });
  };

  const addCustomVariant = () => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      variants: [
        ...currentDraft.variants,
        {
          id: `custom-${Date.now().toString(36)}`,
          label: "",
          options: [],
        },
      ],
    }));
  };

  const updateVariant = (
    variantId: string,
    field: "label" | "options",
    value: string,
  ) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      variants: currentDraft.variants.map((variant) => {
        if (variant.id !== variantId) {
          return variant;
        }

        if (field === "label") {
          return {
            ...variant,
            label: value,
          };
        }

        return {
          ...variant,
          options: [value],
        };
      }),
    }));
  };

  const removeVariant = (variantId: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      variants: currentDraft.variants.filter((variant) => variant.id !== variantId),
    }));
  };

  const setCategoryPath = (path: string[]) => {
    const cleanPath = path.map((segment) => segment.trim()).filter(Boolean);
    const nextCategory = (cleanPath[0] ?? categoryOptions[0] ?? "") as ProductCategory;
    const nextNode = getNodeForPath(categoryTree, cleanPath);
    const isComplete =
      cleanPath.length > 0 &&
      (cleanPath.length >= 3 || (nextNode?.children.length ?? 0) === 0);

    setDraft((currentDraft) => ({
      ...currentDraft,
      category: nextCategory,
      categoryPath: cleanPath.join(" > "),
    }));

    if (isComplete) {
      setIsCategoryEditing(false);
    }
  };

  const onCategoryLevelChange = (level: number, value: string) => {
    const currentPath = splitCategoryPath(draft.categoryPath);
    const nextPath = value
      ? [...currentPath.slice(0, level), value]
      : currentPath.slice(0, level);

    setCategoryPath(nextPath);
  };

  const loadProduct = async (slug: string) => {
    setIsLoadingProduct(true);
    setLoadingProductSlug(slug);
    setStatus("");
    setSavedProductAction(null);

    try {
      const response = await fetch(`/api/admin/products?slug=${encodeURIComponent(slug)}`);
      const payload = (await response.json()) as ProductResponse;

      if (!response.ok || !payload.product) {
        throw new Error(payload.message ?? "Could not load product.");
      }

      setDraft(toDraft(payload.product));
      setProductSearch("");
      setCategorySearch("");
      setIsCategoryEditing(false);
      setUploadResetSignal((currentSignal) => currentSignal + 1);
      setValidationFields(new Set());
      resetSkuAvailability();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load product.");
    } finally {
      setIsLoadingProduct(false);
      setLoadingProductSlug("");
    }
  };

  const loadSimilarProduct = async (slug: string) => {
    setIsLoadingProduct(true);
    setLoadingProductSlug(slug);
    setStatus("");
    setSavedProductAction(null);

    try {
      const response = await fetch(`/api/admin/products?slug=${encodeURIComponent(slug)}`);
      const payload = (await response.json()) as ProductResponse;

      if (!response.ok || !payload.product) {
        throw new Error(payload.message ?? "Could not load product.");
      }

      setDraft(toSimilarDraft(payload.product));
      setProductSearch("");
      setCategorySearch("");
      setIsCategoryEditing(false);
      setUploadResetSignal((currentSignal) => currentSignal + 1);
      setValidationFields(new Set());
      resetSkuAvailability();
      setStatus("");
      toast.success("Duplicate draft ready", "Update the details and upload when ready.");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Could not duplicate product.";
      setStatus(errorMessage);
      toast.error("Could not create duplicate draft", errorMessage);
    } finally {
      setIsLoadingProduct(false);
      setLoadingProductSlug("");
    }
  };

  const onProductSearchSelect = (slug: string) => {
    void loadProduct(slug);
  };

  const copySavedProductListing = (product: Product) => {
    setDraft(toSimilarDraft(product));
    setProductSearch("");
    setCategorySearch("");
    setIsCategoryEditing(false);
    setUploadResetSignal((currentSignal) => currentSignal + 1);
    setValidationFields(new Set());
    resetSkuAvailability();
    setStatus("");
    setSavedProductAction(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.success("Duplicate draft ready", "Update the SKU and upload when ready.");
  };

  const onProductDelete = async (product: ProductSummary) => {
    const previousProducts = products;
    const previousDraft = draft;
    const previousCategorySearch = categorySearch;
    const previousIsCategoryEditing = isCategoryEditing;

    setDeletingProductSlug(product.slug);
    setProductDeleteError("");
    setProductPendingDelete(null);
    setStatus(`Removing ${product.name}...`);
    setProducts((currentProducts) =>
      currentProducts.filter((currentProduct) => currentProduct.slug !== product.slug),
    );

    if (draft.slug === product.slug || draft.originalSlug === product.slug) {
      setDraft(createEmptyDraft());
      setCategorySearch("");
      setIsCategoryEditing(true);
      setUploadResetSignal((currentSignal) => currentSignal + 1);
      setValidationFields(new Set());
      resetSkuAvailability();
    }

    try {
      const response = await fetch(
        `/api/admin/products?slug=${encodeURIComponent(product.slug)}`,
        { method: "DELETE" },
      );
      const payload = (await response.json()) as ProductDeleteResponse;

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not remove product.");
      }

      setStatus(payload.message ?? `${product.name} was removed.`);
      toast.success("Product removed", payload.message ?? product.name);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Could not remove product.";
      setProducts(previousProducts);
      setDraft(previousDraft);
      setCategorySearch(previousCategorySearch);
      setIsCategoryEditing(previousIsCategoryEditing);
      setStatus(errorMessage);
      setProductDeleteError(errorMessage);
      setProductPendingDelete(product);
      toast.error("Product removal failed", errorMessage);
    } finally {
      setDeletingProductSlug(null);
    }
  };

  const onProductSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || !visibleProductResults.length) {
      return;
    }

    event.preventDefault();
    onProductSearchSelect(visibleProductResults[0].slug);
  };

  const removeImage = async (imageUrl: string) => {
    setDeletingImageUrl(imageUrl);
    setDraft((currentDraft) => ({
      ...currentDraft,
      images: currentDraft.images.filter((url) => url !== imageUrl),
    }));

    try {
      const response = await fetch("/api/admin/uploads", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          originalSlug: draft.originalSlug || undefined,
        }),
      });
      const payload = (await response.json()) as ImageDeleteResponse;
      const message = payload.message ?? "Image removed from the draft.";

      if (!response.ok) {
        throw new Error(message);
      }

      setStatus(message);
      toast.success("Image removed", message);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not delete image from R2.";
      setStatus(`Image removed from the draft, but R2 cleanup failed: ${message}`);
      toast.error("R2 cleanup failed", message);
    } finally {
      setDeletingImageUrl("");
    }
  };

  const moveImage = (imageUrl: string, direction: "left" | "right") => {
    setDraft((currentDraft) => {
      const currentIndex = currentDraft.images.indexOf(imageUrl);

      if (currentIndex === -1) {
        return currentDraft;
      }

      const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= currentDraft.images.length) {
        return currentDraft;
      }

      const nextImages = [...currentDraft.images];
      const [movedImage] = nextImages.splice(currentIndex, 1);
      nextImages.splice(targetIndex, 0, movedImage);

      return {
        ...currentDraft,
        images: nextImages,
      };
    });
  };

  const setPrimaryImage = (imageUrl: string) => {
    setDraft((currentDraft) => {
      const nextImages = [
        imageUrl,
        ...currentDraft.images.filter((existingUrl) => existingUrl !== imageUrl),
      ];

      return {
        ...currentDraft,
        images: nextImages,
      };
    });
    setStatus("Primary image updated for the current draft.");
  };

  const removeBannerImage = (imageUrl: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      bannerImages: currentDraft.bannerImages.filter(
        (url) => url !== imageUrl,
      ),
    }));
    setStatus("Banner removed from the current product draft.");
  };

  const onSave = async () => {
    setStatus("");

    const uploadForm = uploadFormRef.current;
    const bannerUploadForm = bannerUploadFormRef.current;
    const hasPendingImageUploads = Boolean(uploadForm?.hasPendingImages());
    const hasPendingBannerUploads = Boolean(
      bannerUploadForm?.hasPendingImages(),
    );
    const hasImagesReadyAtSave =
      draft.images.length > 0 || hasPendingImageUploads;

    const missingRequiredFields: AdminValidationField[] = [];
    if (!draft.name.trim()) {
      missingRequiredFields.push("name");
    }
    if (!draft.sku.trim() || !draft.skuItemNumber.trim()) {
      missingRequiredFields.push("sku");
    }
    if (!basePriceIsValid) {
      missingRequiredFields.push("basePriceUsd");
    }
    if (!stockIsValid) {
      missingRequiredFields.push("stock");
    }
    if (!categorySelectionComplete) {
      missingRequiredFields.push("category");
    }
    if (!getRichTextPlainText(draft.shortDescription)) {
      missingRequiredFields.push("shortDescription");
    }
    if (!getRichTextPlainText(draft.longDescription)) {
      missingRequiredFields.push("longDescription");
    }
    if (!getRichTextPlainText(draft.careInstructions)) {
      missingRequiredFields.push("careInstructions");
    }
    if (!hasImagesReadyAtSave) {
      missingRequiredFields.push("images");
    }

    setValidationFields(new Set(missingRequiredFields));

    if (missingRequiredFields.length > 0) {
      const message = "Complete the highlighted required fields before saving.";
      setStatus(message);
      toast.error("Missing required fields", message);
      return;
    }

    if (skuIsKnownDuplicate) {
      setStatus(skuAvailability.message);
      return;
    }

    setIsSaving(true);
    setIsWaitingForImages(
      hasPendingImageUploads || hasPendingBannerUploads,
    );

    try {
      if (hasPendingImageUploads || hasPendingBannerUploads) {
        setStatus("Waiting for product media to finish uploading to R2...");
      }

      const [uploadedImages, uploadedBanners] = await Promise.all([
        uploadForm?.uploadPendingImages(),
        bannerUploadForm?.uploadPendingImages(),
      ]);
      setIsWaitingForImages(false);

      if (!skuIsKnownAvailable) {
        const skuAvailable = await checkSkuAvailability();
        if (!skuAvailable) {
          setStatus("Resolve SKU availability before saving.");
          return;
        }
      }

      const uploadedImageUrls =
        uploadedImages
          ?.map((upload) => upload.url)
          .filter((url): url is string => Boolean(url)) ?? [];
      const imagesForSave = [
        ...draft.images,
        ...uploadedImageUrls.filter((url) => !draft.images.includes(url)),
      ];
      const uploadedBannerUrls =
        uploadedBanners
          ?.map((upload) => upload.url)
          .filter((url): url is string => Boolean(url)) ?? [];
      const bannerImagesForSave = [
        ...draft.bannerImages,
        ...uploadedBannerUrls.filter(
          (url) => !draft.bannerImages.includes(url),
        ),
      ];

      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          originalSlug: draft.originalSlug || undefined,
          slug: createSlug(draft.name),
          name: draft.name,
          sku: draft.sku,
          category: draft.category,
          categoryPath: splitCategoryPath(draft.categoryPath),
          shortDescription: normalizeRichTextForStorage(draft.shortDescription),
          longDescription: normalizeRichTextForStorage(draft.longDescription),
          basePriceUsd: Number(draft.basePriceUsd),
          basePricePkr: basePricePkrPreview !== null ? Math.round(basePricePkrPreview) : NaN,
          compareAtPricePkr: null,
          stock: draft.stock.trim() ? Number(draft.stock) : 0,
          amazonSellerSku: draft.amazonSellerSku,
          amazonAsin: draft.amazonAsin,
          amazonStoreUrl: buildAmazonListingUrl(draft.amazonAsin),
          amazonFulfillableQuantity: draft.amazonFulfillableQuantity.trim()
            ? Number(draft.amazonFulfillableQuantity)
            : 0,
          amazonInventoryUpdatedAt: draft.amazonInventoryUpdatedAt || undefined,
          amazonMcfEnabled: draft.amazonMcfEnabled,
          tags: draft.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          images: imagesForSave,
          bannerImages: bannerImagesForSave,
          variants: normalizeProductVariants(draft.variants),
          isBestSeller: draft.isBestSeller,
          isNewArrival: draft.isNewArrival,
          careInstructions: normalizeRichTextForStorage(draft.careInstructions),
          shippingInfo: normalizeRichTextForStorage(draft.shippingInfo),
        }),
      });

      const payload = (await response.json()) as ProductResponse;

      if (!response.ok || !payload.product) {
        throw new Error(payload.message ?? "Could not save product.");
      }

      const savedProduct = payload.product;
      setProducts((currentProducts) =>
        sortProducts([
          ...currentProducts.filter(
            (product) =>
              product.slug !== draft.originalSlug && product.slug !== savedProduct.slug,
          ),
          toSummary(savedProduct),
        ]),
      );
      setDraft(createEmptyDraft());
      setCategorySearch("");
      setIsCategoryEditing(true);
      setUploadResetSignal((currentSignal) => currentSignal + 1);
      setValidationFields(new Set());
      resetSkuAvailability();
      const successMessage = payload.message ?? "Product saved.";
      setStatus(successMessage);
      setSavedProductAction(savedProduct);
      toast.success(successMessage, savedProduct.name);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Could not save product.";
      setStatus(errorMessage);
      toast.error("Product upload failed", errorMessage);
    } finally {
      setIsWaitingForImages(false);
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-product-editor">
      {productPendingDelete ? (
        <div
          aria-labelledby="admin-delete-product-title"
          aria-modal="true"
          className="admin-confirm-overlay"
          role="dialog"
        >
          <section className="admin-confirm-dialog">
            <h3 id="admin-delete-product-title">
              Are you sure you want to delete this product?
            </h3>
            {productDeleteError ? (
              <p className="admin-confirm-error" role="alert">
                {productDeleteError}
              </p>
            ) : null}
            <div className="admin-confirm-actions">
              <Button
                disabled={deletingProductSlug === productPendingDelete.slug}
                onClick={() => {
                  setProductPendingDelete(null);
                  setProductDeleteError("");
                }}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                className="admin-danger-btn"
                disabled={deletingProductSlug === productPendingDelete.slug}
                onClick={() => void onProductDelete(productPendingDelete)}
                variant="primary"
              >
                {deletingProductSlug === productPendingDelete.slug
                  ? "Removing..."
                  : "Yes"}
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {savedProductAction ? (
        <div
          aria-labelledby="admin-upload-success-title"
          aria-modal="true"
          className="admin-confirm-overlay"
          role="dialog"
        >
          <section className="admin-confirm-dialog admin-upload-success-dialog">
            <p className="admin-success-kicker">Product uploaded</p>
            <h3 id="admin-upload-success-title">{savedProductAction.name}</h3>
            <div className="admin-success-actions">
              <Link
                aria-label="Return to the admin panel automatically in 10 seconds"
                className="btn-secondary admin-success-redirect-btn"
                href="/admin"
                onClick={() => setSavedProductAction(null)}
                ref={adminPanelLinkRef}
              >
                <span>Admin panel</span>
              </Link>
              <Button
                onClick={() => copySavedProductListing(savedProductAction)}
                variant="primary"
              >
                Copy listing
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      <section className="admin-editor-hero">
        <div className="admin-product-finder">
          <div className="admin-form-toolbar">
            <div className="admin-toolbar-search">
              <div className="admin-product-search-control">
                <FiSearch aria-hidden="true" />
                <Input
                  className="admin-product-search-input"
                  id="admin-product-search"
                  aria-label="Search products"
                  onKeyDown={onProductSearchKeyDown}
                  onChange={(event) => setProductSearch(event.currentTarget.value)}
                  placeholder="Search products"
                  value={productSearch}
                />
              </div>
            </div>
            <Button
              className="admin-toolbar-action"
              disabled={!visibleProductResults.length}
              onClick={() => {
                const firstResult = visibleProductResults[0];

                if (firstResult) {
                  onProductSearchSelect(firstResult.slug);
                }
              }}
              variant="secondary"
            >
              Search
            </Button>
          </div>

          {normalizedProductSearch ? (
            <div className="admin-product-search-results">
              {visibleProductResults.length > 0 ? (
                visibleProductResults.map((product) => {
                  const isProductLoading = loadingProductSlug === product.slug;

                  return (
                    <article
                      className={
                        isProductLoading
                          ? "admin-product-search-result is-loading"
                          : "admin-product-search-result"
                      }
                      key={product.id}
                    >
                      <button
                        className="admin-product-search-result-main"
                        disabled={isLoadingProduct}
                        onClick={() => onProductSearchSelect(product.slug)}
                        type="button"
                      >
                        <span className="admin-product-search-thumb">
                          {product.primaryImage ? (
                            <ProductMedia
                              alt={product.name}
                              className="admin-product-search-image"
                              height={120}
                              sizes="84px"
                              src={getProductImageSrc(product.primaryImage)}
                              width={120}
                            />
                          ) : (
                            <span
                              aria-label="Product image unavailable"
                              className="admin-product-search-thumb-empty"
                              role="img"
                            />
                          )}
                        </span>
                        <span className="admin-product-search-result-copy">
                          <span className="admin-product-search-result-name">{product.name}</span>
                          <span className="admin-product-search-result-meta">
                            <span>{product.sku}</span>
                            <span>{product.category}</span>
                          </span>
                        </span>
                        {isProductLoading ? (
                          <span className="admin-product-search-loading">
                            <span aria-hidden="true" className="admin-loading-spinner" />
                            Loading
                          </span>
                        ) : null}
                      </button>
                      <div className="admin-product-search-actions">
                        <Button
                          className="admin-product-similar-btn"
                          disabled={isLoadingProduct}
                          onClick={() => void loadSimilarProduct(product.slug)}
                          size="compact"
                          variant="secondary"
                        >
                          Duplicate
                        </Button>
                        <Button
                          className="admin-product-delete-btn"
                          disabled={isLoadingProduct || deletingProductSlug === product.slug}
                          onClick={() => {
                            setProductPendingDelete(product);
                            setProductDeleteError("");
                          }}
                          size="compact"
                          variant="secondary"
                        >
                          {deletingProductSlug === product.slug ? "Removing..." : "Remove"}
                        </Button>
                      </div>
                    </article>
                  );
                })
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <div className="admin-editor-layout">
        <section className="admin-editor-panel">
          <div className="form-grid">
            <Field
              className={
                missingName
                  ? "admin-field-name full-width admin-required-missing"
                  : "admin-field-name full-width"
              }
              dataInvalid={missingName}
            >
              <FieldLabel className="sr-only" htmlFor="admin-product-name">
                Product Name
              </FieldLabel>
              <AutosizeTextarea
                aria-invalid={missingName}
                className={
                  missingName
                    ? "admin-product-name-textarea is-invalid"
                    : "admin-product-name-textarea"
                }
                id="admin-product-name"
                name="name"
                onChange={onTextChange}
                placeholder="Product Name"
                rows={2}
                value={draft.name}
              />
            </Field>
            <Field
              className={
                missingSku
                  ? "admin-sku-field admin-required-missing"
                  : "admin-sku-field"
              }
              dataInvalid={skuIsKnownDuplicate || missingSku}
            >
              <div className="admin-sku-builder">
                <label className="admin-sku-part">
                  <span className="sr-only">Prefix</span>
                  <select
                    aria-label="SKU prefix"
                    aria-invalid={skuIsKnownDuplicate || missingSku}
                    className={
                      skuIsKnownDuplicate || missingSku ? "is-invalid" : undefined
                    }
                    name="skuPrefix"
                    onChange={(event) =>
                      updateSkuParts({ skuPrefix: event.currentTarget.value })
                    }
                    value={draft.skuPrefix}
                  >
                    {skuPrefixOptions.map((prefix) => (
                      <option key={prefix} value={prefix}>
                        {prefix}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-sku-part">
                  <span className="sr-only">Item number</span>
                  <Input
                    aria-describedby="admin-sku-preview admin-sku-availability"
                    aria-invalid={skuIsKnownDuplicate || missingSku}
                    className={
                      skuIsKnownDuplicate || missingSku ? "is-invalid" : undefined
                    }
                    id="admin-product-sku-item"
                    inputMode="text"
                    maxLength={SKU_ITEM_NUMBER_MAX_LENGTH}
                    name="skuItemNumber"
                    onChange={(event) =>
                      updateSkuParts({ skuItemNumber: event.currentTarget.value })
                    }
                    placeholder="Item number"
                    value={draft.skuItemNumber}
                  />
                </label>
              </div>
              <div className="admin-sku-heading">
                <FieldLabel className="sr-only" htmlFor="admin-product-sku-item">
                  SKU
                </FieldLabel>
                <FieldDescription className="admin-sku-preview" id="admin-sku-preview">
                  SKU Preview: <strong>{draft.sku || "--"}</strong>
                </FieldDescription>
              </div>
              {skuAvailability.message ? (
                skuAvailability.state === "duplicate" ||
                skuAvailability.state === "error" ? (
                  <FieldError
                    className={`sku-field-status sku-field-status-${skuAvailability.state}`}
                    id="admin-sku-availability"
                  >
                    {skuAvailability.message}
                  </FieldError>
                ) : (
                  <FieldDescription
                    className={`sku-field-status sku-field-status-${skuAvailability.state}`}
                    id="admin-sku-availability"
                  >
                    {skuAvailability.message}
                  </FieldDescription>
                )
              ) : null}
            </Field>
            <Field
              className={
                missingBasePrice
                  ? "admin-field-price admin-required-missing"
                  : "admin-field-price"
              }
              dataInvalid={missingBasePrice}
            >
              <FieldLabel className="sr-only" htmlFor="admin-product-price">
                Base Price USD
              </FieldLabel>
              <Input
                aria-invalid={missingBasePrice}
                className={missingBasePrice ? "is-invalid" : undefined}
                id="admin-product-price"
                inputMode="decimal"
                name="basePriceUsd"
                onChange={onTextChange}
                placeholder="Base Price USD"
                value={draft.basePriceUsd}
              />
            </Field>
            <Field
              className={
                missingStock
                  ? "admin-field-stock admin-required-missing"
                  : "admin-field-stock"
              }
              dataInvalid={missingStock}
            >
              <FieldLabel className="sr-only" htmlFor="admin-product-stock">
                Stock
              </FieldLabel>
              <Input
                aria-invalid={missingStock}
                className={missingStock ? "is-invalid" : undefined}
                id="admin-product-stock"
                inputMode="numeric"
                name="stock"
                onChange={onTextChange}
                placeholder="Stock"
                value={draft.stock}
              />
            </Field>
            <div className="admin-amazon-fields full-width">
              <Field>
                <FieldLabel htmlFor="admin-product-amazon-seller-sku">
                  Amazon Seller SKU
                </FieldLabel>
                <Input
                  id="admin-product-amazon-seller-sku"
                  name="amazonSellerSku"
                  onChange={onTextChange}
                  placeholder="Amazon Seller SKU"
                  value={draft.amazonSellerSku}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="admin-product-amazon-asin">
                  Amazon ASIN
                </FieldLabel>
                <Input
                  id="admin-product-amazon-asin"
                  name="amazonAsin"
                  onChange={onTextChange}
                  placeholder="ASIN"
                  value={draft.amazonAsin}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="admin-product-amazon-stock">
                  Amazon Stock
                </FieldLabel>
                <Input
                  id="admin-product-amazon-stock"
                  inputMode="numeric"
                  name="amazonFulfillableQuantity"
                  onChange={onTextChange}
                  placeholder="0"
                  value={draft.amazonFulfillableQuantity}
                />
              </Field>
              <label className="checkbox-label">
                <input
                  checked={draft.amazonMcfEnabled}
                  name="amazonMcfEnabled"
                  onChange={onCheckboxChange}
                  type="checkbox"
                />
                <span>Use Amazon fallback when local stock is unavailable</span>
              </label>
            </div>
            <div className="admin-price-flags-row full-width">
              <div className="price-info-card admin-field-price-preview">
                <strong>Base Price Preview</strong>
                <p className="tiny">
                  PKR: {formatCurrency(basePricePkrPreview, "PKR")}
                </p>
                <p className="tiny">
                  EUR:{" "}
                  {basePricePkrPreview !== null
                    ? formatCurrency(basePricePkrPreview * ratesFromPkr.EUR, "EUR")
                    : "--"}
                </p>
              </div>
              <div className="checkbox-grid admin-inline-flags">
                <label className="checkbox-label">
                  <input
                    checked={draft.isBestSeller}
                    name="isBestSeller"
                    onChange={onCheckboxChange}
                    type="checkbox"
                  />
                  <span>Mark as best seller</span>
                </label>
                <label className="checkbox-label">
                  <input
                    checked={draft.isNewArrival}
                    name="isNewArrival"
                    onChange={onCheckboxChange}
                    type="checkbox"
                  />
                  <span>Mark as new arrival</span>
                </label>
              </div>
            </div>
            <Field
              className={
                missingShortDescription
                  ? "full-width admin-required-missing"
                  : "full-width"
              }
              dataInvalid={missingShortDescription}
            >
              <FieldLabel className="sr-only" htmlFor="admin-product-short-description">
                Short Description
              </FieldLabel>
              <RichTextEditor
                ariaInvalid={missingShortDescription}
                id="admin-product-short-description"
                onChange={(value) => updateDraft("shortDescription", value)}
                placeholder="Short Description"
                size="short"
                toolbarLabel="Short description tools"
                value={draft.shortDescription}
              />
            </Field>
            <Field
              className={
                missingLongDescription
                  ? "admin-long-description-field full-width admin-required-missing"
                  : "admin-long-description-field full-width"
              }
              dataInvalid={missingLongDescription}
            >
              <FieldLabel className="sr-only" htmlFor="admin-product-long-description">
                Long Description
              </FieldLabel>
              <RichTextEditor
                allowLists
                ariaInvalid={missingLongDescription}
                id="admin-product-long-description"
                onChange={(value) => updateDraft("longDescription", value)}
                placeholder="Long Description"
                size="long"
                toolbarLabel="Long description tools"
                value={draft.longDescription}
              />
            </Field>
            <Field
              className={
                missingCareInstructions
                  ? "full-width admin-required-missing"
                  : "full-width"
              }
              dataInvalid={missingCareInstructions}
            >
              <FieldLabel className="sr-only" htmlFor="admin-product-care">
                Care Instructions
              </FieldLabel>
              <RichTextEditor
                allowLists
                ariaInvalid={missingCareInstructions}
                id="admin-product-care"
                onChange={(value) => updateDraft("careInstructions", value)}
                placeholder="Care Instructions"
                size="medium"
                toolbarLabel="Care instruction tools"
                value={draft.careInstructions}
              />
            </Field>
            <Field className="full-width">
              <FieldLabel className="sr-only" htmlFor="admin-product-shipping-info">
                Shipping Info
              </FieldLabel>
              <RichTextEditor
                allowLists
                id="admin-product-shipping-info"
                onChange={(value) => updateDraft("shippingInfo", value)}
                placeholder="Shipping Info"
                size="medium"
                toolbarLabel="Shipping info tools"
                value={draft.shippingInfo}
              />
            </Field>
          </div>
        </section>

        <section className="admin-editor-panel admin-taxonomy-panel">
          <div
            aria-invalid={missingCategory}
            className={
              missingCategory
                ? "admin-taxonomy-card admin-required-missing"
                : "admin-taxonomy-card"
            }
          >
            <label className="admin-search-field">
              <span className="sr-only">Category Search</span>
              <Input
                aria-label="Category Search"
                onChange={(event) => setCategorySearch(event.currentTarget.value)}
                placeholder="Category Search"
                value={categorySearch}
              />
            </label>

            {matchingCategoryPaths.length > 0 ? (
              <div className="admin-taxonomy-search-results">
                {matchingCategoryPaths.map(({ key, path }) => (
                  <Button
                    className="admin-taxonomy-match"
                    key={key}
                    onClick={() => {
                      setCategoryPath(path);
                      setCategorySearch("");
                    }}
                    variant="unstyled"
                  >
                    <span className="admin-taxonomy-match-leaf">{path[path.length - 1]}</span>
                    <span className="admin-taxonomy-match-path">{key}</span>
                  </Button>
                ))}
              </div>
            ) : null}

            {!isCategoryEditing && categorySelectionComplete ? (
              <div className="admin-taxonomy-summary">
                <span className="admin-taxonomy-summary-label">Selected path</span>
                <strong>{selectedCategoryPath.join(" > ")}</strong>
                <Button
                  className="admin-taxonomy-edit-btn"
                  onClick={() => {
                    updateDraft("category", "");
                    updateDraft("categoryPath", "");
                    setIsCategoryEditing(true);
                    setCategorySearch("");
                  }}
                  size="compact"
                  variant="secondary"
                >
                  Edit
                </Button>
              </div>
            ) : (
              <div className="admin-taxonomy-stepper">
                <div className="admin-taxonomy-step-card">
                  {selectedCategoryPath.length > 0 ? (
                    <div
                      aria-live="polite"
                      className="admin-taxonomy-live-path"
                    >
                      <span>Current path</span>
                      <strong>{selectedCategoryPath.join(" > ")}</strong>
                    </div>
                  ) : null}
                  {activeCategoryOptions.length > 0 ? (
                    <div className="admin-taxonomy-options">
                      {activeCategoryOptions.map((node) => {
                        const level = selectedCategoryPath.length;
                        const nextPath = [...selectedCategoryPath, node.name];
                        const opensNextLevel =
                          node.children.length > 0 && nextPath.length < 3;

                        return (
                          <Button
                            className="admin-taxonomy-option"
                            key={`${level}-${node.name}`}
                            onClick={() => onCategoryLevelChange(level, node.name)}
                            variant="unstyled"
                            aria-label={`${
                              opensNextLevel ? "Open" : "Select"
                            } ${nextPath.join(" > ")}`}
                          >
                            <span className="admin-taxonomy-option-copy">
                              <span className="admin-taxonomy-option-label">
                                {node.name}
                              </span>
                            </span>
                            {opensNextLevel ? <FiArrowRight aria-hidden /> : null}
                          </Button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="admin-editor-panel admin-variant-manager">
        <div className="admin-panel-header">
          <div>
            <h3>Variation options</h3>
          </div>
          <div className="admin-variant-presets">
            {VARIANT_PRESETS.map((preset) => {
              const isAdded = draft.variants.some(
                (variant) =>
                  variant.id === preset.id ||
                  variant.label.trim().toLowerCase() === preset.label.toLowerCase(),
              );

              return (
                <Button
                  disabled={isAdded}
                  key={preset.id}
                  onClick={() => addVariantPreset(preset)}
                  size="compact"
                  variant="secondary"
                >
                  {isAdded ? `${preset.label} added` : `Add ${preset.label}`}
                </Button>
              );
            })}
            <Button onClick={addCustomVariant} size="compact" variant="secondary">
              Add custom
            </Button>
          </div>
        </div>

        {draft.variants.length > 0 ? (
          <div className="admin-variant-grid">
            {draft.variants.map((variant, index) => (
              <article className="admin-variant-card" key={variant.id}>
                <Field>
                  <FieldLabel htmlFor={`admin-variant-label-${variant.id}`}>
                    Option name
                  </FieldLabel>
                  <Input
                    id={`admin-variant-label-${variant.id}`}
                    onChange={(event) =>
                      updateVariant(variant.id, "label", event.currentTarget.value)
                    }
                    placeholder={index === 0 ? "Size" : "Option name"}
                    value={variant.label}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`admin-variant-options-${variant.id}`}>
                    Values
                  </FieldLabel>
                  <Input
                    id={`admin-variant-options-${variant.id}`}
                    onChange={(event) =>
                      updateVariant(variant.id, "options", event.currentTarget.value)
                    }
                    placeholder={
                      variant.id === "style"
                        ? "Classic, Western, Modern"
                        : "Small, Medium, Large"
                    }
                    value={variant.options.join(", ")}
                  />
                </Field>
                <Button
                  className="admin-variant-remove"
                  onClick={() => removeVariant(variant.id)}
                  size="compact"
                  variant="secondary"
                >
                  Remove
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-variant-empty">No variation options added.</p>
        )}
      </section>

      <section className="admin-editor-panel admin-listing-group-manager">
        <div className="admin-panel-header">
          <div>
            <h3>Combined listing</h3>
            <p>
              Use one existing listing as the parent. Its descriptions are shared,
              while every variation keeps its own title, identifiers, images,
              price, and stock.
            </p>
          </div>
        </div>

        {!currentProductSummary ? (
          <p className="admin-listing-group-empty">
            Save or load an existing product before combining listings.
          </p>
        ) : currentProductSummary.parentListingId && listingParentSummary ? (
          <div className="admin-listing-group-child-notice">
            <div>
              <strong>This listing is a variation of {listingParentSummary.name}.</strong>
              <span>
                Open the parent to add or separate other listing variations.
              </span>
            </div>
            <Button
              disabled={isUpdatingListingGroup}
              onClick={() => onProductSearchSelect(listingParentSummary.slug)}
              size="compact"
              variant="secondary"
            >
              Open parent listing
            </Button>
          </div>
        ) : listingParentSummary ? (
          <div className="admin-listing-group-content">
            <div className="admin-listing-group-members">
              <article className="admin-listing-group-row is-parent">
                <span className="admin-listing-group-thumb">
                  {listingParentSummary.primaryImage ? (
                    <ProductMedia
                      alt=""
                      height={64}
                      sizes="56px"
                      src={getProductImageSrc(listingParentSummary.primaryImage)}
                      width={64}
                    />
                  ) : (
                    <span aria-hidden="true">No image</span>
                  )}
                </span>
                <span className="admin-listing-group-copy">
                  <strong>{listingParentSummary.name}</strong>
                  <small>{listingParentSummary.sku}</small>
                </span>
                <span className="admin-listing-group-badge">Parent</span>
              </article>

              {listingChildren.map((product) => (
                <article className="admin-listing-group-row" key={product.id}>
                  <span className="admin-listing-group-thumb">
                    {product.primaryImage ? (
                      <ProductMedia
                        alt=""
                        height={64}
                        sizes="56px"
                        src={getProductImageSrc(product.primaryImage)}
                        width={64}
                      />
                    ) : (
                      <span aria-hidden="true">No image</span>
                    )}
                  </span>
                  <span className="admin-listing-group-copy">
                    <strong>{product.name}</strong>
                    <small>{product.sku}</small>
                  </span>
                  <Button
                    disabled={isUpdatingListingGroup}
                    onClick={() =>
                      void updateListingGroup("uncombine-listings", [product.id])
                    }
                    size="compact"
                    variant="secondary"
                  >
                    {isUpdatingListingGroup ? "Working..." : "Separate"}
                  </Button>
                </article>
              ))}
            </div>

            <div className="admin-listing-group-add">
              <Field>
                <FieldLabel htmlFor="admin-listing-group-search">
                  Add existing listings as variations
                </FieldLabel>
                <Input
                  autoComplete="off"
                  id="admin-listing-group-search"
                  onChange={(event) => setListingGroupSearch(event.currentTarget.value)}
                  placeholder="Search by product title, item number, or category"
                  value={listingGroupSearch}
                />
                <FieldDescription>
                  The currently loaded product stays as the parent listing.
                </FieldDescription>
              </Field>

              {normalizedListingGroupSearch ? (
                <div className="admin-listing-group-results">
                  {listingCandidates.length ? (
                    listingCandidates.map((product) => (
                      <label className="admin-listing-group-candidate" key={product.id}>
                        <input
                          checked={selectedListingIds.has(product.id)}
                          disabled={isUpdatingListingGroup}
                          onChange={() => toggleListingSelection(product.id)}
                          type="checkbox"
                        />
                        <span className="admin-listing-group-thumb">
                          {product.primaryImage ? (
                            <ProductMedia
                              alt=""
                              height={64}
                              sizes="56px"
                              src={getProductImageSrc(product.primaryImage)}
                              width={64}
                            />
                          ) : (
                            <span aria-hidden="true">No image</span>
                          )}
                        </span>
                        <span className="admin-listing-group-copy">
                          <strong>{product.name}</strong>
                          <small>
                            {product.sku} · {product.category}
                          </small>
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="admin-listing-group-empty">
                      No available standalone listings match that search.
                    </p>
                  )}
                </div>
              ) : null}

              <div className="admin-listing-group-actions">
                <Button
                  disabled={isUpdatingListingGroup || !selectedListingIds.size}
                  onClick={() =>
                    void updateListingGroup(
                      "combine-listings",
                      Array.from(selectedListingIds),
                    )
                  }
                  variant="primary"
                >
                  {isUpdatingListingGroup
                    ? "Combining listings..."
                    : `Combine ${selectedListingIds.size || "selected"} listing${
                        selectedListingIds.size === 1 ? "" : "s"
                      }`}
                </Button>
                {listingGroupStatus ? (
                  <p aria-live="polite" className="admin-listing-group-status">
                    {listingGroupStatus}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="admin-editor-panel admin-image-manager">
        <div className="admin-panel-header">
          <div>
            <h3>Upload product images</h3>
          </div>
        </div>

        <div className="admin-image-tools">
          <div
            aria-invalid={missingImages}
            className={
              missingImages
                ? "admin-upload-card admin-required-missing"
                : "admin-upload-card"
            }
          >
            <R2ImageUploadForm
              ref={uploadFormRef}
              autoUpload
              disabled={!uploadFolder}
              disabledMessage={uploadDisabledMessage}
              hideFolderField
              initialFolder={uploadFolder}
              multiple
              resetSignal={uploadResetSignal}
              showUploadButton={false}
              onUploaded={(payload) => {
                if (!payload.url) {
                  return;
                }

                setDraft((currentDraft) => ({
                  ...currentDraft,
                  images: currentDraft.images.includes(payload.url as string)
                    ? currentDraft.images
                    : [...currentDraft.images, payload.url as string],
                }));
                setStatus("Uploaded image attached to the current product draft.");
              }}
              showUploadedPreview={false}
            />
          </div>
        </div>

        {draft.images.length ? (
          <div className="admin-image-grid">
            {draft.images.map((imageUrl, index) => (
              <article className="admin-image-card" key={imageUrl}>
                <div className="admin-image-card-head">
                  <span className={index === 0 ? "admin-image-badge admin-image-badge-primary" : "admin-image-badge"}>
                    {index === 0 ? "Primary image" : `Image ${index + 1}`}
                  </span>
                </div>
                <ProductMedia
                  alt={draft.name || "Product image"}
                  className="admin-image-preview"
                  height={144}
                  sizes="96px"
                  src={getProductImageSrc(imageUrl)}
                  width={144}
                />
                <div className="admin-image-actions">
                  <div className="admin-image-order-controls">
                    <Button
                      aria-label={`Move ${draft.name || "image"} left`}
                      className="admin-image-arrow"
                      disabled={index === 0}
                      onClick={() => moveImage(imageUrl, "left")}
                      title="Move left"
                      variant="unstyled"
                    >
                      <FiArrowLeft />
                    </Button>
                    <Button
                      aria-label={`Move ${draft.name || "image"} right`}
                      className="admin-image-arrow"
                      disabled={index === draft.images.length - 1}
                      onClick={() => moveImage(imageUrl, "right")}
                      title="Move right"
                      variant="unstyled"
                    >
                      <FiArrowRight />
                    </Button>
                  </div>
                  <Button
                    className="admin-image-meta-btn"
                    disabled={index === 0}
                    onClick={() => setPrimaryImage(imageUrl)}
                    size="compact"
                    variant="secondary"
                  >
                    <FiStar />
                    <span>Primary</span>
                  </Button>
                  <Button
                    className="admin-image-meta-btn"
                    disabled={deletingImageUrl === imageUrl}
                    onClick={() => void removeImage(imageUrl)}
                    size="compact"
                    variant="secondary"
                  >
                    <FiTrash2 />
                    <span>{deletingImageUrl === imageUrl ? "Removing..." : "Remove"}</span>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="admin-editor-panel admin-banner-manager">
        <div className="admin-panel-header">
          <div>
            <h3>Upload product page banners</h3>
            <p>
              Add wide lifestyle or promotional images. They appear below the
              product information and reviews.
            </p>
          </div>
        </div>

        <div className="admin-image-tools">
          <div className="admin-upload-card admin-banner-upload-card">
            <R2ImageUploadForm
              ref={bannerUploadFormRef}
              autoUpload
              disabled={!uploadFolder}
              disabledMessage={uploadDisabledMessage}
              hideFolderField
              initialFolder={uploadFolder ? `${uploadFolder}/banners` : ""}
              multiple
              resetSignal={uploadResetSignal}
              showUploadButton={false}
              onUploaded={(payload) => {
                if (!payload.url) {
                  return;
                }

                setDraft((currentDraft) => ({
                  ...currentDraft,
                  bannerImages: currentDraft.bannerImages.includes(
                    payload.url as string,
                  )
                    ? currentDraft.bannerImages
                    : [...currentDraft.bannerImages, payload.url as string],
                }));
                setStatus("Banner attached to the current product draft.");
              }}
              showUploadedPreview={false}
            />
          </div>
        </div>

        {draft.bannerImages.length ? (
          <div className="admin-banner-grid">
            {draft.bannerImages.map((imageUrl, index) => (
              <article className="admin-banner-card" key={imageUrl}>
                <span className="admin-image-badge">
                  Banner {index + 1}
                </span>
                <ProductMedia
                  alt={`${draft.name || "Product"} banner ${index + 1}`}
                  className="admin-banner-preview"
                  height={360}
                  sizes="(max-width: 720px) 100vw, 680px"
                  src={getProductImageSrc(imageUrl)}
                  width={1200}
                />
                <Button
                  className="admin-image-meta-btn"
                  onClick={() => removeBannerImage(imageUrl)}
                  size="compact"
                  variant="secondary"
                >
                  <FiTrash2 />
                  <span>Remove</span>
                </Button>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <div className="admin-form-footer">
        <Button
          disabled={isSaving || isLoadingProduct || skuIsKnownDuplicate}
          onClick={onSave}
          variant="primary"
        >
          {saveButtonLabel}
        </Button>
        {status ? <p className="form-status">{status}</p> : null}
      </div>
    </div>
  );
}
