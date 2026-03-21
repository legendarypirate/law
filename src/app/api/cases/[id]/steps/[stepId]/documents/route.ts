import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { id: caseId, stepId } = await params;
    const body = await request.json();
    const { title, url } = body as { title?: string; url?: string };

    const step = await prisma.caseStep.findFirst({
      where: { id: stepId, caseId },
    });
    if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });

    const doc = await prisma.caseDocument.create({
      data: {
        caseStepId: stepId,
        title: (title ?? "Document").trim(),
        url: url?.trim() || null,
      },
    });

    if (doc.url) {
      await prisma.auditLog.create({
        data: {
          entityType: "case",
          entityId: caseId,
          action: "CASE_DOCUMENT_ADDED",
          message: `Баримт нэмсэн: ${doc.title}`,
          data: {
            stepId,
            stageLabel: step.stageLabel,
            attachments: [{ title: doc.title, url: doc.url }],
          },
        },
      });
    }

    return NextResponse.json(doc);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to add document" }, { status: 500 });
  }
}
