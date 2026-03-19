import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: "case",
        entityId: id,
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      take: 100,
    });
    return NextResponse.json(logs);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }
}

