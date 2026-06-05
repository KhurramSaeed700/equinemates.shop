import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { message: "Not authenticated." },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkId: userId,
    },
    select: {
      orders: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          createdAt: true,
          orderNumber: true,
          status: true,
          totalPkr: true,
          _count: {
            select: {
              items: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    orders:
      user?.orders.map((order) => ({
        id: order.orderNumber,
        date: order.createdAt.toISOString().slice(0, 10),
        status: order.status.toLowerCase(),
        totalPkr: order.totalPkr,
        itemCount: order._count.items,
      })) ?? [],
  });
}
