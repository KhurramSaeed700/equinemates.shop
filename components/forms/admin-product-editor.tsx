"use client";

import Image from "next/image";
import { ChangeEvent, useState } from "react";

import { R2ImageUploadForm } from "@/components/forms/r2-image-upload-form";
import { Product, ProductCategory } from "@/lib/types";

type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  category: ProductCategory;
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
  basePricePkr: string;
  compareAtPricePkr: string;
  stock: string;
  tags: string;
  images: string[];
  isBestSeller: boolean;
  isNewArrival: boolean;
  careInstructions: string;
  shippingInfo: string;
};

type AdminProductEditorProps = {
  categoryOptions: ProductCategory[];
  initialProduct: Product | null;
  initialProducts: ProductSummary[];
};

type ProductResponse = {
  message?: string;
  product?: Product;
};

function createEmptyDraft(defaultCategory: ProductCategory | undefined): ProductDraft {
  return {
    originalSlug: "",
    slug: "",
    name: "",
    sku: "",
    category: defaultCategory ?? "",
    categoryPath: defaultCategory ?? "",
    shortDescription: "",
    longDescription: "",
    basePriceUsd: "",
    basePricePkr: "",
    compareAtPricePkr: "",
    stock: "0",
    tags: "",
    images: [],
    isBestSeller: false,
    isNewArrival: false,
    careInstructions: "",
    shippingInfo: "",
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
    basePricePkr: String(product.basePricePkr),
    compareAtPricePkr: product.compareAtPricePkr ? String(product.compareAtPricePkr) : "",
    stock: String(product.stock),
    tags: product.tags.join(", "),
    images: [...product.images],
    isBestSeller: product.isBestSeller,
    isNewArrival: product.isNewArrival,
    careInstructions: product.careInstructions ?? "",
    shippingInfo: product.shippingInfo ?? "",
  };
}

function toSummary(product: Product): ProductSummary {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    category: product.category,
  };
}

function sortProducts(products: ProductSummary[]): ProductSummary[] {
  return [...products].sort((left, right) => left.name.localeCompare(right.name));
}

