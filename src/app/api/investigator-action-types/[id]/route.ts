import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.investigatorActionType.findUnique({
      where: { id },
    });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch investigator action type" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, order } = body as { name?: string; order?: number };
    const data: { name?: string; order?: number } = {};
    if (name !== undefined) data.name = name?.trim();
    if (typeof order === "number") data.order = order;
    const item = await prisma.investigatorActionType.update({
      where: { id },
      data,
    });
    return NextResponse.json(item);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update investigator action type" },
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
    await prisma.investigatorActionType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete investigator action type" },
      { status: 500 }
    );
  }
}
