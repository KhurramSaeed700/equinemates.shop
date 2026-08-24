import type { Metadata } from "next";

import { AdminAccessRetry } from "@/components/admin/admin-access-retry";
import { AdminWorkspaceShell } from "@/components/admin/admin-workspace-shell";
import { AdminCategoryManager } from "@/components/forms/admin-category-manager";
import {
  flattenAdminCategoryTree,
  getAdminCategoryTree,
} from "@/lib/server/catalog-categories";
import { getAdminProductSummaries } from "@/lib/server/catalog-products";
import { getAdminAccess } from "@/lib/server/admin-auth";

export const metadata: Metadata = {
  title: "Category Manager",
  description: "Manage catalog categories and category product counts.",
};

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.isAuthorized) {
    return <AdminAccessRetry message={adminAccess.reason} />;
  }

  let categoryTree: Awaited<ReturnType<typeof getAdminCategoryTree>>;
  let productSummaries: Awaited<ReturnType<typeof getAdminProductSummaries>>;

  try {
    [categoryTree, productSummaries] = await Promise.all([
      getAdminCategoryTree(),
      getAdminProductSummaries(),
    ]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load categories.";

    return (
      <AdminWorkspaceShell activeModule="categories">
        <div className="empty-state admin-inline-state">
          <p>Could not load categories.</p>
          <p className="tiny">{message}</p>
        </div>
      </AdminWorkspaceShell>
    );
  }

  const flatCategories = flattenAdminCategoryTree(categoryTree);

  return (
    <AdminWorkspaceShell
      activeModule="categories"
      stats={[
        { label: "Categories", value: flatCategories.length },
        { label: "Products", value: productSummaries.length },
      ]}
    >
      <AdminCategoryManager
        initialCategories={categoryTree}
        initialProducts={productSummaries}
      />
    </AdminWorkspaceShell>
  );
}
