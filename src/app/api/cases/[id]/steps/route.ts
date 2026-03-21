import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STEP_PARTICIPANT_ROLE_KEYS } from "@/lib/stepParticipantRoles";
import {
  attachmentsFromDocuments,
  extractFilesFromCaseNoteJson,
  mergeAttachmentsDedupe,
} from "@/lib/auditAttachments";

// List steps for a case (in chronological order)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const steps = await prisma.caseStep.findMany({
      where: { caseId: id },
      orderBy: { createdAt: "asc" },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        documents: true,
        participants: true,
      },
    });
    return NextResponse.json(steps);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch steps" }, { status: 500 });
  }
}

// Add a new step with optional documents
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      stageLabel,
      note,
      deadline,
      documents,
      participants,
      userId,
    }: {
      stageLabel: string;
      note?: string;
      deadline?: string | null;
      documents?: { title: string; url?: string }[];
      participants?: Partial<Record<(typeof STEP_PARTICIPANT_ROLE_KEYS)[number], string[]>>;
      userId?: string;
    } = body;

    if (!stageLabel?.trim()) {
      return NextResponse.json(
        { error: "Stage label is required" },
        { status: 400 }
      );
    }

    const existingCount = await prisma.caseStep.count({ where: { caseId: id } });

    const participantRows: { role: string; name: string }[] = [];
    if (participants && typeof participants === "object") {
      for (const key of STEP_PARTICIPANT_ROLE_KEYS) {
        const arr = participants[key];
        if (Array.isArray(arr)) {
          for (const name of arr) {
            if (typeof name === "string" && name.trim()) {
              participantRows.push({ role: key, name: name.trim() });
            }
          }
        }
      }
    }

    const deadlineDate = deadline != null && deadline !== "" ? new Date(deadline) : undefined;
    const step = await prisma.caseStep.create({
      data: {
        caseId: id,
        order: existingCount + 1,
        stageLabel: stageLabel.trim(),
        note: note?.trim() || undefined,
        deadline: deadlineDate && !Number.isNaN(deadlineDate.getTime()) ? deadlineDate : undefined,
        createdById: userId,
        documents: documents && documents.length
          ? {
              create: documents.map((d) => ({
                title: d.title.trim(),
                url: d.url?.trim() || null,
              })),
            }
          : undefined,
        participants: participantRows.length
          ? { create: participantRows }
          : undefined,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        documents: true,
        participants: true,
      },
    });

    const stepAttachments = mergeAttachmentsDedupe(
      attachmentsFromDocuments(step.documents),
      extractFilesFromCaseNoteJson(note?.trim() || null)
    );

    // Audit
    await prisma.auditLog.create({
      data: {
        entityType: "case",
        entityId: id,
        action: "CASE_STEP_ADDED",
        message: `Шинэ алхам нэмсэн: ${step.stageLabel}`,
        data: {
          stepId: step.id,
          stageLabel: step.stageLabel,
          ...(stepAttachments.length > 0 ? { attachments: stepAttachments } : {}),
        },
        userId,
      },
    });

    return NextResponse.json(step);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create step" }, { status: 500 });
  }
}

