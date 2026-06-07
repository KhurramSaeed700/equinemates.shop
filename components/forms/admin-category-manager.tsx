"use client";

import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
  FiChevronRight,
  FiChevronsUp,
  FiEdit3,
  FiFolderPlus,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { AdminCategoryTreeNode } from "@/lib/server/catalog-categories";
import { useToast } from "@/lib/use-toast";

type AdminCategoryManagerProps = {
  initialCategories: AdminCategoryTreeNode[];
};

type CategoryOption = AdminCategoryTreeNode & {
  label: string;
};

type CategoryApiResponse = {
  categories?: AdminCategoryTreeNode[];
  message?: string;
};

type CreateCategoryMode = "category" | "child" | null;

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

    const childMatch = findCategoryById(node.children, id);
    if (childMatch) {
      return childMatch;
    }
  }

  return null;
}

function findParentId(
  nodes: AdminCategoryTreeNode[],
  id: string,
): string | null {
  for (const node of nodes) {
    if (node.children.some((child) => child.id === id)) {
      return node.id;
    }

    const parentId = findParentId(node.children, id);
    if (parentId) {
      return parentId;
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

function flattenVisibleCategories(
  nodes: AdminCategoryTreeNode[],
  expandedIds: Set<string>,
): AdminCategoryTreeNode[] {
  const items: AdminCategoryTreeNode[] = [];

  for (const node of nodes) {
    items.push(node);

    if (expandedIds.has(node.id)) {
      items.push(...flattenVisibleCategories(node.children, expandedIds));
    }
  }

  return items;
}

function collectDescendantIds(node: AdminCategoryTreeNode | null): Set<string> {
  const ids = new Set<string>();

  if (!node) {
    return ids;
  }

  const visit = (item: AdminCategoryTreeNode) => {
    ids.add(item.id);

    for (const child of item.children) {
      visit(child);
    }
  };

  visit(node);
  return ids;
}

function getProductCountLabel(count: number) {
  return `${count} product${count === 1 ? "" : "s"}`;
}

function getInitialSelectedId(categories: AdminCategoryTreeNode[]) {
  return flattenCategories(categories)[0]?.id ?? "";
}

function CategoryParentPicker({
  categories,
  currentParentId,
  fieldId,
  label,
  onChange,
}: {
  categories: CategoryOption[];
  currentParentId: string;
  fieldId: string;
  label: string;
  onChange: (parentId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const selectedParent =
    categories.find((category) => category.id === currentParentId) ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const results = normalizedQuery
    ? categories
        .filter((category) =>
          `${category.name} ${category.label}`
            .toLowerCase()
            .includes(normalizedQuery),
        )
        .slice(0, 8)
    : [];
  const selectedLabel = selectedParent?.label ?? "Main category";

  function selectParent(parentId: string) {
    onChange(parentId);
    setQuery("");
  }

  return (
    <Field>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <div className="admin-parent-picker">
        <div className="admin-parent-current">
          <span>Current parent</span>
          <strong title={selectedLabel}>{selectedLabel}</strong>
        </div>

        <Button
          aria-pressed={!currentParentId}
          className={
            currentParentId
              ? "admin-parent-main-button"
              : "admin-parent-main-button is-active"
          }
          onClick={() => selectParent("")}
          size="compact"
          variant="secondary"
        >
          Main category
        </Button>

        <label className="admin-parent-search" htmlFor={fieldId}>
          <FiSearch aria-hidden="true" />
          <Input
            className="admin-parent-search-input"
            id={fieldId}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search parent category"
            value={query}
          />
        </label>

        {normalizedQuery ? (
          <div
            aria-label={`${label} search results`}
            className="admin-parent-results"
            role="listbox"
          >
            {results.length > 0 ? (
              results.map((category) => (
                <button
                  aria-selected={category.id === currentParentId}
                  className={
                    category.id === currentParentId
                      ? "admin-parent-result is-selected"
                      : "admin-parent-result"
                  }
                  key={category.id}
                  onClick={() => selectParent(category.id)}
                  role="option"
                  type="button"
                >
                  <span className="admin-parent-result-copy">
                    <strong>{category.name}</strong>
                    <small>{category.label}</small>
                  </span>
                  <span
                    className="admin-parent-result-count"
                    title={getProductCountLabel(category.totalProductCount)}
                  >
                    {category.totalProductCount}
                  </span>
                </button>
              ))
            ) : (
              <p className="tiny admin-parent-empty">No parent matches.</p>
            )}
          </div>
        ) : null}
      </div>
    </Field>
  );
}

function CategoryNodeButton({
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

  return (
    <>
      <button
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={node.id === selectedId}
        className={
          node.id === selectedId
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
        style={{ paddingLeft: `${0.52 + node.level * 0.86}rem` }}
        type="button"
      >
        <span
          className={
            isExpanded
              ? "admin-category-node-disclosure is-expanded"
              : "admin-category-node-disclosure"
          }
          aria-hidden="true"
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
            <CategoryNodeButton
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
}: AdminCategoryManagerProps) {
  const toast = useToast();
  const [categories, setCategories] = useState(initialCategories);
  const [selectedId, setSelectedId] = useState(() =>
    getInitialSelectedId(initialCategories),
  );
  const [search, setSearch] = useState("");
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [createName, setCreateName] = useState("");
  const [createParentId, setCreateParentId] = useState("");
  const [createMode, setCreateMode] = useState<CreateCategoryMode>(null);
  const [status, setStatus] = useState("");
  const [formError, setFormError] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
  const selectedCategory = useMemo(
    () => findCategoryById(categories, selectedId),
    [categories, selectedId],
  );
  const selectedDescendantIds = useMemo(
    () => collectDescendantIds(selectedCategory),
    [selectedCategory],
  );
  const parentOptions = flatCategories.filter(
    (category) => !selectedDescendantIds.has(category.id),
  );
  const normalizedSearch = search.trim().toLowerCase();
  const searchResults = normalizedSearch
    ? flatCategories.filter((category) =>
        category.label.toLowerCase().includes(normalizedSearch),
      )
    : [];
  const visibleCategories = useMemo(
    () => flattenVisibleCategories(categories, expandedIds),
    [categories, expandedIds],
  );

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
      setEditParentId("");
      return;
    }

    setEditName(selectedCategory.name);
    setEditParentId(selectedCategory.parentId ?? "");
    if (createMode === "child") {
      setCreateParentId(selectedCategory.id);
    }
    setPendingDeleteId("");
  }, [createMode, selectedCategory]);

  useEffect(() => {
    const availableIds = new Set(flatCategories.map((category) => category.id));

    setExpandedIds((currentIds) => {
      const nextIds = new Set(
        Array.from(currentIds).filter((id) => availableIds.has(id)),
      );

      return nextIds.size === currentIds.size ? currentIds : nextIds;
    });
  }, [flatCategories]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const selectedElement = Array.from(
      document.querySelectorAll<HTMLElement>("[data-category-id]"),
    ).find((element) => element.dataset.categoryId === selectedId);
    selectedElement?.scrollIntoView({ block: "nearest" });
  }, [expandedIds, normalizedSearch, selectedId]);

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

  function selectCategoryFromKeyboard(id: string) {
    setSelectedId(id);
    setPendingDeleteId("");
  }

  function expandCategoryPath(id: string, includeCategory = false) {
    const pathIds = findAncestorIds(categories, id);
    if (includeCategory) {
      pathIds.push(id);
    }

    if (!pathIds.length) {
      return;
    }

    setExpandedIds((currentIds) => {
      const nextIds = new Set(currentIds);
      for (const pathId of pathIds) {
        nextIds.add(pathId);
      }
      return nextIds;
    });
  }

  function onCategorySearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const activeCategories = normalizedSearch ? searchResults : visibleCategories;
    const activeIndex = activeCategories.findIndex(
      (category) => category.id === selectedId,
    );
    const hierarchyCategory = normalizedSearch
      ? activeCategories[activeIndex === -1 ? 0 : activeIndex]
      : selectedCategory;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!activeCategories.length) {
        return;
      }

      event.preventDefault();
      const fallbackIndex = event.key === "ArrowDown" ? -1 : activeCategories.length;
      const nextIndex =
        event.key === "ArrowDown"
          ? Math.min(
              (activeIndex === -1 ? fallbackIndex : activeIndex) + 1,
              activeCategories.length - 1,
            )
          : Math.max((activeIndex === -1 ? fallbackIndex : activeIndex) - 1, 0);

      selectCategoryFromKeyboard(activeCategories[nextIndex].id);
      return;
    }

    if (event.key === "ArrowRight") {
      if (!hierarchyCategory || hierarchyCategory.children.length === 0) {
        return;
      }

      event.preventDefault();
      setSearch("");
      expandCategoryPath(hierarchyCategory.id, true);
      selectCategoryFromKeyboard(hierarchyCategory.children[0].id);
      return;
    }

    if (event.key === "ArrowLeft") {
      if (!hierarchyCategory) {
        return;
      }

      event.preventDefault();
      setSearch("");

      const parentId = findParentId(categories, hierarchyCategory.id);
      if (parentId) {
        expandCategoryPath(parentId);
        setExpandedIds((currentIds) => {
          const nextIds = new Set(currentIds);
          nextIds.delete(hierarchyCategory.id);
          return nextIds;
        });
        selectCategoryFromKeyboard(parentId);
        return;
      }

      if (expandedIds.has(hierarchyCategory.id)) {
        setExpandedIds((currentIds) => {
          const nextIds = new Set(currentIds);
          nextIds.delete(hierarchyCategory.id);
          return nextIds;
        });
      }
    }
  }

  async function readCategoryResponse(response: Response): Promise<CategoryApiResponse> {
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

  async function refreshCategories() {
    setIsRefreshing(true);
    setFormError("");

    try {
      const response = await fetch("/api/admin/categories", {
        cache: "no-store",
      });
      const payload = await readCategoryResponse(response);
      setStatus(payload.message ?? "Categories refreshed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not refresh categories.";
      setFormError(message);
      toast.error("Could not refresh categories.", message);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function onEditSubmit() {
    if (!selectedCategory) {
      return;
    }

    setIsSavingEdit(true);
    setFormError("");

    try {
      const response = await fetch("/api/admin/categories", {
        body: JSON.stringify({
          id: selectedCategory.id,
          name: editName,
          parentId: editParentId || null,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = await readCategoryResponse(response);
      if (editParentId) {
        setExpandedIds((currentIds) => new Set(currentIds).add(editParentId));
      }
      toast.success(payload.message ?? "Category updated.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not update category.";
      setFormError(message);
      toast.error("Could not update category.", message);
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function onCreateSubmit() {
    if (!createMode) {
      return;
    }

    setIsCreating(true);
    setFormError("");

    try {
      const response = await fetch("/api/admin/categories", {
        body: JSON.stringify({
          name: createName,
          parentId: createParentId || null,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await readCategoryResponse(response);
      if (createParentId) {
        setExpandedIds((currentIds) => new Set(currentIds).add(createParentId));
      }
      setCreateName("");
      setCreateMode(null);
      setCreateParentId("");
      toast.success(payload.message ?? "Category created.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not create category.";
      setFormError(message);
      toast.error("Could not create category.", message);
    } finally {
      setIsCreating(false);
    }
  }

  function openCreateForm(mode: Exclude<CreateCategoryMode, null>) {
    setCreateMode(mode);
    setCreateName("");
    setFormError("");
    setCreateParentId(mode === "child" ? selectedCategory?.id ?? "" : "");
  }

  async function onDeleteSubmit() {
    if (!selectedCategory || selectedCategory.totalProductCount > 0) {
      return;
    }

    if (pendingDeleteId !== selectedCategory.id) {
      setPendingDeleteId(selectedCategory.id);
      return;
    }

    setIsDeleting(true);
    setFormError("");

    try {
      const response = await fetch(
        `/api/admin/categories?id=${encodeURIComponent(selectedCategory.id)}`,
        {
          method: "DELETE",
        },
      );
      const payload = await readCategoryResponse(response);
      setSelectedId("");
      setPendingDeleteId("");
      toast.success(payload.message ?? "Category removed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not remove category.";
      setFormError(message);
      toast.error("Could not remove category.", message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="admin-category-manager">
      <section className="admin-editor-panel admin-category-browser">
        <div className="admin-panel-header admin-category-panel-header">
          <div>
            <h3>Categories</h3>
            <p className="tiny">
              {flatCategories.length} categories -{" "}
              {getProductCountLabel(
                categories.reduce(
                  (total, category) => total + category.totalProductCount,
                  0,
                ),
              )}
            </p>
          </div>
          <div className="admin-category-header-actions">
            <Button
              aria-label="Collapse all categories"
              className="admin-category-icon-button"
              disabled={expandedIds.size === 0}
              onClick={() => setExpandedIds(new Set())}
              size="icon"
              title="Collapse all"
              variant="icon"
            >
              <FiChevronsUp aria-hidden="true" />
            </Button>
            <Button
              aria-label="Refresh categories"
              className="admin-category-icon-button"
              disabled={isRefreshing}
              onClick={() => void refreshCategories()}
              size="icon"
              title="Refresh categories"
              variant="icon"
            >
              <FiRefreshCw aria-hidden="true" />
            </Button>
          </div>
        </div>

        <label className="admin-category-search">
          <FiSearch aria-hidden="true" />
          <Input
            aria-label="Search categories"
            className="admin-category-search-input"
            onChange={(event) => setSearch(event.currentTarget.value)}
            onKeyDown={onCategorySearchKeyDown}
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
                  onClick={() => setSelectedId(category.id)}
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
              <CategoryNodeButton
                expandedIds={expandedIds}
                key={category.id}
                node={category}
                onSelect={setSelectedId}
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
            </div>

            <div className="admin-category-count-grid">
              <article className="admin-category-count-tile">
                <span>Nested Products</span>
                <strong>{selectedCategory.totalProductCount}</strong>
              </article>
              <article className="admin-category-count-tile">
                <span>Subcategories</span>
                <strong>{selectedCategory.children.length}</strong>
              </article>
            </div>

            <div className="admin-category-form-grid">
              <Field>
                <FieldLabel htmlFor="admin-category-name">Name</FieldLabel>
                <Input
                  id="admin-category-name"
                  onChange={(event) => setEditName(event.currentTarget.value)}
                  value={editName}
                />
              </Field>
              <CategoryParentPicker
                categories={parentOptions}
                currentParentId={editParentId}
                fieldId="admin-category-parent"
                label="Parent"
                onChange={setEditParentId}
              />
            </div>

            <div className="admin-category-actions">
              <Button
                disabled={isSavingEdit || !editName.trim()}
                onClick={() => void onEditSubmit()}
                variant="primary"
              >
                <FiEdit3 aria-hidden="true" />
                <span>{isSavingEdit ? "Saving..." : "Save changes"}</span>
              </Button>
              <Button
                className={
                  pendingDeleteId === selectedCategory.id
                    ? "admin-category-danger-button is-confirming"
                    : "admin-category-danger-button"
                }
                disabled={isDeleting || selectedCategory.totalProductCount > 0}
                onClick={() => void onDeleteSubmit()}
                title={
                  selectedCategory.totalProductCount > 0
                    ? "Move products out before deleting"
                    : "Remove category"
                }
                variant="secondary"
              >
                <FiTrash2 aria-hidden="true" />
                <span>
                  {isDeleting
                    ? "Removing..."
                    : pendingDeleteId === selectedCategory.id
                      ? "Confirm remove"
                      : "Remove"}
                </span>
              </Button>
            </div>

            {selectedCategory.totalProductCount > 0 ? (
              <FieldDescription className="admin-category-delete-note">
                {getProductCountLabel(selectedCategory.totalProductCount)} inside this branch.
              </FieldDescription>
            ) : null}
          </>
        ) : (
          <div className="empty-state admin-inline-state">
            <p>Select a category.</p>
          </div>
        )}
      </section>

      <section className="admin-editor-panel admin-category-create-panel">
        <div className="admin-panel-header">
          <div>
            <h3>
              {createMode === "child"
                ? "Add Child"
                : createMode === "category"
                  ? "Add Category"
                  : "Create Categories"}
            </h3>
            <p className="tiny">
              {createMode === "child"
                ? findCategoryById(categories, createParentId)?.path.join(" > ") ??
                  selectedCategory?.path.join(" > ") ??
                  "Select a category first"
                : createMode === "category"
                  ? "Main category"
                  : "Choose what you want to add."}
            </p>
          </div>
        </div>

        <div className="admin-category-create-choice">
          <Button
            aria-pressed={createMode === "child"}
            disabled={!selectedCategory}
            onClick={() => openCreateForm("child")}
            variant={createMode === "child" ? "primary" : "secondary"}
          >
            <FiFolderPlus aria-hidden="true" />
            <span>Add Child</span>
          </Button>
          <Button
            aria-pressed={createMode === "category"}
            onClick={() => openCreateForm("category")}
            variant={createMode === "category" ? "primary" : "secondary"}
          >
            <FiPlus aria-hidden="true" />
            <span>Add Category</span>
          </Button>
        </div>

        {createMode ? (
          <div className="admin-category-form-grid">
            <Field>
              <FieldLabel htmlFor="admin-category-create-name">
                {createMode === "child" ? "Child category name" : "Category name"}
              </FieldLabel>
              <Input
                id="admin-category-create-name"
                onChange={(event) => setCreateName(event.currentTarget.value)}
                value={createName}
              />
            </Field>
            {createMode === "category" ? (
              <CategoryParentPicker
                categories={flatCategories}
                currentParentId={createParentId}
                fieldId="admin-category-create-parent"
                label="Parent"
                onChange={setCreateParentId}
              />
            ) : (
              <div className="admin-create-parent-summary">
                <span>Parent</span>
                <strong>
                  {findCategoryById(categories, createParentId)?.path.join(" > ") ??
                    "Selected category"}
                </strong>
              </div>
            )}
          </div>
        ) : null}

        {createMode ? (
          <Button
            disabled={isCreating || !createName.trim()}
            onClick={() => void onCreateSubmit()}
            variant="primary"
          >
            <FiPlus aria-hidden="true" />
            <span>
              {isCreating
                ? "Adding..."
                : createMode === "child"
                  ? "Add child"
                  : "Add category"}
            </span>
          </Button>
        ) : null}

        {formError ? <FieldError>{formError}</FieldError> : null}
        {status ? <p className="form-status">{status}</p> : null}
      </section>
    </div>
  );
}
