import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ROLE_KEYS = ["judge", "defendant", "prosecutor", "attorney", "victim", "witness", "expert"] as const;

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
      participants?: {
        judge?: string[];
        defendant?: string[];
        prosecutor?: string[];
        attorney?: string[];
        victim?: string[];
        witness?: string[];
        expert?: string[];
      };
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
      for (const key of ROLE_KEYS) {
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

    return NextResponse.json(step);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update step" }, { status: 500 });
  }
}
