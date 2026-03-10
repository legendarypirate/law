import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(roles);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const role = await prisma.role.create({
      data: { name: name.trim(), description: description?.trim() || null },
    });
    return NextResponse.json(role);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
  }
}
