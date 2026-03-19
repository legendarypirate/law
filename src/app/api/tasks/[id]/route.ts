import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json(task);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, status, order, assignedToId, dueDate } = body;
    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title?.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (status !== undefined && ["TODO", "IN_PROGRESS", "DONE"].includes(status))
      data.status = status;
    if (typeof order === "number") data.order = order;
    if (assignedToId !== undefined) data.assignedToId = assignedToId || null;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    const task = await prisma.task.update({
      where: { id },
      data,
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(task);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
