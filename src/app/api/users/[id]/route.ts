import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const { passwordHash: _, ...rest } = user;
    return NextResponse.json(rest);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { email, password, name, roleId, isActive } = body;
    const data: Record<string, unknown> = {};
    if (email !== undefined) data.email = email?.trim()?.toLowerCase();
    if (name !== undefined) data.name = name?.trim();
    if (roleId !== undefined) data.roleId = roleId;
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (password && String(password).length > 0) {
      data.passwordHash = await hashPassword(String(password));
    }
    const user = await prisma.user.update({
      where: { id },
      data,
      include: { role: { select: { id: true, name: true } } },
    });
    const { passwordHash: _, ...rest } = user;
    return NextResponse.json(rest);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
