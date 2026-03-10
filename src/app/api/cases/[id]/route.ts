import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const c = await prisma.case.findUnique({
      where: { id },
      include: {
        client: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
    if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });
    return NextResponse.json(c);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch case" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, status, clientId, assignedToId } = body;
    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title?.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (status !== undefined) data.status = status;
    if (clientId !== undefined) data.clientId = clientId;
    if (assignedToId !== undefined) data.assignedToId = assignedToId || null;
    const c = await prisma.case.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json(c);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update case" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.case.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete case" }, { status: 500 });
  }
}
