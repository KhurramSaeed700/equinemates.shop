"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiChevronRight,
  FiChevronsUp,
  FiCornerUpLeft,
  FiEdit3,
  FiFolderPlus,
  FiLoader,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { AdminCategoryTreeNode } from "@/lib/server/catalog-categories";
import type { AdminProductSummary } from "@/lib/catalog";
import { useToast } from "@/lib/use-toast";

type AdminCategoryManagerProps = {
  initialCategories: AdminCategoryTreeNode[];
  initialProducts: AdminProductSummary[];
};

type CategoryOption = AdminCategoryTreeNode & {
  label: string;
};

type CategoryApiResponse = {
  categories?: AdminCategoryTreeNode[];
  message?: string;
};

type BusyAction =
  | "refresh"
  | "rename"
  | "add-main"
  | "add-child"
  | "move"
  | "promote"
  | "order-up"
  | "order-down"
  | "delete"
  | "bulk-move"
  | null;

type CategoryTool =
  | "rename"
  | "add-child"
  | "hierarchy"
  | "order"
  | "products"
  | "remove"
  | "create-main"
  | null;

const busyActionLabels: Record<Exclude<BusyAction, null>, string> = {
  refresh: "Refreshing categories...",
  rename: "Renaming category...",
  "add-main": "Adding main category...",
  "add-child": "Adding child category...",
  move: "Moving category...",
  promote: "Moving category up one level...",
  "order-up": "Moving category up...",
  "order-down": "Moving category down...",
  delete: "Removing category...",
  "bulk-move": "Moving selected products...",
};

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function flattenCategories(nodes: AdminCategoryTreeNode[]): CategoryOption[] {
  const items: CategoryOption[] = [];

  for (const node of nodes) {
    items.push({
      ...node,
      label: node.path.join(" > "),
    });
    items.push(...flattenCategories(node.children));
  }

  return items;
}

function findCategoryById(
  nodes: AdminCategoryTreeNode[],
  id: string,
): AdminCategoryTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const match = findCategoryById(node.children, id);
    if (match) {
      return match;
    }
  }

  return null;
}

function findCategoryByPath(
  nodes: AdminCategoryTreeNode[],
  path: string[],
): AdminCategoryTreeNode | null {
  for (const node of nodes) {
    const pathMatches =
      node.path.length === path.length &&
      node.path.every((segment, index) => segment === path[index]);

    if (pathMatches) {
      return node;
    }

    const match = findCategoryByPath(node.children, path);
    if (match) {
      return match;
    }
  }

  return null;
}

function findAncestorIds(
  nodes: AdminCategoryTreeNode[],
  id: string,
  ancestors: string[] = [],
): string[] {
  for (const node of nodes) {
    if (node.id === id) {
      return ancestors;
    }

    const childAncestors = findAncestorIds(node.children, id, [
      ...ancestors,
      node.id,
    ]);

    if (childAncestors.length > 0) {
      return childAncestors;
    }
  }

  return [];
}

function collectExpandableIds(nodes: AdminCategoryTreeNode[]): Set<string> {
  const ids = new Set<string>();

  for (const node of nodes) {
    if (node.children.length > 0) {
      ids.add(node.id);
    }

    for (const childId of collectExpandableIds(node.children)) {
      ids.add(childId);
    }
  }

  return ids;
}

function collectDescendantIds(node: AdminCategoryTreeNode): Set<string> {
  const ids = new Set<string>();

  for (const child of node.children) {
    ids.add(child.id);

    for (const descendantId of collectDescendantIds(child)) {
      ids.add(descendantId);
    }
  }

  return ids;
}

function getSiblings(
  nodes: AdminCategoryTreeNode[],
  category: AdminCategoryTreeNode,
) {
  if (!category.parentId) {
    return nodes;
  }

  return findCategoryById(nodes, category.parentId)?.children ?? [];
}

