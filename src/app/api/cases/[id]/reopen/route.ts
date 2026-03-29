import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyCaseClosePin } from "@/lib/caseClosePin";
import { PARTICIPATION_STAGE_VALUES } from "@/lib/caseStages";

/** Reopen from CLOSED: target progress index (0..8), not «Хэрэг хаагдсан» (9). */
const MAX_REOPEN_STAGE_INDEX = PARTICIPATION_STAGE_VALUES.length - 2;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const pin = typeof body?.pin === "string" ? body.pin : "";
    const rawIdx = body?.caseProgressStepIndex;

    const idx =
      typeof rawIdx === "number" && Number.isInteger(rawIdx)
        ? rawIdx
        : typeof rawIdx === "string"
          ? parseInt(rawIdx, 10)
          : NaN;
    if (Number.isNaN(idx) || idx < 0 || idx > MAX_REOPEN_STAGE_INDEX) {
      return NextResponse.json(
        { error: "Сэргээх үе шатын индекс буруу байна" },
        { status: 400 }
      );
    }

    const existing = await prisma.case.findUnique({
      where: { id },
      select: { id: true, title: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Хэрэг олдсонгүй" }, { status: 404 });
    }
    if (existing.status !== "CLOSED") {
      return NextResponse.json(
        { error: "Зөвхөн хаагдсан хэргийг сэргээж болно" },
        { status: 400 }
      );
    }

    const pinOk = await verifyCaseClosePin(pin);
    if (!pinOk) {
      return NextResponse.json({ error: "PIN буруу байна" }, { status: 403 });
    }

    const stageLabel = PARTICIPATION_STAGE_VALUES[idx] ?? "";

    const updated = await prisma.case.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        caseProgressStepIndex: idx,
        closeComment: null,
        closedAt: null,
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        caseClassification: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "case",
        entityId: id,
        action: "CASE_REOPENED",
        message: `Хэрэг сэргээгдлээ: ${stageLabel} (алхам ${idx + 1})`,
        data: {
          caseProgressStepIndex: idx,
          stageLabel,
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Сэргээхэд алдаа гарлаа" }, { status: 500 });
  }
}
