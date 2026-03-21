import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStagesFrom } from "@/lib/caseStages";
import { attachmentsFromContractFilesInput } from "@/lib/auditAttachments";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");
    const assignedToId = searchParams.get("assignedToId");
    const q = searchParams.get("q")?.trim();

    const andConditions: Record<string, unknown>[] = [];
    if (status) andConditions.push({ status: status as "OPEN" | "IN_PROGRESS" | "PENDING" | "CLOSED" });
    if (clientId) andConditions.push({ clientId });
    if (assignedToId) andConditions.push({ assignedToId });
    if (q) {
      andConditions.push({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { client: { name: { contains: q, mode: "insensitive" } } },
        ],
      });
    }

    const cases = await prisma.case.findMany({
      where: andConditions.length ? { AND: andConditions } : undefined,
      orderBy: { updatedAt: "desc" },
      include: {
        client: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        caseClassification: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(cases);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, status, clientId, assignedToId, caseKind, caseJudicialCategory, caseCivilProcedureType, clientType, contactEmail, contactPhone, subjectType, participantCount, caseTsahTypes, caseParticipationStage, caseClassificationId, contractFiles, contractFee, paymentSchedule, contractTerm } = body;
    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!clientId) {
      return NextResponse.json({ error: "Client is required" }, { status: 400 });
    }
    const judicialCategories = ["эрүүгийн", "захиргааны", "иргэний", "зөрчлийн"];
    const nonJudicialCategories = ["Зөвлөгөө", "Байнгын гэрээт", "Байгуулагад үзүүлэх үйлчилгээ", "Тодорхой төрлийн үйлчилгээ", "Багц ажил"];
    const allowedCategory =
      caseKind === "judicial" && judicialCategories.includes(caseJudicialCategory)
        ? caseJudicialCategory
        : caseKind === "non_judicial" && nonJudicialCategories.includes(caseJudicialCategory)
          ? caseJudicialCategory
          : null;
    const civilProcedureTypes = ["Ердийн", "Хялбаршуулсан", "Эвлэрүүлэн зуучлал", "Арбитр"];
    const allowedCivilProcedure =
      caseKind === "judicial" && caseJudicialCategory === "иргэний" && civilProcedureTypes.includes(caseCivilProcedureType)
        ? caseCivilProcedureType
        : null;
    const c = await prisma.case.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        status: status || "OPEN",
        clientId,
        assignedToId: assignedToId || null,
        caseKind: caseKind === "judicial" || caseKind === "non_judicial" ? caseKind : null,
        caseJudicialCategory: allowedCategory,
        caseCivilProcedureType: allowedCivilProcedure,
        clientType: clientType === "Хүн" || clientType === "хуулийн этгээд" ? clientType : null,
        contactEmail: contactEmail?.trim() || null,
        contactPhone: contactPhone?.trim() || null,
        subjectType: subjectType?.trim() || null,
        participantCount: participantCount?.trim() || null,
        // Prisma JSON inputs don't accept plain `null` here; omit with `undefined` instead.
        caseTsahTypes:
          Array.isArray(caseTsahTypes) && caseTsahTypes.length > 0 ? caseTsahTypes : undefined,
        caseParticipationStage: caseParticipationStage?.trim() || null,
        caseClassificationId: caseClassificationId || null,
        contractFiles:
          Array.isArray(contractFiles) && contractFiles.length > 0 ? contractFiles : undefined,
        contractFee: contractFee != null && contractFee !== "" ? Number(contractFee) : null,
        paymentSchedule:
          Array.isArray(paymentSchedule) && paymentSchedule.length > 0 ? paymentSchedule : undefined,
        contractTerm: contractTerm?.trim() || null,
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        caseClassification: { select: { id: true, name: true } },
      },
    });

    const createdAttachments = attachmentsFromContractFilesInput(contractFiles);
    // Audit log for case creation
    await prisma.auditLog.create({
      data: {
        entityType: "case",
        entityId: c.id,
        action: "CASE_CREATED",
        message: `Шинэ хэрэг нээв: ${c.title}`,
        data: {
          title: c.title,
          clientId: c.clientId,
          status: c.status,
          ...(createdAttachments.length > 0 ? { attachments: createdAttachments } : {}),
        },
      },
    });

    // Create case steps from chosen participation stage to end (no more manual add)
    const stagesToCreate = getStagesFrom(c.caseParticipationStage ?? null);
    if (stagesToCreate.length > 0) {
      await prisma.caseStep.createMany({
        data: stagesToCreate.map((stageLabel, i) => ({
          caseId: c.id,
          order: i + 1,
          stageLabel,
        })),
      });
    }

    return NextResponse.json(c);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create case" }, { status: 500 });
  }
}
