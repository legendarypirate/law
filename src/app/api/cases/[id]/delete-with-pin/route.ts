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

    const existing = await prisma.case.findUnique({
      where: { id },
      select: { id: true, title: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Хэрэг олдсонгүй" }, { status: 404 });
    }

    const pinOk = await verifyCaseClosePin(pin);
    if (!pinOk) {
      return NextResponse.json({ error: "PIN буруу байна" }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.auditLog.create({
        data: {
          entityType: "case",
          entityId: id,
          action: "CASE_DELETED",
          message: `Хэрэг устгасан: «${existing.title}»`,
          data: { title: existing.title } as Prisma.InputJsonValue,
        },
      }),
      prisma.case.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Устгахад алдаа гарлаа" }, { status: 500 });
  }
}
