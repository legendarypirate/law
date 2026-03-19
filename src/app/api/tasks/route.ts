import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: [{ status: "asc" }, { order: "asc" }, { createdAt: "asc" }],
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(tasks);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, status, order, assignedToId, dueDate } = body;
    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const targetStatus = status === "IN_PROGRESS" || status === "DONE" ? status : "TODO";
    const last = await prisma.task.findFirst({
      where: { status: targetStatus },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const maxOrder = (last?.order ?? -1) + 1;
    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        status: targetStatus,
        order: typeof order === "number" ? order : maxOrder,
        assignedToId: assignedToId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(task);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
