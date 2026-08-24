import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategoryTree,
  reorderAdminCategory,
  updateAdminCategory,
} from "@/lib/server/catalog-categories";
import { getAdminAccess } from "@/lib/server/admin-auth";

export const runtime = "nodejs";

function getUnauthorizedResponse(reason: string, isAuthenticated: boolean) {
  return NextResponse.json(
    { message: reason },
    { status: isAuthenticated ? 403 : 401 },
  );
}

function revalidateCatalogAdminPaths() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  revalidatePath("/search");
}

async function requireAdminAccess() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.isAuthorized) {
    return getUnauthorizedResponse(
      adminAccess.reason,
      adminAccess.isAuthenticated,
    );
  }

  return null;
}

export async function GET() {
  const unauthorizedResponse = await requireAdminAccess();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    return NextResponse.json({
      categories: await getAdminCategoryTree(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not load categories.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorizedResponse = await requireAdminAccess();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      parentId?: string | null;
    };
    const categories = await createAdminCategory({
      name: String(body.name ?? ""),
      parentId: body.parentId ?? null,
    });

    revalidateCatalogAdminPaths();

    return NextResponse.json({
      categories,
      message: "Category created.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not create category.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const unauthorizedResponse = await requireAdminAccess();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = (await request.json()) as {
      action?: string;
      direction?: string;
      id?: string;
      name?: string;
      parentId?: string | null;
    };

    if (body.action === "reorder") {
      if (body.direction !== "up" && body.direction !== "down") {
        throw new Error("Category order direction is invalid.");
      }

      const categories = await reorderAdminCategory({
        id: String(body.id ?? ""),
        direction: body.direction,
      });

      revalidateCatalogAdminPaths();

      return NextResponse.json({
        categories,
        message: "Category order updated.",
      });
    }

    const categories = await updateAdminCategory({
      id: String(body.id ?? ""),
      name: String(body.name ?? ""),
      parentId: body.parentId ?? null,
    });

    revalidateCatalogAdminPaths();

    return NextResponse.json({
      categories,
      message: "Category updated.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not update category.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const unauthorizedResponse = await requireAdminAccess();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { searchParams } = new URL(request.url);

  try {
    const categories = await deleteAdminCategory(searchParams.get("id") ?? "");

    revalidateCatalogAdminPaths();

    return NextResponse.json({
      categories,
      message: "Category removed.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not remove category.",
      },
      { status: 400 },
    );
  }
}
