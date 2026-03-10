import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");
    const assignedToId = searchParams.get("assignedToId");
    const cases = await prisma.case.findMany({
      where: {
        ...(status && { status: status as "OPEN" | "IN_PROGRESS" | "PENDING" | "CLOSED" }),
        ...(clientId && { clientId }),
        ...(assignedToId && { assignedToId }),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        client: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json(cases);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, status, clientId, assignedToId } = body;
    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!clientId) {
      return NextResponse.json({ error: "Client is required" }, { status: 400 });
    }
    const c = await prisma.case.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        status: status || "OPEN",
        clientId,
        assignedToId: assignedToId || null,
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json(c);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create case" }, { status: 500 });
  }
}
