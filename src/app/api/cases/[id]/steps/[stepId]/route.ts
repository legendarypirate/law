import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { diffNoteFileAttachments } from "@/lib/auditAttachments";
import {
  formatProsecutorSelectionMessage,
  parseLastProsecutorBlockFromNote,
  shouldLogProsecutorSelection,
} from "@/lib/prosecutorDecisionAudit";
import { STEP_PARTICIPANT_ROLE_KEYS } from "@/lib/stepParticipantRoles";
import {
  formatCaseStepNoteForDisplay,
  SHUUKH_HARMGVIUL_NOTE_KIND,
  URIDCHILSAN_HELELTSUULEG_NOTE_KIND,
} from "@/lib/caseNoteDisplay";
import { DAVJ_SHUUKH_HURALDAAN_NOTE_KIND } from "@/lib/davjShuukhHuraldaanNote";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { id: caseId, stepId } = await params;
    const body = await request.json();
    const {
      stageLabel,
      note,
      deadline,
      participants,
    }: {
      stageLabel?: string;
      note?: string;
      deadline?: string | null;
      participants?: Partial<Record<(typeof STEP_PARTICIPANT_ROLE_KEYS)[number], string[]>>;
    } = body;

    const existing = await prisma.caseStep.findFirst({
      where: { id: stepId, caseId },
      include: { participants: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    const data: { stageLabel?: string; note?: string | null; deadline?: Date | null } = {};
    if (stageLabel !== undefined) data.stageLabel = stageLabel.trim();
    if (note !== undefined) data.note = note?.trim() || null;
    if (deadline !== undefined) {
      const d = deadline != null && deadline !== "" ? new Date(deadline) : null;
      data.deadline = d && !Number.isNaN(d.getTime()) ? d : null;
    }

    if (participants !== undefined && typeof participants === "object") {
      await prisma.caseStepParticipant.deleteMany({ where: { caseStepId: stepId } });
      const rows: { role: string; name: string }[] = [];
      for (const key of STEP_PARTICIPANT_ROLE_KEYS) {
        const arr = participants[key];
        if (Array.isArray(arr)) {
          for (const name of arr) {
            if (typeof name === "string" && name.trim()) {
              rows.push({ role: key, name: name.trim() });
            }
          }
        }
      }
      if (rows.length) {
        await prisma.caseStepParticipant.createMany({
          data: rows.map((r) => ({ caseStepId: stepId, role: r.role, name: r.name })),
        });
      }
    }

    const step = await prisma.caseStep.update({
      where: { id: stepId },
      data,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        documents: true,
        participants: true,
      },
    });

    if (note !== undefined) {
      const prevBlock = parseLastProsecutorBlockFromNote(existing.note);
      const nextBlock = parseLastProsecutorBlockFromNote(note?.trim() || null);
      const prosecutorSelectionLine = nextBlock ? formatProsecutorSelectionMessage(nextBlock) : "";

      if (shouldLogProsecutorSelection(prevBlock, nextBlock) && nextBlock) {
        await prisma.auditLog.create({
          data: {
            entityType: "case",
            entityId: caseId,
            action: "CASE_PROSECUTOR_SELECTION_SAVED",
            message: formatProsecutorSelectionMessage(nextBlock),
            data: {
              stepId,
              stageLabel: existing.stageLabel,
              decisionCategory: nextBlock.decisionCategory ?? null,
              decision: nextBlock.decision || null,
            },
          },
        });
      }

      const added = diffNoteFileAttachments(existing.note, note?.trim() || null);
      if (added.length > 0) {
        /** Тайлбар: зөвхөн прокурорын үндсэн сонголт; файлын тухай текст оруулахгүй. */
        const fileMessage = prosecutorSelectionLine || "";
        await prisma.auditLog.create({
          data: {
            entityType: "case",
            entityId: caseId,
            action: "CASE_STEP_FILES_ADDED",
            message: fileMessage,
            data: {
              stepId,
              stageLabel: existing.stageLabel,
              attachments: added,
              ...(prosecutorSelectionLine
                ? {
                    decisionCategory: nextBlock?.decisionCategory ?? null,
                    decision: nextBlock?.decision ?? null,
                  }
                : {}),
            },
          },
        });
      }

      /** Үйл явцын түүх: Урьдчилсан хэлэлцүүлэг / Шүүхэд хэрэг хүргүүлсэн — сонголт, огноо, тэмдэглэл */
      const prevNoteTrim = existing.note?.trim() || null;
      const nextNoteTrim = note?.trim() || null;
      if (prevNoteTrim !== nextNoteTrim && nextNoteTrim) {
        try {
          const parsed = JSON.parse(nextNoteTrim) as { kind?: string };
          const k = parsed.kind;
          if (
            k === URIDCHILSAN_HELELTSUULEG_NOTE_KIND ||
            k === SHUUKH_HARMGVIUL_NOTE_KIND ||
            k === DAVJ_SHUUKH_HURALDAAN_NOTE_KIND
          ) {
            let selectionMessage = formatCaseStepNoteForDisplay(nextNoteTrim);
            if (!selectionMessage.trim()) {
              selectionMessage =
                k === URIDCHILSAN_HELELTSUULEG_NOTE_KIND
                  ? `${existing.stageLabel}: тэмдэглэл шинэчлэгдсөн.`
                  : k === DAVJ_SHUUKH_HURALDAAN_NOTE_KIND
                    ? `${existing.stageLabel}: тэмдэглэл шинэчлэгдсөн.`
                    : `${existing.stageLabel}: мэдээлэл шинэчлэгдсөн.`;
            }
            await prisma.auditLog.create({
              data: {
                entityType: "case",
                entityId: caseId,
                action: "CASE_STEP_SELECTION_SAVED",
                message: selectionMessage,
                data: {
                  stepId,
                  stageLabel: existing.stageLabel,
                  noteKind: k,
                },
              },
            });
          }
        } catch {
          /* not JSON */
        }
      }
    }

    return NextResponse.json(step);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update step" }, { status: 500 });
  }
}
