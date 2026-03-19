import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const type = await prisma.caseType.findUnique({
      where: { id },
      include: { categories: { orderBy: { name: "asc" } } },
    });
    if (!type) {
      return NextResponse.json({ error: "Case type not found" }, { status: 404 });
    }
    return NextResponse.json(type);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch case type" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, order, categoryNames } = body as {
      name?: string;
      description?: string;
      order?: number;
      categoryNames?: string[];
    };

    const existing = await prisma.caseType.findUnique({
      where: { id },
      include: { categories: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Case type not found" }, { status: 404 });
    }

    if (categoryNames && Array.isArray(categoryNames)) {
      await prisma.caseTypeCategory.deleteMany({ where: { caseTypeId: id } });
      const toCreate = categoryNames
        .filter((n): n is string => typeof n === "string" && n.trim().length > 0)
        .map((n) => n.trim());
      if (toCreate.length > 0) {
        await prisma.caseTypeCategory.createMany({
          data: toCreate.map((name) => ({ caseTypeId: id, name })),
        });
      }
    }

    const type = await prisma.caseType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name?.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(order !== undefined && { order: Number(order) }),
      },
      include: {
        categories: { orderBy: { name: "asc" } },
      },
    });
    return NextResponse.json(type);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update case type" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.caseType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete case type" },
      { status: 500 }
    );
  }
}