function getProductCountLabel(count: number) {
  return `${count} product${count === 1 ? "" : "s"}`;
}

function getInitialSelectedId(categories: AdminCategoryTreeNode[]) {
  return flattenCategories(categories)[0]?.id ?? "";
}

function TreeRow({
  expandedIds,
  node,
  onSelect,
  onToggle,
  selectedId,
}: {
  expandedIds: Set<string>;
  node: AdminCategoryTreeNode;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  selectedId: string;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <>
      <button
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        className={
          isSelected
            ? "admin-category-node admin-category-node-active"
            : "admin-category-node"
        }
        data-category-id={node.id}
        onClick={() => {
          onSelect(node.id);

          if (hasChildren) {
            onToggle(node.id);
          }
        }}
        role="treeitem"
        style={{ paddingLeft: `${0.5 + node.level * 0.9}rem` }}
        type="button"
      >
        <span
          aria-hidden="true"
          className={
            isExpanded
              ? "admin-category-node-disclosure is-expanded"
              : "admin-category-node-disclosure"
          }
        >
          {hasChildren ? <FiChevronRight /> : null}
        </span>
        <span className="admin-category-node-copy">
          <strong>{node.name}</strong>
          <small>{node.path.join(" > ")}</small>
        </span>
        <span className="admin-category-node-count">
          {node.totalProductCount}
        </span>
      </button>

      {isExpanded
        ? node.children.map((child) => (
            <TreeRow
              expandedIds={expandedIds}
              key={child.id}
              node={child}
              onSelect={onSelect}
              onToggle={onToggle}
              selectedId={selectedId}
            />
          ))
        : null}
    </>
  );
}

