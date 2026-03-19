import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const role = await prisma.role.findUnique({
      where: { id },
      include: { users: { select: { id: true, name: true, email: true } } },
    });
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
    return NextResponse.json(role);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, permissions } = body;
    const role = await prisma.role.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name?.trim() || undefined }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(permissions !== undefined && { permissions }),
      },
    });
    return NextResponse.json(role);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.role.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
  }
}
