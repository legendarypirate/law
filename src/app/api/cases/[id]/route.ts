import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const caseIncludeFull = {
  client: true,
  assignedTo: { select: { id: true, name: true, email: true } },
  caseTypeCategory: { include: { caseType: true } },
  caseClassification: { select: { id: true, name: true } },
  steps: {
    orderBy: { order: "asc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      documents: true,
      participants: true,
    },
  },
} as const;

const caseIncludeLegacy = {
  client: true,
  assignedTo: { select: { id: true, name: true, email: true } },
  caseClassification: { select: { id: true, name: true } },
  steps: {
    orderBy: { order: "asc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      documents: true,
    },
  },
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let c: Awaited<ReturnType<typeof prisma.case.findUnique>>;
    try {
      c = await prisma.case.findUnique({
        where: { id },
        include: caseIncludeFull,
      });
    } catch {
      c = await prisma.case.findUnique({
        where: { id },
        include: caseIncludeLegacy,
      });
    }
    if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });
    const raw = c as Record<string, unknown>;
    const payload = { ...raw };
    if (payload.caseTypeCategory == null) payload.caseTypeCategory = null;
    if (Array.isArray(payload.steps)) {
      payload.steps = payload.steps.map((s: Record<string, unknown>) => ({
        ...s,
        participants: (s as { participants?: unknown }).participants ?? [],
      }));
    }
    return NextResponse.json(payload);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch case" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, status, clientId, assignedToId, caseTypeCategoryId, caseKind, caseJudicialCategory, caseCivilProcedureType, clientType, contactEmail, contactPhone, subjectType, participantCount, caseTsahTypes, caseParticipationStage, caseClassificationId, contractFiles, contractFee, paymentSchedule, contractTerm, caseProgressStepIndex } = body;
    const data: Record<string, unknown> = {};
    const validStatuses = ["OPEN", "IN_PROGRESS", "PENDING", "CLOSED"] as const;
    if (title !== undefined) data.title = title?.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (status !== undefined && validStatuses.includes(status as (typeof validStatuses)[number])) {
      (data as { status?: string }).status = status;
    }
    if (clientId !== undefined) data.clientId = clientId;
    if (assignedToId !== undefined) data.assignedToId = assignedToId || null;
    if (caseTypeCategoryId !== undefined) data.caseTypeCategoryId = caseTypeCategoryId || null;
    if (caseKind !== undefined) data.caseKind = caseKind === "judicial" || caseKind === "non_judicial" ? caseKind : null;
    const judicialCategories = ["эрүүгийн", "захиргааны", "иргэний", "зөрчлийн"];
    const nonJudicialCategories = ["Зөвлөгөө", "Байнгын гэрээт", "Байгуулагад үзүүлэх үйлчилгээ", "Тодорхой төрлийн үйлчилгээ", "Багц ажил"];
    const previous = await prisma.case.findUnique({ where: { id } });
    if (caseJudicialCategory !== undefined) {
      const effectiveKind = caseKind ?? previous?.caseKind;
      const allowed =
        effectiveKind === "judicial" && judicialCategories.includes(caseJudicialCategory)
          ? caseJudicialCategory
          : effectiveKind === "non_judicial" && nonJudicialCategories.includes(caseJudicialCategory)
            ? caseJudicialCategory
            : null;
      (data as { caseJudicialCategory?: string | null }).caseJudicialCategory = allowed;
      if (allowed !== "иргэний") (data as { caseCivilProcedureType?: null }).caseCivilProcedureType = null;
    }
    const civilProcedureTypes = ["Ердийн", "Хялбаршуулсан", "Эвлэрүүлэн зуучлал", "Арбитр"];
    if (caseCivilProcedureType !== undefined) {
      const effectiveKind = caseKind ?? previous?.caseKind;
      const effectiveCategory = caseJudicialCategory ?? previous?.caseJudicialCategory;
      const allowed =
        effectiveKind === "judicial" && effectiveCategory === "иргэний" && civilProcedureTypes.includes(caseCivilProcedureType)
          ? caseCivilProcedureType
          : null;
      (data as { caseCivilProcedureType?: string | null }).caseCivilProcedureType = allowed;
    }
    if (clientType !== undefined) (data as { clientType?: string | null }).clientType = clientType === "Хүн" || clientType === "хуулийн этгээд" ? clientType : null;
    if (contactEmail !== undefined) (data as { contactEmail?: string | null }).contactEmail = contactEmail?.trim() || null;
    if (contactPhone !== undefined) (data as { contactPhone?: string | null }).contactPhone = contactPhone?.trim() || null;
    if (subjectType !== undefined) (data as { subjectType?: string | null }).subjectType = subjectType?.trim() || null;
    if (participantCount !== undefined) (data as { participantCount?: string | null }).participantCount = participantCount?.trim() || null;
    if (caseTsahTypes !== undefined) (data as { caseTsahTypes?: string[] | null }).caseTsahTypes = Array.isArray(caseTsahTypes) && caseTsahTypes.length > 0 ? caseTsahTypes : null;
    if (caseParticipationStage !== undefined) (data as { caseParticipationStage?: string | null }).caseParticipationStage = caseParticipationStage?.trim() || null;
    if (caseClassificationId !== undefined) (data as { caseClassificationId?: string | null }).caseClassificationId = caseClassificationId || null;
    if (contractFiles !== undefined) (data as { contractFiles?: unknown }).contractFiles = Array.isArray(contractFiles) && contractFiles.length > 0 ? contractFiles : null;
    if (contractFee !== undefined) (data as { contractFee?: number | null }).contractFee = contractFee != null && contractFee !== "" ? Number(contractFee) : null;
    if (paymentSchedule !== undefined) (data as { paymentSchedule?: unknown }).paymentSchedule = Array.isArray(paymentSchedule) && paymentSchedule.length > 0 ? paymentSchedule : null;
    if (contractTerm !== undefined) (data as { contractTerm?: string | null }).contractTerm = contractTerm?.trim() || null;
    if (caseProgressStepIndex !== undefined) {
      const n = typeof caseProgressStepIndex === "number" && caseProgressStepIndex >= 0 && caseProgressStepIndex <= 20 ? caseProgressStepIndex : null;
      (data as { caseProgressStepIndex?: number | null }).caseProgressStepIndex = n;
    }

    const c = await prisma.case.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        caseTypeCategory: { include: { caseType: true } },
      },
    });

    // Audit when important fields change
    if (previous) {
      const changes: Record<string, unknown> = {};
      if (title !== undefined && previous.title !== c.title) {
        changes.title = { from: previous.title, to: c.title };
      }
      if (description !== undefined && previous.description !== c.description) {
        changes.description = { from: previous.description, to: c.description };
      }
      if (status !== undefined && previous.status !== c.status) {
        changes.status = { from: previous.status, to: c.status };
      }
      if (clientId !== undefined && previous.clientId !== c.clientId) {
        changes.clientId = { from: previous.clientId, to: c.clientId };
      }
      if (assignedToId !== undefined && previous.assignedToId !== c.assignedToId) {
        changes.assignedToId = {
          from: previous.assignedToId,
          to: c.assignedToId,
        };
      }
      if (caseTypeCategoryId !== undefined && previous.caseTypeCategoryId !== c.caseTypeCategoryId) {
        changes.caseTypeCategoryId = {
          from: previous.caseTypeCategoryId,
          to: c.caseTypeCategoryId,
        };
      }

      if (Object.keys(changes).length > 0) {
        await prisma.auditLog.create({
          data: {
            entityType: "case",
            entityId: c.id,
            action: "CASE_UPDATED",
            message: "Хэрэгийн мэдээлэл шинэчлэгдсэн.",
            data: changes,
          },
        });
      }
    }

    return NextResponse.json(c);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update case" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.case.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete case" }, { status: 500 });
  }
}
