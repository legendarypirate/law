import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: { cases: true },
    });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    return NextResponse.json(client);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, company, address, notes } = body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name?.trim();
    if (email !== undefined) data.email = email?.trim() || null;
    if (phone !== undefined) data.phone = phone?.trim() || null;
    if (company !== undefined) data.company = company?.trim() || null;
    if (address !== undefined) data.address = address?.trim() || null;
    if (notes !== undefined) data.notes = notes?.trim() || null;
    const client = await prisma.client.update({ where: { id }, data });
    return NextResponse.json(client);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}
