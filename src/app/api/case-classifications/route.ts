import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const list = await prisma.caseClassification.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch case classifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, order } = body as { name?: string; order?: number };
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    const item = await prisma.caseClassification.create({
      data: {
        name: name.trim(),
        order: typeof order === "number" ? order : 0,
      },
    });
    return NextResponse.json(item);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create case classification" },
      { status: 500 }
    );
  }
}
