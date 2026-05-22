"use client";

import { ChangeEvent, KeyboardEvent, useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductMedia } from "@/components/ui/product-media";
import { Textarea } from "@/components/ui/textarea";
import { getProductImageSrc } from "@/lib/image-utils";
import { useToast } from "@/lib/use-toast";
import { CurrencyCode, Product, ProductCategory } from "@/lib/types";

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
};

type ProductDraft = {
  originalSlug: string;
  slug: string;
  name: string;
  sku: string;
  category: ProductCategory;
  categoryPath: string;
  shortDescription: string;
  longDescription: string;
  basePriceUsd: string;
  stock: string;
  tags: string;
  images: string[];
  isBestSeller: boolean;
  isNewArrival: boolean;
  careInstructions: string;
};

type AdminProductEditorProps = {
  categoryTree: CategoryNode[];
  categoryOptions: ProductCategory[];
  initialProduct: Product | null;
  initialProducts: ProductSummary[];
  ratesFromPkr: Record<CurrencyCode, number>;
};

type ProductResponse = {
  message?: string;
  product?: Product;
};

type ProductDeleteResponse = {
  message?: string;
  name?: string;
  deleted?: boolean;
  deactivated?: boolean;
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

type CategoryPathMatch = {
  key: string;
  path: string[];
};

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

function splitCategoryPath(value: string): string[] {
  return value
    .split(">")
    .map((segment) => segment.trim())
    .filter(Boolean);
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

function createEmptyDraft(): ProductDraft {
  return {
    originalSlug: "",
    slug: "",
    name: "",
    sku: "",
    category: "",
    categoryPath: "",
    shortDescription: "",
    longDescription: "",
    basePriceUsd: "",
    stock: "",
    tags: "",
    images: [],
    isBestSeller: false,
    isNewArrival: false,
    careInstructions: "",
  };
}

function toDraft(product: Product): ProductDraft {
  return {
    originalSlug: product.slug,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    category: product.category,
    categoryPath: product.categoryPath.join(" > "),
    shortDescription: product.shortDescription,
    longDescription: product.longDescription,
    basePriceUsd: String(product.basePriceUsd),
    stock: String(product.stock),
    tags: product.tags.join(", "),
    images: [...product.images],
    isBestSeller: product.isBestSeller,
    isNewArrival: product.isNewArrival,
    careInstructions: product.careInstructions ?? "",
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
  };
}

function sortProducts(products: ProductSummary[]): ProductSummary[] {
  return [...products].sort((left, right) => left.name.localeCompare(right.name));
}

export function AdminProductEditor({
  categoryTree,
  categoryOptions,
  initialProduct,
  initialProducts,
  ratesFromPkr,
}: AdminProductEditorProps) {
  const toast = useToast();
  const [products, setProducts] = useState(() => sortProducts(initialProducts));
  const [draft, setDraft] = useState<ProductDraft>(() =>
    initialProduct ? toDraft(initialProduct) : createEmptyDraft(),
  );
  const [productSearch, setProductSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [isCategoryEditing, setIsCategoryEditing] = useState(
    () => !(initialProduct?.categoryPath.length),
  );
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [deletingProductSlug, setDeletingProductSlug] = useState<string | null>(null);
  const [productPendingDelete, setProductPendingDelete] =
    useState<ProductSummary | null>(null);
  const [productDeleteError, setProductDeleteError] = useState("");
  const [uploadResetSignal, setUploadResetSignal] = useState(0);
  const [skuAvailability, setSkuAvailability] = useState<SkuAvailabilityState>({
    state: "idle",
    checkedSku: "",
    message: "",
  });
  const skuCheckRequestRef = useRef(0);
  const uploadFormRef = useRef<R2ImageUploadFormHandle>(null);

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
  const categoryStepTitle =
    selectedCategoryPath.length === 0
      ? "Choose Department"
      : selectedCategoryPath.length === 1
        ? "Choose Subcategory"
        : "Choose Level 3";
  const normalizedProductSearch = productSearch.trim().toLowerCase();
  const filteredProducts = normalizedProductSearch
    ? products.filter((product) => {
        const label = `${product.name} ${product.sku} ${product.category}`.toLowerCase();
        return label.includes(normalizedProductSearch);
      })
    : [];
  const visibleProductResults = filteredProducts.slice(0, 8);
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
  const uploadFolder =
    draft.slug.trim() ||
    draft.name.trim() ||
    draft.categoryPath.split(" > ").at(-1) ||
    "products";

  const updateDraft = (
    field: keyof ProductDraft,
    value: string | boolean | string[],
  ) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  };

  const resetSkuAvailability = () => {
    setSkuAvailability({
      state: "idle",
      checkedSku: "",
      message: "",
    });
  };

  const checkSkuAvailability = async (): Promise<boolean> => {
    const sku = normalizeSku(draft.sku);

    if (!sku) {
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
  };

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
      updateDraft("sku", value);
      return;
    }

    updateDraft(name as keyof ProductDraft, value);
  };

  const onCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateDraft(event.currentTarget.name as keyof ProductDraft, event.currentTarget.checked);
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
    setStatus("");

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
      resetSkuAvailability();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load product.");
    } finally {
      setIsLoadingProduct(false);
    }
  };

  const startNewProduct = () => {
    setDraft(createEmptyDraft());
    setProductSearch("");
    setCategorySearch("");
    setIsCategoryEditing(true);
    setUploadResetSignal((currentSignal) => currentSignal + 1);
    resetSkuAvailability();
    setStatus("Creating a new product draft.");
  };

  const onProductSearchSelect = (slug: string) => {
    void loadProduct(slug);
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

  const removeImage = (imageUrl: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      images: currentDraft.images.filter((url) => url !== imageUrl),
    }));
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

  const onSave = async () => {
    setStatus("");

    if (skuIsKnownDuplicate) {
      setStatus(skuAvailability.message);
      return;
    }

    if (!skuIsKnownAvailable) {
      const skuAvailable = await checkSkuAvailability();
      if (!skuAvailable) {
        setStatus("Resolve SKU availability before saving.");
        return;
      }
    }

    setIsSaving(true);

    try {
      if (uploadFormRef.current?.hasPendingImages()) {
        setStatus("Uploading product images to R2 before saving...");
      }

      const uploadedImages = await uploadFormRef.current?.uploadPendingImages();
      const uploadedImageUrls =
        uploadedImages
          ?.map((upload) => upload.url)
          .filter((url): url is string => Boolean(url)) ?? [];
      const imagesForSave = [
        ...draft.images,
        ...uploadedImageUrls.filter((url) => !draft.images.includes(url)),
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
          shortDescription: draft.shortDescription,
          longDescription: draft.longDescription,
          basePriceUsd: Number(draft.basePriceUsd),
          basePricePkr: basePricePkrPreview !== null ? Math.round(basePricePkrPreview) : NaN,
          compareAtPricePkr: null,
          stock: draft.stock.trim() ? Number(draft.stock) : 0,
          tags: draft.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          images: imagesForSave,
          isBestSeller: draft.isBestSeller,
          isNewArrival: draft.isNewArrival,
          careInstructions: draft.careInstructions,
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
      resetSkuAvailability();
      const successMessage = payload.message ?? "Product saved.";
      setStatus(successMessage);
      toast.success(successMessage, savedProduct.name);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Could not save product.";
      setStatus(errorMessage);
      toast.error("Product upload failed", errorMessage);
    } finally {
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

      <section className="admin-editor-hero">
        <div className="admin-product-finder">
          <div className="admin-form-toolbar">
            <div className="admin-toolbar-search">
              <label className="admin-toolbar-label" htmlFor="admin-product-search">
                Find Product
              </label>
              <div className="admin-product-search-control">
                <FiSearch aria-hidden="true" />
                <Input
                  className="admin-product-search-input"
                  id="admin-product-search"
                  onKeyDown={onProductSearchKeyDown}
                  onChange={(event) => setProductSearch(event.currentTarget.value)}
                  placeholder="Search by name, SKU, or top-level category"
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
            {draft.slug ? (
              <a
                className="btn-secondary admin-toolbar-action"
                href={`/products/${encodeURIComponent(draft.slug)}`}
                rel="noreferrer"
                target="_blank"
              >
                Open Product
              </a>
            ) : null}
          </div>

          {normalizedProductSearch ? (
            <div className="admin-product-search-results">
              {visibleProductResults.length > 0 ? (
                visibleProductResults.map((product) => (
                  <article
                    className="admin-product-search-result"
                    key={product.id}
                  >
                    <button
                      className="admin-product-search-result-main"
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
                          <span aria-hidden="true" className="admin-product-search-thumb-empty">
                            No image
                          </span>
                        )}
                      </span>
                      <span className="admin-product-search-result-copy">
                        <span className="admin-product-search-result-name">{product.name}</span>
                        <span className="admin-product-search-result-meta">
                          <span>{product.sku}</span>
                          <span>{product.category}</span>
                        </span>
                      </span>
                    </button>
                    <Button
                      className="admin-product-delete-btn"
                      disabled={deletingProductSlug === product.slug}
                      onClick={() => {
                        setProductPendingDelete(product);
                        setProductDeleteError("");
                      }}
                      size="compact"
                      variant="secondary"
                    >
                      {deletingProductSlug === product.slug ? "Removing..." : "Remove"}
                    </Button>
                  </article>
                ))
              ) : (
                <p className="tiny admin-product-search-empty">
                  No products match that search yet.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <div className="admin-editor-layout">
        <section className="admin-editor-panel">
          <div className="form-grid">
            <label className="admin-field-name full-width">
              Product Name
              <Input name="name" onChange={onTextChange} value={draft.name} />
            </label>
            <label className="admin-sku-field">
              SKU
              <Input
                aria-describedby="admin-sku-availability"
                aria-invalid={skuIsKnownDuplicate}
                className={skuIsKnownDuplicate ? "is-invalid" : undefined}
                name="sku"
                onBlur={() => void checkSkuAvailability()}
                onChange={onTextChange}
                value={draft.sku}
              />
              {skuAvailability.message ? (
                <span
                  className={`tiny sku-field-status sku-field-status-${skuAvailability.state}`}
                  id="admin-sku-availability"
                >
                  {skuAvailability.message}
                </span>
              ) : null}
            </label>
            <label className="admin-field-price">
              Base Price USD
              <Input
                inputMode="decimal"
                name="basePriceUsd"
                onChange={onTextChange}
                value={draft.basePriceUsd}
              />
            </label>
            <label className="admin-field-stock">
              Stock
              <Input
                inputMode="numeric"
                name="stock"
                onChange={onTextChange}
                value={draft.stock}
              />
            </label>
            <div className="price-info-card admin-field-price-preview">
              <strong>Base Price Preview</strong>
              <p className="tiny">PKR: {formatCurrency(basePricePkrPreview, "PKR")}</p>
              <p className="tiny">
                EUR:{" "}
                {basePricePkrPreview !== null
                  ? formatCurrency(basePricePkrPreview * ratesFromPkr.EUR, "EUR")
                  : "--"}
              </p>
            </div>
            <div className="checkbox-grid full-width">
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
            <label className="full-width">
              Short Description
              <Textarea
                name="shortDescription"
                onChange={onTextChange}
                rows={3}
                value={draft.shortDescription}
              />
            </label>
            <label className="full-width">
              Long Description
              <Textarea
                name="longDescription"
                onChange={onTextChange}
                rows={5}
                value={draft.longDescription}
              />
            </label>
            <label className="full-width">
              Tags
              <Input
                name="tags"
                onChange={onTextChange}
                placeholder="horse, saddle, premium"
                value={draft.tags}
              />
            </label>
            <label className="full-width">
              Care Instructions
              <Textarea
                name="careInstructions"
                onChange={onTextChange}
                rows={3}
                value={draft.careInstructions}
              />
            </label>
          </div>
        </section>

        <section className="admin-editor-panel admin-taxonomy-panel">
          <div className="admin-taxonomy-card">
            <label className="admin-search-field">
              Category Search
              <Input
                onChange={(event) => setCategorySearch(event.currentTarget.value)}
                placeholder="Search blankets, bridles, cat collars, farrier tools..."
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
                  <div className="admin-taxonomy-column-head">
                    <strong>{categoryStepTitle}</strong>
                  </div>
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
                  ) : (
                    <p className="tiny">No categories available at this level.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="admin-editor-panel admin-image-manager">
        <div className="admin-panel-header">
          <div>
            <p className="section-eyebrow">Media</p>
            <h3>Upload and order product images</h3>
          </div>
        </div>

        <div className="admin-image-tools">
          <div className="admin-upload-card">
            <div className="admin-upload-meta">
              <p className="tiny">
                Upload folder: <strong>{uploadFolder}</strong>
              </p>
            </div>
            <R2ImageUploadForm
              ref={uploadFormRef}
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
              <p className="tiny admin-image-url">{imageUrl}</p>
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
                  onClick={() => removeImage(imageUrl)}
                  size="compact"
                  variant="secondary"
                >
                  <FiTrash2 />
                  <span>Remove</span>
                </Button>
              </div>
            </article>
          ))}
          {!draft.images.length ? (
            <p className="empty-state">No product images attached yet.</p>
          ) : null}
        </div>
      </section>

      <div className="admin-form-footer">
        <Button
          disabled={isSaving || isLoadingProduct || skuIsKnownDuplicate}
          onClick={onSave}
          variant="primary"
        >
          {isSaving ? "Saving..." : "Save Product"}
        </Button>
        {status ? <p className="form-status">{status}</p> : null}
      </div>
    </div>
  );
}