export function AdminCategoryManager({
  initialCategories,
  initialProducts,
}: AdminCategoryManagerProps) {
  const toast = useToast();
  const [categories, setCategories] = useState(initialCategories);
  const [products, setProducts] = useState(initialProducts);
  const [selectedId, setSelectedId] = useState(() =>
    getInitialSelectedId(initialCategories),
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState("");
  const [editName, setEditName] = useState("");
  const [mainName, setMainName] = useState("");
  const [childName, setChildName] = useState("");
  const [moveParentId, setMoveParentId] = useState("");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [status, setStatus] = useState("");
  const [formError, setFormError] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [bulkTargetId, setBulkTargetId] = useState("");
  const [activeTool, setActiveTool] = useState<CategoryTool>(null);

  const flatCategories = useMemo(
    () => flattenCategories(categories),
    [categories],
  );
  const selectedCategory = useMemo(
    () => findCategoryById(categories, selectedId),
    [categories, selectedId],
  );
  const normalizedSearch = search.trim().toLowerCase();
  const searchResults = normalizedSearch
    ? flatCategories.filter((category) =>
        category.label.toLowerCase().includes(normalizedSearch),
      )
    : [];
  const selectedDescendantIds = useMemo(
    () =>
      selectedCategory ? collectDescendantIds(selectedCategory) : new Set<string>(),
    [selectedCategory],
  );
  const parentOptions = selectedCategory
    ? flatCategories.filter(
        (category) =>
          category.id !== selectedCategory.id &&
          !selectedDescendantIds.has(category.id),
      )
    : [];
  const siblings = selectedCategory
    ? getSiblings(categories, selectedCategory)
    : [];
  const siblingIndex = selectedCategory
    ? siblings.findIndex((category) => category.id === selectedCategory.id)
    : -1;
  const selectedParent = selectedCategory?.parentId
    ? findCategoryById(categories, selectedCategory.parentId)
    : null;
  const grandParentId = selectedParent?.parentId ?? "";
  const isBusy = busyAction !== null;
  const selectedCategoryProducts = selectedCategory
    ? products.filter(
        (product) =>
          product.categoryPath.join(" > ") === selectedCategory.path.join(" > "),
      )
    : [];
  const bulkDestinationOptions = selectedCategory
    ? flatCategories.filter((category) => category.id !== selectedCategory.id)
    : flatCategories;

  useEffect(() => {
    if (!flatCategories.length) {
      setSelectedId("");
      return;
    }

    if (!selectedId || !flatCategories.some((category) => category.id === selectedId)) {
      setSelectedId(flatCategories[0].id);
    }
  }, [flatCategories, selectedId]);

  useEffect(() => {
    if (!selectedCategory) {
      setEditName("");
      setChildName("");
      setMoveParentId("");
      setPendingDeleteId("");
      return;
    }

    setEditName(selectedCategory.name);
    setChildName("");
    setMoveParentId(selectedCategory.parentId ?? "");
    setPendingDeleteId("");
    setSelectedProductIds(new Set());
    setBulkTargetId("");
    setActiveTool(null);
  }, [selectedCategory]);

  function toggleProductSelection(productId: string) {
    setSelectedProductIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(productId)) {
        nextIds.delete(productId);
      } else {
        nextIds.add(productId);
      }
      return nextIds;
    });
  }

  async function bulkMoveProducts() {
    if (!selectedProductIds.size) {
      return;
    }

    if (!bulkTargetId) {
      const message = "Choose a destination category before moving products.";
      setFormError(message);
      setStatus("");
      toast.error("Destination category required.", message);
      return;
    }

    setBusyAction("bulk-move");
    setFormError("");

    try {
      const response = await fetch("/api/admin/products", {
        body: JSON.stringify({
          action: "bulk-category-move",
          categoryId: bulkTargetId,
          productIds: Array.from(selectedProductIds),
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json()) as CategoryApiResponse & {
        products?: AdminProductSummary[];
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not move products.");
      }

      if (payload.categories) {
        setCategories(payload.categories);
      }
      if (payload.products) {
        setProducts(payload.products);
      }
      setSelectedProductIds(new Set());
      setBulkTargetId("");
      setStatus(payload.message ?? "Products moved.");
      toast.success(payload.message ?? "Products moved.");
    } catch (error) {
      handleActionError(error, "Could not move products.");
    } finally {
      setBusyAction(null);
    }
  }

  function selectCategory(id: string) {
    setSelectedId(id);
    setFormError("");
    setStatus("");
  }

  function toggleCategory(id: string) {
    setExpandedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(id)) {
        nextIds.delete(id);
      } else {
        nextIds.add(id);
      }

      return nextIds;
    });
  }

  function expandPath(tree: AdminCategoryTreeNode[], id: string) {
    const ancestorIds = findAncestorIds(tree, id);

    if (!ancestorIds.length) {
      return;
    }

    setExpandedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      for (const ancestorId of ancestorIds) {
        nextIds.add(ancestorId);
      }

      return nextIds;
    });
  }

  async function readCategoryResponse(response: Response) {
    const payload = (await response.json()) as CategoryApiResponse;

    if (!response.ok) {
      throw new Error(payload.message ?? "Category request failed.");
    }

    if (payload.categories) {
      setCategories(payload.categories);
    }

    if (payload.message) {
      setStatus(payload.message);
    }

    return payload;
  }

  function handleActionError(error: unknown, fallbackMessage: string) {
    const message = error instanceof Error ? error.message : fallbackMessage;
    setFormError(message);
    toast.error(fallbackMessage, message);
  }

  async function refreshCategories() {
    setBusyAction("refresh");
    setFormError("");

    try {
      const response = await fetch("/api/admin/categories", {
        cache: "no-store",
      });
      const payload = await readCategoryResponse(response);
      toast.success(payload.message ?? "Categories refreshed.");
    } catch (error) {
      handleActionError(error, "Could not refresh categories.");
    } finally {
      setBusyAction(null);
    }
  }

  async function renameCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCategory) {
      return;
    }

    setBusyAction("rename");
    setFormError("");

    try {
      const response = await fetch("/api/admin/categories", {
        body: JSON.stringify({
          id: selectedCategory.id,
          name: editName,
          parentId: selectedCategory.parentId ?? null,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = await readCategoryResponse(response);
      toast.success(payload.message ?? "Category updated.");
    } catch (error) {
      handleActionError(error, "Could not update category.");
    } finally {
      setBusyAction(null);
    }
  }

  async function addMainCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextName = normalizeName(mainName);
    if (!nextName) {
      return;
    }

    setBusyAction("add-main");
    setFormError("");

    try {
      const response = await fetch("/api/admin/categories", {
        body: JSON.stringify({
          name: nextName,
          parentId: null,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await readCategoryResponse(response);
      const createdCategory = payload.categories
        ? findCategoryByPath(payload.categories, [nextName])
        : null;

      if (createdCategory) {
        setSelectedId(createdCategory.id);
      }

      setMainName("");
      toast.success(payload.message ?? "Category created.");
    } catch (error) {
      handleActionError(error, "Could not create category.");
    } finally {
      setBusyAction(null);
    }
  }

  async function addChildCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCategory) {
      return;
    }

    const nextName = normalizeName(childName);
    if (!nextName) {
      return;
    }

    setBusyAction("add-child");
    setFormError("");

    try {
      const response = await fetch("/api/admin/categories", {
        body: JSON.stringify({
          name: nextName,
          parentId: selectedCategory.id,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await readCategoryResponse(response);
      const createdCategory = payload.categories
        ? findCategoryByPath(payload.categories, [...selectedCategory.path, nextName])
        : null;

      setExpandedIds((currentIds) => new Set(currentIds).add(selectedCategory.id));

      if (createdCategory) {
        setSelectedId(createdCategory.id);
        if (payload.categories) {
          expandPath(payload.categories, createdCategory.id);
        }
      }

      setChildName("");
      toast.success(payload.message ?? "Category created.");
    } catch (error) {
      handleActionError(error, "Could not create category.");
    } finally {
      setBusyAction(null);
    }
  }

  async function moveCategory(parentId: string | null, action: BusyAction = "move") {
    if (!selectedCategory) {
      return;
    }

    setBusyAction(action);
    setFormError("");

    try {
      const response = await fetch("/api/admin/categories", {
        body: JSON.stringify({
          id: selectedCategory.id,
          name: selectedCategory.name,
          parentId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = await readCategoryResponse(response);

      if (parentId) {
        setExpandedIds((currentIds) => new Set(currentIds).add(parentId));
      }

      if (payload.categories) {
        expandPath(payload.categories, selectedCategory.id);
      }

      toast.success(payload.message ?? "Category moved.");
    } catch (error) {
      handleActionError(error, "Could not move category.");
    } finally {
      setBusyAction(null);
    }
  }

  async function reorderCategory(direction: "up" | "down") {
    if (!selectedCategory) {
      return;
    }

    setBusyAction(direction === "up" ? "order-up" : "order-down");
    setFormError("");

    try {
      const response = await fetch("/api/admin/categories", {
        body: JSON.stringify({
          action: "reorder",
          direction,
          id: selectedCategory.id,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = await readCategoryResponse(response);
      toast.success(payload.message ?? "Category order updated.");
    } catch (error) {
      handleActionError(error, "Could not update category order.");
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteCategory() {
    if (!selectedCategory || selectedCategory.totalProductCount > 0) {
      return;
    }

    if (pendingDeleteId !== selectedCategory.id) {
      setPendingDeleteId(selectedCategory.id);
      return;
    }

    const fallbackSelectionId = selectedCategory.parentId;
    setBusyAction("delete");
    setFormError("");

    try {
      const response = await fetch(
        `/api/admin/categories?id=${encodeURIComponent(selectedCategory.id)}`,
        { method: "DELETE" },
      );
      const payload = await readCategoryResponse(response);
      const nextCategories = payload.categories ?? [];
      const fallbackSelection =
        (fallbackSelectionId
          ? findCategoryById(nextCategories, fallbackSelectionId)
          : null) ?? flattenCategories(nextCategories)[0] ?? null;

      setSelectedId(fallbackSelection?.id ?? "");
      setPendingDeleteId("");
      toast.success(payload.message ?? "Category removed.");
    } catch (error) {
      handleActionError(error, "Could not remove category.");
    } finally {
      setBusyAction(null);
    }
  }

  const totalProductCount = categories.reduce(
    (total, category) => total + category.totalProductCount,
    0,
  );
  const canDeleteSelected = Boolean(
    selectedCategory && selectedCategory.totalProductCount === 0,
  );
  const hasExpandedCategories = expandedIds.size > 0;

  return (
    <div aria-busy={isBusy} className="admin-category-manager">
      <section className="admin-editor-panel admin-category-browser">
        <div className="admin-panel-header admin-category-panel-header">
          <div>
            <h3>Categories</h3>
            <p className="tiny">
              {flatCategories.length} categories -{" "}
              {getProductCountLabel(totalProductCount)}
            </p>
          </div>
          <div className="admin-category-header-actions">
            <Button
              aria-label={
                hasExpandedCategories
                  ? "Collapse all categories"
                  : "Expand all categories"
              }
              className="admin-category-icon-button"
              onClick={() =>
                setExpandedIds(
                  hasExpandedCategories
                    ? new Set()
                    : collectExpandableIds(categories),
                )
              }
              size="icon"
              title={hasExpandedCategories ? "Collapse all" : "Expand all"}
              variant="icon"
            >
              {hasExpandedCategories ? (
                <FiChevronsUp aria-hidden="true" />
              ) : (
                <FiChevronRight aria-hidden="true" />
              )}
            </Button>
            <Button
              aria-label="Refresh categories"
              className="admin-category-icon-button"
              disabled={isBusy}
              onClick={() => void refreshCategories()}
              size="icon"
              title="Refresh categories"
              variant="icon"
            >
              {busyAction === "refresh" ? (
                <FiLoader aria-hidden="true" className="admin-category-spinner" />
              ) : (
                <FiRefreshCw aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        <label className="admin-category-search">
          <FiSearch aria-hidden="true" />
          <Input
            aria-label="Search categories"
            className="admin-category-search-input"
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search categories"
            value={search}
          />
        </label>

        <div className="admin-category-tree" role="tree">
          {normalizedSearch ? (
            searchResults.length > 0 ? (
              searchResults.map((category) => (
                <button
                  aria-selected={category.id === selectedId}
                  className={
                    category.id === selectedId
                      ? "admin-category-search-result admin-category-node-active"
                      : "admin-category-search-result"
                  }
                  data-category-id={category.id}
                  key={category.id}
                  onClick={() => selectCategory(category.id)}
                  role="treeitem"
                  type="button"
                >
                  <span>
                    <strong>{category.name}</strong>
                    <small>{category.label}</small>
                  </span>
                  <span>{category.totalProductCount}</span>
                </button>
              ))
            ) : (
              <p className="tiny admin-category-empty">No matching categories.</p>
            )
          ) : categories.length > 0 ? (
            categories.map((category) => (
              <TreeRow
                expandedIds={expandedIds}
                key={category.id}
                node={category}
                onSelect={selectCategory}
                onToggle={toggleCategory}
                selectedId={selectedId}
              />
            ))
          ) : (
            <p className="tiny admin-category-empty">No categories yet.</p>
          )}
        </div>
      </section>

      <section className="admin-editor-panel admin-category-detail-panel">
        {selectedCategory ? (
          <>
            <div className="admin-panel-header admin-category-panel-header">
              <div>
                <h3>{selectedCategory.name}</h3>
                <p className="tiny">{selectedCategory.path.join(" > ")}</p>
              </div>
              <div className="admin-category-quick-stats">
                <span>{getProductCountLabel(selectedCategory.totalProductCount)}</span>
                <span>{selectedCategory.children.length} subcategories</span>
              </div>
            </div>

            {busyAction ? (
              <div
                aria-live="polite"
                className="admin-category-busy-status"
                role="status"
              >
                <FiLoader aria-hidden="true" className="admin-category-spinner" />
                <span>{busyActionLabels[busyAction]}</span>
              </div>
            ) : null}

            <div className="admin-category-tool-layout">
              <nav aria-label="Category actions" className="admin-category-tool-menu">
                {[
                  ["rename", "Rename"],
                  ["add-child", "Add child"],
                  ["hierarchy", "Hierarchy"],
                  ["order", "Order"],
                  ["products", "Move products"],
                  ["remove", "Remove"],
                  ["create-main", "Create main category"],
                ].map(([tool, label]) => (
                  <button
                    aria-pressed={activeTool === tool}
                    className={
                      activeTool === tool
                        ? "admin-category-tool-button is-active"
                        : "admin-category-tool-button"
                    }
                    disabled={isBusy}
                    key={tool}
                    onClick={() => setActiveTool(tool as CategoryTool)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </nav>

              <div className="admin-category-tool-content">
                {!activeTool ? (
                  <div className="admin-category-tool-placeholder">
                    <strong>Choose an action</strong>
                    <p>Select one of the options to manage this category.</p>
                  </div>
                ) : null}

            {activeTool === "rename" ? (
              <form
              className="admin-category-simple-section"
              onSubmit={renameCategory}
            >
              <div className="admin-category-section-heading">
                <h4>Rename</h4>
              </div>
              <div className="admin-category-action-grid">
                <Field>
                  <FieldLabel htmlFor="admin-category-name">Name</FieldLabel>
                  <Input
                    disabled={isBusy}
                    id="admin-category-name"
                    onChange={(event) => setEditName(event.currentTarget.value)}
                    value={editName}
                  />
                </Field>
                <Button
                  disabled={isBusy || !editName.trim()}
                  type="submit"
                  variant="primary"
                >
                  {busyAction === "rename" ? (
                    <FiLoader aria-hidden="true" className="admin-category-spinner" />
                  ) : (
                    <FiEdit3 aria-hidden="true" />
                  )}
                  <span>{busyAction === "rename" ? "Renaming..." : "Rename"}</span>
                </Button>
              </div>
              </form>
            ) : null}

            {activeTool === "add-child" ? (
              <form
              className="admin-category-simple-section"
              onSubmit={addChildCategory}
            >
              <div className="admin-category-section-heading">
                <h4>Add Child</h4>
                <p>{selectedCategory.path.join(" > ")}</p>
              </div>
              <div className="admin-category-action-grid">
                <Field>
                  <FieldLabel htmlFor="admin-category-child-name">
                    Child category name
                  </FieldLabel>
                  <Input
                    disabled={isBusy}
                    id="admin-category-child-name"
                    onChange={(event) => setChildName(event.currentTarget.value)}
                    value={childName}
                  />
                </Field>
                <Button
                  disabled={isBusy || !childName.trim()}
                  type="submit"
                  variant="primary"
                >
                  {busyAction === "add-child" ? (
                    <FiLoader aria-hidden="true" className="admin-category-spinner" />
                  ) : (
                    <FiFolderPlus aria-hidden="true" />
                  )}
                  <span>
                    {busyAction === "add-child" ? "Adding..." : "Add child"}
                  </span>
                </Button>
              </div>
              </form>
            ) : null}

            {activeTool === "hierarchy" ? (
              <div className="admin-category-simple-section">
              <div className="admin-category-section-heading">
                <h4>Hierarchy</h4>
              </div>
              <div className="admin-category-action-grid">
                <Field>
                  <FieldLabel htmlFor="admin-category-parent">
                    Move under
                  </FieldLabel>
                  <select
                    className="ui-select admin-category-parent-select"
                    id="admin-category-parent"
                    disabled={isBusy}
                    onChange={(event) =>
                      setMoveParentId(event.currentTarget.value)
                    }
                    value={moveParentId}
                  >
                    <option value="">Main category</option>
                    {parentOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Button
                  disabled={
                    isBusy ||
                    moveParentId === (selectedCategory.parentId ?? "")
                  }
                  onClick={() => void moveCategory(moveParentId || null)}
                  variant="primary"
                >
                  {busyAction === "move" ? (
                    <FiLoader aria-hidden="true" className="admin-category-spinner" />
                  ) : (
                    <FiCornerUpLeft aria-hidden="true" />
                  )}
                  <span>{busyAction === "move" ? "Moving..." : "Move"}</span>
                </Button>
              </div>
              <div className="admin-category-actions">
                {selectedCategory.parentId ? (
                  <Button
                    disabled={isBusy}
                    onClick={() =>
                      void moveCategory(grandParentId || null, "promote")
                    }
                    size="compact"
                    variant="secondary"
                  >
                    {busyAction === "promote" ? (
                      <FiLoader aria-hidden="true" className="admin-category-spinner" />
                    ) : (
                      <FiCornerUpLeft aria-hidden="true" />
                    )}
                    <span>
                      {busyAction === "promote"
                        ? "Moving..."
                        : grandParentId
                          ? "Move up one level"
                          : "Make main category"}
                    </span>
                  </Button>
                ) : null}
              </div>
              </div>
            ) : null}

            {activeTool === "order" ? (
              <div className="admin-category-simple-section">
              <div className="admin-category-section-heading">
                <h4>Order</h4>
              </div>
              <div className="admin-category-actions">
                <Button
                  disabled={isBusy || siblingIndex <= 0}
                  onClick={() => void reorderCategory("up")}
                  variant="secondary"
                >
                  {busyAction === "order-up" ? (
                    <FiLoader aria-hidden="true" className="admin-category-spinner" />
                  ) : (
                    <FiArrowUp aria-hidden="true" />
                  )}
                  <span>{busyAction === "order-up" ? "Moving..." : "Move up"}</span>
                </Button>
                <Button
                  disabled={
                    isBusy ||
                    siblingIndex === -1 ||
                    siblingIndex >= siblings.length - 1
                  }
                  onClick={() => void reorderCategory("down")}
                  variant="secondary"
                >
                  {busyAction === "order-down" ? (
                    <FiLoader aria-hidden="true" className="admin-category-spinner" />
                  ) : (
                    <FiArrowDown aria-hidden="true" />
                  )}
                  <span>
                    {busyAction === "order-down" ? "Moving..." : "Move down"}
                  </span>
                </Button>
              </div>
              </div>
            ) : null}

            {activeTool === "products" ? (
              <div className="admin-category-simple-section">
              <div className="admin-category-section-heading">
                <h4>Products in this category</h4>
                <p>{selectedCategoryProducts.length} direct products</p>
              </div>
              {selectedCategoryProducts.length ? (
                <>
                  <div className="admin-category-product-list">
                    <label className="admin-category-product-select-all">
                      <input
                        checked={
                          selectedProductIds.size === selectedCategoryProducts.length
                        }
                        disabled={isBusy}
                        onChange={(event) =>
                          setSelectedProductIds(
                            event.currentTarget.checked
                              ? new Set(selectedCategoryProducts.map((product) => product.id))
                              : new Set(),
                          )
                        }
                        type="checkbox"
                      />
                      Select all
                    </label>
                    {selectedCategoryProducts.map((product) => (
                      <label className="admin-category-product-row" key={product.id}>
                        <input
                          checked={selectedProductIds.has(product.id)}
                          disabled={isBusy}
                          onChange={() => toggleProductSelection(product.id)}
                          type="checkbox"
                        />
                        <span>
                          <strong>{product.name}</strong>
                          <small>{product.sku}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="admin-category-action-grid">
                    <Field>
                      <FieldLabel htmlFor="admin-product-bulk-category">
                        Move selected to
                      </FieldLabel>
                      <select
                        className="ui-select"
                        disabled={isBusy}
                        id="admin-product-bulk-category"
                        onChange={(event) => {
                          setBulkTargetId(event.currentTarget.value);
                          setFormError("");
                        }}
                        value={bulkTargetId}
                      >
                        <option value="">Choose destination</option>
                        {bulkDestinationOptions.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Button
                      disabled={isBusy || !selectedProductIds.size}
                      onClick={() => void bulkMoveProducts()}
                      variant="primary"
                    >
                      {busyAction === "bulk-move" ? (
                        <FiLoader aria-hidden="true" className="admin-category-spinner" />
                      ) : (
                        <FiCornerUpLeft aria-hidden="true" />
                      )}
                      <span>
                        {busyAction === "bulk-move"
                          ? "Moving..."
                          : `Move ${selectedProductIds.size || "selected"}`}
                      </span>
                    </Button>
                  </div>
                </>
              ) : (
                <p className="admin-category-product-empty">
                  No products are assigned directly to this category.
                </p>
              )}
              </div>
            ) : null}

            {activeTool === "remove" ? (
              <div className="admin-category-simple-section">
              <div className="admin-category-section-heading">
                <h4>Remove</h4>
                {selectedCategory.totalProductCount > 0 ? (
                  <p>{getProductCountLabel(selectedCategory.totalProductCount)} inside this branch.</p>
                ) : null}
              </div>
              <div className="admin-category-actions">
                <Button
                  className={
                    pendingDeleteId === selectedCategory.id
                      ? "admin-category-danger-button is-confirming"
                      : "admin-category-danger-button"
                  }
                  disabled={isBusy || !canDeleteSelected}
                  onClick={() => void deleteCategory()}
                  variant="secondary"
                >
                  {busyAction === "delete" ? (
                    <FiLoader aria-hidden="true" className="admin-category-spinner" />
                  ) : (
                    <FiTrash2 aria-hidden="true" />
                  )}
                  <span>
                    {busyAction === "delete"
                      ? "Removing..."
                      : pendingDeleteId === selectedCategory.id
                        ? "Confirm remove"
                        : "Remove"}
                  </span>
                </Button>
              </div>
              </div>
            ) : null}

            {activeTool === "create-main" ? (
              <form
              className="admin-category-simple-section"
              onSubmit={addMainCategory}
            >
              <div className="admin-category-section-heading">
                <h4>Create main category</h4>
                <p>Adds a new top-level category</p>
              </div>
              <div className="admin-category-action-grid">
                <Field>
                  <FieldLabel htmlFor="admin-category-main-name">
                    Category name
                  </FieldLabel>
                  <Input
                    disabled={isBusy}
                    id="admin-category-main-name"
                    onChange={(event) => setMainName(event.currentTarget.value)}
                    placeholder="Enter category name"
                    value={mainName}
                  />
                </Field>
                <Button
                  disabled={isBusy || !mainName.trim()}
                  type="submit"
                  variant="primary"
                >
                  {busyAction === "add-main" ? (
                    <FiLoader
                      aria-hidden="true"
                      className="admin-category-spinner"
                    />
                  ) : (
                    <FiPlus aria-hidden="true" />
                  )}
                  <span>
                    {busyAction === "add-main"
                      ? "Creating..."
                      : "Create main category"}
                  </span>
                </Button>
              </div>
              </form>
            ) : null}

                {formError ? <FieldError>{formError}</FieldError> : null}
                {status ? <p className="form-status">{status}</p> : null}
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state admin-inline-state">
            <p>Select a category.</p>
          </div>
        )}
      </section>
    </div>
  );
}
