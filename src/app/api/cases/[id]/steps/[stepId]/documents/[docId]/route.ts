import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; stepId: string; docId: string }> }
) {
  try {
    const { id: caseId, stepId, docId } = await params;

    const step = await prisma.caseStep.findFirst({
      where: { id: stepId, caseId },
    });
    if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });

    const doc = await prisma.caseDocument.findFirst({
      where: { id: docId, caseStepId: stepId },
    });
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    return NextResponse.json(doc);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string; docId: string }> }
) {
  try {
    const { id: caseId, stepId, docId } = await params;

    const step = await prisma.caseStep.findFirst({
      where: { id: stepId, caseId },
    });
    if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });

    const body = await request.json();
    const { title, url } = body as { title?: string; url?: string };

    const doc = await prisma.caseDocument.updateMany({
      where: { id: docId, caseStepId: stepId },
      data: {
        ...(title !== undefined && { title: title?.trim() || "Баримт" }),
        ...(url !== undefined && { url: url?.trim() || null }),
      },
    });
    if (doc.count === 0) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    const updated = await prisma.caseDocument.findUnique({ where: { id: docId } });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; stepId: string; docId: string }> }
) {
  try {
    const { id: caseId, stepId, docId } = await params;

    const step = await prisma.caseStep.findFirst({
      where: { id: stepId, caseId },
    });
    if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });

    await prisma.caseDocument.deleteMany({
      where: { id: docId, caseStepId: stepId },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
