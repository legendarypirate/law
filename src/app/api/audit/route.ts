import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const offset = Number(searchParams.get("offset")) || 0;

    const where: { entityType?: string; entityId?: string } = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ logs, total });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
