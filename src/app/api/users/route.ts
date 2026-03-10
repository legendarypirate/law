import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get("roleId");
    const users = await prisma.user.findMany({
      where: roleId ? { roleId } : undefined,
      orderBy: { name: "asc" },
      include: { role: { select: { id: true, name: true } } },
    });
    return NextResponse.json(users.map((u) => ({ ...u, passwordHash: undefined })));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, roleId } = body;
    if (!email?.trim() || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }
    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }
    const role = roleId
      ? await prisma.role.findUnique({ where: { id: roleId } })
      : await prisma.role.findFirst();
    if (!role) {
      return NextResponse.json({ error: "No role found. Create a role first." }, { status: 400 });
    }
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        name: name?.trim() || email.trim(),
        roleId: role.id,
      },
      include: { role: { select: { id: true, name: true } } },
    });
    const { passwordHash: _, ...rest } = user;
    return NextResponse.json(rest);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
