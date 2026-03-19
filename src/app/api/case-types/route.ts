import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const types = await prisma.caseType.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        categories: { orderBy: { name: "asc" } },
      },
    });
    return NextResponse.json(types);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch case types" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, order, categoryNames } = body as {
      name: string;
      description?: string;
      order?: number;
      categoryNames?: string[];
    };

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const type = await prisma.caseType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        order: order ?? 0,
        categories:
          categoryNames && categoryNames.length > 0
            ? {
                create: categoryNames
                  .filter((n): n is string => typeof n === "string" && n.trim().length > 0)
                  .map((n) => ({ name: n.trim() })),
              }
            : undefined,
      },
      include: {
        categories: true,
      },
    });
    return NextResponse.json(type);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create case type" },
      { status: 500 }
    );
  }
}
