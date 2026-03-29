import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Бүх зүйлчлэлийн ID-г шинэ дарааллаар илгээнэ — `order` нь 0…n-1 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const orderedIds = body?.orderedIds;
    if (!Array.isArray(orderedIds) || !orderedIds.every((id: unknown) => typeof id === "string")) {
      return NextResponse.json(
        { error: "orderedIds (string[]) шаардлагатай" },
        { status: 400 }
      );
    }
    const existing = await prisma.caseClassification.findMany({ select: { id: true } });
    const idSet = new Set(existing.map((e) => e.id));
    if (orderedIds.length !== existing.length || !orderedIds.every((id: string) => idSet.has(id))) {
      return NextResponse.json(
        { error: "Бүх зүйлчлэлийн ID нэг удаагийн жагсаалтаар илгээнэ үү" },
        { status: 400 }
      );
    }
    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.caseClassification.update({
          where: { id },
          data: { order: index },
        })
      )
    );
    const list = await prisma.caseClassification.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Дараалал шинэчлэхэд алдаа" },
      { status: 500 }
    );
  }
}
