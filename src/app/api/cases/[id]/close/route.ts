import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyCaseClosePin } from "@/lib/caseClosePin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const pin = typeof body?.pin === "string" ? body.pin : "";
    const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

    if (!comment) {
      return NextResponse.json({ error: "Хаах шалтгаан / тайлбар оруулна уу" }, { status: 400 });
    }

    const existing = await prisma.case.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Хэрэг олдсонгүй" }, { status: 404 });
    }
    if (existing.status === "CLOSED") {
      return NextResponse.json({ error: "Хэрэг аль хэдийн хаагдсан" }, { status: 400 });
    }

    const pinOk = await verifyCaseClosePin(pin);
    if (!pinOk) {
      return NextResponse.json({ error: "PIN буруу байна" }, { status: 403 });
    }

    const updated = await prisma.case.update({
      where: { id },
      data: {
        status: "CLOSED",
        closeComment: comment,
        closedAt: new Date(),
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        caseTypeCategory: { include: { caseType: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "case",
        entityId: id,
        action: "CASE_MANUALLY_CLOSED",
        message: "Хэрэг PIN болон тайлбартайгаар хаагдсан.",
        data: { closeComment: comment } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Хэрэг хаахад алдаа гарлаа" }, { status: 500 });
  }
}