export function AdminProductEditor({
  categoryOptions,
  initialProduct,
  initialProducts,
}: AdminProductEditorProps) {
  const [products, setProducts] = useState(() => sortProducts(initialProducts));
  const [selectedSlug, setSelectedSlug] = useState(initialProduct?.slug ?? "__new__");
  const [draft, setDraft] = useState<ProductDraft>(() =>
    initialProduct ? toDraft(initialProduct) : createEmptyDraft(categoryOptions[0]),
  );
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  const updateDraft = (
    field: keyof ProductDraft,
    value: string | boolean | string[],
  ) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  };

  const onTextChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.currentTarget;

    if (name === "category") {
      setDraft((currentDraft) => ({
        ...currentDraft,
        category: value,
        categoryPath:
          currentDraft.categoryPath.trim().length > 0
            ? currentDraft.categoryPath
            : value,
      }));
      return;
    }

    updateDraft(name as keyof ProductDraft, value);
  };

  const onCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateDraft(event.currentTarget.name as keyof ProductDraft, event.currentTarget.checked);
  };

  const loadProduct = async (slug: string) => {
    setIsLoadingProduct(true);
    setStatus("");

    try {
      const response = await fetch(
        `/api/admin/products?slug=${encodeURIComponent(slug)}`,
      );
      const payload = (await response.json()) as ProductResponse;

      if (!response.ok || !payload.product) {
        throw new Error(payload.message ?? "Could not load product.");
      }

      setDraft(toDraft(payload.product));
      setSelectedSlug(payload.product.slug);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load product.");
    } finally {
      setIsLoadingProduct(false);
    }
  };

  const startNewProduct = () => {
    setSelectedSlug("__new__");
    setDraft(createEmptyDraft(categoryOptions[0]));
    setImageUrlInput("");
    setStatus("Creating a new product draft.");
  };

  const addImageUrl = () => {
    const nextUrl = imageUrlInput.trim();

    if (!nextUrl) {
      return;
    }

    setDraft((currentDraft) => ({
      ...currentDraft,
      images: currentDraft.images.includes(nextUrl)
        ? currentDraft.images
        : [...currentDraft.images, nextUrl],
    }));
    setImageUrlInput("");
    setStatus("Image URL added to the current draft.");
  };

  const removeImage = (imageUrl: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      images: currentDraft.images.filter((url) => url !== imageUrl),
    }));
  };

  const onSave = async () => {
    setIsSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          originalSlug: draft.originalSlug || undefined,
          slug: draft.slug,
          name: draft.name,
          sku: draft.sku,
          category: draft.category,
          categoryPath: draft.categoryPath
            .split(">")
            .map((segment) => segment.trim())
            .filter(Boolean),
          shortDescription: draft.shortDescription,
          longDescription: draft.longDescription,
          basePriceUsd: Number(draft.basePriceUsd),
          basePricePkr: Number(draft.basePricePkr),
          compareAtPricePkr: draft.compareAtPricePkr
            ? Number(draft.compareAtPricePkr)
            : null,
          stock: Number(draft.stock),
          tags: draft.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          images: draft.images,
          isBestSeller: draft.isBestSeller,
          isNewArrival: draft.isNewArrival,
          careInstructions: draft.careInstructions,
          shippingInfo: draft.shippingInfo,
        }),
      });

      const payload = (await response.json()) as ProductResponse;

      if (!response.ok || !payload.product) {
        throw new Error(payload.message ?? "Could not save product.");
      }

      const savedProduct = payload.product;
      setDraft(toDraft(savedProduct));
      setSelectedSlug(savedProduct.slug);
      setProducts((currentProducts) =>
        sortProducts([
          ...currentProducts.filter(
            (product) =>
              product.slug !== draft.originalSlug && product.slug !== savedProduct.slug,
          ),
          toSummary(savedProduct),
        ]),
      );
      setStatus(payload.message ?? "Product saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save product.");
    } finally {
      setIsSaving(false);
    }
  };

  const uploadFolder =
    draft.slug.trim() || draft.name.trim() || draft.categoryPath.split(" > ").at(-1) || "products";

  return (
    <div className="admin-product-editor">
      <div className="admin-form-toolbar">
        <label>
          Select Product
          <select
            disabled={isLoadingProduct}
            onChange={(event) => {
              const nextSlug = event.currentTarget.value;
              if (nextSlug === "__new__") {
                startNewProduct();
                return;
              }
              void loadProduct(nextSlug);
            }}
            value={selectedSlug}
          >
            <option value="__new__">Create new product</option>
            {products.map((product) => (
              <option key={product.id} value={product.slug}>
                {product.name} ({product.sku})
              </option>
            ))}
          </select>
        </label>
        <button className="btn-secondary compact" onClick={startNewProduct} type="button">
          New Draft
        </button>
        {draft.slug ? (
          <a
            className="btn-secondary compact"
            href={`/products/${encodeURIComponent(draft.slug)}`}
            rel="noreferrer"
            target="_blank"
          >
            Open Product
          </a>
        ) : null}
      </div>

      <div className="form-grid">
        <label>
          Product Name
          <input name="name" onChange={onTextChange} type="text" value={draft.name} />
        </label>
        <label>
          Slug
          <input name="slug" onChange={onTextChange} type="text" value={draft.slug} />
        </label>
        <label>
          SKU
          <input name="sku" onChange={onTextChange} type="text" value={draft.sku} />
        </label>
        <label>
          Category
          <select name="category" onChange={onTextChange} value={draft.category}>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="full-width">
          Category Path
          <input
            name="categoryPath"
            onChange={onTextChange}
            placeholder="Horse > Saddles & Pads > English Saddles"
            type="text"
            value={draft.categoryPath}
          />
        </label>
        <label>
          Base Price USD
          <input
            inputMode="decimal"
            name="basePriceUsd"
            onChange={onTextChange}
            type="text"
            value={draft.basePriceUsd}
          />
        </label>
        <label>
          Base Price PKR
          <input
            inputMode="decimal"
            name="basePricePkr"
            onChange={onTextChange}
            type="text"
            value={draft.basePricePkr}
          />
        </label>
        <label>
          Compare-at PKR
          <input
            inputMode="decimal"
            name="compareAtPricePkr"
            onChange={onTextChange}
            type="text"
            value={draft.compareAtPricePkr}
          />
        </label>
        <label>
          Stock
          <input inputMode="numeric" name="stock" onChange={onTextChange} type="text" value={draft.stock} />
        </label>
        <label className="checkbox-label">
          <input
            checked={draft.isBestSeller}
            name="isBestSeller"
            onChange={onCheckboxChange}
            type="checkbox"
          />
          Mark as best seller
        </label>
        <label className="checkbox-label">
          <input
            checked={draft.isNewArrival}
            name="isNewArrival"
            onChange={onCheckboxChange}
            type="checkbox"
          />
          Mark as new arrival
        </label>
        <label className="full-width">
          Short Description
          <textarea
            name="shortDescription"
            onChange={onTextChange}
            rows={3}
            value={draft.shortDescription}
          />
        </label>
        <label className="full-width">
          Long Description
          <textarea
            name="longDescription"
            onChange={onTextChange}
            rows={5}
            value={draft.longDescription}
          />
        </label>
        <label className="full-width">
          Tags
          <input
            name="tags"
            onChange={onTextChange}
            placeholder="horse, saddle, premium"
            type="text"
            value={draft.tags}
          />
        </label>
        <label className="full-width">
          Care Instructions
          <textarea
            name="careInstructions"
            onChange={onTextChange}
            rows={3}
            value={draft.careInstructions}
          />
        </label>
        <label className="full-width">
          Shipping Info
          <textarea
            name="shippingInfo"
            onChange={onTextChange}
            rows={3}
            value={draft.shippingInfo}
          />
        </label>
      </div>

      <div className="admin-image-manager">
        <div className="admin-image-input">
          <label className="full-width">
            Add Existing Image URL
            <input
              onChange={(event) => setImageUrlInput(event.currentTarget.value)}
              placeholder="https://cdn.example.com/products/..."
              type="text"
              value={imageUrlInput}
            />
          </label>
          <button className="btn-secondary compact" onClick={addImageUrl} type="button">
            Add URL
          </button>
        </div>

        <R2ImageUploadForm
          hideFolderField
          initialFolder={uploadFolder}
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

        <div className="admin-image-grid">
          {draft.images.map((imageUrl) => (
            <article className="admin-image-card" key={imageUrl}>
              <Image
                alt={draft.name || "Product image"}
                className="admin-image-preview"
                height={180}
                sizes="120px"
                src={imageUrl}
                width={180}
              />
              <p className="tiny admin-image-url">{imageUrl}</p>
              <button
                className="btn-secondary compact"
                onClick={() => removeImage(imageUrl)}
                type="button"
              >
                Remove
              </button>
            </article>
          ))}
          {!draft.images.length ? (
            <p className="empty-state">No product images attached yet.</p>
          ) : null}
        </div>
      </div>

      <div className="admin-form-footer">
        <button
          className="btn-primary"
          disabled={isSaving || isLoadingProduct}
          onClick={onSave}
          type="button"
        >
          {isSaving ? "Saving..." : "Save Product"}
        </button>
        {status ? <p className="form-status">{status}</p> : null}
      </div>
    </div>
  );
}
