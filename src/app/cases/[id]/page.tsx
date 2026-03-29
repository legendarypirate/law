"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { emptyPinCells, PinCodeInput, pinCellsToString } from "@/components/PinCodeInput";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  FolderOpen,
  Pencil,
  Plus,
  StickyNote,
} from "lucide-react";
import {
  ANKHAN_GOMDOL_GARGSAN_ESEH_OPTIONS,
  ANKHAN_GOMDOL_GARGSAN_TALUUD_OPTIONS,
  ANKHAN_SHIIDVER_OPTIONS,
  ankhanShiidverExcludesGomdolSection,
  type AnkhanShuukhShiidverFields,
  buildAnkhanShuukhShiidverNoteJson,
  emptyAnkhanShuukhShiidverFields,
  generateAnkhanGomdolEntryId,
  parseAnkhanShuukhShiidverNote,
} from "@/lib/ankhanShuukhShiidverNote";
import {
  buildDavjShuukhHuraldaanNoteJson,
  DAVJ_KHRALIIN_SHIIDVER_KHERGIIG_TUDGELZUULEH,
  DAVJ_KHRALIIN_SHIIDVER_OPTIONS,
  DAVJ_KHRALIIN_SHIIDVER_LEGACY_RETURN_ANKHAN_SHUUKH_HURALDAAN,
  DAVJ_KHRALIIN_SHIIDVER_LEGACY_RETURN_PROKUROR_LONG,
  DAVJ_KHRALIIN_SHIIDVER_RETURN_ANKHAN_SHUUKH_HURALDAAN,
  DAVJ_KHRALIIN_SHIIDVER_RETURN_PROKUROR,
  DAVJ_KHRALIIN_SHIIDVER_RETURN_URIDCHILSAN_HELELTSUULEG,
  davjKhuraliinShiidverProgressStepIndex,
  davjKhuraliinShiidverProgressWhenGomdolUgvi,
  davjKhuraliinShiidverShowsGomdolSection,
  davjKhuraliinShiidverShowsHoyshluulahDate,
  davjKhuralynTovToDeadlineIso,
  emptyDavjShuukhHuraldaanFields,
  getDavjKhuralynTovDeadlineFromNote,
  isDavjShuukhHuraldaanStructuredNote,
  parseDavjShuukhHuraldaanNote,
  type DavjShuukhHuraldaanFields,
} from "@/lib/davjShuukhHuraldaanNote";
import {
  buildHynaltShuukhHuraldaanNoteJson,
  getHynaltKhuralynTovDeadlineFromNote,
  hynaltKhuraliinShiidverImplicitUgviProgress,
  hynaltKhuraliinShiidverProgressStepIndex,
  hynaltKhuraliinShiidverShowsGomdolSection,
  hynaltKhuraliinShiidverShowsHoyshluulahDate,
  formatHynaltKhuraliinShiidverForDisplay,
  HYNALT_KHRALIIN_SHIIDVER_OPTIONS,
  HYNALT_KHRALIIN_SHIIDVER_RETURN_TO_DAVJ,
  isHynaltKhuraliinShiidverReturnToDavj,
  HYNALT_NIIT_SHUUGCHIDIN_TOGTOOL_HELELTSEKH,
  HYNALT_NIIT_SHUUGCHIDIN_TOGTOOL_OPTIONS,
  HYNALT_NIIT_SHUUGCHIDIN_TOGTOOL_TATGALZSAN,
  HYNALT_SHUUGIIN_NER_STATIC,
  isHynaltShuukhHuraldaanStructuredNote,
  parseHynaltShuukhHuraldaanNote,
} from "@/lib/hynaltShuukhHuraldaanNote";
import { sortCaseClassifications } from "@/lib/caseClassifications";
import {
  PARTICIPATION_STAGE_OPTIONS,
  PARTICIPATION_STAGE_VALUES,
} from "@/lib/caseStages";
import {
  PARTICIPANT_COUNT_OPTIONS,
  SUBJECT_TYPE_OPTIONS,
  TSAH_TYPE_OPTIONS,
} from "@/lib/caseFormFieldOptions";
import { parseAuditAttachmentsFromData } from "@/lib/auditAttachments";
import {
  formatCaseStepNoteForDisplay,
  parseAuditStageLabel,
  parseAuditStepId,
  PROKUROR_HYANGAL_NOTE_KIND,
  SHUUKH_HARMGVIUL_NOTE_KIND,
  URIDCHILSAN_HELELTSUULEG_NOTE_KIND,
} from "@/lib/caseNoteDisplay";
import {
  PARTICIPANT_GRID_ORDER_KEYS,
  STEP_PARTICIPANT_ROLE_KEYS,
  STEP_PARTICIPANT_ROLES,
  normalizeStepParticipantRole,
} from "@/lib/stepParticipantRoles";
import { cn, formatNumberWithCommas, parseFormattedNumber, sanitizeNumericInput } from "@/lib/utils";

const PARTICIPANT_ROLES = STEP_PARTICIPANT_ROLES;

type Client = { id: string; name: string; email: string | null };
type User = { id: string; name: string; email: string };

type CaseStepParticipant = { id: string; role: string; name: string };

type CaseStep = {
  id: string;
  order: number;
  stageLabel: string;
  note: string | null;
  deadline: string | null;
  createdAt: string;
  createdBy: User | null;
  documents: { id: string; title: string; url: string | null; createdAt: string }[];
  participants: CaseStepParticipant[];
};

function getDeadlineRemaining(deadline: string | null): { text: string; days: number; isOverdue: boolean; isUpcoming: boolean } | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(d);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffMs = deadlineDate.getTime() - today.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isOverdue = days < 0;
  const isUpcoming = days >= 0 && days <= 365;
  let text: string;
  if (days < 0) text = `Хугацаа хэтэрсэн ${Math.abs(days)} өдөр`;
  else if (days === 0) text = "Өнөөдөр дуусах";
  else if (days === 1) text = "1 өдрийн дараа";
  else text = `${days} өдрийн дараа`;
  return { text, days, isOverdue, isUpcoming };
}

type CaseTypeCategory = { id: string; name: string; caseType: { id: string; name: string } };

type CaseAuditLog = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  message: string | null;
  data: unknown;
  createdAt: string;
  user: User | null;
};

const CASE_HISTORY_ACTION_LABELS: Record<string, string> = {
  CASE_CREATED: "Хэрэг нээсэн",
  CASE_UPDATED: "Хэрэг шинэчилсэн",
  CASE_STEP_ADDED: "Алхам нэмсэн",
  CASE_DOCUMENT_ADDED: "Баримт нэмсэн",
  CASE_STEP_FILES_ADDED: "Алхамд файл хавсаргасан",
  CASE_PROSECUTOR_SELECTION_SAVED: "Прокурорын сонголт хадгалсан",
  CASE_STEP_SELECTION_SAVED: "Алхмын сонголт / тэмдэглэл хадгалсан",
  CASE_MANUALLY_CLOSED: "Хэрэг гараар хаагдсан (PIN)",
  CASE_ATTORNEY_REQUEST_COMPLAINT_SAVED: "Өмгөөлөгчийн хүсэлт / гомдол хадгалсан",
  CASE_DELETED: "Хэрэг устгасан",
  CASE_REOPENED: "Хаагдсан хэрэг сэргээгдсэн",
};

type CaseDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  client: Client;
  assignedTo: User | null;
  caseTypeCategory: CaseTypeCategory | null;
  caseKind: string | null;
  caseJudicialCategory: string | null;
  caseCivilProcedureType: string | null;
  clientType: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  subjectType: string | null;
  participantCount: string | null;
  caseTsahTypes: string[] | null;
  caseParticipationStage: string | null;
  mordonBaitsaaltynKharyaalal: string | null;
  prokurorynKharyaalal: string | null;
  caseClassification: { id: string; name: string } | null;
  contractFiles: { url: string; title: string }[] | null;
  contractFee: number | null;
  paymentSchedule: { date: string; amount: number }[] | null;
  contractTerm: string | null;
  caseProgressStepIndex: number | null;
  closeComment: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  steps: CaseStep[];
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Нээгдсэн",
  IN_PROGRESS: "Явцтай",
  PENDING: "Хүлээгдэж буй",
  CLOSED: "Хаагдсан",
};

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "CLOSED"
      ? "secondary"
      : status === "IN_PROGRESS"
        ? "default"
        : "outline";
  return <Badge variant={variant}>{STATUS_LABELS[status] ?? status}</Badge>;
}

function participantsByRole(participants: CaseStepParticipant[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const key of STEP_PARTICIPANT_ROLE_KEYS) {
    out[key] = [];
  }
  for (const p of participants) {
    const r = normalizeStepParticipantRole(p.role);
    if (!out[r]) out[r] = [];
    out[r].push(p.name);
  }
  return out;
}

function DocumentRow({
  doc,
  caseId,
  stepId,
  onUpdate,
  onRemove,
}: {
  doc: { id: string; title: string; url: string | null };
  caseId: string;
  stepId: string;
  onUpdate: (updated: { title?: string; url?: string | null }) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc.title || "Баримт");
  useEffect(() => {
    setTitle(doc.title || "Баримт");
  }, [doc.title]);

  const saveTitle = () => {
    setEditing(false);
    const t = title.trim() || doc.title || "Баримт";
    if (t === (doc.title || "Баримт")) return;
    fetch(`/api/cases/${caseId}/steps/${stepId}/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t }),
    }).then((res) => {
      if (res.ok) onUpdate({ title: t });
    });
  };

  return (
    <li className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
      {editing ? (
        <Input
          className="min-w-0 flex-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === "Enter" && saveTitle()}
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="min-w-0 flex-1 truncate text-left text-primary underline underline-offset-2 hover:no-underline"
        >
          {doc.title || "Баримт"}
        </button>
      )}
      {doc.url && (
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded bg-muted px-2 py-1 text-xs text-foreground hover:bg-muted/80"
        >
          Нээх
        </a>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-destructive hover:text-destructive"
        onClick={onRemove}
        aria-label="Устгах"
      >
        ×
      </Button>
    </li>
  );
}

function StepDeadlineRow({
  step,
  caseId,
  onUpdate,
}: {
  step: CaseStep;
  caseId: string;
  onUpdate: (deadline: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    step.deadline ? new Date(step.deadline).toISOString().slice(0, 10) : ""
  );
  useEffect(() => {
    setValue(step.deadline ? new Date(step.deadline).toISOString().slice(0, 10) : "");
  }, [step.deadline]);
  const remaining = getDeadlineRemaining(step.deadline);

  const save = () => {
    setEditing(false);
    const next = value.trim() || null;
    if (next === (step.deadline ? new Date(step.deadline).toISOString().slice(0, 10) : "")) return;
    fetch(`/api/cases/${caseId}/steps/${step.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deadline: next ? `${next}T00:00:00.000Z` : null }),
    }).then((res) => {
      if (res.ok) onUpdate(next ? `${next}T00:00:00.000Z` : null);
    });
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Дуусах хугацаа:</span>
      {editing ? (
        <>
          <Input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="h-8 w-40 text-xs"
          />
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={save}>
            Хадгалах
          </Button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-foreground underline underline-offset-1 hover:no-underline"
        >
          {step.deadline
            ? new Date(step.deadline).toLocaleDateString("mn-MN", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "— Тохируулах"}
        </button>
      )}
      {remaining && (
        <span
          className={cn(
            "text-xs",
            remaining.isOverdue ? "font-medium text-destructive" : "text-muted-foreground"
          )}
        >
          ({remaining.text})
        </span>
      )}
    </div>
  );
}

function davjYmdToMnLabel(ymd: string): string {
  const t = ymd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return t || "—";
  return new Date(`${t}T12:00:00`).toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function DavjShuukhHuraldaanBlock({
  step,
  fields,
  setFields,
  legacyPlainText,
  disabled,
  onSaveStage1,
  onSaveStage2,
  hynaltNiitPanelRevealed,
  onHynaltReceiptDateChange,
}: {
  step: CaseStep;
  fields: DavjShuukhHuraldaanFields;
  setFields: React.Dispatch<React.SetStateAction<DavjShuukhHuraldaanFields>>;
  legacyPlainText: string | null;
  disabled?: boolean;
  onSaveStage1: () => void | Promise<void>;
  onSaveStage2: () => void | Promise<void>;
  /** Алхам 9: «Нийт шүүгчдийн… тогтоол» — эхний хадгалалтын дараа л */
  hynaltNiitPanelRevealed?: boolean;
  onHynaltReceiptDateChange?: (hasNonEmptyDate: boolean) => void;
}) {
  const patch = (p: Partial<DavjShuukhHuraldaanFields>) =>
    setFields((prev) => ({ ...prev, ...p }));

  const stage = fields.davjUiStage;
  const effectiveDeadline =
    stage >= 2 ? step.deadline ?? davjKhuralynTovToDeadlineIso(fields.khuralynTov) : null;
  const remaining = getDeadlineRemaining(effectiveDeadline);

  return (
    <div className="mt-2 space-y-4 rounded-md border border-border bg-muted/10 p-3">
      <p className="text-xs text-muted-foreground">
        Алхам {Math.min(stage, 4)} / 4
      </p>

      {/* 1: Давж — шүүгч/туслах; Хяналт — зөвхөн хэрэг, шүүхийн нэр (УДШ) */}
      <div className="space-y-2 rounded-md border border-border/60 bg-background/40 p-3">
        <span className="text-xs font-medium text-foreground">
          {step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE
            ? "1. Хэрэг хүлээн авсан"
            : "1. Шүүгч, шүүгчийн туслах"}
        </span>
        {stage > 1 && (
          <div className="rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
            {fields.kheregHuleenAwsanOgnoo && (
              <div>Хэрэг хүлээн авсан: {davjYmdToMnLabel(fields.kheregHuleenAwsanOgnoo)}</div>
            )}
            {step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE ? (
              <div>Шүүхийн нэр: {HYNALT_SHUUGIIN_NER_STATIC}</div>
            ) : (
              fields.shuugiinNer && <div>Шүүхийн нэр: {fields.shuugiinNer}</div>
            )}
            {step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE &&
              fields.niitShuugchidinKhuraldaanaasGarssanTogtool.trim() && (
                <div>
                  Нийт шүүгчдийн хуралдаанаас гарсан тогтоол:{" "}
                  {fields.niitShuugchidinKhuraldaanaasGarssanTogtool.trim()}
                </div>
              )}
            {step.stageLabel !== HYNALT_SHUUKH_HURALDAAN_STAGE && (
              <>
                <div>Шүүгч: {fields.shuugch.trim() || "—"}</div>
                <div>Шүүгчийн туслах: {fields.shuugchiinTuslah.trim() || "—"}</div>
              </>
            )}
          </div>
        )}
        {stage === 1 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Хэрэг хүлээн авсан огноо</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={fields.kheregHuleenAwsanOgnoo}
                  onChange={(e) => {
                    const v = e.target.value;
                    const has = !!v.trim();
                    if (step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE) {
                      onHynaltReceiptDateChange?.(has);
                    }
                    patch(
                      has
                        ? { kheregHuleenAwsanOgnoo: v }
                        : { kheregHuleenAwsanOgnoo: "", niitShuugchidinKhuraldaanaasGarssanTogtool: "" }
                    );
                  }}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Шүүхийн нэр</Label>
                {step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE ? (
                  <p className="flex h-8 items-center text-sm text-foreground">{HYNALT_SHUUGIIN_NER_STATIC}</p>
                ) : (
                  <Input
                    className="h-8 text-sm"
                    value={fields.shuugiinNer}
                    onChange={(e) => patch({ shuugiinNer: e.target.value })}
                    placeholder="Жишээ: БГД"
                    disabled={disabled}
                  />
                )}
              </div>
              {step.stageLabel !== HYNALT_SHUUKH_HURALDAAN_STAGE && (
                <>
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label className="text-xs font-medium">Шүүгч</Label>
                    <Input
                      className="h-8 text-sm"
                      value={fields.shuugch}
                      onChange={(e) => patch({ shuugch: e.target.value })}
                      placeholder="Нэр"
                      disabled={disabled}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label className="text-xs font-medium">Шүүгчийн туслах</Label>
                    <Input
                      className="h-8 text-sm"
                      value={fields.shuugchiinTuslah}
                      onChange={(e) => patch({ shuugchiinTuslah: e.target.value })}
                      placeholder="Нэр"
                      disabled={disabled}
                    />
                  </div>
                </>
              )}
            </div>
            <Button type="button" size="sm" onClick={() => void onSaveStage1()} disabled={disabled}>
              Хадгалах
            </Button>
            {step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE && hynaltNiitPanelRevealed && (
                <div className="mt-3 space-y-1.5">
                  <Label className="text-xs font-medium">Нийт шүүгчдийн хуралдаанаас гарсан тогтоол</Label>
                  <select
                    className={cn(
                      "flex h-9 w-full max-w-md rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none",
                      "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                    )}
                    value={fields.niitShuugchidinKhuraldaanaasGarssanTogtool}
                    onChange={(e) =>
                      patch({ niitShuugchidinKhuraldaanaasGarssanTogtool: e.target.value })
                    }
                    disabled={disabled}
                  >
                    <option value="">Сонгох</option>
                    {fields.niitShuugchidinKhuraldaanaasGarssanTogtool.trim() &&
                      !(
                        HYNALT_NIIT_SHUUGCHIDIN_TOGTOOL_OPTIONS as readonly string[]
                      ).includes(fields.niitShuugchidinKhuraldaanaasGarssanTogtool) && (
                        <option value={fields.niitShuugchidinKhuraldaanaasGarssanTogtool}>
                          {fields.niitShuugchidinKhuraldaanaasGarssanTogtool}
                        </option>
                      )}
                    {HYNALT_NIIT_SHUUGCHIDIN_TOGTOOL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              )}
          </>
        )}
      </div>

      {/* 2: Хурлын тов */}
      {stage >= 2 && (
        <div className="space-y-2 rounded-md border border-border/60 bg-background/40 p-3">
          <span className="text-xs font-medium text-foreground">2. Хурлын тов</span>
          {stage > 2 && fields.khuralynTov.trim() && (
            <div className="rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
              Хурлын тов: {davjYmdToMnLabel(fields.khuralynTov)}
              {remaining && <span className="ml-2">({remaining.text})</span>}
            </div>
          )}
          {stage === 2 && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-xs font-medium text-muted-foreground">Огноо</Label>
                <Input
                  type="date"
                  className="h-8 w-40 text-xs"
                  value={fields.khuralynTov}
                  onChange={(e) => patch({ khuralynTov: e.target.value })}
                  disabled={disabled}
                />
                {remaining && (
                  <span
                    className={cn(
                      "text-xs",
                      remaining.isOverdue ? "font-medium text-destructive" : "text-muted-foreground"
                    )}
                  >
                    ({remaining.text})
                  </span>
                )}
              </div>
              <Button type="button" size="sm" onClick={() => void onSaveStage2()} disabled={disabled}>
                Хадгалах
              </Button>
            </>
          )}
        </div>
      )}

      {legacyPlainText && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <span className="font-medium">Өмнөх тэмдэглэл:</span> {legacyPlainText}
        </div>
      )}
    </div>
  );
}

/** Алхам 7: «Анхан шатны шүүх хуралдаан» — Иргэдийн төлөөлөгч талбар; бусад шатанд нуух */
const ANKHAN_SHUUKH_HURALDAAN_STAGE = "Анхан шатны шүүх хуралдаан" as const;
/** Алхам 8: «Давж заалдах шатны шүүх хуралдаан» — Оролцогчид нь алхам 7-тай ижил (бүх багана, нэг нэгээр биш) */
const DAVJ_ZAALDAH_SHUUKH_HURALDAAN_STAGE = "Давж заалдах шатны шүүх хуралдаан" as const;
const HYNALT_SHUUKH_HURALDAAN_STAGE = "Хяналтын шатны шүүх хуралдаан" as const;

function isCourtHuraldaanExtendedStage(stageLabel: string): boolean {
  return (
    stageLabel === DAVJ_ZAALDAH_SHUUKH_HURALDAAN_STAGE || stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE
  );
}

function isCourtStepFullParticipantsGrid(stageLabel: string): boolean {
  return (
    stageLabel === ANKHAN_SHUUKH_HURALDAAN_STAGE ||
    stageLabel === DAVJ_ZAALDAH_SHUUKH_HURALDAAN_STAGE ||
    stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE
  );
}

type CaseClassificationRow = { id: string; name: string; order: number };

function AnkhanShuukhShiidverBlock({
  fields,
  setFields,
  legacyPlainText,
}: {
  fields: AnkhanShuukhShiidverFields;
  setFields: React.Dispatch<React.SetStateAction<AnkhanShuukhShiidverFields>>;
  legacyPlainText: string | null;
}) {
  const [classifications, setClassifications] = useState<CaseClassificationRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/case-classifications")
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) return;
        const rows: CaseClassificationRow[] = [];
        for (const item of data) {
          if (!item || typeof item !== "object") continue;
          const x = item as Record<string, unknown>;
          const id = typeof x.id === "string" ? x.id : "";
          const name = typeof x.name === "string" ? x.name : "";
          const order = typeof x.order === "number" ? x.order : 0;
          if (id) rows.push({ id, name, order });
        }
        setClassifications(sortCaseClassifications(rows));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = (p: Partial<AnkhanShuukhShiidverFields>) =>
    setFields((prev) => ({ ...prev, ...p }));

  const sh = fields.shiidver.trim();

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Шүүхээс гарсан шийдвэр</Label>
        <select
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          )}
          value={fields.shiidver}
          onChange={(e) => {
            const v = e.target.value;
            if (ankhanShiidverExcludesGomdolSection(v)) {
              setFields((prev) => ({
                ...prev,
                shiidver: v,
                gomdolGargsanEseh: "",
                gomdolGargsanTaluudEntries: [],
              }));
            } else {
              patch({ shiidver: v });
            }
          }}
        >
          <option value="">Сонгох</option>
          {sh &&
            !(ANKHAN_SHIIDVER_OPTIONS as readonly string[]).includes(sh) && (
              <option value={sh}>{sh}</option>
            )}
          {ANKHAN_SHIIDVER_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {legacyPlainText && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <span className="font-medium">Өмнөх тэмдэглэл (энгийн текст):</span> {legacyPlainText}
        </div>
      )}

      {sh === "Шүүх хуралдааныг хойшлуулах" && (
        <div className="space-y-3 rounded-md border border-border bg-muted/10 p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Дараагийн хурлын тов</Label>
            <Input
              type="date"
              className="text-sm"
              value={fields.daraagiinKhuralOgnoo}
              onChange={(e) => patch({ daraagiinKhuralOgnoo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Тэмдэглэл</Label>
            <Textarea
              className="min-h-[72px] text-sm"
              value={fields.daraagiinKhuralTemdeglel}
              onChange={(e) => patch({ daraagiinKhuralTemdeglel: e.target.value })}
              placeholder="Тэмдэглэл"
            />
          </div>
        </div>
      )}

      {sh === "Хэрэг хэлэлцэхийг 60 хүртэлх хоногоор хойшлуулах" && (
        <div className="space-y-3 rounded-md border border-border bg-muted/10 p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Огноо</Label>
            <Input
              type="date"
              className="text-sm"
              value={fields.hoyshluulah60Ognoo}
              onChange={(e) => patch({ hoyshluulah60Ognoo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Тэмдэглэл</Label>
            <Textarea
              className="min-h-[72px] text-sm"
              value={fields.hoyshluulah60Temdeglel}
              onChange={(e) => patch({ hoyshluulah60Temdeglel: e.target.value })}
              placeholder="Тэмдэглэл"
            />
          </div>
        </div>
      )}

      {sh === "Ажлын 5 хүртэлх хоногоор завсарлуулах" && (
        <div className="space-y-3 rounded-md border border-border bg-muted/10 p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Огноо</Label>
            <Input
              type="date"
              className="text-sm"
              value={fields.avasarluulahOgnoo}
              onChange={(e) => patch({ avasarluulahOgnoo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Тэмдэглэл</Label>
            <Textarea
              className="min-h-[72px] text-sm"
              value={fields.avasarluulahTemdeglel}
              onChange={(e) => patch({ avasarluulahTemdeglel: e.target.value })}
              placeholder="Тэмдэглэл"
            />
          </div>
        </div>
      )}

      {sh === "Шийтгэх тогтоол" && (
        <div className="space-y-3 rounded-md border border-border bg-muted/10 p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Тэмдэглэл</Label>
            <Textarea
              className="min-h-[72px] text-sm"
              value={fields.shiitgehTemdeglel}
              onChange={(e) => patch({ shiitgehTemdeglel: e.target.value })}
              placeholder="Тэмдэглэл"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Хэргийн зүйлчлэл</Label>
              <select
                className={cn(
                  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none",
                  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                )}
                value={fields.kheregiinZuillelClassificationId}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) {
                    patch({ kheregiinZuillelClassificationId: "", kheregiinZuillelName: "" });
                    return;
                  }
                  const row = classifications.find((c) => c.id === id);
                  patch({
                    kheregiinZuillelClassificationId: id,
                    kheregiinZuillelName: row?.name ?? "",
                  });
                }}
              >
                <option value="">Сонгох</option>
                {fields.kheregiinZuillelClassificationId &&
                  !classifications.some((c) => c.id === fields.kheregiinZuillelClassificationId) && (
                    <option value={fields.kheregiinZuillelClassificationId}>
                      {fields.kheregiinZuillelName || "—"}
                    </option>
                  )}
                {classifications.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fields.kheregiinZuillelName && !fields.kheregiinZuillelClassificationId && (
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Өмнөх утга: {fields.kheregiinZuillelName} — жагсаалтаас сонгон шинэчилнэ үү
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ялын төрөл</Label>
              <Input
                className="text-sm"
                value={fields.yalynTorol}
                onChange={(e) => patch({ yalynTorol: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Хугацаа</Label>
              <Input
                className="text-sm"
                value={fields.hugatsaa}
                onChange={(e) => patch({ hugatsaa: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Журам</Label>
              <Input
                className="text-sm"
                value={fields.juram}
                onChange={(e) => patch({ juram: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Гаргуулсан хохирол</Label>
              <Textarea
                className="min-h-[60px] text-sm"
                value={fields.garguulsanHohirol}
                onChange={(e) => patch({ garguulsanHohirol: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {sh === "Цагаатгах тогтоол" && (
        <div className="space-y-3 rounded-md border border-border bg-muted/10 p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Тэмдэглэл</Label>
            <Textarea
              className="min-h-[96px] text-sm"
              value={fields.tsagaatgahTemdeglel}
              onChange={(e) => patch({ tsagaatgahTemdeglel: e.target.value })}
              placeholder="Тэмдэглэл"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StepDetailContent({
  step,
  caseId,
  caseStatus,
  onCaseStatusChange,
  savingParticipants,
  onSaveParticipants,
  onStepUpdate,
  onAfterProgressToStep,
  reloadCase,
}: {
  step: CaseStep;
  caseId: string;
  caseStatus: string;
  onCaseStatusChange?: (status: string) => void;
  savingParticipants: boolean;
  onSaveParticipants: (stepId: string, participants: Record<string, string[]>) => Promise<void>;
  onStepUpdate: (updated: Partial<CaseStep>) => void;
  onAfterProgressToStep?: (stepIndex: number) => void;
  reloadCase?: () => void | Promise<void>;
}) {
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docError, setDocError] = useState("");
  const [ankhanFields, setAnkhanFields] = useState<AnkhanShuukhShiidverFields>(() =>
    emptyAnkhanShuukhShiidverFields()
  );
  const [ankhanLegacyPlain, setAnkhanLegacyPlain] = useState<string | null>(null);
  const [savingAnkhan, setSavingAnkhan] = useState(false);
  const [gomdolOpenAddPicker, setGomdolOpenAddPicker] = useState(false);
  const [gomdolUploadEntryId, setGomdolUploadEntryId] = useState<string | null>(null);
  const [gomdolUploadError, setGomdolUploadError] = useState("");
  const [davjFields, setDavjFields] = useState<DavjShuukhHuraldaanFields>(() =>
    emptyDavjShuukhHuraldaanFields()
  );
  const [davjLegacyPlain, setDavjLegacyPlain] = useState<string | null>(null);
  const [savingDavj, setSavingDavj] = useState(false);
  const [davjKhuralUploading, setDavjKhuralUploading] = useState(false);
  const [davjKhuralUploadError, setDavjKhuralUploadError] = useState("");
  const [davjGomdolOpenAddPicker, setDavjGomdolOpenAddPicker] = useState(false);
  const [davjGomdolUploadEntryId, setDavjGomdolUploadEntryId] = useState<string | null>(null);
  const [davjGomdolUploadError, setDavjGomdolUploadError] = useState("");
  const [davjResumeDialogOpen, setDavjResumeDialogOpen] = useState(false);
  const [davjResumeKhuralynTov, setDavjResumeKhuralynTov] = useState("");
  const [davjResumeError, setDavjResumeError] = useState("");
  /** Алхам 9: тогтоолын сонголт — эхний «Хадгалах» (огноо) амжилттай дараа true */
  const [hynaltNiitPanelRevealed, setHynaltNiitPanelRevealed] = useState(false);

  useEffect(() => {
    if (step.stageLabel === DAVJ_ZAALDAH_SHUUKH_HURALDAAN_STAGE) {
      const p = parseDavjShuukhHuraldaanNote(step.note);
      setDavjFields(p.fields);
      setDavjLegacyPlain(p.legacyPlainText);
      setAnkhanFields(emptyAnkhanShuukhShiidverFields());
      setAnkhanLegacyPlain(null);
      setHynaltNiitPanelRevealed(false);
    } else if (step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE) {
      const p = parseHynaltShuukhHuraldaanNote(step.note);
      const f = p.fields;
      setDavjFields(f);
      setDavjLegacyPlain(p.legacyPlainText);
      setAnkhanFields(emptyAnkhanShuukhShiidverFields());
      setAnkhanLegacyPlain(null);
      const revealNiitPanel =
        f.davjUiStage > 1 ||
        !!f.niitShuugchidinKhuraldaanaasGarssanTogtool.trim() ||
        !!f.kheregHuleenAwsanOgnoo.trim();
      setHynaltNiitPanelRevealed(revealNiitPanel);
    } else {
      const p = parseAnkhanShuukhShiidverNote(step.note);
      setAnkhanFields(p.fields);
      setAnkhanLegacyPlain(p.legacyPlainText);
      setDavjFields(emptyDavjShuukhHuraldaanFields());
      setDavjLegacyPlain(null);
      setHynaltNiitPanelRevealed(false);
    }
  }, [step.id, step.note, step.stageLabel]);

  const buildCourtHuraldaanNoteJson = (fields: DavjShuukhHuraldaanFields): string =>
    step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE
      ? buildHynaltShuukhHuraldaanNoteJson(fields)
      : buildDavjShuukhHuraldaanNoteJson(fields);

  const uploadAndAddDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setDocError("");
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      const res = await fetch("/api/upload/cloudinary", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setDocError(data.error || "Файл байршуулахад алдаа гарлаа");
        return;
      }
      for (const u of data.uploads || []) {
        const docRes = await fetch(`/api/cases/${caseId}/steps/${step.id}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: u.title || "Баримт", url: u.url }),
        });
        if (docRes.ok) {
          const doc = await docRes.json();
          onStepUpdate({
            documents: [...step.documents, { id: doc.id, title: doc.title, url: doc.url, createdAt: doc.createdAt }],
          });
        }
      }
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  const removeDocument = async (docId: string) => {
    const res = await fetch(`/api/cases/${caseId}/steps/${step.id}/documents/${docId}`, { method: "DELETE" });
    if (res.ok) {
      onStepUpdate({
        documents: step.documents.filter((d) => d.id !== docId),
      });
    }
  };

  const updateDocumentTitle = async (docId: string, title: string) => {
    const res = await fetch(`/api/cases/${caseId}/steps/${step.id}/documents/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() || "Баримт" }),
    });
    if (res.ok) {
      onStepUpdate({
        documents: step.documents.map((d) => (d.id === docId ? { ...d, title: title.trim() || d.title } : d)),
      });
    }
  };

  const uploadGomdolEntryFile = async (entryId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setGomdolUploadError("");
    setGomdolUploadEntryId(entryId);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      const res = await fetch("/api/upload/cloudinary", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setGomdolUploadError(typeof data.error === "string" ? data.error : "Файл байршуулахад алдаа гарлаа");
        return;
      }
      for (const u of data.uploads || []) {
        const url = typeof u.url === "string" ? u.url : "";
        if (!url) continue;
        const title = typeof u.title === "string" && u.title.trim() ? u.title.trim() : "Файл";
        setAnkhanFields((prev) => ({
          ...prev,
          gomdolGargsanTaluudEntries: prev.gomdolGargsanTaluudEntries.map((en) =>
            en.id === entryId ? { ...en, files: [...en.files, { title, url }] } : en
          ),
        }));
      }
    } finally {
      setGomdolUploadEntryId(null);
      e.target.value = "";
    }
  };

  const handleSaveAnkhanStep = async () => {
    const byRole = participantsByRole(step.participants);
    const participantsPayload: Record<string, string[]> = {};
    for (const key of STEP_PARTICIPANT_ROLE_KEYS) {
      participantsPayload[key] = [...(byRole[key] || [])];
    }
    const noteJson = buildAnkhanShuukhShiidverNoteJson(ankhanFields);
    setSavingAnkhan(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteJson, participants: participantsPayload }),
      });
      const updated = await res.json().catch(() => ({}));
      if (res.ok) {
        const nextParticipants = Array.isArray(updated.participants)
          ? updated.participants.map((p: { id: string; role: string; name: string }) => ({
              id: p.id,
              role: p.role,
              name: p.name,
            }))
          : step.participants;
        onStepUpdate({
          note: updated.note ?? null,
          participants: nextParticipants,
        });
        setAnkhanLegacyPlain(null);

        const gomdol = ankhanFields.gomdolGargsanEseh.trim();
        if (gomdol === "Үгүй") {
          const closedIdx = PARTICIPATION_STAGE_VALUES.indexOf("Хэрэг хаагдсан");
          if (closedIdx >= 0) {
            const progressRes = await fetch(`/api/cases/${caseId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ caseProgressStepIndex: closedIdx, status: "CLOSED" }),
            });
            if (progressRes.ok) {
              await reloadCase?.();
              onAfterProgressToStep?.(closedIdx);
            }
          }
        } else if (gomdol === "Тийм") {
          const davjIdx = PARTICIPATION_STAGE_VALUES.indexOf("Давж заалдах шатны шүүх хуралдаан");
          if (davjIdx >= 0) {
            const progressRes = await fetch(`/api/cases/${caseId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ caseProgressStepIndex: davjIdx }),
            });
            if (progressRes.ok) {
              await reloadCase?.();
              onAfterProgressToStep?.(davjIdx);
            }
          }
        }
      }
    } finally {
      setSavingAnkhan(false);
    }
  };

  const buildDavjParticipantsPayload = (): Record<string, string[]> => {
    const byRole = participantsByRole(step.participants);
    const participantsPayload: Record<string, string[]> = {};
    for (const key of STEP_PARTICIPANT_ROLE_KEYS) {
      if (key === "judge" || key === "judgeAssistant") participantsPayload[key] = [];
      else participantsPayload[key] = [...(byRole[key] || [])];
    }
    return participantsPayload;
  };

  const patchDavjStep = async (body: Record<string, unknown>): Promise<boolean> => {
    setSavingDavj(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const updated = await res.json().catch(() => ({}));
      if (res.ok) {
        const u = updated as {
          note?: string | null;
          deadline?: string | Date | null;
          participants?: { id: string; role: string; name: string }[];
        };
        const nextParticipants = Array.isArray(u.participants)
          ? u.participants.map((p) => ({ id: p.id, role: p.role, name: p.name }))
          : step.participants;
        const patchUpdate: Partial<CaseStep> = {
          note: u.note ?? null,
          participants: nextParticipants,
        };
        if (Object.prototype.hasOwnProperty.call(u, "deadline")) {
          patchUpdate.deadline =
            u.deadline == null
              ? null
              : typeof u.deadline === "string"
                ? u.deadline
                : new Date(u.deadline).toISOString();
        }
        onStepUpdate(patchUpdate);
        setDavjLegacyPlain(null);
        return true;
      }
      return false;
    } finally {
      setSavingDavj(false);
    }
  };

  const handleSaveDavjStage1 = async () => {
    if (step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE) {
      if (!davjFields.kheregHuleenAwsanOgnoo.trim()) return;
      const niit = davjFields.niitShuugchidinKhuraldaanaasGarssanTogtool.trim();

      if (!niit) {
        if (hynaltNiitPanelRevealed) return;
        const noteJson = buildCourtHuraldaanNoteJson({
          ...davjFields,
          shuugch: "",
          shuugchiinTuslah: "",
          davjUiStage: 1,
          niitShuugchidinKhuraldaanaasGarssanTogtool: "",
        });
        const ok = await patchDavjStep({ note: noteJson, participants: buildDavjParticipantsPayload() });
        if (!ok) return;
        setHynaltNiitPanelRevealed(true);
        return;
      }

      const baseHynalt: DavjShuukhHuraldaanFields = {
        ...davjFields,
        shuugch: "",
        shuugchiinTuslah: "",
      };

      if (niit === HYNALT_NIIT_SHUUGCHIDIN_TOGTOOL_TATGALZSAN) {
        const noteJson = buildCourtHuraldaanNoteJson({ ...baseHynalt, davjUiStage: 1 });
        const ok = await patchDavjStep({ note: noteJson, participants: buildDavjParticipantsPayload() });
        if (!ok) return;
        const closedIdx = PARTICIPATION_STAGE_VALUES.indexOf("Хэрэг хаагдсан");
        if (closedIdx < 0) return;
        const progressRes = await fetch(`/api/cases/${caseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseProgressStepIndex: closedIdx, status: "CLOSED" }),
        });
        if (progressRes.ok) {
          onCaseStatusChange?.("CLOSED");
          await reloadCase?.();
          onAfterProgressToStep?.(closedIdx);
        }
        return;
      }

      if (niit !== HYNALT_NIIT_SHUUGCHIDIN_TOGTOOL_HELELTSEKH) return;

      const noteJson = buildCourtHuraldaanNoteJson({ ...baseHynalt, davjUiStage: 2 });
      await patchDavjStep({ note: noteJson, participants: buildDavjParticipantsPayload() });
      return;
    }

    if (!davjFields.shuugch.trim() || !davjFields.shuugchiinTuslah.trim()) return;
    const noteJson = buildCourtHuraldaanNoteJson({ ...davjFields, davjUiStage: 2 });
    await patchDavjStep({ note: noteJson, participants: buildDavjParticipantsPayload() });
  };

  const handleSaveDavjStage2 = async () => {
    if (!davjKhuralynTovToDeadlineIso(davjFields.khuralynTov)) return;
    const deadlineIso = davjKhuralynTovToDeadlineIso(davjFields.khuralynTov);
    const noteJson = buildCourtHuraldaanNoteJson({ ...davjFields, davjUiStage: 3 });
    await patchDavjStep({
      note: noteJson,
      participants: buildDavjParticipantsPayload(),
      deadline: deadlineIso,
    });
  };

  const handleSaveDavjStage3Participants = async () => {
    const noteJson = buildCourtHuraldaanNoteJson({ ...davjFields, davjUiStage: 4 });
    await patchDavjStep({ note: noteJson, participants: buildDavjParticipantsPayload() });
  };

  const handleSaveDavjStage4 = async () => {
    const kh = davjFields.khuraliinShiidver.trim();
    const courtShowsGomdolForSave =
      step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE
        ? hynaltKhuraliinShiidverShowsGomdolSection(kh)
        : davjKhuraliinShiidverShowsGomdolSection(kh);
    const fieldsForSave: DavjShuukhHuraldaanFields = {
      ...davjFields,
      davjKheregTudgelzsen:
        step.stageLabel === DAVJ_ZAALDAH_SHUUKH_HURALDAAN_STAGE &&
        kh === DAVJ_KHRALIIN_SHIIDVER_KHERGIIG_TUDGELZUULEH,
      ...(!courtShowsGomdolForSave
        ? { davjGomdolGargsanEseh: "", davjGomdolGargsanTaluudEntries: [] }
        : {}),
    };
    const noteJson = buildCourtHuraldaanNoteJson(fieldsForSave);
    const patchBody: Record<string, unknown> = {
      note: noteJson,
      participants: buildDavjParticipantsPayload(),
    };
    if (
      (step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE
        ? hynaltKhuraliinShiidverShowsHoyshluulahDate(kh)
        : davjKhuraliinShiidverShowsHoyshluulahDate(kh))
    ) {
      const dl = davjKhuralynTovToDeadlineIso(davjFields.khuralHoyshluulahKhuralOgnoo);
      if (dl) patchBody.deadline = dl;
    }
    const ok = await patchDavjStep(patchBody);
    if (!ok) return;
    setDavjFields((prev) => ({
      ...prev,
      davjKheregTudgelzsen:
        step.stageLabel === DAVJ_ZAALDAH_SHUUKH_HURALDAAN_STAGE &&
        kh === DAVJ_KHRALIIN_SHIIDVER_KHERGIIG_TUDGELZUULEH,
    }));

    if (
      step.stageLabel === DAVJ_ZAALDAH_SHUUKH_HURALDAAN_STAGE &&
      kh === DAVJ_KHRALIIN_SHIIDVER_KHERGIIG_TUDGELZUULEH
    ) {
      const pauseRes = await fetch(`/api/cases/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING" }),
      });
      if (pauseRes.ok) {
        onCaseStatusChange?.("PENDING");
        await reloadCase?.();
      }
      return;
    }

    if (step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE) {
      const ugvi = hynaltKhuraliinShiidverImplicitUgviProgress(kh);
      if (ugvi != null) {
        const progressBody: Record<string, unknown> = { caseProgressStepIndex: ugvi.stepIndex };
        if (ugvi.closeCase) progressBody.status = "CLOSED";
        else if (caseStatus === "PENDING") progressBody.status = "IN_PROGRESS";
        const progressRes = await fetch(`/api/cases/${caseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(progressBody),
        });
        if (progressRes.ok) {
          if (ugvi.closeCase) onCaseStatusChange?.("CLOSED");
          else if (caseStatus === "PENDING") onCaseStatusChange?.("IN_PROGRESS");
          await reloadCase?.();
          onAfterProgressToStep?.(ugvi.stepIndex);
        }
        return;
      }
      const targetIdx = hynaltKhuraliinShiidverProgressStepIndex(kh);
      if (targetIdx == null) return;
      const progressBodyHynalt: Record<string, unknown> = { caseProgressStepIndex: targetIdx };
      if (caseStatus === "PENDING") progressBodyHynalt.status = "IN_PROGRESS";
      const progressResHynalt = await fetch(`/api/cases/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(progressBodyHynalt),
      });
      if (progressResHynalt.ok) {
        if (caseStatus === "PENDING") onCaseStatusChange?.("IN_PROGRESS");
        await reloadCase?.();
        onAfterProgressToStep?.(targetIdx);
      }
      return;
    }

    const courtShowsGomdol = davjKhuraliinShiidverShowsGomdolSection(kh);
    if (courtShowsGomdol) {
      const dg = fieldsForSave.davjGomdolGargsanEseh.trim();
      if (dg === "Үгүй") {
        const ugvi = davjKhuraliinShiidverProgressWhenGomdolUgvi(kh);
        if (ugvi == null) return;
        const progressBody: Record<string, unknown> = { caseProgressStepIndex: ugvi.stepIndex };
        if (ugvi.closeCase) progressBody.status = "CLOSED";
        else if (caseStatus === "PENDING") progressBody.status = "IN_PROGRESS";
        const progressRes = await fetch(`/api/cases/${caseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(progressBody),
        });
        if (progressRes.ok) {
          if (ugvi.closeCase) onCaseStatusChange?.("CLOSED");
          else if (caseStatus === "PENDING") onCaseStatusChange?.("IN_PROGRESS");
          await reloadCase?.();
          onAfterProgressToStep?.(ugvi.stepIndex);
        }
        return;
      }
      if (dg === "Тийм") {
        const nextIdx = PARTICIPATION_STAGE_VALUES.indexOf("Хяналтын шатны шүүх хуралдаан");
        if (nextIdx >= 0) {
          const progressBody: Record<string, unknown> = { caseProgressStepIndex: nextIdx };
          if (caseStatus === "PENDING") progressBody.status = "IN_PROGRESS";
          const progressRes = await fetch(`/api/cases/${caseId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(progressBody),
          });
          if (progressRes.ok) {
            if (caseStatus === "PENDING") onCaseStatusChange?.("IN_PROGRESS");
            await reloadCase?.();
            onAfterProgressToStep?.(nextIdx);
          }
        }
        return;
      }
      return;
    }

    const targetIdx = davjKhuraliinShiidverProgressStepIndex(kh);
    if (targetIdx == null) return;
    const progressBody: Record<string, unknown> = { caseProgressStepIndex: targetIdx };
    if (caseStatus === "PENDING") progressBody.status = "IN_PROGRESS";
    const progressRes = await fetch(`/api/cases/${caseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(progressBody),
    });
    if (progressRes.ok) {
      if (caseStatus === "PENDING") onCaseStatusChange?.("IN_PROGRESS");
      await reloadCase?.();
      onAfterProgressToStep?.(targetIdx);
    }
  };

  const openDavjResumeDialog = () => {
    setDavjResumeKhuralynTov(davjFields.khuralynTov.trim());
    setDavjResumeError("");
    setDavjResumeDialogOpen(true);
  };

  const confirmDavjResumeAfterTudgelzulsen = async () => {
    const ymd = davjResumeKhuralynTov.trim();
    const deadlineIso = davjKhuralynTovToDeadlineIso(ymd);
    if (!deadlineIso) {
      setDavjResumeError("Хурлын товыг (YYYY-MM-DD) зөв сонгоно уу.");
      return;
    }
    const nextFields: DavjShuukhHuraldaanFields = {
      ...davjFields,
      khuralynTov: ymd,
      davjKheregTudgelzsen: false,
    };
    const noteJson = buildCourtHuraldaanNoteJson(nextFields);
    const ok = await patchDavjStep({
      note: noteJson,
      participants: buildDavjParticipantsPayload(),
      deadline: deadlineIso,
    });
    if (!ok) {
      setDavjResumeError("Хадгалахад алдаа гарлаа. Дахин оролдоно уу.");
      return;
    }
    setDavjFields(nextFields);
    const progressRes = await fetch(`/api/cases/${caseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    });
    if (progressRes.ok) {
      onCaseStatusChange?.("IN_PROGRESS");
      setDavjResumeDialogOpen(false);
      setDavjResumeError("");
      await reloadCase?.();
    } else {
      setDavjResumeError("Төлөв шинэчлэхэд алдаа гарлаа.");
    }
  };

  const uploadDavjKhuraliinFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setDavjKhuralUploadError("");
    setDavjKhuralUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      const res = await fetch("/api/upload/cloudinary", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setDavjKhuralUploadError(typeof data.error === "string" ? data.error : "Файл байршуулахад алдаа гарлаа");
        return;
      }
      const adds: { title: string; url: string }[] = [];
      for (const u of data.uploads || []) {
        const url = typeof u.url === "string" ? u.url : "";
        if (!url) continue;
        const title = typeof u.title === "string" && u.title.trim() ? u.title.trim() : "Файл";
        adds.push({ title, url });
      }
      if (adds.length > 0) {
        setDavjFields((prev) => ({
          ...prev,
          khuraliinShiidverFiles: [...prev.khuraliinShiidverFiles, ...adds],
        }));
      }
    } finally {
      setDavjKhuralUploading(false);
      e.target.value = "";
    }
  };

  const uploadDavjGomdolEntryFile = async (entryId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setDavjGomdolUploadError("");
    setDavjGomdolUploadEntryId(entryId);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      const res = await fetch("/api/upload/cloudinary", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setDavjGomdolUploadError(typeof data.error === "string" ? data.error : "Файл байршуулахад алдаа гарлаа");
        return;
      }
      for (const u of data.uploads || []) {
        const url = typeof u.url === "string" ? u.url : "";
        if (!url) continue;
        const title = typeof u.title === "string" && u.title.trim() ? u.title.trim() : "Файл";
        setDavjFields((prev) => ({
          ...prev,
          davjGomdolGargsanTaluudEntries: prev.davjGomdolGargsanTaluudEntries.map((en) =>
            en.id === entryId ? { ...en, files: [...en.files, { title, url }] } : en
          ),
        }));
      }
    } finally {
      setDavjGomdolUploadEntryId(null);
      e.target.value = "";
    }
  };

  const showCourtStructuredBlock =
    (step.stageLabel === DAVJ_ZAALDAH_SHUUKH_HURALDAAN_STAGE &&
      (isDavjShuukhHuraldaanStructuredNote(step.note) || !step.note?.trim())) ||
    (step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE &&
      (isHynaltShuukhHuraldaanStructuredNote(step.note) || !step.note?.trim()));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-foreground">
          {step.stageLabel}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(step.createdAt).toLocaleString("mn-MN", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {step.createdBy && ` · ${step.createdBy.name}`}
        </span>
      </div>
      {showCourtStructuredBlock ? (
        <DavjShuukhHuraldaanBlock
          step={step}
          fields={davjFields}
          setFields={setDavjFields}
          legacyPlainText={davjLegacyPlain}
          disabled={savingParticipants || savingDavj}
          onSaveStage1={handleSaveDavjStage1}
          onSaveStage2={handleSaveDavjStage2}
          hynaltNiitPanelRevealed={
            step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE ? hynaltNiitPanelRevealed : false
          }
          onHynaltReceiptDateChange={
            step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE
              ? (hasDate) => {
                  if (!hasDate) setHynaltNiitPanelRevealed(false);
                }
              : undefined
          }
        />
      ) : (
        <StepDeadlineRow
          step={step}
          caseId={caseId}
          onUpdate={(deadline) => onStepUpdate({ deadline })}
        />
      )}
      {step.stageLabel !== ANKHAN_SHUUKH_HURALDAAN_STAGE &&
        step.note &&
        !(
          step.stageLabel === DAVJ_ZAALDAH_SHUUKH_HURALDAAN_STAGE &&
          isDavjShuukhHuraldaanStructuredNote(step.note)
        ) &&
        !(
          step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE &&
          isHynaltShuukhHuraldaanStructuredNote(step.note)
        ) && (
        <p className="mt-2 text-sm text-muted-foreground">{step.note}</p>
      )}
      {step.stageLabel === ANKHAN_SHUUKH_HURALDAAN_STAGE && (
        <AnkhanShuukhShiidverBlock
          fields={ankhanFields}
          setFields={setAnkhanFields}
          legacyPlainText={ankhanLegacyPlain}
        />
      )}

      {step.stageLabel === ANKHAN_SHUUKH_HURALDAAN_STAGE &&
        !ankhanShiidverExcludesGomdolSection(ankhanFields.shiidver) && (
        <div className="mt-4 space-y-1.5">
          <Label className="text-xs font-medium">Гомдол гаргасан эсэх</Label>
          <select
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none",
              "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            )}
            value={ankhanFields.gomdolGargsanEseh}
            onChange={(e) => {
              const v = e.target.value;
              setAnkhanFields((prev) => ({
                ...prev,
                gomdolGargsanEseh: v,
                gomdolGargsanTaluudEntries: v === "Тийм" ? prev.gomdolGargsanTaluudEntries : [],
              }));
            }}
          >
            <option value="">Сонгох</option>
            {ankhanFields.gomdolGargsanEseh &&
              !(ANKHAN_GOMDOL_GARGSAN_ESEH_OPTIONS as readonly string[]).includes(
                ankhanFields.gomdolGargsanEseh
              ) && (
                <option value={ankhanFields.gomdolGargsanEseh}>{ankhanFields.gomdolGargsanEseh}</option>
              )}
            {ANKHAN_GOMDOL_GARGSAN_ESEH_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}

      {step.stageLabel === ANKHAN_SHUUKH_HURALDAAN_STAGE &&
        !ankhanShiidverExcludesGomdolSection(ankhanFields.shiidver) &&
        ankhanFields.gomdolGargsanEseh === "Тийм" && (
          <div className="mt-3 space-y-3 rounded-md border border-border bg-muted/10 p-3">
            <Label className="text-xs font-medium">Гомдол гаргасан талууд</Label>
            <p className="text-xs text-muted-foreground">
              + товчоор тал нэмнэ. Нэмэгдсэн тал бүрт өөрийн тэмдэглэл, файл оруулна.
            </p>

            <div className="rounded-lg border border-input bg-background/60 px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                {ankhanFields.gomdolGargsanTaluudEntries.map((entry) => (
                  <span
                    key={entry.id}
                    className="inline-flex max-w-[min(100%,280px)] items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-sm text-foreground"
                  >
                    <span className="truncate">{entry.tal}</span>
                    <button
                      type="button"
                      className="shrink-0 rounded p-0.5 hover:bg-primary/25"
                      onClick={() =>
                        setAnkhanFields((prev) => ({
                          ...prev,
                          gomdolGargsanTaluudEntries: prev.gomdolGargsanTaluudEntries.filter(
                            (x) => x.id !== entry.id
                          ),
                        }))
                      }
                      aria-label="Устгах"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setGomdolOpenAddPicker((v) => !v)}
                    title="Тал нэмэх"
                  >
                    <Plus className="size-4" />
                  </Button>
                  {gomdolOpenAddPicker && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        aria-hidden
                        onClick={() => setGomdolOpenAddPicker(false)}
                      />
                      <div className="absolute left-0 top-full z-20 mt-1 max-h-56 min-w-[220px] overflow-auto rounded-md border border-border bg-popover py-1 shadow-md">
                        {ANKHAN_GOMDOL_GARGSAN_TALUUD_OPTIONS.map((tal) => (
                          <button
                            key={tal}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              const id = generateAnkhanGomdolEntryId();
                              setAnkhanFields((prev) => ({
                                ...prev,
                                gomdolGargsanTaluudEntries: [
                                  ...prev.gomdolGargsanTaluudEntries,
                                  { id, tal, temdeglel: "", files: [] },
                                ],
                              }));
                              setGomdolOpenAddPicker(false);
                            }}
                          >
                            {tal}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {ankhanFields.gomdolGargsanTaluudEntries.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Одоогоор тал нэмээгүй. + дарж жагсаалтаас сонгоно уу.
                </p>
              )}
            </div>

            {ankhanFields.gomdolGargsanTaluudEntries.map((sel) => (
              <div
                key={sel.id}
                className="space-y-2 rounded-md border border-border/80 bg-background/60 p-3"
              >
                <p className="text-xs font-medium text-foreground">
                  Тал: <span className="text-primary">{sel.tal}</span>
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Тэмдэглэл</Label>
                  <Textarea
                    className="min-h-[56px] text-sm"
                    value={sel.temdeglel}
                    onChange={(e) =>
                      setAnkhanFields((prev) => ({
                        ...prev,
                        gomdolGargsanTaluudEntries: prev.gomdolGargsanTaluudEntries.map((en) =>
                          en.id === sel.id ? { ...en, temdeglel: e.target.value } : en
                        ),
                      }))
                    }
                    placeholder="Тэмдэглэл"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Файл</Label>
                  {sel.files.length > 0 && (
                    <ul className="space-y-1 text-xs">
                      {sel.files.map((f, fi) => (
                        <li
                          key={`${sel.id}-f-${fi}`}
                          className="flex flex-wrap items-center justify-between gap-2"
                        >
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {f.title}
                          </a>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              setAnkhanFields((prev) => ({
                                ...prev,
                                gomdolGargsanTaluudEntries: prev.gomdolGargsanTaluudEntries.map((en) =>
                                  en.id === sel.id
                                    ? { ...en, files: en.files.filter((_, i) => i !== fi) }
                                    : en
                                ),
                              }))
                            }
                            aria-label="Файл устгах"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                      disabled={gomdolUploadEntryId === sel.id}
                      onChange={(e) => uploadGomdolEntryFile(sel.id, e)}
                    />
                    <span className="rounded border border-dashed border-border px-2 py-1 hover:bg-muted/40">
                      {gomdolUploadEntryId === sel.id ? "Байршуулж байна…" : "+ Файл сонгох"}
                    </span>
                  </label>
                </div>
              </div>
            ))}

            {gomdolUploadError && (
              <p className="text-xs text-destructive">{gomdolUploadError}</p>
            )}
          </div>
        )}

      {!(
        showCourtStructuredBlock &&
        isCourtHuraldaanExtendedStage(step.stageLabel) &&
        davjFields.davjUiStage < 3
      ) && (
        <>
          {showCourtStructuredBlock &&
            isCourtHuraldaanExtendedStage(step.stageLabel) &&
            davjFields.davjUiStage >= 3 && (
              <p className="mt-3 text-xs font-medium text-muted-foreground">3. Оролцогчид</p>
            )}
          <StepParticipantsEditor
            step={step}
            saving={savingParticipants}
            onSave={onSaveParticipants}
            selectableRolesMode={!isCourtStepFullParticipantsGrid(step.stageLabel)}
            excludeRoleKeys={
              isCourtStepFullParticipantsGrid(step.stageLabel)
                ? isCourtHuraldaanExtendedStage(step.stageLabel)
                  ? ["judge", "judgeAssistant"]
                  : undefined
                : ["citizenRepresentative"]
            }
            readOnly={
              showCourtStructuredBlock &&
              isCourtHuraldaanExtendedStage(step.stageLabel) &&
              davjFields.davjUiStage >= 4
            }
          />
        </>
      )}

      {showCourtStructuredBlock &&
        isCourtHuraldaanExtendedStage(step.stageLabel) &&
        davjFields.davjUiStage === 3 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSaveDavjStage3Participants()}
              disabled={savingParticipants || savingDavj}
            >
              {savingDavj ? "Хадгалж байна…" : "Хадгалах"}
            </Button>
          </div>
        )}

      {showCourtStructuredBlock &&
        isCourtHuraldaanExtendedStage(step.stageLabel) &&
        davjFields.davjUiStage >= 4 && (
          <div className="mt-4 space-y-2 rounded-md border border-border/60 bg-muted/10 p-3">
            <span className="text-xs font-medium text-foreground">4. Хурлын шийдвэр</span>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Шийдвэр сонгох</Label>
              <select
                className={cn(
                  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none",
                  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                )}
                value={davjFields.khuraliinShiidver}
                onChange={(e) => {
                  const v = e.target.value;
                  const showsGom =
                    step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE
                      ? hynaltKhuraliinShiidverShowsGomdolSection(v)
                      : davjKhuraliinShiidverShowsGomdolSection(v);
                  const showsHoysh =
                    step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE
                      ? hynaltKhuraliinShiidverShowsHoyshluulahDate(v)
                      : davjKhuraliinShiidverShowsHoyshluulahDate(v);
                  setDavjFields((prev) => {
                    const next: DavjShuukhHuraldaanFields = { ...prev, khuraliinShiidver: v };
                    if (!showsGom) {
                      next.davjGomdolGargsanEseh = "";
                      next.davjGomdolGargsanTaluudEntries = [];
                    }
                    if (!showsHoysh) {
                      next.khuralHoyshluulahKhuralOgnoo = "";
                    }
                    return next;
                  });
                }}
                disabled={savingParticipants || savingDavj}
              >
                <option value="">Сонгох</option>
                {davjFields.khuraliinShiidver &&
                  !((
                    step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE
                      ? HYNALT_KHRALIIN_SHIIDVER_OPTIONS
                      : DAVJ_KHRALIIN_SHIIDVER_OPTIONS
                  ) as readonly string[]).includes(davjFields.khuraliinShiidver) && (
                    <option value={davjFields.khuraliinShiidver}>
                      {step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE
                        ? formatHynaltKhuraliinShiidverForDisplay(davjFields.khuraliinShiidver)
                        : davjFields.khuraliinShiidver}
                    </option>
                  )}
                {(step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE
                  ? HYNALT_KHRALIIN_SHIIDVER_OPTIONS
                  : DAVJ_KHRALIIN_SHIIDVER_OPTIONS
                ).map((opt) => (
                  <option key={opt} value={opt}>
                    {step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE
                      ? formatHynaltKhuraliinShiidverForDisplay(opt)
                      : opt}
                  </option>
                ))}
              </select>
            </div>
            {davjFields.khuraliinShiidver.trim() !== "" && (
              <div className="space-y-3 rounded-md border border-border/80 bg-background/50 p-3">
                {(step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE
                  ? hynaltKhuraliinShiidverShowsHoyshluulahDate(davjFields.khuraliinShiidver)
                  : davjKhuraliinShiidverShowsHoyshluulahDate(davjFields.khuraliinShiidver)) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Дараагийн хурлын тов</Label>
                    <Input
                      type="date"
                      className="text-sm"
                      value={davjFields.khuralHoyshluulahKhuralOgnoo}
                      onChange={(e) =>
                        setDavjFields((prev) => ({
                          ...prev,
                          khuralHoyshluulahKhuralOgnoo: e.target.value,
                        }))
                      }
                      disabled={savingParticipants || savingDavj}
                    />
                  </div>
                )}

                {(step.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE
                  ? hynaltKhuraliinShiidverShowsGomdolSection(davjFields.khuraliinShiidver)
                  : davjKhuraliinShiidverShowsGomdolSection(davjFields.khuraliinShiidver)) && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Гомдол гаргасан эсэх</Label>
                      <select
                        className={cn(
                          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none",
                          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                        )}
                        value={davjFields.davjGomdolGargsanEseh}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDavjFields((prev) => ({
                            ...prev,
                            davjGomdolGargsanEseh: v,
                            davjGomdolGargsanTaluudEntries:
                              v === "Тийм" ? prev.davjGomdolGargsanTaluudEntries : [],
                          }));
                        }}
                        disabled={savingParticipants || savingDavj}
                      >
                        <option value="">Сонгох</option>
                        {davjFields.davjGomdolGargsanEseh &&
                          !(ANKHAN_GOMDOL_GARGSAN_ESEH_OPTIONS as readonly string[]).includes(
                            davjFields.davjGomdolGargsanEseh
                          ) && (
                            <option value={davjFields.davjGomdolGargsanEseh}>
                              {davjFields.davjGomdolGargsanEseh}
                            </option>
                          )}
                        {ANKHAN_GOMDOL_GARGSAN_ESEH_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    {davjFields.davjGomdolGargsanEseh === "Тийм" && (
                      <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
                        <Label className="text-xs font-medium">Гомдол гаргасан талууд</Label>
                        <p className="text-xs text-muted-foreground">
                          + товчоор тал нэмнэ. Нэмэгдсэн тал бүрт өөрийн тэмдэглэл, файл оруулна.
                        </p>

                        <div className="rounded-lg border border-input bg-background/60 px-3 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {davjFields.davjGomdolGargsanTaluudEntries.map((entry) => (
                              <span
                                key={entry.id}
                                className="inline-flex max-w-[min(100%,280px)] items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-sm text-foreground"
                              >
                                <span className="truncate">{entry.tal}</span>
                                <button
                                  type="button"
                                  className="shrink-0 rounded p-0.5 hover:bg-primary/25"
                                  onClick={() =>
                                    setDavjFields((prev) => ({
                                      ...prev,
                                      davjGomdolGargsanTaluudEntries:
                                        prev.davjGomdolGargsanTaluudEntries.filter((x) => x.id !== entry.id),
                                    }))
                                  }
                                  aria-label="Устгах"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                            <div className="relative">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => setDavjGomdolOpenAddPicker((x) => !x)}
                                title="Тал нэмэх"
                                disabled={savingParticipants || savingDavj}
                              >
                                <Plus className="size-4" />
                              </Button>
                              {davjGomdolOpenAddPicker && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    aria-hidden
                                    onClick={() => setDavjGomdolOpenAddPicker(false)}
                                  />
                                  <div className="absolute left-0 top-full z-20 mt-1 max-h-56 min-w-[220px] overflow-auto rounded-md border border-border bg-popover py-1 shadow-md">
                                    {ANKHAN_GOMDOL_GARGSAN_TALUUD_OPTIONS.map((tal) => (
                                      <button
                                        key={tal}
                                        type="button"
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                                        onClick={() => {
                                          const id = generateAnkhanGomdolEntryId();
                                          setDavjFields((prev) => ({
                                            ...prev,
                                            davjGomdolGargsanTaluudEntries: [
                                              ...prev.davjGomdolGargsanTaluudEntries,
                                              { id, tal, temdeglel: "", files: [] },
                                            ],
                                          }));
                                          setDavjGomdolOpenAddPicker(false);
                                        }}
                                      >
                                        {tal}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          {davjFields.davjGomdolGargsanTaluudEntries.length === 0 && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Одоогоор тал нэмээгүй. + дарж жагсаалтаас сонгоно уу.
                            </p>
                          )}
                        </div>

                        {davjFields.davjGomdolGargsanTaluudEntries.map((sel) => (
                          <div
                            key={sel.id}
                            className="space-y-2 rounded-md border border-border/80 bg-background/60 p-3"
                          >
                            <p className="text-xs font-medium text-foreground">
                              Тал: <span className="text-primary">{sel.tal}</span>
                            </p>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Тэмдэглэл</Label>
                              <Textarea
                                className="min-h-[56px] text-sm"
                                value={sel.temdeglel}
                                onChange={(e) =>
                                  setDavjFields((prev) => ({
                                    ...prev,
                                    davjGomdolGargsanTaluudEntries: prev.davjGomdolGargsanTaluudEntries.map((en) =>
                                      en.id === sel.id ? { ...en, temdeglel: e.target.value } : en
                                    ),
                                  }))
                                }
                                placeholder="Тэмдэглэл"
                                disabled={savingParticipants || savingDavj}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Файл</Label>
                              {sel.files.length > 0 && (
                                <ul className="space-y-1 text-xs">
                                  {sel.files.map((f, fi) => (
                                    <li
                                      key={`${sel.id}-f-${fi}`}
                                      className="flex flex-wrap items-center justify-between gap-2"
                                    >
                                      <a
                                        href={f.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary underline-offset-2 hover:underline"
                                      >
                                        {f.title}
                                      </a>
                                      <button
                                        type="button"
                                        className="text-muted-foreground hover:text-destructive"
                                        onClick={() =>
                                          setDavjFields((prev) => ({
                                            ...prev,
                                            davjGomdolGargsanTaluudEntries:
                                              prev.davjGomdolGargsanTaluudEntries.map((en) =>
                                                en.id === sel.id
                                                  ? { ...en, files: en.files.filter((_, i) => i !== fi) }
                                                  : en
                                              ),
                                          }))
                                        }
                                        aria-label="Файл устгах"
                                      >
                                        ×
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                                <input
                                  type="file"
                                  multiple
                                  className="hidden"
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                                  disabled={davjGomdolUploadEntryId === sel.id || savingParticipants || savingDavj}
                                  onChange={(e) => void uploadDavjGomdolEntryFile(sel.id, e)}
                                />
                                <span className="rounded border border-dashed border-border px-2 py-1 hover:bg-muted/40">
                                  {davjGomdolUploadEntryId === sel.id
                                    ? "Байршуулж байна…"
                                    : "+ Файл сонгох"}
                                </span>
                              </label>
                            </div>
                          </div>
                        ))}

                        {davjGomdolUploadError && (
                          <p className="text-xs text-destructive">{davjGomdolUploadError}</p>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Тэмдэглэл</Label>
                  <Textarea
                    className="min-h-[80px] text-sm"
                    value={davjFields.khuraliinShiidverTemdeglel}
                    onChange={(e) =>
                      setDavjFields((prev) => ({
                        ...prev,
                        khuraliinShiidverTemdeglel: e.target.value,
                      }))
                    }
                    placeholder="Тэмдэглэл бичнэ үү"
                    disabled={savingParticipants || savingDavj}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Файл</Label>
                  {davjFields.khuraliinShiidverFiles.length > 0 && (
                    <ul className="space-y-1 text-xs">
                      {davjFields.khuraliinShiidverFiles.map((f, fi) => (
                        <li
                          key={`${f.url}-${fi}`}
                          className="flex flex-wrap items-center justify-between gap-2"
                        >
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {f.title}
                          </a>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive"
                            disabled={savingParticipants || savingDavj || davjKhuralUploading}
                            onClick={() =>
                              setDavjFields((prev) => ({
                                ...prev,
                                khuraliinShiidverFiles: prev.khuraliinShiidverFiles.filter((_, i) => i !== fi),
                              }))
                            }
                            aria-label="Файл устгах"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                      disabled={davjKhuralUploading || savingParticipants || savingDavj}
                      onChange={(e) => void uploadDavjKhuraliinFile(e)}
                    />
                    <span className="rounded border border-dashed border-border px-2 py-1 hover:bg-muted/40">
                      {davjKhuralUploading ? "Байршуулж байна…" : "+ Файл сонгох"}
                    </span>
                  </label>
                  {davjKhuralUploadError && (
                    <p className="text-xs text-destructive">{davjKhuralUploadError}</p>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {caseStatus === "PENDING" &&
                step.stageLabel === DAVJ_ZAALDAH_SHUUKH_HURALDAAN_STAGE &&
                davjFields.davjKheregTudgelzsen && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={openDavjResumeDialog}
                  disabled={savingParticipants || savingDavj}
                >
                  Сэргээх
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSaveDavjStage4()}
                disabled={savingParticipants || savingDavj}
              >
                {savingDavj ? "Хадгалж байна…" : "Хадгалах"}
              </Button>
            </div>
          </div>
        )}

      {/* Documents at bottom: upload (Cloudinary), view, edit title, delete */}
      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <div className="text-xs font-medium text-muted-foreground">Хавсаргасан баримтууд</div>
        <div className="space-y-2">
          {step.documents.length > 0 && (
            <ul className="space-y-2">
              {step.documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  caseId={caseId}
                  stepId={step.id}
                  onUpdate={(updated) =>
                    onStepUpdate({
                      documents: step.documents.map((d) => (d.id === doc.id ? { ...d, ...updated } : d)),
                    })
                  }
                  onRemove={() => removeDocument(doc.id)}
                />
              ))}
            </ul>
          )}
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-muted/30">
            <input
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
              onChange={uploadAndAddDocument}
              disabled={uploadingDoc}
            />
            <svg className="h-10 w-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm text-muted-foreground">
              {uploadingDoc ? "Байршуулж байна…" : "Файл сонгох эсвэл энд чирж хаяна"}
            </span>
            <span className="text-xs text-muted-foreground">Cloudinary дээр хадгалагдана</span>
          </label>
        </div>
        {docError && <p className="text-xs text-destructive">{docError}</p>}
      </div>

      {step.stageLabel === ANKHAN_SHUUKH_HURALDAAN_STAGE && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button
            type="button"
            size="sm"
            onClick={handleSaveAnkhanStep}
            disabled={savingParticipants || savingAnkhan}
          >
            {savingParticipants || savingAnkhan ? "Хадгалж байна…" : "Хадгалах"}
          </Button>
        </div>
      )}

      <Dialog
        open={davjResumeDialogOpen}
        onOpenChange={(open) => {
          setDavjResumeDialogOpen(open);
          if (!open) setDavjResumeError("");
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Хэргийг сэргээх</DialogTitle>
            <DialogDescription>
              Түдгэлзүүлсэн хэргийг үргэлжлүүлэхийн тулд шинэ хурлын товыг оруулна уу.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label className="text-xs font-medium">Хурлын тов</Label>
            <Input
              type="date"
              className="text-sm"
              value={davjResumeKhuralynTov}
              onChange={(e) => {
                setDavjResumeKhuralynTov(e.target.value);
                setDavjResumeError("");
              }}
              disabled={savingDavj}
            />
            {davjResumeError && <p className="text-xs text-destructive">{davjResumeError}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDavjResumeDialogOpen(false)}
              disabled={savingDavj}
            >
              Цуцлах
            </Button>
            <Button type="button" onClick={() => void confirmDavjResumeAfterTudgelzulsen()} disabled={savingDavj}>
              {savingDavj ? "Хадгалж байна…" : "Хадгалах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type ShuukhGaragsanHuseltFile = { title: string; url: string };

function parseGaragsanHuseltFiles(raw: unknown): ShuukhGaragsanHuseltFile[] {
  if (!Array.isArray(raw)) return [];
  const out: ShuukhGaragsanHuseltFile[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const x = item as Record<string, unknown>;
    const url = typeof x.url === "string" ? x.url.trim() : "";
    if (!url) continue;
    const title = typeof x.title === "string" && x.title.trim() ? x.title.trim() : "Файл";
    out.push({ title, url });
  }
  return out;
}

/** «Хүсэлт гаргасан тал» сонголтууд */
const SHUUKH_HUSELT_GARGSAN_TAL_OPTIONS = [
  "Прокурор",
  "Яллагдагч",
  "Хохирогч",
  "Хохирогчийн өмгөөлөгч",
  "Яллагдагчийн өмгөөлөгч",
  "Иргэний нэхэмжлэгч, хариуцагч",
  "Бусад",
] as const;

function parseShuukhHarmgviulNote(note: string | null): {
  medeelel: string;
  huleenAwsanOgnoo: string;
  huleenAwsanShuuh: string;
  uridchilisanHeleltsuulegHuseltGargasan: boolean;
  uridchilisanHeleltsuulegOgnoo: string;
  huseltGargasanTal: string;
  garagsanHuseltFiles: ShuukhGaragsanHuseltFile[];
  tovchKhuraangui: string;
} {
  const empty = {
    medeelel: "",
    huleenAwsanOgnoo: "",
    huleenAwsanShuuh: "",
    uridchilisanHeleltsuulegHuseltGargasan: false,
    uridchilisanHeleltsuulegOgnoo: "",
    huseltGargasanTal: "",
    garagsanHuseltFiles: [] as ShuukhGaragsanHuseltFile[],
    tovchKhuraangui: "",
  };
  if (!note?.trim()) return empty;
  try {
    const o = JSON.parse(note) as Record<string, unknown>;
    if (o.kind === SHUUKH_HARMGVIUL_NOTE_KIND) {
      const uh = o.uridchilisanHeleltsuulegHuseltGargasan;
      return {
        medeelel: typeof o.medeelel === "string" ? o.medeelel : "",
        huleenAwsanOgnoo: typeof o.huleenAwsanOgnoo === "string" ? o.huleenAwsanOgnoo : "",
        huleenAwsanShuuh: typeof o.huleenAwsanShuuh === "string" ? o.huleenAwsanShuuh : "",
        uridchilisanHeleltsuulegHuseltGargasan: uh === true,
        uridchilisanHeleltsuulegOgnoo:
          typeof o.uridchilisanHeleltsuulegOgnoo === "string" ? o.uridchilisanHeleltsuulegOgnoo : "",
        huseltGargasanTal: typeof o.huseltGargasanTal === "string" ? o.huseltGargasanTal : "",
        garagsanHuseltFiles: parseGaragsanHuseltFiles(o.garagsanHuseltFiles),
        tovchKhuraangui: typeof o.tovchKhuraangui === "string" ? o.tovchKhuraangui : "",
      };
    }
  } catch {
    /* plain text */
  }
  return { ...empty, medeelel: note.trim() };
}

/** «Урьдчилсан хэлэлцүүлэг» / «Анхан шатны шүүх хуралдаан» — PARTICIPATION_STAGE_VALUES индекс */
const SHUUKH_PROGRESS_URIDCHILSAN_HELELTSUULEG = PARTICIPATION_STAGE_VALUES.indexOf("Урьдчилсан хэлэлцүүлэг");
const SHUUKH_PROGRESS_ANKHAN_SHUUKH = PARTICIPATION_STAGE_VALUES.indexOf("Анхан шатны шүүх хуралдаан");
const SHUUKH_PROGRESS_PROKUROR_HYANALT = PARTICIPATION_STAGE_VALUES.indexOf("Прокурорын хяналт");
const SHUUKH_PROGRESS_DAVJ_ZAALDAN = PARTICIPATION_STAGE_VALUES.indexOf("Давж заалдах шатны шүүх хуралдаан");
const SHUUKH_PROGRESS_HYNALT_SHUUKH = PARTICIPATION_STAGE_VALUES.indexOf("Хяналтын шатны шүүх хуралдаан");
/** «Шүүхэд хэрэг хүргүүлсэн» — алхам 5, PARTICIPATION_STAGE_VALUES индекс */
const SHUUKH_PROGRESS_SHUUKH_HARMGVIUL = PARTICIPATION_STAGE_VALUES.indexOf("Шүүхэд хэрэг хүргүүлсэн");

/** Урьдчилсан тэмдэглэлд хадгалагдах — цувааны визуал (алгасах / буцах) */
const URID_GOMDOL_MARK_SKIP_ANKHAN = "skip_ankhan_to_davj" as const;
const URID_GOMDOL_MARK_RETURN_PROKUROR = "return_prokuror" as const;

/** Алхам 5: «Шүүхэд хэрэг хүргүүлсэн» — Мэдээлэл, хүлээн авсан огноо/шүүх, оролцогчид (шинжээчгүй). */
function ShuukhHarmgviulStepContent({
  step,
  caseId,
  savingParticipants,
  onSaveParticipants,
  onStepUpdate,
  onAfterProgressToStep,
  reloadCase,
}: {
  step: CaseStep;
  caseId: string;
  savingParticipants: boolean;
  onSaveParticipants: (stepId: string, participants: Record<string, string[]>) => Promise<void>;
  onStepUpdate: (updated: Partial<CaseStep>) => void;
  onAfterProgressToStep?: (stepIndex: number) => void;
  reloadCase?: () => void | Promise<void>;
}) {
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docError, setDocError] = useState("");
  const [medeelel, setMedeelel] = useState("");
  const [huleenAwsanOgnoo, setHuleenAwsanOgnoo] = useState("");
  const [huleenAwsanShuuh, setHuleenAwsanShuuh] = useState("");
  const [uridchilisanHeleltsuulegHuseltGargasan, setUridchilisanHeleltsuulegHuseltGargasan] = useState(false);
  const [uridchilisanHeleltsuulegOgnoo, setUridchilisanHeleltsuulegOgnoo] = useState("");
  const [huseltGargasanTal, setHuseltGargasanTal] = useState("");
  const [garagsanHuseltFiles, setGaragsanHuseltFiles] = useState<ShuukhGaragsanHuseltFile[]>([]);
  const [tovchKhuraangui, setTovchKhuraangui] = useState("");
  const [uploadingHuselt, setUploadingHuselt] = useState(false);
  const [huseltUploadError, setHuseltUploadError] = useState("");
  const [savingStep, setSavingStep] = useState(false);
  const [saveStepError, setSaveStepError] = useState<string | null>(null);

  useEffect(() => {
    const p = parseShuukhHarmgviulNote(step.note);
    setMedeelel(p.medeelel);
    setHuleenAwsanOgnoo(p.huleenAwsanOgnoo);
    setHuleenAwsanShuuh(p.huleenAwsanShuuh);
    setUridchilisanHeleltsuulegHuseltGargasan(p.uridchilisanHeleltsuulegHuseltGargasan);
    setUridchilisanHeleltsuulegOgnoo(p.uridchilisanHeleltsuulegOgnoo);
    setHuseltGargasanTal(p.huseltGargasanTal);
    setGaragsanHuseltFiles(p.garagsanHuseltFiles);
    setTovchKhuraangui(p.tovchKhuraangui);
  }, [step.id, step.note]);

  const uploadAndAddDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setDocError("");
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      const res = await fetch("/api/upload/cloudinary", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setDocError(data.error || "Файл байршуулахад алдаа гарлаа");
        return;
      }
      for (const u of data.uploads || []) {
        const docRes = await fetch(`/api/cases/${caseId}/steps/${step.id}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: u.title || "Баримт", url: u.url }),
        });
        if (docRes.ok) {
          const doc = await docRes.json();
          onStepUpdate({
            documents: [...step.documents, { id: doc.id, title: doc.title, url: doc.url, createdAt: doc.createdAt }],
          });
        }
      }
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  const removeDocument = async (docId: string) => {
    const res = await fetch(`/api/cases/${caseId}/steps/${step.id}/documents/${docId}`, { method: "DELETE" });
    if (res.ok) {
      onStepUpdate({
        documents: step.documents.filter((d) => d.id !== docId),
      });
    }
  };

  const uploadGaragsanHuseltFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setHuseltUploadError("");
    setUploadingHuselt(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      const res = await fetch("/api/upload/cloudinary", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setHuseltUploadError(data.error || "Файл байршуулахад алдаа гарлаа");
        return;
      }
      const newFiles = (data.uploads || []).map(
        (u: { url: string; title?: string }) => ({ url: u.url, title: u.title?.trim() || "Файл" })
      );
      setGaragsanHuseltFiles((prev) => [...prev, ...newFiles]);
    } finally {
      setUploadingHuselt(false);
      e.target.value = "";
    }
  };

  const removeGaragsanHuseltFile = (index: number) => {
    setGaragsanHuseltFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /** Тэмдэглэл (JSON) + оролцогчид (шинжээчгүй) нэг дор хадгална. */
  const handleSaveStep = async () => {
    setSaveStepError(null);
    setSavingStep(true);
    try {
      const payload = {
        kind: SHUUKH_HARMGVIUL_NOTE_KIND,
        uridchilisanHeleltsuulegHuseltGargasan,
        medeelel: medeelel.trim(),
        huleenAwsanOgnoo: huleenAwsanOgnoo.trim(),
        huleenAwsanShuuh: huleenAwsanShuuh.trim(),
        ...(uridchilisanHeleltsuulegHuseltGargasan
          ? {
              uridchilisanHeleltsuulegOgnoo: uridchilisanHeleltsuulegOgnoo.trim(),
              huseltGargasanTal: huseltGargasanTal.trim(),
              garagsanHuseltFiles,
              tovchKhuraangui: tovchKhuraangui.trim(),
            }
          : {
              uridchilisanHeleltsuulegOgnoo: "",
              huseltGargasanTal: "",
              garagsanHuseltFiles: [] as ShuukhGaragsanHuseltFile[],
              tovchKhuraangui: "",
            }),
      };
      const byRole = participantsByRole(step.participants);
      const participantsPayload: Record<string, string[]> = {};
      for (const key of STEP_PARTICIPANT_ROLE_KEYS) {
        if (key === "expert" || key === "citizenRepresentative") continue;
        participantsPayload[key] = [...(byRole[key] || [])];
      }
      const res = await fetch(`/api/cases/${caseId}/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: JSON.stringify(payload),
          participants: participantsPayload,
        }),
      });
      const updated = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveStepError(typeof updated?.error === "string" ? updated.error : "Хадгалахад алдаа гарлаа");
        return;
      }
      const nextParticipants = Array.isArray(updated.participants)
        ? updated.participants.map((p: { id: string; role: string; name: string }) => ({
            id: p.id,
            role: p.role,
            name: p.name,
          }))
        : step.participants;
      onStepUpdate({
        note: updated.note ?? null,
        participants: nextParticipants,
      });

      const nextProgress = uridchilisanHeleltsuulegHuseltGargasan
        ? SHUUKH_PROGRESS_URIDCHILSAN_HELELTSUULEG
        : SHUUKH_PROGRESS_ANKHAN_SHUUKH;
      if (nextProgress >= 0) {
        const progressRes = await fetch(`/api/cases/${caseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseProgressStepIndex: nextProgress }),
        });
        if (progressRes.ok) {
          await reloadCase?.();
          onAfterProgressToStep?.(nextProgress);
        }
      }
    } finally {
      setSavingStep(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-foreground">
          {step.stageLabel}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(step.createdAt).toLocaleString("mn-MN", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {step.createdBy && ` · ${step.createdBy.name}`}
        </span>
      </div>
      <StepDeadlineRow
        step={step}
        caseId={caseId}
        onUpdate={(deadline) => onStepUpdate({ deadline })}
      />

      <div className="mt-4 space-y-3">
        <div className="text-xs font-medium text-muted-foreground">Тэмдэглэл</div>
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <input
              id="shuukh-uridchilisan-huselt"
              type="checkbox"
              checked={uridchilisanHeleltsuulegHuseltGargasan}
              onChange={(e) => {
                const v = e.target.checked;
                setUridchilisanHeleltsuulegHuseltGargasan(v);
                if (!v) {
                  setUridchilisanHeleltsuulegOgnoo("");
                  setHuseltGargasanTal("");
                  setGaragsanHuseltFiles([]);
                  setTovchKhuraangui("");
                  setHuseltUploadError("");
                }
              }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
            />
            <Label htmlFor="shuukh-uridchilisan-huselt" className="cursor-pointer text-xs font-normal leading-snug">
              Урьдчилсан хэлэлцүүлэгийн хүсэлт гаргасан эсэх
            </Label>
          </div>
          {uridchilisanHeleltsuulegHuseltGargasan && (
            <div className="space-y-3 rounded-lg border border-border bg-card px-3 py-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Урьдчилсан хэлэлцүүлэгийн огноо</Label>
                  <Input
                    type="date"
                    className="text-sm"
                    value={uridchilisanHeleltsuulegOgnoo}
                    onChange={(e) => setUridchilisanHeleltsuulegOgnoo(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Хүсэлт гаргасан тал</Label>
                  <select
                    className={cn(
                      "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs outline-none",
                      "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                    )}
                    value={huseltGargasanTal}
                    onChange={(e) => setHuseltGargasanTal(e.target.value)}
                  >
                    <option value="">Сонгох</option>
                    {huseltGargasanTal &&
                      !(SHUUKH_HUSELT_GARGSAN_TAL_OPTIONS as readonly string[]).includes(huseltGargasanTal) && (
                        <option value={huseltGargasanTal}>{huseltGargasanTal}</option>
                      )}
                    {SHUUKH_HUSELT_GARGSAN_TAL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Гаргасан хүсэлт</Label>
                {garagsanHuseltFiles.length > 0 && (
                  <ul className="mb-2 flex flex-wrap gap-1">
                    {garagsanHuseltFiles.map((f, i) => (
                      <li
                        key={`${f.url}-${i}`}
                        className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
                      >
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline underline-offset-2"
                        >
                          {f.title}
                        </a>
                        <button
                          type="button"
                          onClick={() => removeGaragsanHuseltFile(i)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Устгах"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-center text-xs transition-colors hover:border-primary/40">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                    onChange={uploadGaragsanHuseltFiles}
                    disabled={uploadingHuselt}
                  />
                  {uploadingHuselt ? "Байршуулж байна…" : "Файл сонгох (Cloudinary)"}
                </label>
                {huseltUploadError && <p className="text-xs text-destructive">{huseltUploadError}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Товч хураангүй</Label>
                <Textarea
                  className="min-h-[72px] text-sm"
                  value={tovchKhuraangui}
                  onChange={(e) => setTovchKhuraangui(e.target.value)}
                  placeholder="Товч хураангүй"
                />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Мэдээлэл</Label>
            <Textarea
              className="min-h-[80px] text-sm"
              value={medeelel}
              onChange={(e) => setMedeelel(e.target.value)}
              placeholder="Мэдээлэл"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Хүлээн авсан огноо</Label>
              <Input
                type="date"
                className="text-sm"
                value={huleenAwsanOgnoo}
                onChange={(e) => setHuleenAwsanOgnoo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Хүлээн авсан шүүх</Label>
              <Input
                className="text-sm"
                value={huleenAwsanShuuh}
                onChange={(e) => setHuleenAwsanShuuh(e.target.value)}
                placeholder="Шүүхийн нэр"
              />
            </div>
          </div>
        </div>
      </div>

      <StepParticipantsEditor
        step={step}
        saving={savingParticipants}
        onSave={onSaveParticipants}
        excludeRoleKeys={["expert", "citizenRepresentative"]}
      />

      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <div className="text-xs font-medium text-muted-foreground">Хавсаргасан баримтууд</div>
        <div className="space-y-2">
          {step.documents.length > 0 && (
            <ul className="space-y-2">
              {step.documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  caseId={caseId}
                  stepId={step.id}
                  onUpdate={(updated) =>
                    onStepUpdate({
                      documents: step.documents.map((d) => (d.id === doc.id ? { ...d, ...updated } : d)),
                    })
                  }
                  onRemove={() => removeDocument(doc.id)}
                />
              ))}
            </ul>
          )}
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-muted/30">
            <input
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
              onChange={uploadAndAddDocument}
              disabled={uploadingDoc}
            />
            <svg className="h-10 w-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm text-muted-foreground">
              {uploadingDoc ? "Байршуулж байна…" : "Файл сонгох эсвэл энд чирж хаяна"}
            </span>
            <span className="text-xs text-muted-foreground">Cloudinary дээр хадгалагдана</span>
          </label>
        </div>
        {docError && <p className="text-xs text-destructive">{docError}</p>}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button type="button" size="sm" onClick={handleSaveStep} disabled={savingStep || savingParticipants}>
            {savingStep ? "Хадгалж байна…" : "Хадгалах"}
          </Button>
          {saveStepError && <p className="text-xs text-destructive">{saveStepError}</p>}
        </div>
      </div>
    </>
  );
}

/** Урьдчилсан хэлэлцүүлэгээс гарсан шийдвэр — dropdown */
const URIDCHILSAN_SHIIDVER_OPTIONS = [
  "Урьдчилсан хэлэлцүүлэгийг хойшлуулах",
  "Хэргийг прокурорт буцаах",
  "Яллагдагчийг шүүхэд шилжүүлэх",
  "Харьяаллын дагуу шилжүүлэх",
  "Хэргийг түдгэлзүүлэх",
] as const;

const URIDCHILSAN_SHIIDVER_HOYSHLUULAH = "Урьдчилсан хэлэлцүүлэгийг хойшлуулах";
const URIDCHILSAN_SHIIDVER_PROKUROR = "Хэргийг прокурорт буцаах";
const URIDCHILSAN_SHIIDVER_SHILEGUULEH = "Яллагдагчийг шүүхэд шилжүүлэх";

const GOMDOL_ESERGUUTSEL_STATUS_PENDING = "Хүлээгдэж байгаа";
const GOMDOL_ESERGUUTSEL_STATUS_YES = "Тийм";
const GOMDOL_ESERGUUTSEL_STATUS_NO = "Үгүй";
const GOMDOL_ESERGUUTSEL_STATUS_OPTIONS = [
  GOMDOL_ESERGUUTSEL_STATUS_PENDING,
  GOMDOL_ESERGUUTSEL_STATUS_YES,
  GOMDOL_ESERGUUTSEL_STATUS_NO,
] as const;

/** «Хэнээс» сонголтоос шүүгч, туслахыг хасна */
const GOMDOL_HENEES_EXCLUDED_ROLE_KEYS = new Set<string>(["judge", "judgeAssistant"]);

function formatUridKuuchinOgnooForDisplay(iso: string): string {
  const v = iso.trim();
  if (!v) return "—";
  const d = new Date(`${v}T12:00:00`);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("mn-MN", { year: "numeric", month: "long", day: "numeric" });
}

function parseUridchilisanHeleltsuulegNote(note: string | null): {
  shiidver: string;
  temdeglel: string;
  hoyshluulahOgnoo: string;
  kuuchinTogoldorBolohOgnoo: string;
  shuukhKhuraldaanTov: string;
  gomdolEserguutselStatus: string;
  gomdolEserguutselHeneesRoleKey: string;
  uridGomdolProgressMark: string | null;
} {
  const empty = {
    shiidver: "",
    temdeglel: "",
    hoyshluulahOgnoo: "",
    kuuchinTogoldorBolohOgnoo: "",
    shuukhKhuraldaanTov: "",
    gomdolEserguutselStatus: GOMDOL_ESERGUUTSEL_STATUS_PENDING,
    gomdolEserguutselHeneesRoleKey: "",
    uridGomdolProgressMark: null as string | null,
  };
  if (!note?.trim()) return empty;
  try {
    const o = JSON.parse(note) as Record<string, unknown>;
    if (o.kind === URIDCHILSAN_HELELTSUULEG_NOTE_KIND) {
      const raw = typeof o.gomdolEserguutselStatus === "string" ? o.gomdolEserguutselStatus.trim() : "";
      const valid = new Set(GOMDOL_ESERGUUTSEL_STATUS_OPTIONS as readonly string[]);
      let gomdolEserguutselStatus = raw;
      if (!valid.has(gomdolEserguutselStatus)) {
        const ge = o.gomdolEserguutselGarsan;
        if (ge === true) gomdolEserguutselStatus = GOMDOL_ESERGUUTSEL_STATUS_YES;
        else if (ge === false) gomdolEserguutselStatus = GOMDOL_ESERGUUTSEL_STATUS_NO;
        else gomdolEserguutselStatus = GOMDOL_ESERGUUTSEL_STATUS_PENDING;
      }
      let gomdolEserguutselHeneesRoleKey =
        typeof o.gomdolEserguutselHeneesRoleKey === "string" ? o.gomdolEserguutselHeneesRoleKey.trim() : "";
      if (
        gomdolEserguutselStatus === GOMDOL_ESERGUUTSEL_STATUS_YES &&
        GOMDOL_HENEES_EXCLUDED_ROLE_KEYS.has(gomdolEserguutselHeneesRoleKey)
      ) {
        gomdolEserguutselHeneesRoleKey = "";
      }
      const rawMark = o.uridGomdolProgressMark;
      const uridGomdolProgressMark =
        rawMark === URID_GOMDOL_MARK_SKIP_ANKHAN || rawMark === URID_GOMDOL_MARK_RETURN_PROKUROR
          ? rawMark
          : null;
      const rawShiidver = typeof o.shiidver === "string" ? o.shiidver.trim() : "";
      /** Хуучин хадгалалт: shiidver хоосон + uridProkurorBuutsaaLogged */
      const prokurorBuutsaaLogged = o.uridProkurorBuutsaaLogged === true;
      const shiidverResolved =
        rawShiidver ||
        (prokurorBuutsaaLogged ? URIDCHILSAN_SHIIDVER_PROKUROR : "");
      return {
        shiidver: shiidverResolved,
        temdeglel: typeof o.temdeglel === "string" ? o.temdeglel : "",
        hoyshluulahOgnoo: typeof o.hoyshluulahOgnoo === "string" ? o.hoyshluulahOgnoo : "",
        kuuchinTogoldorBolohOgnoo: typeof o.kuuchinTogoldorBolohOgnoo === "string" ? o.kuuchinTogoldorBolohOgnoo : "",
        shuukhKhuraldaanTov: typeof o.shuukhKhuraldaanTov === "string" ? o.shuukhKhuraldaanTov : "",
        gomdolEserguutselStatus,
        gomdolEserguutselHeneesRoleKey,
        uridGomdolProgressMark,
      };
    }
  } catch {
    /* plain text */
  }
  return { ...empty, temdeglel: note.trim() };
}

/** Алхам 6: «Урьдчилсан хэлэлцүүлэг» — зөвхөн шийдвэр, тэмдэглэл, файл (оролцогчидгүй). */
function UridchilisanHeleltsuulegStepContent({
  step,
  caseId,
  caseProgressStepIndex,
  uridEnterFromStep5Key,
  onStepUpdate,
  onAfterProgressToStep,
  reloadCase,
}: {
  step: CaseStep;
  caseId: string;
  /** Явцын индекс — алхам 5→6 шилжихэд сонголт үргэлж идэвхтэй байх шалгуурт ашиглана */
  caseProgressStepIndex?: number | null;
  /** Эхний табаас «Шүүхэд хэрэг хүргүүлсэн» → «Урьдчилсан хэлэлцүүлэг» руу ороход нэмэгдэнэ — дахин сонголт харуулах */
  uridEnterFromStep5Key?: number;
  onStepUpdate: (updated: Partial<CaseStep>) => void;
  onAfterProgressToStep?: (stepIndex: number) => void;
  reloadCase?: () => void | Promise<void>;
}) {
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docError, setDocError] = useState("");
  const [shiidver, setShiidver] = useState("");
  const [temdeglel, setTemdeglel] = useState("");
  const [hoyshluulahOgnoo, setHoyshluulahOgnoo] = useState("");
  const [kuuchinTogoldorBolohOgnoo, setKuuchinTogoldorBolohOgnoo] = useState("");
  const [shuukhKhuraldaanTov, setShuukhKhuraldaanTov] = useState("");
  const [gomdolEserguutselStatus, setGomdolEserguutselStatus] = useState(GOMDOL_ESERGUUTSEL_STATUS_PENDING);
  const [gomdolEserguutselHeneesRoleKey, setGomdolEserguutselHeneesRoleKey] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** «Хэргийг прокурорт буцаах» + огноо хадгалсны дараа текст болгох; Засах дарвал дахин сонголт */
  const [editProkurorDecisionFields, setEditProkurorDecisionFields] = useState(false);
  /** Хадгалалтын дараа л текст горим руу шилжүүлэх — табаар дахин ороход дахин сонголт */
  const prevUridNoteRef = useRef<string | null | undefined>(undefined);

  const savedParsed = useMemo(() => parseUridchilisanHeleltsuulegNote(step.note), [step.note]);

  /** Сонгосон шийдвэр «Хэргийг прокурорт буцаах» үед гомдлын хэсэг (хадгалахыг хүлээлгүйгээр dropdown-оос шууд) */
  const isProkurorBuutsaaShiidver = shiidver.trim() === URIDCHILSAN_SHIIDVER_PROKUROR;
  /** Алхам 5-аас алхам 6 дээр (явц «Урьдчилсан хэлэлцүүлэг») — шийдвэрийн сонголт үргэлж ашиглах боломжтой */
  const uridStepActiveInProgress =
    caseProgressStepIndex != null &&
    caseProgressStepIndex === SHUUKH_PROGRESS_URIDCHILSAN_HELELTSUULEG &&
    SHUUKH_PROGRESS_URIDCHILSAN_HELELTSUULEG >= 0;

  const formMatchesSavedProkuror =
    savedParsed.shiidver === URIDCHILSAN_SHIIDVER_PROKUROR &&
    shiidver.trim() === savedParsed.shiidver &&
    kuuchinTogoldorBolohOgnoo.trim() === savedParsed.kuuchinTogoldorBolohOgnoo.trim();

  /** Тэмдэглэлд прокурор + огноо хадгалагдсан, форм таарч байгаа үед dropdown биш текст */
  const showProkurorBuutsaaAsSavedText =
    !editProkurorDecisionFields &&
    savedParsed.shiidver === URIDCHILSAN_SHIIDVER_PROKUROR &&
    savedParsed.kuuchinTogoldorBolohOgnoo.trim() !== "" &&
    formMatchesSavedProkuror;

  useEffect(() => {
    const p = parseUridchilisanHeleltsuulegNote(step.note);
    setShiidver(p.shiidver);
    setTemdeglel(p.temdeglel);
    setHoyshluulahOgnoo(p.hoyshluulahOgnoo);
    setKuuchinTogoldorBolohOgnoo(p.kuuchinTogoldorBolohOgnoo);
    setShuukhKhuraldaanTov(p.shuukhKhuraldaanTov);
    setGomdolEserguutselStatus(p.gomdolEserguutselStatus);
    setGomdolEserguutselHeneesRoleKey(p.gomdolEserguutselHeneesRoleKey);
  }, [step.id, step.note]);

  useEffect(() => {
    const n = step.note ?? null;
    if (prevUridNoteRef.current !== undefined && prevUridNoteRef.current !== n) {
      setEditProkurorDecisionFields(false);
    }
    prevUridNoteRef.current = n;
  }, [step.note]);

  /** Зөвхөн «алхам 5 → 6» табаар ороход key нэмэгдэхэд нээгдэнэ — k>0 бүрт дахин true болгохгүй (хадгалсны дараа текст горим алдагдана) */
  const lastHandledUridNavKeyRef = useRef(uridEnterFromStep5Key ?? 0);
  useEffect(() => {
    const k = uridEnterFromStep5Key ?? 0;
    if (k > lastHandledUridNavKeyRef.current) {
      setEditProkurorDecisionFields(true);
    }
    lastHandledUridNavKeyRef.current = k;
  }, [uridEnterFromStep5Key]);

  const uploadAndAddDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setDocError("");
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      const res = await fetch("/api/upload/cloudinary", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setDocError(data.error || "Файл байршуулахад алдаа гарлаа");
        return;
      }
      for (const u of data.uploads || []) {
        const docRes = await fetch(`/api/cases/${caseId}/steps/${step.id}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: u.title || "Баримт", url: u.url }),
        });
        if (docRes.ok) {
          const doc = await docRes.json();
          onStepUpdate({
            documents: [...step.documents, { id: doc.id, title: doc.title, url: doc.url, createdAt: doc.createdAt }],
          });
        }
      }
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  const removeDocument = async (docId: string) => {
    const res = await fetch(`/api/cases/${caseId}/steps/${step.id}/documents/${docId}`, { method: "DELETE" });
    if (res.ok) {
      onStepUpdate({
        documents: step.documents.filter((d) => d.id !== docId),
      });
    }
  };

  const handleSaveNote = async () => {
    setSaveError(null);
    setSavingNote(true);
    try {
      const sh = shiidver.trim();
      const prevParsed = parseUridchilisanHeleltsuulegNote(step.note);
      let uridGomdolProgressMark: string | null = prevParsed.uridGomdolProgressMark ?? null;
      const isProkuror = sh === URIDCHILSAN_SHIIDVER_PROKUROR;
      if (isProkuror) {
        if (gomdolEserguutselStatus === GOMDOL_ESERGUUTSEL_STATUS_YES) {
          uridGomdolProgressMark = URID_GOMDOL_MARK_SKIP_ANKHAN;
        } else if (gomdolEserguutselStatus === GOMDOL_ESERGUUTSEL_STATUS_NO) {
          uridGomdolProgressMark = URID_GOMDOL_MARK_RETURN_PROKUROR;
        } else {
          uridGomdolProgressMark = null;
        }
      } else {
        uridGomdolProgressMark = null;
      }
      const payload = {
        kind: URIDCHILSAN_HELELTSUULEG_NOTE_KIND,
        /** «Хэргийг прокурорт буцаах»-ыг JSON-д шууд хадгална — хадгалсны дараа dropdown алдагдахгүй */
        shiidver: sh,
        temdeglel: temdeglel.trim(),
        hoyshluulahOgnoo: sh === URIDCHILSAN_SHIIDVER_HOYSHLUULAH ? hoyshluulahOgnoo.trim() : "",
        kuuchinTogoldorBolohOgnoo: sh === URIDCHILSAN_SHIIDVER_PROKUROR ? kuuchinTogoldorBolohOgnoo.trim() : "",
        shuukhKhuraldaanTov: sh === URIDCHILSAN_SHIIDVER_SHILEGUULEH ? shuukhKhuraldaanTov.trim() : "",
        gomdolEserguutselStatus:
          sh === URIDCHILSAN_SHIIDVER_PROKUROR
            ? gomdolEserguutselStatus
            : GOMDOL_ESERGUUTSEL_STATUS_PENDING,
        gomdolEserguutselHeneesRoleKey:
          sh === URIDCHILSAN_SHIIDVER_PROKUROR &&
          gomdolEserguutselStatus === GOMDOL_ESERGUUTSEL_STATUS_YES
            ? gomdolEserguutselHeneesRoleKey.trim()
            : "",
        uridGomdolProgressMark,
      };
      const res = await fetch(`/api/cases/${caseId}/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: JSON.stringify(payload) }),
      });
      const updated = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(typeof updated?.error === "string" ? updated.error : "Хадгалахад алдаа гарлаа");
        return;
      }
      onStepUpdate({ note: updated.note ?? null });
      /** Хадгалсны дараа прокурорын шийдвэр + огноог текст горимд шилжүүлнэ (табаар k>0 effect дахин true болгохгүй) */
      setEditProkurorDecisionFields(false);
      lastHandledUridNavKeyRef.current = uridEnterFromStep5Key ?? 0;

      let navigatedProgress: number | null = null;
      if (isProkuror) {
        if (gomdolEserguutselStatus === GOMDOL_ESERGUUTSEL_STATUS_YES && SHUUKH_PROGRESS_DAVJ_ZAALDAN >= 0) {
          const progressRes = await fetch(`/api/cases/${caseId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ caseProgressStepIndex: SHUUKH_PROGRESS_DAVJ_ZAALDAN }),
          });
          if (progressRes.ok) navigatedProgress = SHUUKH_PROGRESS_DAVJ_ZAALDAN;
        } else if (gomdolEserguutselStatus === GOMDOL_ESERGUUTSEL_STATUS_NO && SHUUKH_PROGRESS_PROKUROR_HYANALT >= 0) {
          const progressRes = await fetch(`/api/cases/${caseId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ caseProgressStepIndex: SHUUKH_PROGRESS_PROKUROR_HYANALT }),
          });
          if (progressRes.ok) navigatedProgress = SHUUKH_PROGRESS_PROKUROR_HYANALT;
        }
      }

      if (sh === URIDCHILSAN_SHIIDVER_SHILEGUULEH && SHUUKH_PROGRESS_ANKHAN_SHUUKH >= 0) {
        const progressRes = await fetch(`/api/cases/${caseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseProgressStepIndex: SHUUKH_PROGRESS_ANKHAN_SHUUKH }),
        });
        if (progressRes.ok) navigatedProgress = SHUUKH_PROGRESS_ANKHAN_SHUUKH;
      }

      await reloadCase?.();
      if (navigatedProgress != null) {
        onAfterProgressToStep?.(navigatedProgress);
      }
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-foreground">
          {step.stageLabel}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(step.createdAt).toLocaleString("mn-MN", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {step.createdBy && ` · ${step.createdBy.name}`}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {showProkurorBuutsaaAsSavedText ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label
                  className="text-xs"
                  title={
                    uridStepActiveInProgress
                      ? "Алхам 5 («Шүүхэд хэрэг хүргүүлсэн»)-аас ирсэн тохиолдолд шийдвэрийн сонголт үргэлж нээлттэй."
                      : undefined
                  }
                >
                  Урьдчилсан хэлэлцүүлэгээс гарсан шийдвэр
                </Label>
                <div
                  className={cn(
                    "flex min-h-9 w-full items-center rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-foreground"
                  )}
                >
                  {URIDCHILSAN_SHIIDVER_PROKUROR}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 text-xs"
                onClick={() => setEditProkurorDecisionFields(true)}
              >
                Засах
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Хүчин төгөлдөр болох огноо</Label>
              <div
                className={cn(
                  "flex min-h-9 w-full items-center rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-foreground"
                )}
              >
                {formatUridKuuchinOgnooForDisplay(kuuchinTogoldorBolohOgnoo)}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label
                className="text-xs"
                title={
                  uridStepActiveInProgress
                    ? "Алхам 5 («Шүүхэд хэрэг хүргүүлсэн»)-аас ирсэн тохиолдолд шийдвэрийн сонголт үргэлж нээлттэй."
                    : undefined
                }
              >
                Урьдчилсан хэлэлцүүлэгээс гарсан шийдвэр
              </Label>
              <select
                className={cn(
                  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none",
                  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                )}
                value={shiidver}
                onChange={(e) => {
                  const v = e.target.value;
                  setShiidver(v);
                  if (v !== URIDCHILSAN_SHIIDVER_HOYSHLUULAH) setHoyshluulahOgnoo("");
                  if (v !== URIDCHILSAN_SHIIDVER_PROKUROR) setKuuchinTogoldorBolohOgnoo("");
                  if (v !== URIDCHILSAN_SHIIDVER_SHILEGUULEH) setShuukhKhuraldaanTov("");
                }}
              >
                <option value="">Сонгох</option>
                {shiidver &&
                  !(URIDCHILSAN_SHIIDVER_OPTIONS as readonly string[]).includes(shiidver) && (
                    <option value={shiidver}>{shiidver}</option>
                  )}
                {URIDCHILSAN_SHIIDVER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            {shiidver === URIDCHILSAN_SHIIDVER_HOYSHLUULAH && (
              <div className="space-y-1.5">
                <Label className="text-xs">Хойшлуулах огноо</Label>
                <Input
                  type="date"
                  className="text-sm"
                  value={hoyshluulahOgnoo}
                  onChange={(e) => setHoyshluulahOgnoo(e.target.value)}
                />
              </div>
            )}
            {shiidver === URIDCHILSAN_SHIIDVER_PROKUROR && (
              <div className="space-y-1.5">
                <Label className="text-xs">Хүчин төгөлдөр болох огноо</Label>
                <Input
                  type="date"
                  className="text-sm"
                  value={kuuchinTogoldorBolohOgnoo}
                  onChange={(e) => setKuuchinTogoldorBolohOgnoo(e.target.value)}
                />
              </div>
            )}
          </>
        )}
        {isProkurorBuutsaaShiidver && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Хэргийг прокурорт буцаасан: Гомдол эсэргүүцэл гарсан эсэх</Label>
              <select
                className={cn(
                  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none",
                  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                )}
                value={gomdolEserguutselStatus}
                onChange={(e) => {
                  const v = e.target.value;
                  setGomdolEserguutselStatus(v);
                  if (v !== GOMDOL_ESERGUUTSEL_STATUS_YES) {
                    setGomdolEserguutselHeneesRoleKey("");
                  } else {
                    setGomdolEserguutselHeneesRoleKey((prev) =>
                      GOMDOL_HENEES_EXCLUDED_ROLE_KEYS.has(prev) ? "" : prev
                    );
                  }
                }}
              >
                {GOMDOL_ESERGUUTSEL_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            {gomdolEserguutselStatus === GOMDOL_ESERGUUTSEL_STATUS_YES && (
              <div className="space-y-1.5">
                <Label className="text-xs">Хэнээс: (оролцогчийн төрөл)</Label>
                <select
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none",
                    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                  )}
                  value={gomdolEserguutselHeneesRoleKey}
                  onChange={(e) => setGomdolEserguutselHeneesRoleKey(e.target.value)}
                >
                  <option value="">Сонгох</option>
                  {gomdolEserguutselHeneesRoleKey &&
                    !STEP_PARTICIPANT_ROLES.some((r) => r.key === gomdolEserguutselHeneesRoleKey) && (
                      <option value={gomdolEserguutselHeneesRoleKey}>{gomdolEserguutselHeneesRoleKey}</option>
                    )}
                  {STEP_PARTICIPANT_ROLES.filter((r) => !GOMDOL_HENEES_EXCLUDED_ROLE_KEYS.has(r.key)).map(
                    ({ key, label }) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}
          </>
        )}
        {shiidver === URIDCHILSAN_SHIIDVER_SHILEGUULEH && (
          <div className="space-y-1.5">
            <Label className="text-xs">Шүүх хуралдааны тов</Label>
            <Input
              type="date"
              className="text-sm"
              value={shuukhKhuraldaanTov}
              onChange={(e) => setShuukhKhuraldaanTov(e.target.value)}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs">Тэмдэглэл</Label>
          <Textarea
            className="min-h-[100px] text-sm"
            value={temdeglel}
            onChange={(e) => setTemdeglel(e.target.value)}
            placeholder="Тэмдэглэл"
          />
        </div>
      </div>

      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <div className="text-xs font-medium text-muted-foreground">Хавсаргасан баримтууд</div>
        <div className="space-y-2">
          {step.documents.length > 0 && (
            <ul className="space-y-2">
              {step.documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  caseId={caseId}
                  stepId={step.id}
                  onUpdate={(updated) =>
                    onStepUpdate({
                      documents: step.documents.map((d) => (d.id === doc.id ? { ...d, ...updated } : d)),
                    })
                  }
                  onRemove={() => removeDocument(doc.id)}
                />
              ))}
            </ul>
          )}
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-muted/30">
            <input
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
              onChange={uploadAndAddDocument}
              disabled={uploadingDoc}
            />
            <svg className="h-10 w-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm text-muted-foreground">
              {uploadingDoc ? "Байршуулж байна…" : "Файл сонгох эсвэл энд чирж хаяна"}
            </span>
            <span className="text-xs text-muted-foreground">Cloudinary дээр хадгалагдана</span>
          </label>
        </div>
        {docError && <p className="text-xs text-destructive">{docError}</p>}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button type="button" size="sm" onClick={handleSaveNote} disabled={savingNote}>
            {savingNote ? "Хадгалж байна…" : "Хадгалах"}
          </Button>
          {saveError && <p className="text-xs text-destructive">{saveError}</p>}
        </div>
      </div>
    </>
  );
}

/** Шинэ нэр; хуучин тэмдэглэл `...татах` parse үед энд татагдана. */
const PROSECUTOR_DECISION_ERUU_TATAH =
  "Эрүүгийн хэрэг үүсгэж яллагдагчаар татах тухай" as const;
const PROSECUTOR_DECISION_ERUU_TATAH_LEGACY =
  "Эрүүгийн хэрэг үүсгэж яллагдагчаар татах" as const;

function normalizeProsecutorEruuDecision(decision: string): string {
  if (decision === PROSECUTOR_DECISION_ERUU_TATAH_LEGACY) return PROSECUTOR_DECISION_ERUU_TATAH;
  return decision;
}

function isProsecutorEruuTatahDecision(decision: string): boolean {
  return (
    decision === PROSECUTOR_DECISION_ERUU_TATAH ||
    decision === PROSECUTOR_DECISION_ERUU_TATAH_LEGACY
  );
}

/** «Хэрэг бүртгэлтийн хэрэг нээхээс татгалзах» — дагах сонголт: зөвхөн «Үгүй» → 10-р алхам хаагдсан; «Хүлээгдэж буй» / «Гомдол гаргах» → 1-р алхам */
const PROSECUTOR_DECISION_DECLINE_OPEN_CASE = "Хэрэг бүртгэлтийн хэрэг нээхээс татгалзах" as const;
const PROSECUTOR_DECISION_DECLINE_OPEN_CASE_FOLLOW_UP_OPTIONS = [
  "Хүлээгдэж буй",
  "Үгүй",
  "Гомдол гаргах",
] as const;

const PROSECUTOR_DECISION_OPTIONS = [
  "Хэрэг бүртгэлтийн хэрэг нээх",
  PROSECUTOR_DECISION_DECLINE_OPEN_CASE,
  "Харьяаллын дагуу шилжүүлэх",
  PROSECUTOR_DECISION_ERUU_TATAH,
] as const;

/** Step 2 (Хэрэг бүртгэлт) prosecutor decision: Ажиллагаатай холбоотой (first 5) */
const PROSECUTOR_DECISION_STEP2_AJILLAGAATAI = [
  "Прокурорын зөвшөөрөл",
  "Прокурорын даалгавар",
  "Прокурорын тогтоол",
  "Сэжигтнийг баривчилсныг хүчинтэйд тооцуулах",
  "Хэрэг бүртгэлийн хугацааг сунгах",
] as const;
/** Step 2: «Хэрэг бүртгэлийн хэргийг хаах» → 10-р алхам, хаагдсан; 3–9 алхмуудыг цурамтгай. */
const PROSECUTOR_DECISION_CLOSE_REGISTRATION_CASE = "Хэрэг бүртгэлийн хэргийг хаах" as const;

/** Step 2: Хэрэг бүртгэлийн хэрэгтэй холбоотой (last 2) */
const PROSECUTOR_DECISION_STEP2_XEREG_BURTGEL = [
  PROSECUTOR_DECISION_CLOSE_REGISTRATION_CASE,
  PROSECUTOR_DECISION_ERUU_TATAH,
] as const;

/** «Хэрэг бүртгэлийн хэргийг хаах» хадгалагдсан алхмын PARTICIPATION_STAGE_VALUES индекс, эсвэл null. Мөрдөн байцаалт эхлээд шалгана (хоёр алхам ижил форм). */
function prosecutionCloseCaseStageIndex(data: CaseDetail): number | null {
  for (const label of ["Мөрдөн байцаалт", "Хэрэг бүртгэлт"] as const) {
    const st = data.steps.find((s) => s.stageLabel === label);
    if (!st?.note?.trim()) continue;
    try {
      const o = JSON.parse(st.note) as { prosecutorDecisionBlocks?: unknown };
      const blocks = o.prosecutorDecisionBlocks;
      if (!Array.isArray(blocks) || blocks.length === 0) continue;
      const last = blocks[blocks.length - 1] as { decision?: unknown };
      if (typeof last?.decision === "string" && last.decision === PROSECUTOR_DECISION_CLOSE_REGISTRATION_CASE) {
        const idx = PARTICIPATION_STAGE_VALUES.indexOf(label);
        return idx >= 0 ? idx : null;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Алхам 8: «Гомдол гаргасан эсэх» = Үгүй + хаах шийдвэрүүд → 10-р шат хаагдсан.
 * Цуваанд зөвхөн 9-р дугуй (Хяналтын шат) цурамтгай, 2–9 хооронд урт зураасгүй.
 */
function isDavjGomdolUgviClosedCase(data: CaseDetail): boolean {
  const closedIdx = PARTICIPATION_STAGE_VALUES.indexOf("Хэрэг хаагдсан");
  const progressIndex = data.caseProgressStepIndex != null ? Number(data.caseProgressStepIndex) : null;
  if (progressIndex !== closedIdx || data.status !== "CLOSED") return false;
  const davjStep = data.steps.find((s) => s.stageLabel === "Давж заалдах шатны шүүх хуралдаан");
  if (!davjStep?.note?.trim() || !isDavjShuukhHuraldaanStructuredNote(davjStep.note)) return false;
  const { fields } = parseDavjShuukhHuraldaanNote(davjStep.note);
  if (fields.davjGomdolGargsanEseh.trim() !== "Үгүй") return false;
  const kh = fields.khuraliinShiidver.trim();
  return davjKhuraliinShiidverProgressWhenGomdolUgvi(kh)?.closeCase === true;
}

/** «Хэрэг хаагдсан» дээр байгаа бөгөөд хяналтын шатны JSON-д хурлын шийдвэр хадгалагдсан — 9→10 төгсөлт, урт хэвтээ цурамгүй */
function isProgressAtStage10AfterHynaltCourtDecision(data: CaseDetail): boolean {
  const endIdx = PARTICIPATION_STAGE_VALUES.indexOf("Хэрэг хаагдсан");
  const progressIndex = data.caseProgressStepIndex != null ? Number(data.caseProgressStepIndex) : null;
  if (progressIndex !== endIdx) return false;
  const hynaltStep = data.steps.find((s) => s.stageLabel === "Хяналтын шатны шүүх хуралдаан");
  if (!hynaltStep?.note?.trim() || !isHynaltShuukhHuraldaanStructuredNote(hynaltStep.note)) return false;
  const { fields } = parseHynaltShuukhHuraldaanNote(hynaltStep.note);
  return fields.khuraliinShiidver.trim() !== "";
}

/**
 * Давж: гомдол «Үгүй» + УХ / анхан шүүх / прокурорт буцаах — `caseProgressStepIndex`-ийн очих индекс.
 * (УХ=5, Анхан=6, Прокурор=3)
 */
function getDavjGomdolUgviReturnProgressIndex(data: CaseDetail): number | null {
  const davjStep = data.steps.find((s) => s.stageLabel === "Давж заалдах шатны шүүх хуралдаан");
  if (!davjStep?.note?.trim() || !isDavjShuukhHuraldaanStructuredNote(davjStep.note)) return null;
  const { fields } = parseDavjShuukhHuraldaanNote(davjStep.note);
  if (fields.davjGomdolGargsanEseh.trim() !== "Үгүй") return null;
  const kh = fields.khuraliinShiidver.trim();
  if (kh === DAVJ_KHRALIIN_SHIIDVER_RETURN_URIDCHILSAN_HELELTSUULEG) {
    return SHUUKH_PROGRESS_URIDCHILSAN_HELELTSUULEG >= 0 ? SHUUKH_PROGRESS_URIDCHILSAN_HELELTSUULEG : null;
  }
  if (
    kh === DAVJ_KHRALIIN_SHIIDVER_RETURN_ANKHAN_SHUUKH_HURALDAAN ||
    kh === DAVJ_KHRALIIN_SHIIDVER_LEGACY_RETURN_ANKHAN_SHUUKH_HURALDAAN
  ) {
    return SHUUKH_PROGRESS_ANKHAN_SHUUKH >= 0 ? SHUUKH_PROGRESS_ANKHAN_SHUUKH : null;
  }
  if (
    kh === DAVJ_KHRALIIN_SHIIDVER_RETURN_PROKUROR ||
    kh === DAVJ_KHRALIIN_SHIIDVER_LEGACY_RETURN_PROKUROR_LONG
  ) {
    return SHUUKH_PROGRESS_PROKUROR_HYANALT >= 0 ? SHUUKH_PROGRESS_PROKUROR_HYANALT : null;
  }
  return null;
}

function getHynaltGomdolUgviReturnProgressIndex(data: CaseDetail): number | null {
  const hynaltStep = data.steps.find((s) => s.stageLabel === "Хяналтын шатны шүүх хуралдаан");
  if (!hynaltStep?.note?.trim() || !isHynaltShuukhHuraldaanStructuredNote(hynaltStep.note)) return null;
  const { fields } = parseHynaltShuukhHuraldaanNote(hynaltStep.note);
  const gomdol = fields.davjGomdolGargsanEseh.trim();
  if (gomdol === "Тийм") return null;
  const kh = fields.khuraliinShiidver.trim();
  if (kh === DAVJ_KHRALIIN_SHIIDVER_RETURN_URIDCHILSAN_HELELTSUULEG) {
    return SHUUKH_PROGRESS_URIDCHILSAN_HELELTSUULEG >= 0 ? SHUUKH_PROGRESS_URIDCHILSAN_HELELTSUULEG : null;
  }
  if (
    kh === DAVJ_KHRALIIN_SHIIDVER_RETURN_ANKHAN_SHUUKH_HURALDAAN ||
    kh === DAVJ_KHRALIIN_SHIIDVER_LEGACY_RETURN_ANKHAN_SHUUKH_HURALDAAN
  ) {
    return SHUUKH_PROGRESS_ANKHAN_SHUUKH >= 0 ? SHUUKH_PROGRESS_ANKHAN_SHUUKH : null;
  }
  if (
    kh === DAVJ_KHRALIIN_SHIIDVER_RETURN_PROKUROR ||
    kh === DAVJ_KHRALIIN_SHIIDVER_LEGACY_RETURN_PROKUROR_LONG
  ) {
    return SHUUKH_PROGRESS_PROKUROR_HYANALT >= 0 ? SHUUKH_PROGRESS_PROKUROR_HYANALT : null;
  }
  return null;
}

/** Урт ↩: давж/хяналтын шатнаас буцах (давж: гомдол «Үгүй»; хяналт: гомдолгүй эсвэл «Үгүй»; 9→8 «буцаах»). */
function getCourtShuukhReturnArrow(
  data: CaseDetail,
  progressIndex: number | null
): { from: number; to: number; ariaLabel: string } | null {
  if (progressIndex == null) return null;

  if (
    SHUUKH_PROGRESS_DAVJ_ZAALDAN >= 0 &&
    SHUUKH_PROGRESS_HYNALT_SHUUKH >= 0 &&
    progressIndex === SHUUKH_PROGRESS_DAVJ_ZAALDAN
  ) {
    const hynaltStep = data.steps.find((s) => s.stageLabel === "Хяналтын шатны шүүх хуралдаан");
    if (hynaltStep?.note?.trim() && isHynaltShuukhHuraldaanStructuredNote(hynaltStep.note)) {
      const { fields } = parseHynaltShuukhHuraldaanNote(hynaltStep.note);
      if (isHynaltKhuraliinShiidverReturnToDavj(fields.khuraliinShiidver)) {
        return {
          from: SHUUKH_PROGRESS_HYNALT_SHUUKH,
          to: SHUUKH_PROGRESS_DAVJ_ZAALDAN,
          ariaLabel:
            "Хяналтын шатны шүүх хуралдаанаас Давж заалдах шатны шүүх хуралдаан руу буцсан",
        };
      }
    }
  }

  const davjTgt = getDavjGomdolUgviReturnProgressIndex(data);
  if (davjTgt != null && progressIndex === davjTgt && SHUUKH_PROGRESS_DAVJ_ZAALDAN >= 0) {
    return {
      from: SHUUKH_PROGRESS_DAVJ_ZAALDAN,
      to: davjTgt,
      ariaLabel:
        davjTgt === SHUUKH_PROGRESS_URIDCHILSAN_HELELTSUULEG
          ? "Давж заалдах шатнаас Урьдчилсан хэлэлцүүлэг рүү буцсан"
          : davjTgt === SHUUKH_PROGRESS_ANKHAN_SHUUKH
            ? "Давж заалдах шатнаас Анхан шатны шүүх хуралдаан рүү буцсан"
            : davjTgt === SHUUKH_PROGRESS_PROKUROR_HYANALT
              ? "Давж заалдах шатнаас Прокурорын хяналт рүү буцсан"
              : "Давж заалдах шатнаас буцсан",
    };
  }

  const hynaltTgt = getHynaltGomdolUgviReturnProgressIndex(data);
  if (hynaltTgt != null && progressIndex === hynaltTgt && SHUUKH_PROGRESS_HYNALT_SHUUKH >= 0) {
    return {
      from: SHUUKH_PROGRESS_HYNALT_SHUUKH,
      to: hynaltTgt,
      ariaLabel:
        hynaltTgt === SHUUKH_PROGRESS_URIDCHILSAN_HELELTSUULEG
          ? "Хяналтын шатнаас Урьдчилсан хэлэлцүүлэг рүү буцсан"
          : hynaltTgt === SHUUKH_PROGRESS_ANKHAN_SHUUKH
            ? "Хяналтын шатнаас Анхан шатны шүүх хуралдаан рүү буцсан"
            : hynaltTgt === SHUUKH_PROGRESS_PROKUROR_HYANALT
              ? "Хяналтын шатнаас Прокурорын хяналт рүү буцсан"
              : "Хяналтын шатнаас буцсан",
    };
  }

  return null;
}

const STEP2_CATEGORY_AJILLAGAATAI = "Ажиллагаатай холбоотой";
const STEP2_CATEGORY_XEREG_BURTGEL = "Хэрэг бүртгэлийн хэрэгтэй холбоотой";

/** Мөрдөн байцаалт (алхам 3) — «Ажиллагаатай холбоотой»-н шийдвэрүүд */
const PROSECUTOR_DECISION_STEP3_AJILLAGAATAI = [
  "Прокурорын зөвшөөрөл",
  "Прокурорын даалгавар",
  "Прокурорын тогтоол",
  "Таслан сэргийлэх арга хэмжээ авах саналыг шүүхэд хүргүүлэх",
  "Яллагдагчийн эд хөрөнгийг битүүмжлэх",
] as const;

/** Мөрдөн байцаалт — «Мөрдөн байцаалтын хэрэгтэй холбоотой» (Таслан сэргийлэх, битүүмжлэхгүй) */
const STEP3_CATEGORY_MOR = "Мөрдөн байцаалтын хэрэгтэй холбоотой" as const;
const PROSECUTOR_DECISION_STEP3_MOR = [
  "Эрүүгийн хэрэг үүсгэж яллагдагчаар татах тухай тогтоолыг хүчингүй болгох",
  "Эрүүгийн хэрэг үүсгэж яллагдагчаар татах тухай тогтоолд өөрчлөлт оруулах",
  "Мөрдөгчөөс хэргийг шүүхэд шилжүүлэх саналтай ирүүлснийг хүлээн авах",
  "Прокурорын зөвшөөрөл",
  "Прокурорын даалгавар",
  "Мөрдөн байцаалтын хугацааг сунгах",
] as const;

/** Мөрдөн байцаалт — хадгалахад алхам 2 (Хэрэг бүртгэлт) руу */
const PROSECUTOR_DECISION_MORDON_BACK_TO_REGISTRATION = PROSECUTOR_DECISION_STEP3_MOR[0];
/** Мөрдөн байцаалт — хадгалахад алхам 4 (Прокурорын хяналт) руу */
const PROSECUTOR_DECISION_MORDON_TO_PROSECUTOR_CONTROL = PROSECUTOR_DECISION_STEP3_MOR[2];

/** Алхам 4 — Прокурорын хяналт: зөвхөн шийдвэр (ангилалгүй) */
const PROSECUTOR_DECISION_STEP4_PROKUROR_CONTROL = [
  "Нэмэлт ажиллагаа хийлгэхээр мөрдөн байцаалтанд буцаах",
  "ЭХҮЯТТ тогтоолыг хүчингүй болгож хэрэг бүртгэлтэнд буцаах",
  "ЭХҮЯТТ тогтоолд өөрчлөлт оруулах",
  "Хэргийн зүйлчлэлийг өөрчлөн дахин мэдүүлэг авхуулах",
  "Хэргийг хялбаршуулсан журмаар шийдвэрлэх",
  "Яллах дүгнэлт үйлдэн хэргийг шүүхэд шилжүүлэх",
] as const;

/** Алхам 4 → буцааж алхам 3 (Мөрдөн байцаалт) */
const PROSECUTOR_DECISION_STEP4_BACK_TO_MORDON = PROSECUTOR_DECISION_STEP4_PROKUROR_CONTROL[0];
/** Алхам 4 → буцааж алхам 2 (Хэрэг бүртгэлт) */
const PROSECUTOR_DECISION_STEP4_BACK_TO_REGISTRATION = PROSECUTOR_DECISION_STEP4_PROKUROR_CONTROL[1];
/** Алхам 4 → алхам 5 (Шүүхэд хэрэг хүргүүлсэн) */
const PROSECUTOR_DECISION_STEP4_TO_COURT_DELIVERED = PROSECUTOR_DECISION_STEP4_PROKUROR_CONTROL[5];

function lastProsecutorDecisionFromStepNote(note: string | null | undefined): string | null {
  if (!note?.trim()) return null;
  try {
    const o = JSON.parse(note) as { prosecutorDecisionBlocks?: unknown };
    const blocks = o.prosecutorDecisionBlocks;
    if (!Array.isArray(blocks) || blocks.length === 0) return null;
    const last = blocks[blocks.length - 1] as { decision?: unknown };
    return typeof last?.decision === "string" ? last.decision : null;
  } catch {
    return null;
  }
}

const PROSECUTOR_DECISION_FOLLOW_UP_OPTIONS = ["Үгүй", "Гомдол гаргах"] as const;

const PROSECUTOR_DECISION_HIDE_FOLLOW_UP = "Харьяаллын дагуу шилжүүлэх";

type ParticipantComplaintFile = { url: string; title: string };

type ParticipantComplaintSection = { note: string; files: ParticipantComplaintFile[] };

type ProsecutorResponseSection = { files: ParticipantComplaintFile[] };

/** Per-level: 1 Оролцогчийн гомдол (note+files) + 1 Хариу мэдэгдэх хуудас (files) */
type ComplaintLevel = {
  participantComplaint: ParticipantComplaintSection;
  prosecutorResponse: ProsecutorResponseSection;
};

type ComplaintLevelKey = "duurgiin" | "niislel" | "ulsynEronhii";

/** One prosecutor decision block; when decision is "Харьяаллын дагуу шилжүүлэх", transferAddress is used; note used in step 2. decisionCategory used in step 2 to show Ажиллагаатай vs Хэрэг бүртгэлийн хэрэгтэй. files: Хэрэг бүртгэлт алхамд прокурорын хэсэгт хавсаргах файл. */
type ProsecutorDecisionBlock = {
  decision: string;
  followUp: string;
  transferAddress: string;
  note: string;
  files: ParticipantComplaintFile[];
  /** Step 2 only: "Ажиллагаатай холбоотой" | "Хэрэг бүртгэлийн хэрэгтэй холбоотой" */
  decisionCategory?: string;
};

/** Step 2: Өмгөөлөгчөөс гаргасан хүсэлт гомдлууд — type (Гомдол/Хүсэлт), note, files */
type OmgoologchHuseltGomdolEntry = {
  type: string;
  note: string;
  files: ParticipantComplaintFile[];
};

type GomdolSections = {
  complaintContent: string;
  investigatorActionIds: string[];
  /** Legacy single decision (parsed into prosecutorDecisionBlocks if blocks missing) */
  prosecutorDecision: string;
  prosecutorDecisionFollowUp: string;
  /** List of decision blocks; last one is current. When last is transfer, save adds a new block. */
  prosecutorDecisionBlocks: ProsecutorDecisionBlock[];
  /** Step 2: attorney requests/complaints */
  omgoologchHuseltGomdol: OmgoologchHuseltGomdolEntry[];
  complaintLevels: {
    duurgiin: ComplaintLevel;
    niislel: ComplaintLevel | null;
    ulsynEronhii: ComplaintLevel | null;
  };
};

function parseParticipantComplaintFiles(v: unknown): ParticipantComplaintFile[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (x): x is ParticipantComplaintFile =>
      x != null && typeof x === "object" && typeof (x as { url?: unknown }).url === "string" && typeof (x as { title?: unknown }).title === "string"
  );
}

function parseParticipantComplaint(v: unknown): ParticipantComplaintSection {
  if (v != null && typeof v === "object" && !Array.isArray(v)) {
    const o = v as { note?: unknown; files?: unknown };
    return {
      note: typeof o.note === "string" ? o.note : "",
      files: parseParticipantComplaintFiles(o.files),
    };
  }
  if (Array.isArray(v)) return { note: "", files: parseParticipantComplaintFiles(v) };
  return { note: "", files: [] };
}

function parseProsecutorResponse(v: unknown): ProsecutorResponseSection {
  if (v != null && typeof v === "object" && !Array.isArray(v)) {
    const o = v as { files?: unknown };
    return { files: parseParticipantComplaintFiles(o.files) };
  }
  if (Array.isArray(v)) return { files: parseParticipantComplaintFiles(v) };
  return { files: [] };
}

const defaultComplaintLevel = (): ComplaintLevel => ({
  participantComplaint: { note: "", files: [] },
  prosecutorResponse: { files: [] },
});

function parseComplaintLevel(v: unknown): ComplaintLevel {
  if (v != null && typeof v === "object" && !Array.isArray(v)) {
    const o = v as { participantComplaint?: unknown; participantComplaint1?: unknown; prosecutorResponse?: unknown };
    const single = o.participantComplaint != null ? parseParticipantComplaint(o.participantComplaint) : parseParticipantComplaint(o.participantComplaint1);
    return {
      participantComplaint: single,
      prosecutorResponse: parseProsecutorResponse(o.prosecutorResponse),
    };
  }
  return defaultComplaintLevel();
}

function parseGomdolNote(note: string | null): GomdolSections {
  const defaultLevels = {
    duurgiin: defaultComplaintLevel(),
    niislel: null as ComplaintLevel | null,
    ulsynEronhii: null as ComplaintLevel | null,
  };
  const oneBlock = (): ProsecutorDecisionBlock[] => [
    { decision: "", followUp: "", transferAddress: "", note: "", files: [] },
  ];
  const oneOmgoologch = (): OmgoologchHuseltGomdolEntry[] => [{ type: "", note: "", files: [] }];
  const empty: GomdolSections = {
    complaintContent: "",
    investigatorActionIds: [],
    prosecutorDecision: "",
    prosecutorDecisionFollowUp: "",
    prosecutorDecisionBlocks: oneBlock(),
    omgoologchHuseltGomdol: oneOmgoologch(),
    complaintLevels: { ...defaultLevels, duurgiin: defaultComplaintLevel() },
  };
  if (!note?.trim()) return empty;
  try {
    const o = JSON.parse(note) as Record<string, unknown>;
    if (o.kind === PROKUROR_HYANGAL_NOTE_KIND) {
      const sa = typeof o.supervisionActivities === "string" ? o.supervisionActivities.trim() : "";
      const rc = typeof o.requirementsAndConclusion === "string" ? o.requirementsAndConclusion.trim() : "";
      const noteMerged = [
        sa ? `Хяналтын ажиллагаа, тэмдэглэл: ${sa}` : "",
        rc ? `Шаардлага, дүгнэлт: ${rc}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      return {
        ...empty,
        prosecutorDecisionBlocks: [
          {
            decision: "",
            followUp: "",
            transferAddress: "",
            note: noteMerged,
            files: [],
          },
        ],
      };
    }
    const ids = o.investigatorActionIds;
    let complaintLevels = empty.complaintLevels;
    if (o.complaintLevels != null && typeof o.complaintLevels === "object" && !Array.isArray(o.complaintLevels)) {
      const cl = o.complaintLevels as Record<string, unknown>;
      complaintLevels = {
        duurgiin: parseComplaintLevel(cl.duurgiin),
        niislel: cl.niislel != null ? parseComplaintLevel(cl.niislel) : null,
        ulsynEronhii: cl.ulsynEronhii != null ? parseComplaintLevel(cl.ulsynEronhii) : null,
      };
    } else {
      complaintLevels = {
        duurgiin: {
          participantComplaint: parseParticipantComplaint(o.participantComplaint),
          prosecutorResponse: parseProsecutorResponse(o.prosecutorResponse),
        },
        niislel: null,
        ulsynEronhii: null,
      };
    }
    let blocks = empty.prosecutorDecisionBlocks;
    if (Array.isArray(o.prosecutorDecisionBlocks) && o.prosecutorDecisionBlocks.length > 0) {
      blocks = (o.prosecutorDecisionBlocks as unknown[]).map((b) => {
        if (b != null && typeof b === "object") {
          const x = b as {
            decision?: unknown;
            followUp?: unknown;
            transferAddress?: unknown;
            note?: unknown;
            decisionCategory?: unknown;
            files?: unknown;
          };
          return {
            decision: normalizeProsecutorEruuDecision(typeof x.decision === "string" ? x.decision : ""),
            followUp: typeof x.followUp === "string" ? x.followUp : "",
            transferAddress: typeof x.transferAddress === "string" ? x.transferAddress : "",
            note: typeof x.note === "string" ? x.note : "",
            files: parseParticipantComplaintFiles(x.files),
            decisionCategory: typeof x.decisionCategory === "string" ? x.decisionCategory : undefined,
          };
        }
        return { decision: "", followUp: "", transferAddress: "", note: "", files: [] };
      });
    } else {
      blocks = [
        {
          decision: normalizeProsecutorEruuDecision(
            typeof o.prosecutorDecision === "string" ? o.prosecutorDecision : ""
          ),
          followUp: typeof o.prosecutorDecisionFollowUp === "string" ? o.prosecutorDecisionFollowUp : "",
          transferAddress: "",
          note: "",
          files: [],
        },
      ];
    }
    let omgoologchHuseltGomdol = oneOmgoologch();
    if (Array.isArray(o.omgoologchHuseltGomdol) && o.omgoologchHuseltGomdol.length > 0) {
      omgoologchHuseltGomdol = (o.omgoologchHuseltGomdol as unknown[]).map((e) => {
        if (e != null && typeof e === "object") {
          const x = e as { type?: unknown; note?: unknown; files?: unknown };
          const files = Array.isArray(x.files)
            ? (x.files as unknown[]).map((f) => {
                if (f != null && typeof f === "object") {
                  const y = f as { url?: unknown; title?: unknown };
                  return {
                    url: typeof y.url === "string" ? y.url : "",
                    title: typeof y.title === "string" ? y.title : "",
                  };
                }
                return { url: "", title: "" };
              })
            : [];
          return {
            type: typeof x.type === "string" ? x.type : "",
            note: typeof x.note === "string" ? x.note : "",
            files,
          };
        }
        return { type: "", note: "", files: [] };
      });
    }
    return {
      complaintContent: typeof o.complaintContent === "string" ? o.complaintContent : "",
      investigatorActionIds: Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [],
      prosecutorDecision: blocks[blocks.length - 1]?.decision ?? "",
      prosecutorDecisionFollowUp: blocks[blocks.length - 1]?.followUp ?? "",
      prosecutorDecisionBlocks: blocks,
      omgoologchHuseltGomdol,
      complaintLevels,
    };
  } catch {
    return empty;
  }
}

type InvestigatorActionTypeItem = { id: string; name: string; order: number };

function ComplaintFilesBlock({
  files,
  uploading,
  uploadError,
  onUpload,
  onRemoveFile,
  onFileTitle,
}: {
  level: ComplaintLevelKey;
  files: ParticipantComplaintFile[];
  uploading: boolean;
  uploadError: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (i: number) => void;
  onFileTitle: (i: number, t: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-input bg-muted/10 px-3 py-3">
      <p className="text-xs text-muted-foreground">Файл оруулна уу. Cloudinary дээр хадгалагдана.</p>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background px-4 py-5 text-center transition-colors hover:border-primary/40 hover:bg-muted/20">
        <input
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
          onChange={onUpload}
          disabled={uploading}
        />
        <svg className="h-9 w-9 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span className="text-sm text-foreground">
          {uploading ? "Байршуулж байна…" : "Файл сонгох эсвэл энд чирж хаяна"}
        </span>
      </label>
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, idx) => (
            <li key={idx} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <Input
                className="min-w-0 flex-1 text-sm"
                value={f.title}
                onChange={(e) => onFileTitle(idx, e.target.value)}
                placeholder="Файлын нэр"
              />
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline shrink-0">
                Нээх
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                onClick={() => onRemoveFile(idx)}
                aria-label="Устгах"
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
      )}
      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
    </div>
  );
}

function ResponseFilesBlock({
  files,
  uploading,
  uploadError,
  onUpload,
  onRemoveFile,
  onFileTitle,
}: {
  level: ComplaintLevelKey;
  files: ParticipantComplaintFile[];
  uploading: boolean;
  uploadError: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (i: number) => void;
  onFileTitle: (i: number, t: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-input bg-muted/10 px-3 py-3">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background px-4 py-5 text-center transition-colors hover:border-primary/40 hover:bg-muted/20">
        <input
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
          onChange={onUpload}
          disabled={uploading}
        />
        <svg className="h-9 w-9 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span className="text-sm text-foreground">
          {uploading ? "Байршуулж байна…" : "Файл сонгох эсвэл энд чирж хаяна"}
        </span>
      </label>
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, idx) => (
            <li key={idx} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <Input
                className="min-w-0 flex-1 text-sm"
                value={f.title}
                onChange={(e) => onFileTitle(idx, e.target.value)}
                placeholder="Файлын нэр"
              />
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline shrink-0">
                Нээх
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                onClick={() => onRemoveFile(idx)}
                aria-label="Устгах"
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
      )}
      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
    </div>
  );
}

function GomdolMedeelelContent({
  step,
  caseId,
  onStepUpdate,
  onAfterProgressToStep,
  reloadCase,
}: {
  step: CaseStep;
  caseId: string;
  onStepUpdate: (updated: Partial<CaseStep>) => void;
  onAfterProgressToStep?: (stepIndex: number) => void;
  reloadCase?: () => void;
}) {
  const [sections, setSections] = useState<GomdolSections>(() => parseGomdolNote(step.note));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [openAddList, setOpenAddList] = useState(false);
  const [investigatorActionTypes, setInvestigatorActionTypes] = useState<InvestigatorActionTypeItem[]>([]);
  const [uploadingParticipant, setUploadingParticipant] = useState<ComplaintLevelKey | null>(null);
  const [participantComplaintUploadError, setParticipantComplaintUploadError] = useState("");
  const [uploadingProsecutorResponse, setUploadingProsecutorResponse] = useState<ComplaintLevelKey | null>(null);
  const [prosecutorResponseUploadError, setProsecutorResponseUploadError] = useState("");
  const [duurgiinExpanded, setDuurgiinExpanded] = useState(true);

  // Sync sections when step.note changes (e.g. after parent update or tab switch)
  useEffect(() => {
    setSections(parseGomdolNote(step.note));
  }, [step.id, step.note]);

  useEffect(() => {
    fetch("/api/investigator-action-types")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setInvestigatorActionTypes(data))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!caseId || !step?.id) return;
    setSaveError(null);
    setSaving(true);
    try {
      const blocks = sections.prosecutorDecisionBlocks;
      const lastBlock = blocks[blocks.length - 1];
      const isTransfer = lastBlock?.decision === PROSECUTOR_DECISION_HIDE_FOLLOW_UP;

      let payload: GomdolSections = { ...sections };
      if (isTransfer) {
        payload = {
          ...sections,
          prosecutorDecisionBlocks: [
            ...blocks,
            { decision: "", followUp: "", transferAddress: "", note: "", files: [] },
          ],
        };
      }

      const res = await fetch(`/api/cases/${caseId}/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: JSON.stringify(payload) }),
      });
      const updated = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(typeof updated?.error === "string" ? updated.error : "Хадгалахад алдаа гарлаа");
        return;
      }
      onStepUpdate({ note: updated.note ?? null });

      if (isTransfer) {
        reloadCase?.();
        return;
      }

      const decision = lastBlock?.decision ?? "";
      const followUp = lastBlock?.followUp ?? "";
      const openCaseCombo = decision === "Хэрэг бүртгэлтийн хэрэг нээх";
      if (openCaseCombo) {
        const progressRes = await fetch(`/api/cases/${caseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseProgressStepIndex: 1 }),
        });
        if (progressRes.ok) {
          reloadCase?.();
          onAfterProgressToStep?.(1);
        }
      }
      const eruuCombo = isProsecutorEruuTatahDecision(decision);
      if (eruuCombo) {
        const progressRes = await fetch(`/api/cases/${caseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseProgressStepIndex: 2 }),
        });
        if (progressRes.ok) {
          reloadCase?.();
          onAfterProgressToStep?.(2);
        }
      }
      const declineCloseCombo =
        decision === PROSECUTOR_DECISION_DECLINE_OPEN_CASE && followUp === "Үгүй";
      const declineStayStep1Combo =
        decision === PROSECUTOR_DECISION_DECLINE_OPEN_CASE &&
        (followUp === "Хүлээгдэж буй" || followUp === "Гомдол гаргах");
      if (declineCloseCombo) {
        const closeRes = await fetch(`/api/cases/${caseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseProgressStepIndex: 9, status: "CLOSED" }),
        });
        const closeData = await closeRes.json().catch(() => ({}));
        if (!closeRes.ok) {
          setSaveError(typeof closeData?.error === "string" ? closeData.error : "Хэргийг хаах үед алдаа гарлаа");
          return;
        }
        reloadCase?.();
        onAfterProgressToStep?.(9);
      } else if (declineStayStep1Combo) {
        const stayRes = await fetch(`/api/cases/${caseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseProgressStepIndex: 0, status: "IN_PROGRESS" }),
        });
        if (stayRes.ok) {
          reloadCase?.();
          onAfterProgressToStep?.(0);
        }
      }
    } catch (err) {
      setSaveError("Хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const addInvestigatorAction = (id: string) => {
    if (sections.investigatorActionIds.includes(id)) return;
    setSections((prev) => ({
      ...prev,
      investigatorActionIds: [...prev.investigatorActionIds, id],
    }));
    setOpenAddList(false);
  };

  const removeInvestigatorAction = (id: string) => {
    setSections((prev) => ({
      ...prev,
      investigatorActionIds: prev.investigatorActionIds.filter((x) => x !== id),
    }));
  };

  const uploadParticipantComplaintFiles = async (level: ComplaintLevelKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setParticipantComplaintUploadError("");
    setUploadingParticipant(level);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      const res = await fetch("/api/upload/cloudinary", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setParticipantComplaintUploadError(data.error || "Файл байршуулахад алдаа гарлаа");
        return;
      }
      const newFiles = (data.uploads || []).map(
        (u: { url: string; title?: string }) => ({ url: u.url, title: u.title || "Файл" })
      );
      setSections((prev) => {
        const levelData = prev.complaintLevels[level];
        if (!levelData) return prev;
        const section = levelData.participantComplaint;
        return {
          ...prev,
          complaintLevels: {
            ...prev.complaintLevels,
            [level]: {
              ...levelData,
              participantComplaint: { ...section, files: [...section.files, ...newFiles] },
            },
          },
        };
      });
    } finally {
      setUploadingParticipant(null);
      e.target.value = "";
    }
  };

  const removeParticipantComplaintFile = (level: ComplaintLevelKey, fileIndex: number) => {
    setSections((prev) => {
      const levelData = prev.complaintLevels[level];
      if (!levelData) return prev;
      const section = levelData.participantComplaint;
      return {
        ...prev,
        complaintLevels: {
          ...prev.complaintLevels,
          [level]: {
            ...levelData,
            participantComplaint: { ...section, files: section.files.filter((_, i) => i !== fileIndex) },
          },
        },
      };
    });
  };

  const setParticipantComplaintFileTitle = (level: ComplaintLevelKey, fileIndex: number, title: string) => {
    setSections((prev) => {
      const levelData = prev.complaintLevels[level];
      if (!levelData) return prev;
      const section = levelData.participantComplaint;
      return {
        ...prev,
        complaintLevels: {
          ...prev.complaintLevels,
          [level]: {
            ...levelData,
            participantComplaint: {
              ...section,
              files: section.files.map((f, i) => (i === fileIndex ? { ...f, title } : f)),
            },
          },
        },
      };
    });
  };

  const uploadProsecutorResponseFiles = async (level: ComplaintLevelKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setProsecutorResponseUploadError("");
    setUploadingProsecutorResponse(level);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      const res = await fetch("/api/upload/cloudinary", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setProsecutorResponseUploadError(data.error || "Файл байршуулахад алдаа гарлаа");
        return;
      }
      const newFiles = (data.uploads || []).map(
        (u: { url: string; title?: string }) => ({ url: u.url, title: u.title || "Файл" })
      );
      setSections((prev) => {
        const levelData = prev.complaintLevels[level];
        if (!levelData) return prev;
        return {
          ...prev,
          complaintLevels: {
            ...prev.complaintLevels,
            [level]: {
              ...levelData,
              prosecutorResponse: {
                ...levelData.prosecutorResponse,
                files: [...levelData.prosecutorResponse.files, ...newFiles],
              },
            },
          },
        };
      });
    } finally {
      setUploadingProsecutorResponse(null);
      e.target.value = "";
    }
  };

  const removeProsecutorResponseFile = (level: ComplaintLevelKey, fileIndex: number) => {
    setSections((prev) => {
      const levelData = prev.complaintLevels[level];
      if (!levelData) return prev;
      return {
        ...prev,
        complaintLevels: {
          ...prev.complaintLevels,
          [level]: {
            ...levelData,
            prosecutorResponse: {
              ...levelData.prosecutorResponse,
              files: levelData.prosecutorResponse.files.filter((_, i) => i !== fileIndex),
            },
          },
        },
      };
    });
  };

  const setProsecutorResponseFileTitle = (level: ComplaintLevelKey, fileIndex: number, title: string) => {
    setSections((prev) => {
      const levelData = prev.complaintLevels[level];
      if (!levelData) return prev;
      return {
        ...prev,
        complaintLevels: {
          ...prev.complaintLevels,
          [level]: {
            ...levelData,
            prosecutorResponse: {
              ...levelData.prosecutorResponse,
              files: levelData.prosecutorResponse.files.map((f, i) => (i === fileIndex ? { ...f, title } : f)),
            },
          },
        },
      };
    });
  };

  const addComplaintLevel = (level: "niislel" | "ulsynEronhii") => {
    setSections((prev) => ({
      ...prev,
      complaintLevels: {
        ...prev.complaintLevels,
        [level]: defaultComplaintLevel(),
      },
    }));
  };

  const removeComplaintLevel = (level: "niislel" | "ulsynEronhii") => {
    setSections((prev) => ({
      ...prev,
      complaintLevels: {
        ...prev.complaintLevels,
        [level]: null,
      },
    }));
  };

  const availableToAdd = investigatorActionTypes.filter(
    (item) => !sections.investigatorActionIds.includes(item.id)
  );
  const selectedItems = investigatorActionTypes.filter((item) =>
    sections.investigatorActionIds.includes(item.id)
  );

  return (
    <div className="space-y-6">
      {/* 1. Гомдолын агуулга */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Гомдолын агуулга</Label>
        <textarea
          value={sections.complaintContent}
          onChange={(e) => setSections((prev) => ({ ...prev, complaintContent: e.target.value }))}
          rows={4}
          className={cn(
            "w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
          placeholder="Гомдолын агуулга оруулах…"
        />
      </div>

      {/* 2. Мөрдөгчийн ажиллагаа — add via + icon, list picker */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Мөрдөгчийн ажиллагаа</Label>
        <div className="rounded-lg border border-input bg-muted/10 px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {selectedItems.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-sm text-foreground"
              >
                {item.name}
                <button
                  type="button"
                  onClick={() => removeInvestigatorAction(item.id)}
                  className="rounded p-0.5 hover:bg-primary/20"
                  aria-label="Устгах"
                >
                  ×
                </button>
              </span>
            ))}
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setOpenAddList((v) => !v)}
                title="Мөрдөгчийн ажиллагаа нэмэх"
              >
                <Plus className="size-4" />
              </Button>
              {openAddList && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden
                    onClick={() => setOpenAddList(false)}
                  />
                  <div className="absolute left-0 top-full z-20 mt-1 max-h-56 min-w-[200px] overflow-auto rounded-md border border-border bg-popover py-1 shadow-md">
                    {availableToAdd.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-muted-foreground">
                        {investigatorActionTypes.length === 0
                          ? "Мөрдөгчийн ажиллагааны төрөл байхгүй. Цэснээс нэмнэ үү."
                          : "Бүгд нэмэгдсэн."}
                      </p>
                    ) : (
                      availableToAdd.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => addInvestigatorAction(item.id)}
                        >
                          {item.name}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Прокурорын шийдвэр — multiple blocks; when "Харьяаллын дагуу шилжүүлэх" show address input, save adds new block */}
      {sections.prosecutorDecisionBlocks.map((block, blockIndex) => {
        const isLast = blockIndex === sections.prosecutorDecisionBlocks.length - 1;
        const isTransfer = block.decision === PROSECUTOR_DECISION_HIDE_FOLLOW_UP;
        return (
          <div key={blockIndex} className="space-y-2 rounded-lg border border-border bg-muted/10 p-4">
            <Label className="text-sm font-medium">
              Прокурорын шийдвэр{sections.prosecutorDecisionBlocks.length > 1 ? ` (${blockIndex + 1})` : ""}
            </Label>
            {!isLast ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">{block.decision || "—"}</p>
                {isTransfer && block.transferAddress && (
                  <p className="text-muted-foreground">Шилжүүлсэн харьяалал: {block.transferAddress}</p>
                )}
                {block.files && block.files.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-border/60 pt-2">
                    {block.files.map((f, fi) => (
                      <li key={`${f.url}-${fi}`}>
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary underline underline-offset-2"
                        >
                          {f.title || "Файл"}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-3">
                  <Select
                    value={block.decision || "none"}
                    onValueChange={(v) =>
                      setSections((prev) => {
                        const next = [...prev.prosecutorDecisionBlocks];
                        next[blockIndex] = { ...next[blockIndex], decision: v === "none" || v == null ? "" : v };
                        return { ...prev, prosecutorDecisionBlocks: next };
                      })
                    }
                  >
                    <SelectTrigger className="w-full min-w-[min(100%,20rem)] max-w-4xl">
                      <SelectValue placeholder="Сонгох" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Сонгох —</SelectItem>
                      {PROSECUTOR_DECISION_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {block.decision && block.decision !== PROSECUTOR_DECISION_HIDE_FOLLOW_UP && (
                    <Select
                      value={block.followUp || "none"}
                      onValueChange={(v) =>
                        setSections((prev) => {
                          const next = [...prev.prosecutorDecisionBlocks];
                          next[blockIndex] = { ...next[blockIndex], followUp: v === "none" || v == null ? "" : v };
                          return { ...prev, prosecutorDecisionBlocks: next };
                        })
                      }
                    >
                      <SelectTrigger className="w-full min-w-[min(100%,12rem)] max-w-3xl">
                        <SelectValue placeholder="Сонгох" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Сонгох —</SelectItem>
                        {(block.decision === PROSECUTOR_DECISION_DECLINE_OPEN_CASE
                          ? PROSECUTOR_DECISION_DECLINE_OPEN_CASE_FOLLOW_UP_OPTIONS
                          : PROSECUTOR_DECISION_FOLLOW_UP_OPTIONS
                        ).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {isTransfer && (
                  <div className="space-y-1 pt-2">
                    <Label className="text-xs text-muted-foreground">Шилжүүлсэн харьяалал (шинэ хаяг)</Label>
                    <Input
                      value={block.transferAddress}
                      onChange={(e) =>
                        setSections((prev) => {
                          const next = [...prev.prosecutorDecisionBlocks];
                          next[blockIndex] = { ...next[blockIndex], transferAddress: e.target.value };
                          return { ...prev, prosecutorDecisionBlocks: next };
                        })
                      }
                      placeholder="Харьяалал / хаяг оруулах..."
                      className="max-w-md"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
      {(() => {
        const lastBlock = sections.prosecutorDecisionBlocks[sections.prosecutorDecisionBlocks.length - 1];
        return lastBlock?.followUp === "Гомдол гаргах";
      })() && (
        <div className="space-y-6">
          {/* Level 1: Дүүргийн прокурорын шат — shrinkable */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <button
              type="button"
              onClick={() => setDuurgiinExpanded((v) => !v)}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                duurgiinExpanded ? "rounded-t-xl" : "rounded-xl"
              )}
              aria-expanded={duurgiinExpanded}
            >
              <h4 className="text-sm font-semibold text-foreground">Дүүргийн прокурорын шат</h4>
              {duurgiinExpanded ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
            </button>
            {duurgiinExpanded && (
            <div className="space-y-4 border-t border-border px-4 pt-4 pb-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Оролцогчийн гомдол</Label>
                <textarea
                  value={sections.complaintLevels.duurgiin.participantComplaint.note}
                  onChange={(e) =>
                    setSections((prev) => ({
                      ...prev,
                      complaintLevels: {
                        ...prev.complaintLevels,
                        duurgiin: {
                          ...prev.complaintLevels.duurgiin,
                          participantComplaint: { ...prev.complaintLevels.duurgiin.participantComplaint, note: e.target.value },
                        },
                      },
                    }))
                  }
                  rows={2}
                  className={cn(
                    "w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
                  )}
                  placeholder="Тэмдэглэл оруулах…"
                />
                <ComplaintFilesBlock
                  level="duurgiin"
                  files={sections.complaintLevels.duurgiin.participantComplaint.files}
                  uploading={uploadingParticipant === "duurgiin"}
                  uploadError={participantComplaintUploadError}
                  onUpload={(ev) => uploadParticipantComplaintFiles("duurgiin", ev)}
                  onRemoveFile={(i) => removeParticipantComplaintFile("duurgiin", i)}
                  onFileTitle={(i, t) => setParticipantComplaintFileTitle("duurgiin", i, t)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Хариу мэдэгдэх хуудас</Label>
                <p className="text-xs text-muted-foreground">Файл оруулна уу. Cloudinary дээр хадгалагдана.</p>
                <ResponseFilesBlock
                  level="duurgiin"
                  files={sections.complaintLevels.duurgiin.prosecutorResponse.files}
                  uploading={uploadingProsecutorResponse === "duurgiin"}
                  uploadError={prosecutorResponseUploadError}
                  onUpload={(ev) => uploadProsecutorResponseFiles("duurgiin", ev)}
                  onRemoveFile={(i) => removeProsecutorResponseFile("duurgiin", i)}
                  onFileTitle={(i, t) => setProsecutorResponseFileTitle("duurgiin", i, t)}
                />
              </div>
            </div>
            )}
          </div>

          {/* Level 2: Нийслэлд гомдол — optional */}
          {sections.complaintLevels.niislel === null ? (
            <button
              type="button"
              onClick={() => addComplaintLevel("niislel")}
              className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-primary/10"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Аль нэг тал нийслэлд гомдол гаргасан — энд дарж нэмнэ үү
            </button>
          ) : (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Нийслэлд гомдол гаргасан</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeComplaintLevel("niislel")}
                >
                  Хэсгийг хасах
                </Button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Оролцогчийн гомдол</Label>
                  <textarea
                    value={sections.complaintLevels.niislel.participantComplaint.note}
                    onChange={(e) =>
                      setSections((prev) => ({
                        ...prev,
                        complaintLevels: {
                          ...prev.complaintLevels,
                          niislel: prev.complaintLevels.niislel
                            ? {
                                ...prev.complaintLevels.niislel,
                                participantComplaint: { ...prev.complaintLevels.niislel!.participantComplaint, note: e.target.value },
                              }
                            : null,
                        },
                      }))
                    }
                    rows={2}
                    className={cn(
                      "w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
                    )}
                    placeholder="Тэмдэглэл оруулах…"
                  />
                  <ComplaintFilesBlock
                    level="niislel"
                    files={sections.complaintLevels.niislel.participantComplaint.files}
                    uploading={uploadingParticipant === "niislel"}
                    uploadError={participantComplaintUploadError}
                    onUpload={(ev) => uploadParticipantComplaintFiles("niislel", ev)}
                    onRemoveFile={(i) => removeParticipantComplaintFile("niislel", i)}
                    onFileTitle={(i, t) => setParticipantComplaintFileTitle("niislel", i, t)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Хариу мэдэгдэх хуудас</Label>
                  <ResponseFilesBlock
                    level="niislel"
                    files={sections.complaintLevels.niislel.prosecutorResponse.files}
                    uploading={uploadingProsecutorResponse === "niislel"}
                    uploadError={prosecutorResponseUploadError}
                    onUpload={(ev) => uploadProsecutorResponseFiles("niislel", ev)}
                    onRemoveFile={(i) => removeProsecutorResponseFile("niislel", i)}
                    onFileTitle={(i, t) => setProsecutorResponseFileTitle("niislel", i, t)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Level 3: Улсын ерөнхийд гомдол — optional */}
          {sections.complaintLevels.ulsynEronhii === null ? (
            <button
              type="button"
              onClick={() => addComplaintLevel("ulsynEronhii")}
              className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-primary/10"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Улсын ерөнхийд гомдол гаргасан — энд дарж нэмнэ үү
            </button>
          ) : (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Улсын ерөнхийд гомдол гаргасан</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeComplaintLevel("ulsynEronhii")}
                >
                  Хэсгийг хасах
                </Button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Оролцогчийн гомдол</Label>
                  <textarea
                    value={sections.complaintLevels.ulsynEronhii.participantComplaint.note}
                    onChange={(e) =>
                      setSections((prev) => ({
                        ...prev,
                        complaintLevels: {
                          ...prev.complaintLevels,
                          ulsynEronhii: prev.complaintLevels.ulsynEronhii
                            ? {
                                ...prev.complaintLevels.ulsynEronhii,
                                participantComplaint: { ...prev.complaintLevels.ulsynEronhii!.participantComplaint, note: e.target.value },
                              }
                            : null,
                        },
                      }))
                    }
                    rows={2}
                    className={cn(
                      "w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
                    )}
                    placeholder="Тэмдэглэл оруулах…"
                  />
                  <ComplaintFilesBlock
                    level="ulsynEronhii"
                    files={sections.complaintLevels.ulsynEronhii.participantComplaint.files}
                    uploading={uploadingParticipant === "ulsynEronhii"}
                    uploadError={participantComplaintUploadError}
                    onUpload={(ev) => uploadParticipantComplaintFiles("ulsynEronhii", ev)}
                    onRemoveFile={(i) => removeParticipantComplaintFile("ulsynEronhii", i)}
                    onFileTitle={(i, t) => setParticipantComplaintFileTitle("ulsynEronhii", i, t)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Хариу мэдэгдэх хуудас</Label>
                  <ResponseFilesBlock
                    level="ulsynEronhii"
                    files={sections.complaintLevels.ulsynEronhii.prosecutorResponse.files}
                    uploading={uploadingProsecutorResponse === "ulsynEronhii"}
                    uploadError={prosecutorResponseUploadError}
                    onUpload={(ev) => uploadProsecutorResponseFiles("ulsynEronhii", ev)}
                    onRemoveFile={(i) => removeProsecutorResponseFile("ulsynEronhii", i)}
                    onFileTitle={(i, t) => setProsecutorResponseFileTitle("ulsynEronhii", i, t)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={handleSave} disabled={saving} size="sm">
          {saving ? "Хадгалж байна…" : "Хадгалах"}
        </Button>
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
      </div>
    </div>
  );
}

/** Хэрэг бүртгэлт, Мөрдөн байцаалт, Прокурорын хяналт: ижил форм (алхам 2 ба 4 = бүртгэлийн ангилал; алхам 3 = мөрдөгчийн). */
function XeregBurtgelStepContent({
  step,
  caseId,
  onStepUpdate,
  onAfterProgressToStep,
  reloadCase,
}: {
  step: CaseStep;
  caseId: string;
  onStepUpdate: (updated: Partial<CaseStep>) => void;
  onAfterProgressToStep?: (stepIndex: number) => void;
  reloadCase?: () => void;
}) {
  const isMordonBurtgelStep = step.stageLabel === "Мөрдөн байцаалт";
  /** Алхам 4 — Прокурорын хяналт: тусгай шийдвэрүүд, мөрдөгчийн ажиллагаа байхгүй */
  const isProkurorHyanaltStep = step.stageLabel === "Прокурорын хяналт";
  const hideInvestigatorActions = isProkurorHyanaltStep;
  const [sections, setSections] = useState<GomdolSections>(() => parseGomdolNote(step.note));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [openAddList, setOpenAddList] = useState(false);
  const [investigatorActionTypes, setInvestigatorActionTypes] = useState<InvestigatorActionTypeItem[]>([]);
  const [uploadingOmgoologch, setUploadingOmgoologch] = useState(false);
  const [uploadErrorOmgoologch, setUploadErrorOmgoologch] = useState("");
  const [uploadingProsecutorBlockIndex, setUploadingProsecutorBlockIndex] = useState<number | null>(null);
  const [uploadErrorProsecutor, setUploadErrorProsecutor] = useState("");

  useEffect(() => {
    const parsed = parseGomdolNote(step.note);
    const stripInvestigatorIds = step.stageLabel === "Прокурорын хяналт";
    setSections(
      stripInvestigatorIds ? { ...parsed, investigatorActionIds: [] } : parsed
    );
  }, [step.id, step.note, step.stageLabel]);

  useEffect(() => {
    if (step.stageLabel === "Прокурорын хяналт") return;
    fetch("/api/investigator-action-types")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setInvestigatorActionTypes(data))
      .catch(() => {});
  }, [step.stageLabel]);

  const uploadProsecutorBlockFiles = async (blockIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadErrorProsecutor("");
    setUploadingProsecutorBlockIndex(blockIndex);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) formData.append("files", files[i]);
      const res = await fetch("/api/upload/cloudinary", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadErrorProsecutor((data.error as string) || "Файл байршуулахад алдаа гарлаа");
        return;
      }
      const newFiles = (data.uploads || []).map(
        (u: { url: string; title?: string }) => ({ url: u.url, title: u.title || "Файл" })
      );
      setSections((prev) => {
        const next = [...prev.prosecutorDecisionBlocks];
        const cur = next[blockIndex];
        if (!cur) return prev;
        next[blockIndex] = { ...cur, files: [...(cur.files ?? []), ...newFiles] };
        return { ...prev, prosecutorDecisionBlocks: next };
      });
    } finally {
      setUploadingProsecutorBlockIndex(null);
      e.target.value = "";
    }
  };

  const removeProsecutorBlockFile = (blockIndex: number, fileIndex: number) => {
    setSections((prev) => {
      const next = [...prev.prosecutorDecisionBlocks];
      const cur = next[blockIndex];
      if (!cur) return prev;
      next[blockIndex] = { ...cur, files: cur.files.filter((_, i) => i !== fileIndex) };
      return { ...prev, prosecutorDecisionBlocks: next };
    });
  };

  const setProsecutorBlockFileTitle = (blockIndex: number, fileIndex: number, title: string) => {
    setSections((prev) => {
      const next = [...prev.prosecutorDecisionBlocks];
      const cur = next[blockIndex];
      if (!cur) return prev;
      next[blockIndex] = {
        ...cur,
        files: cur.files.map((f, i) => (i === fileIndex ? { ...f, title } : f)),
      };
      return { ...prev, prosecutorDecisionBlocks: next };
    });
  };

  const uploadOmgoologchFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadErrorOmgoologch("");
    setUploadingOmgoologch(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) formData.append("files", files[i]);
      const res = await fetch("/api/upload/cloudinary", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadErrorOmgoologch((data.error as string) || "Файл байршуулахад алдаа гарлаа");
        return;
      }
      const newFiles = (data.uploads || []).map(
        (u: { url: string; title?: string }) => ({ url: u.url, title: u.title || "Файл" })
      );
      setSections((prev) => {
        const list = prev.omgoologchHuseltGomdol ?? [];
        const first = list[0] ?? { type: "", note: "", files: [] };
        const nextList = [{ ...first, files: [...first.files, ...newFiles] }, ...list.slice(1)];
        return { ...prev, omgoologchHuseltGomdol: nextList };
      });
    } finally {
      setUploadingOmgoologch(false);
      e.target.value = "";
    }
  };

  const removeOmgoologchFile = (fileIndex: number) => {
    setSections((prev) => {
      const list = prev.omgoologchHuseltGomdol ?? [];
      const first = list[0] ?? { type: "", note: "", files: [] };
      const nextList = [
        { ...first, files: first.files.filter((_, i) => i !== fileIndex) },
        ...list.slice(1),
      ];
      return { ...prev, omgoologchHuseltGomdol: nextList };
    });
  };

  const setOmgoologchFileTitle = (fileIndex: number, title: string) => {
    setSections((prev) => {
      const list = prev.omgoologchHuseltGomdol ?? [];
      const first = list[0] ?? { type: "", note: "", files: [] };
      const nextList = [
        {
          ...first,
          files: first.files.map((f, i) => (i === fileIndex ? { ...f, title } : f)),
        },
        ...list.slice(1),
      ];
      return { ...prev, omgoologchHuseltGomdol: nextList };
    });
  };

  const addInvestigatorAction = (id: string) => {
    if (sections.investigatorActionIds.includes(id)) return;
    setSections((prev) => ({
      ...prev,
      investigatorActionIds: [...prev.investigatorActionIds, id],
    }));
    setOpenAddList(false);
  };

  const removeInvestigatorAction = (id: string) => {
    setSections((prev) => ({
      ...prev,
      investigatorActionIds: prev.investigatorActionIds.filter((x) => x !== id),
    }));
  };

  const handleSave = async () => {
    if (!caseId || !step?.id) return;
    setSaveError(null);
    setSaving(true);
    try {
      let notePayload = sections;
      if (isMordonBurtgelStep) {
        notePayload = {
          ...sections,
          prosecutorDecisionBlocks: sections.prosecutorDecisionBlocks.map((b) =>
            b.decisionCategory === STEP2_CATEGORY_XEREG_BURTGEL
              ? { ...b, decisionCategory: STEP3_CATEGORY_MOR }
              : b
          ),
        };
      }
      if (isProkurorHyanaltStep) {
        const blocks = [...notePayload.prosecutorDecisionBlocks];
        if (blocks.length > 0) {
          const li = blocks.length - 1;
          blocks[li] = { ...blocks[li], decisionCategory: "" };
        }
        notePayload = { ...notePayload, investigatorActionIds: [], prosecutorDecisionBlocks: blocks };
      }
      const res = await fetch(`/api/cases/${caseId}/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: JSON.stringify(notePayload) }),
      });
      const updated = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(typeof updated?.error === "string" ? updated.error : "Хадгалахад алдаа гарлаа");
        return;
      }
      onStepUpdate({ note: updated.note ?? null });
      if (
        isMordonBurtgelStep &&
        sections.prosecutorDecisionBlocks.some((b) => b.decisionCategory === STEP2_CATEGORY_XEREG_BURTGEL)
      ) {
        setSections(notePayload);
      }

      const lastBlock = notePayload.prosecutorDecisionBlocks[notePayload.prosecutorDecisionBlocks.length - 1];
      const decision = lastBlock?.decision ?? "";
      if (isProsecutorEruuTatahDecision(decision)) {
        const stageIdx = PARTICIPATION_STAGE_VALUES.indexOf(
          step.stageLabel as (typeof PARTICIPATION_STAGE_VALUES)[number]
        );
        const nextProgressIdx =
          stageIdx >= 0 && stageIdx < PARTICIPATION_STAGE_VALUES.length - 1 ? stageIdx + 1 : 2;
        const progressRes = await fetch(`/api/cases/${caseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseProgressStepIndex: nextProgressIdx }),
        });
        if (progressRes.ok) {
          reloadCase?.();
          onAfterProgressToStep?.(nextProgressIdx);
        }
      }
      if (decision === PROSECUTOR_DECISION_CLOSE_REGISTRATION_CASE) {
        const closeRes = await fetch(`/api/cases/${caseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseProgressStepIndex: 9, status: "CLOSED" }),
        });
        const closeData = await closeRes.json().catch(() => ({}));
        if (!closeRes.ok) {
          setSaveError(typeof closeData?.error === "string" ? closeData.error : "Хэргийг хаах үед алдаа гарлаа");
          return;
        }
        reloadCase?.();
        onAfterProgressToStep?.(9);
      }

      if (isMordonBurtgelStep) {
        if (decision === PROSECUTOR_DECISION_MORDON_TO_PROSECUTOR_CONTROL) {
          const progressRes = await fetch(`/api/cases/${caseId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ caseProgressStepIndex: 3 }),
          });
          if (progressRes.ok) {
            reloadCase?.();
            onAfterProgressToStep?.(3);
          }
        } else if (decision === PROSECUTOR_DECISION_MORDON_BACK_TO_REGISTRATION) {
          const progressRes = await fetch(`/api/cases/${caseId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ caseProgressStepIndex: 1 }),
          });
          if (progressRes.ok) {
            reloadCase?.();
            onAfterProgressToStep?.(1);
          }
        }
      }

      if (isProkurorHyanaltStep) {
        let progressIdx: number | null = null;
        if (decision === PROSECUTOR_DECISION_STEP4_BACK_TO_MORDON) progressIdx = 2;
        else if (decision === PROSECUTOR_DECISION_STEP4_BACK_TO_REGISTRATION) progressIdx = 1;
        else if (decision === PROSECUTOR_DECISION_STEP4_TO_COURT_DELIVERED) progressIdx = 4;
        if (progressIdx != null) {
          const progressRes = await fetch(`/api/cases/${caseId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ caseProgressStepIndex: progressIdx }),
          });
          if (progressRes.ok) {
            reloadCase?.();
            onAfterProgressToStep?.(progressIdx);
          }
        }
      }
    } catch (err) {
      setSaveError("Хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const availableToAdd = investigatorActionTypes.filter(
    (item) => !sections.investigatorActionIds.includes(item.id)
  );
  const selectedItems = investigatorActionTypes.filter((item) =>
    sections.investigatorActionIds.includes(item.id)
  );

  return (
    <div className="space-y-6">
      {!hideInvestigatorActions && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Мөрдөгчийн ажиллагаа</Label>
          <div className="rounded-lg border border-input bg-muted/10 px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {selectedItems.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-sm text-foreground"
                >
                  {item.name}
                  <button
                    type="button"
                    onClick={() => removeInvestigatorAction(item.id)}
                    className="rounded p-0.5 hover:bg-primary/20"
                    aria-label="Устгах"
                  >
                    ×
                  </button>
                </span>
              ))}
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setOpenAddList((v) => !v)}
                  title="Мөрдөгчийн ажиллагаа нэмэх"
                >
                  <Plus className="size-4" />
                </Button>
                {openAddList && (
                  <>
                    <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpenAddList(false)} />
                    <div className="absolute left-0 top-full z-20 mt-1 max-h-56 min-w-[200px] overflow-auto rounded-md border border-border bg-popover py-1 shadow-md">
                      {availableToAdd.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">
                          {investigatorActionTypes.length === 0
                            ? "Мөрдөгчийн ажиллагааны төрөл байхгүй. Цэснээс нэмнэ үү."
                            : "Бүгд нэмэгдсэн."}
                        </p>
                      ) : (
                        availableToAdd.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => addInvestigatorAction(item.id)}
                          >
                            {item.name}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Прокурорын шийдвэр (step 2: 8 options + note) */}
      {sections.prosecutorDecisionBlocks.map((block, blockIndex) => {
        const isLast = blockIndex === sections.prosecutorDecisionBlocks.length - 1;
        return (
          <div key={blockIndex} className="space-y-2 rounded-lg border border-border bg-muted/10 p-4">
            <Label className="text-sm font-medium">
              Прокурорын шийдвэр{sections.prosecutorDecisionBlocks.length > 1 ? ` (${blockIndex + 1})` : ""}
            </Label>
            {!isLast ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">{block.decision || "—"}</p>
                {block.note && <p className="text-muted-foreground whitespace-pre-wrap">{block.note}</p>}
                {block.files && block.files.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-border/60 pt-2">
                    {block.files.map((f, fi) => (
                      <li key={`${f.url}-${fi}`}>
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary underline underline-offset-2"
                        >
                          {f.title || "Файл"}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <>
                {isProkurorHyanaltStep ? (
                  <div className="space-y-3">
                    {(() => {
                      const step4Opts = PROSECUTOR_DECISION_STEP4_PROKUROR_CONTROL as readonly string[];
                      const inStep4List = step4Opts.includes(block.decision);
                      return (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Шийдвэр</Label>
                            <Select
                              value={inStep4List ? block.decision : "none"}
                              onValueChange={(v) =>
                                setSections((prev) => {
                                  const next = [...prev.prosecutorDecisionBlocks];
                                  next[blockIndex] = {
                                    ...next[blockIndex],
                                    decision: v === "none" || v == null ? "" : v,
                                    decisionCategory: "",
                                  };
                                  return { ...prev, prosecutorDecisionBlocks: next };
                                })
                              }
                            >
                              <SelectTrigger className="w-full min-w-[min(100%,20rem)] max-w-4xl">
                                <SelectValue placeholder="Сонгох" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— Сонгох —</SelectItem>
                                {step4Opts.map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {!inStep4List && block.decision.trim() !== "" && (
                            <p className="text-xs text-muted-foreground">
                              Өмнөх сонголт: {block.decision}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  (() => {
                    const secondCatLabel = isMordonBurtgelStep ? STEP3_CATEGORY_MOR : STEP2_CATEGORY_XEREG_BURTGEL;
                    const secondCatOptions = isMordonBurtgelStep
                      ? PROSECUTOR_DECISION_STEP3_MOR
                      : PROSECUTOR_DECISION_STEP2_XEREG_BURTGEL;
                    const ajillagaaOptions = isMordonBurtgelStep
                      ? PROSECUTOR_DECISION_STEP3_AJILLAGAATAI
                      : PROSECUTOR_DECISION_STEP2_AJILLAGAATAI;

                    const inAjillagaaList = (ajillagaaOptions as readonly string[]).includes(block.decision);
                    const inSecondList = (secondCatOptions as readonly string[]).includes(block.decision);
                    const inLegacyStep2AjillagaaOnMordon =
                      isMordonBurtgelStep &&
                      (PROSECUTOR_DECISION_STEP2_AJILLAGAATAI as readonly string[]).includes(block.decision) &&
                      !inAjillagaaList &&
                      !inSecondList;
                    const inLegacyXeregSecond =
                      isMordonBurtgelStep &&
                      (PROSECUTOR_DECISION_STEP2_XEREG_BURTGEL as readonly string[]).includes(block.decision);

                    const normalizedDecisionCategory =
                      isMordonBurtgelStep && block.decisionCategory === STEP2_CATEGORY_XEREG_BURTGEL
                        ? STEP3_CATEGORY_MOR
                        : block.decisionCategory;

                    const currentCategory =
                      normalizedDecisionCategory ||
                      (inAjillagaaList && !inSecondList
                        ? STEP2_CATEGORY_AJILLAGAATAI
                        : inSecondList && !inAjillagaaList
                          ? secondCatLabel
                          : inAjillagaaList && inSecondList
                            ? STEP2_CATEGORY_AJILLAGAATAI
                            : inLegacyStep2AjillagaaOnMordon
                              ? STEP2_CATEGORY_AJILLAGAATAI
                              : inLegacyXeregSecond
                                ? secondCatLabel
                                : "");

                    const options =
                      currentCategory === STEP2_CATEGORY_AJILLAGAATAI
                        ? ajillagaaOptions
                        : currentCategory === secondCatLabel ||
                            (isMordonBurtgelStep && currentCategory === STEP2_CATEGORY_XEREG_BURTGEL)
                          ? secondCatOptions
                          : null;
                    return (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Ангилал</Label>
                          <Select
                            value={currentCategory || "none"}
                            onValueChange={(v) =>
                              setSections((prev) => {
                                const next = [...prev.prosecutorDecisionBlocks];
                                const cat = v === "none" || v == null ? "" : v;
                                next[blockIndex] = { ...next[blockIndex], decisionCategory: cat, decision: "" };
                                return { ...prev, prosecutorDecisionBlocks: next };
                              })
                            }
                          >
                            <SelectTrigger className="w-full min-w-[min(100%,18rem)] max-w-4xl">
                              <SelectValue placeholder="Сонгох" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— Сонгох —</SelectItem>
                              <SelectItem value={STEP2_CATEGORY_AJILLAGAATAI}>{STEP2_CATEGORY_AJILLAGAATAI}</SelectItem>
                              <SelectItem value={secondCatLabel}>{secondCatLabel}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {options && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Шидвэр</Label>
                            <Select
                              value={block.decision || "none"}
                              onValueChange={(v) =>
                                setSections((prev) => {
                                  const next = [...prev.prosecutorDecisionBlocks];
                                  next[blockIndex] = { ...next[blockIndex], decision: v === "none" || v == null ? "" : v };
                                  return { ...prev, prosecutorDecisionBlocks: next };
                                })
                              }
                            >
                              <SelectTrigger className="w-full min-w-[min(100%,20rem)] max-w-4xl">
                                <SelectValue placeholder="Сонгох" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— Сонгох —</SelectItem>
                                {options.map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
                <div className="space-y-1 pt-2">
                  <Label className="text-xs text-muted-foreground">Тэмдэглэл</Label>
                  <textarea
                    value={block.note}
                    onChange={(e) =>
                      setSections((prev) => {
                        const next = [...prev.prosecutorDecisionBlocks];
                        next[blockIndex] = { ...next[blockIndex], note: e.target.value };
                        return { ...prev, prosecutorDecisionBlocks: next };
                      })
                    }
                    rows={3}
                    className={cn(
                      "w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
                    )}
                    placeholder="Тэмдэглэл оруулах…"
                  />
                </div>
                <div className="space-y-1 pt-2">
                  <Label className="text-xs text-muted-foreground">Хавсаргах файл</Label>
                  <ComplaintFilesBlock
                    level="duurgiin"
                    files={block.files ?? []}
                    uploading={uploadingProsecutorBlockIndex === blockIndex}
                    uploadError={uploadingProsecutorBlockIndex === blockIndex ? uploadErrorProsecutor : ""}
                    onUpload={(ev) => uploadProsecutorBlockFiles(blockIndex, ev)}
                    onRemoveFile={(i) => removeProsecutorBlockFile(blockIndex, i)}
                    onFileTitle={(i, t) => setProsecutorBlockFileTitle(blockIndex, i, t)}
                  />
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Өмгөөлөгчөөс гаргасан хүсэлт гомдлууд */}
      {(sections.omgoologchHuseltGomdol?.length ?? 0) > 0 && (() => {
        const entry = sections.omgoologchHuseltGomdol![0];
        const typeOptions = ["Гомдол", "Хүсэлт"] as const;
        return (
          <div className="space-y-3 rounded-lg border border-border bg-muted/10 p-4">
            <Label className="text-sm font-medium">Өмгөөлөгчөөс гаргасан хүсэлт гомдлууд</Label>
            <div className="grid gap-3 sm:grid-cols-1">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Төрөл</span>
                <Select
                  value={entry.type || "none"}
                  onValueChange={(v) =>
                    setSections((prev) => {
                      const list = [...(prev.omgoologchHuseltGomdol ?? [{ type: "", note: "", files: [] }])];
                      list[0] = { ...list[0], type: v === "none" || v == null ? "" : v };
                      return { ...prev, omgoologchHuseltGomdol: list };
                    })
                  }
                >
                  <SelectTrigger className="w-full min-w-[min(100%,12rem)] max-w-3xl">
                    <SelectValue placeholder="Сонгох" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Сонгох —</SelectItem>
                    {typeOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Тэмдэглэл</Label>
                <textarea
                  value={entry.note}
                  onChange={(e) =>
                    setSections((prev) => {
                      const list = [...(prev.omgoologchHuseltGomdol ?? [{ type: "", note: "", files: [] }])];
                      list[0] = { ...list[0], note: e.target.value };
                      return { ...prev, omgoologchHuseltGomdol: list };
                    })
                  }
                  rows={3}
                  className={cn(
                    "w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
                  )}
                  placeholder="Тэмдэглэл оруулах…"
                />
              </div>
              <ComplaintFilesBlock
                level="duurgiin"
                files={entry.files}
                uploading={uploadingOmgoologch}
                uploadError={uploadErrorOmgoologch}
                onUpload={uploadOmgoologchFiles}
                onRemoveFile={removeOmgoologchFile}
                onFileTitle={setOmgoologchFileTitle}
              />
            </div>
          </div>
        );
      })()}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={handleSave} disabled={saving} size="sm">
          {saving ? "Хадгалж байна…" : "Хадгалах"}
        </Button>
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
      </div>
    </div>
  );
}

function StepParticipantsEditor({
  step,
  saving,
  onSave,
  excludeRoleKeys,
  /** Алхам 2-ын «Мөрдөгчийн ажиллагаа» шиг: + дарж төрөл нэмэх, зөвхөн сонгосон баганууд */
  selectableRolesMode = true,
  readOnly = false,
}: {
  step: CaseStep;
  saving: boolean;
  onSave: (stepId: string, participants: Record<string, string[]>) => Promise<void>;
  excludeRoleKeys?: string[];
  selectableRolesMode?: boolean;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [newNames, setNewNames] = useState<Record<string, string>>({});
  const [activeRoleKeys, setActiveRoleKeys] = useState<Set<string>>(() => new Set());
  const [openRolePicker, setOpenRolePicker] = useState(false);
  const prevStepIdRef = useRef<string | null>(null);

  const byRole = participantsByRole(step.participants);
  const roles = excludeRoleKeys?.length
    ? PARTICIPANT_ROLES.filter((r) => !excludeRoleKeys.includes(r.key))
    : PARTICIPANT_ROLES;

  const excludeSig = excludeRoleKeys?.slice().sort().join("\0") ?? "";

  useEffect(() => {
    if (readOnly) setEditing(false);
  }, [readOnly]);

  useEffect(() => {
    const stepChanged = prevStepIdRef.current !== null && prevStepIdRef.current !== step.id;
    prevStepIdRef.current = step.id;
    if (!selectableRolesMode) return;

    setActiveRoleKeys((prev) => {
      const by = participantsByRole(step.participants);
      if (stepChanged) {
        const next = new Set<string>();
        for (const k of STEP_PARTICIPANT_ROLE_KEYS) {
          if (excludeRoleKeys?.includes(k)) continue;
          if ((by[k] || []).length > 0) next.add(k);
        }
        return next;
      }
      const next = new Set(prev);
      for (const k of STEP_PARTICIPANT_ROLE_KEYS) {
        if (excludeRoleKeys?.includes(k)) continue;
        if ((by[k] || []).length > 0) next.add(k);
      }
      return next;
    });
  }, [step.id, step.participants, excludeSig, selectableRolesMode]);

  const orderedRoles = PARTICIPANT_GRID_ORDER_KEYS.map((k) => roles.find((r) => r.key === k)).filter(
    (r): r is (typeof roles)[number] => r != null
  );

  const visibleOrderedRoles = selectableRolesMode
    ? orderedRoles.filter((r) => activeRoleKeys.has(r.key))
    : orderedRoles;

  const availableRolesToAdd = selectableRolesMode
    ? orderedRoles.filter((r) => !activeRoleKeys.has(r.key))
    : [];

  const addParticipant = (role: string) => {
    const name = (newNames[role] ?? "").trim();
    if (!name) return;
    const next = { ...byRole, [role]: [...(byRole[role] || []), name] };
    onSave(step.id, next);
    setNewNames((prev) => ({ ...prev, [role]: "" }));
  };

  const removeParticipant = (role: string, index: number) => {
    const list = [...(byRole[role] || [])];
    list.splice(index, 1);
    const next = { ...byRole, [role]: list };
    onSave(step.id, next);
  };

  const addParticipantRoleColumn = (key: string) => {
    setActiveRoleKeys((prev) => new Set(prev).add(key));
    setOpenRolePicker(false);
  };

  const removeParticipantRoleColumn = (key: string) => {
    setActiveRoleKeys((prev) => {
      const n = new Set(prev);
      n.delete(key);
      return n;
    });
    const next = { ...byRole, [key]: [] };
    onSave(step.id, next);
  };

  const renderRoleColumn = (key: string, label: string, className?: string) => {
    const canEdit = editing && !readOnly;
    return (
      <div key={key} className={cn("space-y-1.5", className)}>
        <div className="flex items-start justify-between gap-2">
          <Label className="text-xs leading-tight">{label}</Label>
          {selectableRolesMode && canEdit && (
            <button
              type="button"
              onClick={() => removeParticipantRoleColumn(key)}
              disabled={saving}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Энэ төрлийг жагсаалтаас хасах"
              aria-label="Төрөл хасах"
            >
              ×
            </button>
          )}
        </div>
        <ul className="flex flex-wrap gap-1">
          {(byRole[key] || []).map((name, i) => (
            <li key={`${key}-${i}`} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs">
              <span>{name}</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => removeParticipant(key, i)}
                  disabled={saving}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Устгах"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="flex gap-1">
            <Input
              placeholder="Нэр нэмэх"
              value={newNames[key] ?? ""}
              onChange={(e) => setNewNames((prev) => ({ ...prev, [key]: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addParticipant(key))}
              className="h-8 text-xs"
              disabled={saving}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={() => addParticipant(key)}
              disabled={saving || !(newNames[key] ?? "").trim()}
            >
              Нэмэх
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Оролцогчид (алхам дээр)
        </span>
        {!readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8 shrink-0"
            onClick={() => setEditing((e) => !e)}
            aria-label={editing ? "Засах хаах" : "Засах"}
            title={editing ? "Засах хаах" : "Засах"}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </Button>
        )}
      </div>

      {selectableRolesMode && !readOnly && (
        <div className="rounded-lg border border-input bg-muted/10 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Оролцогчийн төрөл нэмэх</span>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setOpenRolePicker((v) => !v)}
                title="Төрөл нэмэх"
                disabled={saving || availableRolesToAdd.length === 0}
              >
                <Plus className="size-4" />
              </Button>
              {openRolePicker && availableRolesToAdd.length > 0 && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpenRolePicker(false)} />
                  <div className="absolute left-0 top-full z-20 mt-1 max-h-56 min-w-[220px] overflow-auto rounded-md border border-border bg-popover py-1 shadow-md">
                    {availableRolesToAdd.map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => addParticipantRoleColumn(r.key)}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {availableRolesToAdd.length === 0 && activeRoleKeys.size > 0 && (
              <span className="text-xs text-muted-foreground">Бүх төрөл нэмэгдсэн.</span>
            )}
          </div>
          {activeRoleKeys.size === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              + товчоор төрөл сонгон оролцогч нэмнэ (алхам 2-ын «Мөрдөгчийн ажиллагаа»-тай ижил).
            </p>
          )}
        </div>
      )}

      {(!selectableRolesMode || visibleOrderedRoles.length > 0) && orderedRoles.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(selectableRolesMode ? visibleOrderedRoles : orderedRoles).map(({ key, label }, i) => {
            const list = selectableRolesMode ? visibleOrderedRoles : orderedRoles;
            const lastAlone = list.length % 2 === 1 && i === list.length - 1;
            return renderRoleColumn(key, label, lastAlone ? "sm:col-span-2" : undefined);
          })}
        </div>
      )}
    </div>
  );
}

/** 10-р алхам: «хаах» хаана хадгалснаас хамааран цурам эхлэх (ж: алхам 1-ээс хаасан → 2–9; бүртгэлээс → 3–9; мөрдөнөөс → 4–9). */
function CaseProcessStageTabStrip({
  data,
  expandedStepIndex,
  setExpandedStepIndex,
  isStepHighlighted,
}: {
  data: CaseDetail;
  expandedStepIndex: number | null;
  setExpandedStepIndex: (i: number) => void;
  isStepHighlighted: (step: CaseStep, index: number) => boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const prokurorReturnWrapRef = useRef<HTMLDivElement | null>(null);
  const prokurorReturnGlyphRef = useRef<HTMLSpanElement | null>(null);
  const uridReturnWrapRef = useRef<HTMLDivElement | null>(null);
  const uridReturnGlyphRef = useRef<HTMLSpanElement | null>(null);
  const davjReturnArrowWrapRef = useRef<HTMLDivElement | null>(null);
  const davjReturnArrowGlyphRef = useRef<HTMLSpanElement | null>(null);
  const circleRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const allStages = PARTICIPATION_STAGE_VALUES;
  const stepByStage = new Map<string, CaseStep>();
  data.steps.forEach((s) => stepByStage.set(s.stageLabel, s));

  const progressIndex = data.caseProgressStepIndex != null ? Number(data.caseProgressStepIndex) : null;
  const defaultExpanded =
    expandedStepIndex !== null
      ? expandedStepIndex
      : progressIndex != null && progressIndex >= 0 && progressIndex < allStages.length
        ? progressIndex
        : 0;
  const activeIndex = defaultExpanded >= 0 && defaultExpanded < allStages.length ? defaultExpanded : 0;
  const step10IsCurrent = progressIndex !== null && progressIndex === 9;
  const closeCaseDecisionAt = prosecutionCloseCaseStageIndex(data);
  /** Зөвхөн давж+«Үгүй»+хаах — хяналтаас 10 руу шилжих нь энэ цурам биш */
  const davjGomdolUgviClosed = isDavjGomdolUgviClosedCase(data);
  const stage10AfterHynaltCourt =
    step10IsCurrent && isProgressAtStage10AfterHynaltCourtDecision(data);
  /**
   * Урт хэвтээ цурам: `> 8` бол шугам нуугдана.
   * Давж+Үгүй хаалт эсвэл хяналтаас 10 руу — аль алинд нь 9 (эхлэл «хэтэрхий баруун») гэж тооцож нуух.
   * Бусад 10-р шат: бүртгэл/мөрдөнөөс «хаах» эсвэл анхны 1-ээс 8 хүртэл цурам.
   */
  const strikeStartIndex = davjGomdolUgviClosed
    ? 9
    : stage10AfterHynaltCourt
      ? 9
      : closeCaseDecisionAt != null
        ? closeCaseDecisionAt + 1
        : 1;

  /** Алхам 2–3 хооронд: зөвхөн мөрдөн «хүчингүй болгох» → жижиг ↩ */
  const mordonStep = stepByStage.get("Мөрдөн байцаалт") ?? null;
  const prokurorStep = stepByStage.get("Прокурорын хяналт") ?? null;
  const prokurorLastDecision = lastProsecutorDecisionFromStepNote(prokurorStep?.note);
  const mordonBackToRegistration =
    lastProsecutorDecisionFromStepNote(mordonStep?.note) === PROSECUTOR_DECISION_MORDON_BACK_TO_REGISTRATION;
  const prokurorBackToRegistration = prokurorLastDecision === PROSECUTOR_DECISION_STEP4_BACK_TO_REGISTRATION;
  const showReturnArrowAfterRegistrationSlot = progressIndex === 1 && mordonBackToRegistration;

  /** Алхам 4 → 2: прокурор «ЭХҮЯТТ… хэрэг бүртгэлтэнд буцаах» — нэг урт буцах сум (дугуй 4-оос 2 хүртэл). */
  const prokurorLongReturnActive = progressIndex === 1 && prokurorBackToRegistration;

  const uridStepForMark = stepByStage.get("Урьдчилсан хэлэлцүүлэг") ?? null;
  let uridGomdolProgressMark: string | null = null;
  if (uridStepForMark?.note) {
    try {
      const u = JSON.parse(uridStepForMark.note) as Record<string, unknown>;
      if (u.kind === URIDCHILSAN_HELELTSUULEG_NOTE_KIND) {
        const m = u.uridGomdolProgressMark;
        if (m === URID_GOMDOL_MARK_SKIP_ANKHAN || m === URID_GOMDOL_MARK_RETURN_PROKUROR) {
          uridGomdolProgressMark = m;
        }
      }
    } catch {
      /* ignore */
    }
  }

  /** Гомдол «Тийм» → 8-р шат руу; 7-р шатыг алгассан (зураас) */
  const uridSkippedAnkhanShuukh =
    progressIndex !== null &&
    progressIndex === SHUUKH_PROGRESS_DAVJ_ZAALDAN &&
    uridGomdolProgressMark === URID_GOMDOL_MARK_SKIP_ANKHAN &&
    SHUUKH_PROGRESS_ANKHAN_SHUUKH >= 0;

  /** Гомдол «Үгүй» → прокурорт буцах: 6-аас 4 рүү урт ↩ */
  const uridLongReturnToProkurorActive =
    progressIndex !== null &&
    progressIndex === SHUUKH_PROGRESS_PROKUROR_HYANALT &&
    uridGomdolProgressMark === URID_GOMDOL_MARK_RETURN_PROKUROR &&
    SHUUKH_PROGRESS_URIDCHILSAN_HELELTSUULEG >= 0;

  /** Давж/хяналтын шатнаас УХ/Анхан/Прокурорт буцах, эсвэл хяналтын → давж: очих шат дээр урт ↩ */
  const courtReturnArrow = getCourtShuukhReturnArrow(data, progressIndex);

  /** Алхам 3–4 хооронд: прокурор «мөрдөн байцаалтанд буцаах», одоо алхам 3 дээр. */
  const showReturnArrowAfterMordonSlot =
    progressIndex === 2 && prokurorLastDecision === PROSECUTOR_DECISION_STEP4_BACK_TO_MORDON;

  const updateStrikeLine = useCallback(() => {
    const container = containerRef.current;
    const line = lineRef.current;
    if (!step10IsCurrent || !container || !line) {
      if (line) {
        line.style.width = "0px";
        line.style.opacity = "0";
      }
      return;
    }
    if (strikeStartIndex > 8) {
      line.style.width = "0px";
      line.style.opacity = "0";
      return;
    }
    const first = circleRefs.current[strikeStartIndex];
    const last = circleRefs.current[8];
    if (!first || !last) return;
    const cr = container.getBoundingClientRect();
    const r1 = first.getBoundingClientRect();
    const r2 = last.getBoundingClientRect();
    // Жижиг ↩-тэй ижил байрлалтай байлгахын тулд тойргийн төвөөс жаахан доош шилжүүлнэ.
    const y = r1.top + r1.height / 2 - cr.top + 6;
    const x1 = r1.left + r1.width / 2 - cr.left;
    const x2 = r2.left + r2.width / 2 - cr.left;
    line.style.top = `${y}px`;
    line.style.left = `${Math.min(x1, x2)}px`;
    line.style.width = `${Math.abs(x2 - x1)}px`;
    line.style.height = "3px";
    line.style.opacity = "1";
    line.style.transform = "translateY(-50%)";
  }, [step10IsCurrent, strikeStartIndex]);

  const updateProkurorReturnLine = useCallback(() => {
    const container = containerRef.current;
    const wrap = prokurorReturnWrapRef.current;
    const glyph = prokurorReturnGlyphRef.current;
    if (!prokurorLongReturnActive || !container || !wrap || !glyph) {
      if (wrap) wrap.style.opacity = "0";
      return;
    }
    const el1 = circleRefs.current[1];
    const el3 = circleRefs.current[3];
    if (!el1 || !el3) {
      wrap.style.opacity = "0";
      return;
    }
    const cr = container.getBoundingClientRect();
    const r1 = el1.getBoundingClientRect();
    const r3 = el3.getBoundingClientRect();
    const x1 = r1.left + r1.width / 2 - cr.left;
    const x3 = r3.left + r3.width / 2 - cr.left;
    // Угсралтыг бага зэрэг доошлуулж, шугам/тайлбарын харагдах байрлалд ойртуулах.
    const y = r1.top + r1.height / 2 - cr.top + 6;
    const span = Math.abs(x3 - x1);
    const midX = (x1 + x3) / 2;
    glyph.style.left = `${midX}px`;
    glyph.style.top = `${y}px`;
    glyph.style.transform = "translate(-50%, -50%)";
    const w = glyph.getBoundingClientRect().width || 1;
    const scaleX = Math.min(45, Math.max(1.15, span / w));
    glyph.style.transform = `translate(-50%, -50%) scaleX(${scaleX})`;
    wrap.style.opacity = "1";
  }, [prokurorLongReturnActive]);

  const updateUridGomdolReturnLine = useCallback(() => {
    const container = containerRef.current;
    const wrap = uridReturnWrapRef.current;
    const glyph = uridReturnGlyphRef.current;
    if (!uridLongReturnToProkurorActive || !container || !wrap || !glyph) {
      if (wrap) wrap.style.opacity = "0";
      return;
    }
    const idxUrid = SHUUKH_PROGRESS_URIDCHILSAN_HELELTSUULEG;
    const idxProkuror = SHUUKH_PROGRESS_PROKUROR_HYANALT;
    const elUrid = circleRefs.current[idxUrid];
    const elProkuror = circleRefs.current[idxProkuror];
    if (!elUrid || !elProkuror) {
      wrap.style.opacity = "0";
      return;
    }
    const cr = container.getBoundingClientRect();
    const rU = elUrid.getBoundingClientRect();
    const rP = elProkuror.getBoundingClientRect();
    const xU = rU.left + rU.width / 2 - cr.left;
    const xP = rP.left + rP.width / 2 - cr.left;
    const y = rU.top + rU.height / 2 - cr.top + 6;
    const span = Math.abs(xU - xP);
    const midX = (xU + xP) / 2;
    glyph.style.left = `${midX}px`;
    glyph.style.top = `${y}px`;
    glyph.style.transform = "translate(-50%, -50%)";
    const w = glyph.getBoundingClientRect().width || 1;
    const scaleX = Math.min(55, Math.max(1.2, span / w));
    glyph.style.transform = `translate(-50%, -50%) scaleX(${scaleX})`;
    wrap.style.opacity = "1";
  }, [uridLongReturnToProkurorActive]);

  const updateDavjReturnArrowLine = useCallback(() => {
    const container = containerRef.current;
    const wrap = davjReturnArrowWrapRef.current;
    const glyph = davjReturnArrowGlyphRef.current;
    const arrow = getCourtShuukhReturnArrow(
      data,
      data.caseProgressStepIndex != null ? Number(data.caseProgressStepIndex) : null
    );
    if (!arrow || !container || !wrap || !glyph) {
      if (wrap) wrap.style.opacity = "0";
      return;
    }
    const elA = circleRefs.current[arrow.from];
    const elB = circleRefs.current[arrow.to];
    if (!elA || !elB) {
      wrap.style.opacity = "0";
      return;
    }
    const cr = container.getBoundingClientRect();
    const rA = elA.getBoundingClientRect();
    const rB = elB.getBoundingClientRect();
    const xA = rA.left + rA.width / 2 - cr.left;
    const xB = rB.left + rB.width / 2 - cr.left;
    const y = rA.top + rA.height / 2 - cr.top + 6;
    const span = Math.abs(xB - xA);
    const midX = (xA + xB) / 2;
    glyph.style.left = `${midX}px`;
    glyph.style.top = `${y}px`;
    glyph.style.transform = "translate(-50%, -50%)";
    const w = glyph.getBoundingClientRect().width || 1;
    const scaleX = Math.min(65, Math.max(1.2, span / w));
    glyph.style.transform = `translate(-50%, -50%) scaleX(${scaleX})`;
    wrap.style.opacity = "1";
  }, [data]);

  useLayoutEffect(() => {
    updateStrikeLine();
    const id = requestAnimationFrame(() => updateStrikeLine());
    return () => cancelAnimationFrame(id);
  }, [updateStrikeLine, data.caseProgressStepIndex, expandedStepIndex, data.steps, activeIndex]);

  useLayoutEffect(() => {
    updateProkurorReturnLine();
    const id = requestAnimationFrame(() => updateProkurorReturnLine());
    return () => cancelAnimationFrame(id);
  }, [updateProkurorReturnLine, data.caseProgressStepIndex, expandedStepIndex, data.steps, activeIndex]);

  useLayoutEffect(() => {
    updateUridGomdolReturnLine();
    const id = requestAnimationFrame(() => updateUridGomdolReturnLine());
    return () => cancelAnimationFrame(id);
  }, [updateUridGomdolReturnLine, data.caseProgressStepIndex, expandedStepIndex, data.steps, activeIndex]);

  useLayoutEffect(() => {
    updateDavjReturnArrowLine();
    const id = requestAnimationFrame(() => updateDavjReturnArrowLine());
    return () => cancelAnimationFrame(id);
  }, [updateDavjReturnArrowLine, data.caseProgressStepIndex, expandedStepIndex, data.steps, activeIndex]);

  useEffect(() => {
    window.addEventListener("resize", updateStrikeLine);
    return () => window.removeEventListener("resize", updateStrikeLine);
  }, [updateStrikeLine]);

  useEffect(() => {
    window.addEventListener("resize", updateProkurorReturnLine);
    return () => window.removeEventListener("resize", updateProkurorReturnLine);
  }, [updateProkurorReturnLine]);

  useEffect(() => {
    window.addEventListener("resize", updateUridGomdolReturnLine);
    return () => window.removeEventListener("resize", updateUridGomdolReturnLine);
  }, [updateUridGomdolReturnLine]);

  useEffect(() => {
    window.addEventListener("resize", updateDavjReturnArrowLine);
    return () => window.removeEventListener("resize", updateDavjReturnArrowLine);
  }, [updateDavjReturnArrowLine]);

  return (
    <div ref={containerRef} className="relative flex border-b border-border bg-muted/30">
      {allStages.map((stageLabel, index) => {
        const step = stepByStage.get(stageLabel) ?? null;
        const progressIndexInner = data.caseProgressStepIndex != null ? Number(data.caseProgressStepIndex) : null;
        const isActive = index === activeIndex;
        const skipStrikeIndex =
          uridSkippedAnkhanShuukh && SHUUKH_PROGRESS_ANKHAN_SHUUKH >= 0
            ? SHUUKH_PROGRESS_ANKHAN_SHUUKH
            : davjGomdolUgviClosed && SHUUKH_PROGRESS_HYNALT_SHUUKH >= 0
              ? SHUUKH_PROGRESS_HYNALT_SHUUKH
              : -1;
        const isCompleted = step10IsCurrent
          ? davjGomdolUgviClosed
            ? SHUUKH_PROGRESS_DAVJ_ZAALDAN >= 0 &&
              index <= SHUUKH_PROGRESS_DAVJ_ZAALDAN &&
              index !== skipStrikeIndex
            : stage10AfterHynaltCourt
              ? index < 9
              : index === 0 || (closeCaseDecisionAt != null && index <= closeCaseDecisionAt)
          : progressIndexInner != null
            ? index <= progressIndexInner && index !== skipStrikeIndex
            : step != null && index <= activeIndex;
        const remaining = step ? getDeadlineRemaining(step.deadline) : null;
        const highlighted = step ? isStepHighlighted(step, index) : false;
        const showArrowAfter =
          progressIndexInner != null && progressIndexInner > index && index < allStages.length - 1;
        const showReturnArrowAfterRegistration =
          index === 1 && progressIndexInner === 1 && showReturnArrowAfterRegistrationSlot;
        const showReturnArrowAfterMordon =
          index === 2 && progressIndexInner === 2 && showReturnArrowAfterMordonSlot;
        return (
          <Fragment key={stageLabel}>
            <button
              type="button"
              onClick={() => setExpandedStepIndex(index)}
              className={cn(
                "relative z-[1] flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 border-b-2 px-2 py-2.5 text-center transition-colors",
                isActive
                  ? "border-primary bg-background text-primary font-medium"
                  : "border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                highlighted && (isCompleted || isActive) && "border-l-2 border-l-amber-500",
                index === skipStrikeIndex && "opacity-80"
              )}
              title={remaining ? `${stageLabel} — ${remaining.text}` : stageLabel}
            >
              <span
                ref={(el) => {
                  circleRefs.current[index] = el;
                }}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-white",
                  index === skipStrikeIndex
                    ? "bg-slate-500 line-through decoration-2 decoration-white/90"
                    : isCompleted
                      ? "bg-green-600"
                      : isActive
                        ? "bg-sky-500"
                        : "bg-slate-400"
                )}
              >
                {isCompleted ? "✓" : index + 1}
              </span>
              <span
                className={cn(
                  "text-xs truncate w-full",
                  index === skipStrikeIndex && "line-through text-muted-foreground"
                )}
              >
                {stageLabel}
              </span>
              {remaining && (
                <span
                  className={cn(
                    "text-[10px] truncate w-full",
                    remaining.isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                  )}
                >
                  {remaining.text}
                </span>
              )}
            </button>
            {showArrowAfter && (
              <span
                className="relative z-[1] flex w-6 shrink-0 items-center justify-center text-muted-foreground text-xl font-bold tracking-tight"
                aria-hidden
              >
                ➔
              </span>
            )}
            {showReturnArrowAfterRegistration && (
              <span
                className="relative z-[1] flex w-6 shrink-0 items-center justify-center text-amber-600 dark:text-amber-400 text-[1.35rem] font-bold leading-none"
                title="Мөрдөн байцаалтаас Хэрэг бүртгэл рүү буцсан"
                aria-label="Мөрдөн байцаалтаас Хэрэг бүртгэл рүү буцсан"
              >
                ↩
              </span>
            )}
            {showReturnArrowAfterMordon && (
              <span
                className="relative z-[1] flex w-6 shrink-0 items-center justify-center text-amber-600 dark:text-amber-400 text-[1.35rem] font-bold leading-none"
                title="Прокурорын хяналтаас Мөрдөн байцаалт рүү буцсан"
                aria-label="Прокурорын хяналтаас Мөрдөн байцаалт рүү буцсан"
              >
                ↩
              </span>
            )}
          </Fragment>
        );
      })}
      {prokurorLongReturnActive && (
        <div
          ref={prokurorReturnWrapRef}
          className="pointer-events-none absolute inset-0 z-[15] overflow-visible"
          style={{ opacity: 0 }}
          role="img"
          aria-label="Прокурорын хяналтаас Хэрэг бүртгэл рүү буцсан"
        >
          {/* 2–3 завсартай ижил ↩, зөвхөн scaleX-ээр уртасгасан */}
          <span
            ref={prokurorReturnGlyphRef}
            className="absolute text-amber-600 dark:text-amber-400 text-[1.35rem] font-bold leading-none tracking-tight"
            style={{ transformOrigin: "center center" }}
          >
            ↩
          </span>
        </div>
      )}
      {uridLongReturnToProkurorActive && (
        <div
          ref={uridReturnWrapRef}
          className="pointer-events-none absolute inset-0 z-[15] overflow-visible"
          style={{ opacity: 0 }}
          role="img"
          aria-label="Урьдчилсан хэлэлцүүлгээс Прокурорын хяналт рүү буцсан"
        >
          <span
            ref={uridReturnGlyphRef}
            className="absolute text-amber-600 dark:text-amber-400 text-[1.35rem] font-bold leading-none tracking-tight"
            style={{ transformOrigin: "center center" }}
          >
            ↩
          </span>
        </div>
      )}
      {courtReturnArrow && (
        <div
          ref={davjReturnArrowWrapRef}
          className="pointer-events-none absolute inset-0 z-[15] overflow-visible"
          style={{ opacity: 0 }}
          role="img"
          aria-label={courtReturnArrow.ariaLabel}
        >
          <span
            ref={davjReturnArrowGlyphRef}
            className="absolute text-amber-600 dark:text-amber-400 text-[1.35rem] font-bold leading-none tracking-tight"
            style={{ transformOrigin: "center center" }}
          >
            ↩
          </span>
        </div>
      )}
      {step10IsCurrent && (
        <div
          ref={lineRef}
          className="pointer-events-none absolute z-20 rounded-full bg-foreground/75 shadow-sm"
          style={{ width: 0, opacity: 0, top: 0, left: 0 }}
          aria-hidden
        />
      )}
    </div>
  );
}

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const caseId = params?.id;

  const [data, setData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [expandedStepIndex, setExpandedStepIndex] = useState<number | null>(null);
  /** «Шүүхэд хэрэг хүргүүлсэн» → «Урьдчилсан хэлэлцүүлэг» табаар ороход нэмэгдэнэ — прокурорын шийдвэрийг дахин сонгох горим */
  const [uridEnterFromStep5Key, setUridEnterFromStep5Key] = useState(0);
  const prevExpandedProcessTabRef = useRef<number | null>(null);
  const [caseTypes, setCaseTypes] = useState<{ id: string; name: string; categories: { id: string; name: string }[] }[]>([]);
  const [updatingCase, setUpdatingCase] = useState(false);
  const [closingCase, setClosingCase] = useState(false);
  const [closeCaseDialogOpen, setCloseCaseDialogOpen] = useState(false);
  const [closePinCells, setClosePinCells] = useState<string[]>(() => emptyPinCells(4));
  const [closeComment, setCloseComment] = useState("");
  const [closeCaseError, setCloseCaseError] = useState("");
  const [detailTab, setDetailTab] = useState<"detail" | "process" | "history">("detail");
  const [savingStepParticipants, setSavingStepParticipants] = useState<string | null>(null);
  const [caseHistoryLogs, setCaseHistoryLogs] = useState<CaseAuditLog[] | null>(null);
  const [caseHistoryLoading, setCaseHistoryLoading] = useState(false);
  /** Audit row whose attachments drawer is open */
  const [historyFilesLog, setHistoryFilesLog] = useState<CaseAuditLog | null>(null);
  /** Audit row from which “View Note” was opened (drawer shows case + step notes) */
  const [historyNotesLog, setHistoryNotesLog] = useState<CaseAuditLog | null>(null);

  const [detailUsers, setDetailUsers] = useState<User[]>([]);
  const [detailClassifications, setDetailClassifications] = useState<{ id: string; name: string; order: number }[]>(
    []
  );
  const [editingRegistration, setEditingRegistration] = useState(false);
  const [savingRegistration, setSavingRegistration] = useState(false);
  const [registrationSaveError, setRegistrationSaveError] = useState("");
  const [regContactEmail, setRegContactEmail] = useState("");
  const [regContactPhone, setRegContactPhone] = useState("");
  const [regSubjectType, setRegSubjectType] = useState("");
  const [regParticipantCount, setRegParticipantCount] = useState("");
  const [regCaseTsahTypes, setRegCaseTsahTypes] = useState<string[]>([]);
  const [regMordonKharyaalal, setRegMordonKharyaalal] = useState("");
  const [regProkurorKharyaalal, setRegProkurorKharyaalal] = useState("");
  const [regCaseClassificationId, setRegCaseClassificationId] = useState("");
  const [regStatus, setRegStatus] = useState("");
  const [regAssignedToId, setRegAssignedToId] = useState("");
  const [regContractFiles, setRegContractFiles] = useState<{ url: string; title: string }[]>([]);
  const [regClassificationOpen, setRegClassificationOpen] = useState(false);
  const [regClassificationSearch, setRegClassificationSearch] = useState("");
  const regClassificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    (async () => {
      try {
        const [uRes, cRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/case-classifications"),
        ]);
        if (cancelled) return;
        if (uRes.ok) {
          const u = await uRes.json();
          if (Array.isArray(u)) setDetailUsers(u);
        }
        if (cRes.ok) {
          const c = await cRes.json();
          if (Array.isArray(c)) setDetailClassifications(sortCaseClassifications(c));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  useEffect(() => {
    if (!regClassificationOpen) return;
    const onDown = (e: MouseEvent) => {
      if (regClassificationRef.current?.contains(e.target as Node)) return;
      setRegClassificationOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [regClassificationOpen]);

  useLayoutEffect(() => {
    if (expandedStepIndex == null) {
      prevExpandedProcessTabRef.current = expandedStepIndex;
      return;
    }
    const prev = prevExpandedProcessTabRef.current;
    if (
      SHUUKH_PROGRESS_URIDCHILSAN_HELELTSUULEG >= 0 &&
      SHUUKH_PROGRESS_SHUUKH_HARMGVIUL >= 0 &&
      expandedStepIndex === SHUUKH_PROGRESS_URIDCHILSAN_HELELTSUULEG &&
      prev === SHUUKH_PROGRESS_SHUUKH_HARMGVIUL
    ) {
      setUridEnterFromStep5Key((k) => k + 1);
    }
    prevExpandedProcessTabRef.current = expandedStepIndex;
  }, [expandedStepIndex]);

  const load = async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const [caseRes, typesRes] = await Promise.all([
        fetch(`/api/cases/${caseId}`),
        fetch("/api/case-types"),
      ]);
      if (caseRes.ok) {
        const c = await caseRes.json();
        setData(c);
      }
      if (typesRes.ok) {
        const t = await typesRes.json();
        setCaseTypes(t);
      }
    } catch (err) {
      console.error("Case detail load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [caseId]);

  useEffect(() => {
    if (detailTab !== "history" || !caseId) return;
    let cancelled = false;
    setCaseHistoryLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/audit`);
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(json)) {
          setCaseHistoryLogs(json as CaseAuditLog[]);
        } else {
          setCaseHistoryLogs([]);
        }
      } catch {
        if (!cancelled) setCaseHistoryLogs([]);
      } finally {
        if (!cancelled) setCaseHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailTab, caseId]);

  const openCloseCaseDialog = () => {
    if (!data || data.status === "CLOSED") return;
    setClosePinCells(emptyPinCells(4));
    setCloseComment("");
    setCloseCaseError("");
    setCloseCaseDialogOpen(true);
  };

  const submitCloseCase = async () => {
    if (!caseId || !data || data.status === "CLOSED") return;
    setCloseCaseError("");
    setClosingCase(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinCellsToString(closePinCells), comment: closeComment }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCloseCaseError(typeof payload?.error === "string" ? payload.error : "Алдаа гарлаа");
        return;
      }
      const closedTitle = data.title;
      setData((prev) =>
        prev
          ? {
              ...prev,
              status: "CLOSED",
              closeComment: typeof payload.closeComment === "string" ? payload.closeComment : closeComment.trim(),
              closedAt: typeof payload.closedAt === "string" ? payload.closedAt : new Date().toISOString(),
            }
          : null
      );
      setCloseCaseDialogOpen(false);
      window.alert(`«${closedTitle}» хэрэг амжилттай хаагдлаа.`);
    } finally {
      setClosingCase(false);
    }
  };

  const updateCaseCategory = async (caseTypeCategoryId: string | null) => {
    if (!caseId || !data) return;
    setUpdatingCase(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseTypeCategoryId: caseTypeCategoryId || null }),
      });
      if (res.ok) {
        const c = await res.json();
        setData((prev) => (prev ? { ...prev, caseTypeCategory: c.caseTypeCategory } : null));
      }
    } finally {
      setUpdatingCase(false);
    }
  };

  const beginEditRegistration = () => {
    if (!data) return;
    setRegContactEmail(data.contactEmail ?? "");
    setRegContactPhone(data.contactPhone ?? "");
    setRegSubjectType(data.subjectType ?? "");
    setRegParticipantCount(data.participantCount ?? "");
    setRegCaseTsahTypes(Array.isArray(data.caseTsahTypes) ? [...data.caseTsahTypes] : []);
    setRegMordonKharyaalal(data.mordonBaitsaaltynKharyaalal ?? "");
    setRegProkurorKharyaalal(data.prokurorynKharyaalal ?? "");
    setRegCaseClassificationId(data.caseClassification?.id ?? "");
    setRegStatus(data.status ?? "OPEN");
    setRegAssignedToId(data.assignedTo?.id ?? "");
    setRegContractFiles(
      Array.isArray(data.contractFiles) ? data.contractFiles.map((f) => ({ url: f.url, title: f.title })) : []
    );
    setRegistrationSaveError("");
    setRegClassificationOpen(false);
    setRegClassificationSearch("");
    setEditingRegistration(true);
  };

  const cancelEditRegistration = () => {
    setEditingRegistration(false);
    setRegistrationSaveError("");
    setRegClassificationOpen(false);
  };

  const saveRegistrationDetails = async () => {
    if (!caseId || !data) return;
    setSavingRegistration(true);
    setRegistrationSaveError("");
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactEmail: regContactEmail.trim() || null,
          contactPhone: regContactPhone.trim() || null,
          subjectType: regSubjectType.trim() || null,
          participantCount: regParticipantCount.trim() || null,
          caseTsahTypes: regCaseTsahTypes,
          mordonBaitsaaltynKharyaalal: regMordonKharyaalal.trim() || null,
          prokurorynKharyaalal: regProkurorKharyaalal.trim() || null,
          caseClassificationId: regCaseClassificationId || null,
          status: regStatus,
          assignedToId: regAssignedToId || null,
          contractFiles: regContractFiles,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRegistrationSaveError(
          typeof payload?.error === "string" ? payload.error : "Хадгалахад алдаа гарлаа"
        );
        return;
      }
      setEditingRegistration(false);
      await load();
    } finally {
      setSavingRegistration(false);
    }
  };

  const saveStepParticipants = async (stepId: string, participants: Record<string, string[]>) => {
    if (!caseId) return;
    setSavingStepParticipants(stepId);
    try {
      const res = await fetch(`/api/cases/${caseId}/steps/${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants }),
      });
      if (res.ok) {
        const updated = await res.json();
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            steps: prev.steps.map((s) => (s.id === stepId ? { ...s, participants: updated.participants } : s)),
          };
        });
      }
    } finally {
      setSavingStepParticipants(null);
    }
  };

  if (!caseId) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Хэрэгийн ID буруу байна.</p>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Ачаалж байна…</p>
      </div>
    );
  }

  const latestStep = data.steps[data.steps.length - 1] ?? null;

  // Анхан шат эсвэл шийдвэр буцаагдсан тухайн шатын дугаар тод өнгөөр
  const isStepHighlighted = (step: CaseStep, index: number) => {
    const label = step.stageLabel.toLowerCase();
    if (label.includes("анхан")) return true;
    const hasReturnLater = data.steps.some(
      (s, i) => i > index && s.stageLabel.toLowerCase().includes("буцаа"),
    );
    if (hasReturnLater && (step.order === 1 || label.includes("анхан"))) return true;
    return false;
  };

  return (
    <div className="flex gap-6 p-8">
      {/* Left: main and workflow */}
      <div className="flex-1 space-y-4">
        <Button variant="outline" size="sm" onClick={() => router.push("/cases")}>
          Хэргүүд рүү буцах
        </Button>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold">
                {data.title}
              </CardTitle>
              <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span>
                  Харилцагч:{" "}
                  <span className="font-medium text-foreground">
                    {data.client.name}
                  </span>
                </span>
                {data.assignedTo && (
                  <span>
                    · Хариуцсан өмгөөлөгч:{" "}
                    <span className="font-medium text-foreground">
                      {data.assignedTo.name}
                    </span>
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Label className="text-xs text-muted-foreground shrink-0">Хэргийн зүйл анги</Label>
                <Select
                  value={data.caseTypeCategory?.id ?? "none"}
                  onValueChange={(v) => updateCaseCategory(v === "none" ? null : v)}
                  disabled={updatingCase}
                >
                  <SelectTrigger className="w-full min-w-0 max-w-2xl h-auto min-h-8 py-1.5 text-xs">
                    <SelectValue placeholder="Сонгох" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Сонгоогүй —</SelectItem>
                    {caseTypes.map((t) =>
                      t.categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {t.name} — {cat.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              {data.description && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {data.description}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={data.status} />
              {data.status !== "CLOSED" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openCloseCaseDialog}
                  disabled={closingCase}
                >
                  Хэрэг хаах
                </Button>
              )}
              {latestStep && (
                <span className="max-w-[220px] text-right text-xs text-muted-foreground">
                  Сүүлийн шат: {latestStep.stageLabel}
                </span>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Tabs: Дэлгэрэнгүй | Бүртгэл | Үйл явцын түүх */}
        <div className="flex flex-wrap gap-0 border-b border-border">
          <button
            type="button"
            onClick={() => setDetailTab("detail")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              detailTab === "detail"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Дэлгэрэнгүй
          </button>
          <button
            type="button"
            onClick={() => setDetailTab("process")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              detailTab === "process"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Бүртгэл
          </button>
          <button
            type="button"
            onClick={() => setDetailTab("history")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              detailTab === "history"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Үйл явцын түүх
          </button>
        </div>

        {detailTab === "detail" && (
        <>
        {/* Хэргийн бүртгэлийн мэдээлэл — values from the 3-step create form */}
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
            <CardTitle className="text-sm font-semibold">Хэргийн бүртгэлийн мэдээлэл</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {registrationSaveError && (
                <span className="text-xs text-destructive">{registrationSaveError}</span>
              )}
              {editingRegistration ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelEditRegistration}
                    disabled={savingRegistration}
                  >
                    Болих
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveRegistrationDetails}
                    disabled={savingRegistration}
                  >
                    {savingRegistration ? "Хадгалж байна…" : "Хадгалах"}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2"
                  onClick={beginEditRegistration}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Засах
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm">
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline">
                  <dt className="text-muted-foreground">Гарчиг:</dt>
                  <dd className="font-medium">{data.title}</dd>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline">
                  <dt className="text-muted-foreground">Шүүхийн / Шүүхийн бус:</dt>
                  <dd className="font-medium">
                    {data.caseKind === "judicial"
                      ? "Шүүхийн"
                      : data.caseKind === "non_judicial"
                        ? "Шүүхийн бус"
                        : "—"}
                  </dd>
                </div>
                {data.caseKind === "judicial" && (
                  <>
                    <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline">
                      <dt className="text-muted-foreground">Ангилал:</dt>
                      <dd className="font-medium">{data.caseJudicialCategory ?? "—"}</dd>
                    </div>
                    {data.caseJudicialCategory === "иргэний" && (
                      <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline">
                        <dt className="text-muted-foreground">Иргэний төрөл:</dt>
                        <dd className="font-medium">{data.caseCivilProcedureType ?? "—"}</dd>
                      </div>
                    )}
                  </>
                )}
                {data.caseKind === "non_judicial" && (
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline">
                    <dt className="text-muted-foreground">Үйлчилгээний төрөл:</dt>
                    <dd className="font-medium">{data.caseJudicialCategory ?? "—"}</dd>
                  </div>
                )}
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline">
                  <dt className="text-muted-foreground">Тайлбар:</dt>
                  <dd className="mt-0.5 font-medium whitespace-pre-wrap">{data.description ?? "—"}</dd>
                </div>
              </dl>
            </div>

            <div>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm">
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline">
                  <dt className="text-muted-foreground">Үйлчлүүлэгч:</dt>
                  <dd className="font-medium">{data.client.name}</dd>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline">
                  <dt className="text-muted-foreground">Үйлчлүүлэгийн төрөл:</dt>
                  <dd className="font-medium">{data.clientType ?? "—"}</dd>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center">
                  <dt className="text-muted-foreground">Имэйл:</dt>
                  <dd className="min-w-0">
                    {editingRegistration ? (
                      <Input
                        type="email"
                        value={regContactEmail}
                        onChange={(e) => setRegContactEmail(e.target.value)}
                        className="h-9 max-w-md"
                        autoComplete="email"
                      />
                    ) : (
                      <span className="font-medium">{data.contactEmail ?? "—"}</span>
                    )}
                  </dd>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center">
                  <dt className="text-muted-foreground">Утас:</dt>
                  <dd className="min-w-0">
                    {editingRegistration ? (
                      <Input
                        value={regContactPhone}
                        onChange={(e) => setRegContactPhone(e.target.value)}
                        className="h-9 max-w-md"
                        autoComplete="tel"
                      />
                    ) : (
                      <span className="font-medium">{data.contactPhone ?? "—"}</span>
                    )}
                  </dd>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center">
                  <dt className="text-muted-foreground">Субъектийн төрөл:</dt>
                  <dd className="min-w-0">
                    {editingRegistration ? (
                      <Select
                        value={regSubjectType || "none"}
                        onValueChange={(v) => setRegSubjectType(v === "none" || v == null ? "" : v)}
                      >
                        <SelectTrigger className="h-9 max-w-md">
                          <SelectValue placeholder="Сонгох" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {SUBJECT_TYPE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="font-medium">{data.subjectType ?? "—"}</span>
                    )}
                  </dd>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center">
                  <dt className="text-muted-foreground">Оролцогчийн тоо:</dt>
                  <dd className="min-w-0">
                    {editingRegistration ? (
                      <Select
                        value={regParticipantCount || "none"}
                        onValueChange={(v) => setRegParticipantCount(v === "none" || v == null ? "" : v)}
                      >
                        <SelectTrigger className="h-9 max-w-md">
                          <SelectValue placeholder="Сонгох" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {PARTICIPANT_COUNT_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="font-medium">{data.participantCount ?? "—"}</span>
                    )}
                  </dd>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-start">
                  <dt className="text-muted-foreground pt-2">ТСАХ-ний төрөл:</dt>
                  <dd className="min-w-0">
                    {editingRegistration ? (
                      <div className="rounded-lg border border-input bg-transparent p-3">
                        <div className="flex flex-col gap-2">
                          {TSAH_TYPE_OPTIONS.map((o) => (
                            <label
                              key={o.value}
                              className="flex cursor-pointer items-center gap-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={regCaseTsahTypes.includes(o.value)}
                                onChange={() => {
                                  setRegCaseTsahTypes((prev) =>
                                    prev.includes(o.value)
                                      ? prev.filter((v) => v !== o.value)
                                      : [...prev, o.value]
                                  );
                                }}
                                className="size-4 rounded border-input"
                              />
                              <span>{o.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="font-medium">
                        {Array.isArray(data.caseTsahTypes) && data.caseTsahTypes.length > 0
                          ? data.caseTsahTypes.join(", ")
                          : "—"}
                      </span>
                    )}
                  </dd>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline">
                  <dt className="text-muted-foreground">Оролцож эхэлсэн үе шат:</dt>
                  <dd className="font-medium">{data.caseParticipationStage ?? "—"}</dd>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center">
                  <dt className="text-muted-foreground">Мөрдөн байцаалтын харъяалал:</dt>
                  <dd className="min-w-0">
                    {editingRegistration ? (
                      <Input
                        value={regMordonKharyaalal}
                        onChange={(e) => setRegMordonKharyaalal(e.target.value)}
                        className="h-9 max-w-md"
                      />
                    ) : (
                      <span className="font-medium">{data.mordonBaitsaaltynKharyaalal ?? "—"}</span>
                    )}
                  </dd>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center">
                  <dt className="text-muted-foreground">Прокурорын харъяалал:</dt>
                  <dd className="min-w-0">
                    {editingRegistration ? (
                      <Input
                        value={regProkurorKharyaalal}
                        onChange={(e) => setRegProkurorKharyaalal(e.target.value)}
                        className="h-9 max-w-md"
                      />
                    ) : (
                      <span className="font-medium">{data.prokurorynKharyaalal ?? "—"}</span>
                    )}
                  </dd>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-start">
                  <dt className="text-muted-foreground pt-2">Хэргийн зүйлчлэл:</dt>
                  <dd className="min-w-0">
                    {editingRegistration ? (
                      <div className="relative max-w-md" ref={regClassificationRef}>
                        <button
                          type="button"
                          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm"
                          onClick={() => setRegClassificationOpen((o) => !o)}
                        >
                          <span className="truncate">
                            {regCaseClassificationId
                              ? (detailClassifications.find((c) => c.id === regCaseClassificationId)?.name ??
                                "Сонгогдсон")
                              : "Сонгох"}
                          </span>
                          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                        </button>
                        {regClassificationOpen && (
                          <div className="absolute z-30 mt-1 w-full rounded-md border bg-popover p-2 shadow-md">
                            <Input
                              placeholder="Хайх…"
                              value={regClassificationSearch}
                              onChange={(e) => setRegClassificationSearch(e.target.value)}
                              className="mb-2 h-8 text-sm"
                            />
                            <div className="max-h-48 overflow-y-auto space-y-0.5">
                              <button
                                type="button"
                                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                                onClick={() => {
                                  setRegCaseClassificationId("");
                                  setRegClassificationOpen(false);
                                }}
                              >
                                —
                              </button>
                              {detailClassifications
                                .filter((c) =>
                                  !regClassificationSearch.trim()
                                    ? true
                                    : c.name
                                        .toLowerCase()
                                        .includes(regClassificationSearch.trim().toLowerCase())
                                )
                                .map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                                    onClick={() => {
                                      setRegCaseClassificationId(c.id);
                                      setRegClassificationOpen(false);
                                      setRegClassificationSearch("");
                                    }}
                                  >
                                    {c.name}
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="font-medium">{data.caseClassification?.name ?? "—"}</span>
                    )}
                  </dd>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center">
                  <dt className="text-muted-foreground">Төлөв:</dt>
                  <dd className="min-w-0">
                    {editingRegistration ? (
                      <Select
                        value={regStatus}
                        onValueChange={(v) => {
                          if (v != null) setRegStatus(v);
                        }}
                      >
                        <SelectTrigger className="h-9 max-w-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([k, lbl]) => (
                            <SelectItem key={k} value={k}>
                              {lbl}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <StatusBadge status={data.status} />
                    )}
                  </dd>
                </div>
                {data.status === "CLOSED" && data.closeComment && (
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline">
                    <dt className="text-muted-foreground">Хаасан тайлбар:</dt>
                    <dd className="font-medium whitespace-pre-wrap">{data.closeComment}</dd>
                  </div>
                )}
                {data.status === "CLOSED" && data.closedAt && (
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline">
                    <dt className="text-muted-foreground">Хаагдсан огноо:</dt>
                    <dd className="font-medium">
                      {new Date(data.closedAt).toLocaleString("mn-MN", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </dd>
                  </div>
                )}
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-center">
                  <dt className="text-muted-foreground">Хариуцсан:</dt>
                  <dd className="min-w-0">
                    {editingRegistration ? (
                      <Select
                        value={regAssignedToId || "none"}
                        onValueChange={(v) => setRegAssignedToId(v === "none" || v == null ? "" : v)}
                      >
                        <SelectTrigger className="h-9 max-w-md">
                          <SelectValue placeholder="Сонгох" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {detailUsers.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="font-medium">{data.assignedTo?.name ?? "—"}</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm">
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-start">
                  <dt className="text-muted-foreground">Гэрээ (файлууд):</dt>
                  <dd className="mt-1 min-w-0">
                    {editingRegistration ? (
                      <div className="space-y-2 max-w-md">
                        <div className="flex flex-wrap gap-2">
                          <input
                            id="detail-contract-files"
                            type="file"
                            multiple
                            className="hidden"
                            onChange={async (e) => {
                              const list = e.target.files;
                              if (!list?.length) return;
                              const next: { url: string; title: string }[] = [];
                              for (let i = 0; i < list.length; i++) {
                                const file = list.item(i);
                                if (!file) continue;
                                const fd = new FormData();
                                fd.append("file", file);
                                const up = await fetch("/api/upload", { method: "POST", body: fd });
                                if (up.ok) {
                                  const j = await up.json();
                                  next.push({ url: j.url, title: j.title ?? file.name });
                                }
                              }
                              if (next.length) setRegContractFiles((prev) => [...prev, ...next]);
                              e.target.value = "";
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9"
                            onClick={() => document.getElementById("detail-contract-files")?.click()}
                          >
                            Файл нэмэх
                          </Button>
                        </div>
                        {regContractFiles.length > 0 ? (
                          <ul className="space-y-1 text-sm">
                            {regContractFiles.map((f, i) => (
                              <li key={i} className="flex flex-wrap items-center gap-2">
                                <a
                                  href={f.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary underline truncate max-w-[200px]"
                                >
                                  {f.title || "Файл"}
                                </a>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-destructive"
                                  onClick={() =>
                                    setRegContractFiles((prev) => prev.filter((_, j) => j !== i))
                                  }
                                >
                                  Устгах
                                </Button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-muted-foreground text-sm">Файл байхгүй</span>
                        )}
                      </div>
                    ) : Array.isArray(data.contractFiles) && data.contractFiles.length > 0 ? (
                      <ul className="space-y-1">
                        {data.contractFiles.map((f, i) => (
                          <li key={i}>
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline"
                            >
                              {f.title || "Файл"}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline">
                  <dt className="text-muted-foreground">Гэрээний хөлс:</dt>
                  <dd className="font-medium">
                    {data.contractFee != null ? formatNumberWithCommas(data.contractFee) : "—"}
                  </dd>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline">
                  <dt className="text-muted-foreground">Гэрээний хугацаа:</dt>
                  <dd className="font-medium">{data.contractTerm ?? "—"}</dd>
                </div>
                <div className="flex flex-col gap-1.5">
                  <dt className="text-muted-foreground">Төлбөрийн хуваарь:</dt>
                  <dd className="mt-0">
                    {Array.isArray(data.paymentSchedule) && data.paymentSchedule.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[200px] text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-1 pr-2 text-muted-foreground">Огноо</th>
                              <th className="text-right text-muted-foreground">Дүн</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.paymentSchedule.map((row, i) => (
                              <tr key={i} className="border-b border-border/50">
                                <td className="py-1 pr-2">{row.date}</td>
                                <td className="text-right font-medium">
                                  {formatNumberWithCommas(row.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>
        </>
        )}

        {detailTab === "process" && (
        <>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Ажиллагааны түүх
            </CardTitle>
            {data.steps.some((s) => {
              const eff =
                s.deadline ??
                (s.stageLabel === DAVJ_ZAALDAH_SHUUKH_HURALDAAN_STAGE
                  ? getDavjKhuralynTovDeadlineFromNote(s.note)
                  : s.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE
                    ? getHynaltKhuralynTovDeadlineFromNote(s.note)
                    : null);
              return eff && getDeadlineRemaining(eff)?.isUpcoming;
            }) && (
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                <span className="font-medium">Дуусах хугацаа:</span>{" "}
                {data.steps
                  .map((s) => {
                    const eff =
                      s.deadline ??
                      (s.stageLabel === DAVJ_ZAALDAH_SHUUKH_HURALDAAN_STAGE
                        ? getDavjKhuralynTovDeadlineFromNote(s.note)
                        : s.stageLabel === HYNALT_SHUUKH_HURALDAAN_STAGE
                          ? getHynaltKhuralynTovDeadlineFromNote(s.note)
                          : null);
                    const r = eff ? getDeadlineRemaining(eff) : null;
                    return r?.isUpcoming ? `${s.stageLabel} — ${r.text}` : null;
                  })
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {(() => {
              const allStages = PARTICIPATION_STAGE_VALUES;
              const stepByStage = new Map<string, CaseStep>();
              data.steps.forEach((s) => stepByStage.set(s.stageLabel, s));
              const progressIndex = data.caseProgressStepIndex != null ? Number(data.caseProgressStepIndex) : null;
              const defaultExpanded =
                expandedStepIndex !== null
                  ? expandedStepIndex
                  : progressIndex != null && progressIndex >= 0 && progressIndex < allStages.length
                    ? progressIndex
                    : 0;
              const activeIndex = defaultExpanded >= 0 && defaultExpanded < allStages.length ? defaultExpanded : 0;
              const selectedStageLabel = allStages[activeIndex];
              const selectedStep = selectedStageLabel ? stepByStage.get(selectedStageLabel) ?? null : null;

              return (
              <div className="rounded-lg border border-border bg-muted/20 overflow-x-auto overflow-y-visible">
                <CaseProcessStageTabStrip
                  data={data}
                  expandedStepIndex={expandedStepIndex}
                  setExpandedStepIndex={setExpandedStepIndex}
                  isStepHighlighted={isStepHighlighted}
                />

                {/* Step content */}
                <div className="min-h-[200px]">
                  <div className="p-4">
                    {selectedStageLabel === "Хэрэг хаагдсан" ? (
                      <p className="text-sm text-muted-foreground">
                        Хэрэг хаагдсан.
                      </p>
                    ) : selectedStep ? (
                      selectedStageLabel === "Гомдол мэдээлэл" ? (
                        <GomdolMedeelelContent
                          step={selectedStep}
                          caseId={caseId!}
                          onStepUpdate={(updated) => {
                            setData((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    steps: prev.steps.map((s) => (s.id === selectedStep.id ? { ...s, ...updated } : s)),
                                  }
                                : null
                            );
                          }}
                          onAfterProgressToStep={(stepIndex) => setExpandedStepIndex(stepIndex)}
                          reloadCase={load}
                        />
                      ) : selectedStageLabel === "Хэрэг бүртгэлт" ||
                        selectedStageLabel === "Мөрдөн байцаалт" ||
                        selectedStageLabel === "Прокурорын хяналт" ? (
                        <XeregBurtgelStepContent
                          step={selectedStep}
                          caseId={caseId!}
                          onStepUpdate={(updated) => {
                            setData((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    steps: prev.steps.map((s) => (s.id === selectedStep.id ? { ...s, ...updated } : s)),
                                  }
                                : null
                            );
                          }}
                          onAfterProgressToStep={(stepIndex) => setExpandedStepIndex(stepIndex)}
                          reloadCase={load}
                        />
                      ) : selectedStageLabel === "Шүүхэд хэрэг хүргүүлсэн" ? (
                        <ShuukhHarmgviulStepContent
                          step={selectedStep}
                          caseId={caseId!}
                          savingParticipants={savingStepParticipants === selectedStep.id}
                          onSaveParticipants={saveStepParticipants}
                          onStepUpdate={(updated) => {
                            setData((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    steps: prev.steps.map((s) => (s.id === selectedStep.id ? { ...s, ...updated } : s)),
                                  }
                                : null
                            );
                          }}
                          onAfterProgressToStep={(stepIndex) => setExpandedStepIndex(stepIndex)}
                          reloadCase={load}
                        />
                      ) : selectedStageLabel === "Урьдчилсан хэлэлцүүлэг" ? (
                        <UridchilisanHeleltsuulegStepContent
                          step={selectedStep}
                          caseId={caseId!}
                          caseProgressStepIndex={data.caseProgressStepIndex ?? null}
                          uridEnterFromStep5Key={uridEnterFromStep5Key}
                          onStepUpdate={(updated) => {
                            setData((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    steps: prev.steps.map((s) => (s.id === selectedStep.id ? { ...s, ...updated } : s)),
                                  }
                                : null
                            );
                          }}
                          onAfterProgressToStep={(stepIndex) => setExpandedStepIndex(stepIndex)}
                          reloadCase={load}
                        />
                      ) : (
                        <StepDetailContent
                          step={selectedStep}
                          caseId={caseId!}
                          caseStatus={data.status}
                          onCaseStatusChange={(status) =>
                            setData((prev) => (prev ? { ...prev, status } : null))
                          }
                          savingParticipants={savingStepParticipants === selectedStep.id}
                          onSaveParticipants={saveStepParticipants}
                          onStepUpdate={(updated) => {
                            setData((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    steps: prev.steps.map((s) => (s.id === selectedStep.id ? { ...s, ...updated } : s)),
                                  }
                                : null
                            );
                          }}
                          onAfterProgressToStep={(stepIndex) => setExpandedStepIndex(stepIndex)}
                          reloadCase={load}
                        />
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        &quot;{selectedStageLabel}&quot; үе шатанд оруулсан мэдээлэл байхгүй байна.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              );
            })()}
          </CardContent>
        </Card>
        </>
        )}

        {detailTab === "history" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Үйл явцын түүх</CardTitle>
              <p className="text-xs text-muted-foreground">
                Энэ хэрэгт холбоотой үйлдлийн бүртгэл (нээлт, шинэчлэлт, алхам нэмэх г.м.).
              </p>
            </CardHeader>
            <CardContent>
              {caseHistoryLoading ? (
                <p className="text-sm text-muted-foreground">Ачаалж байна…</p>
              ) : !caseHistoryLogs || caseHistoryLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Одоогоор түүхийн бүртгэл алга.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-36 whitespace-nowrap">Огноо</TableHead>
                        <TableHead>Хийгдсэн ажиллагаа</TableHead>
                        <TableHead className="w-40">Хэрэглэгч</TableHead>
                        <TableHead className="w-20 text-end whitespace-nowrap"> </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {caseHistoryLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString("mn-MN", {
                              year: "numeric",
                              month: "short",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell className="max-w-md text-sm">
                            {log.message?.trim() ? log.message : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {log.user?.name ?? "—"}
                          </TableCell>
                          <TableCell className="text-end align-top">
                            <div className="flex flex-row items-center justify-end gap-1">
                              {parseAuditStepId(log.data) ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon-sm"
                                  title="Тэмдэглэл"
                                  aria-label="Тухайн үе шатны тэмдэглэл харах"
                                  onClick={() => setHistoryNotesLog(log)}
                                >
                                  <StickyNote className="size-4" aria-hidden />
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                title="Файл"
                                aria-label="Хавсаргасан файл харах"
                                onClick={() => setHistoryFilesLog(log)}
                              >
                                <FolderOpen className="size-4" aria-hidden />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog
          open={closeCaseDialogOpen}
          onOpenChange={(open) => {
            setCloseCaseDialogOpen(open);
            if (!open) {
              setCloseCaseError("");
              setClosePinCells(emptyPinCells(4));
              setCloseComment("");
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Хэрэг хаах</DialogTitle>
              <DialogDescription>
                PIN код болон хаасан шалтгааны тайлбар оруулна уу. Тохиргооноос PIN өөрчлөх боломжтой.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-3">
                <Label>PIN код</Label>
                <PinCodeInput
                  key={closeCaseDialogOpen ? "open" : "closed"}
                  value={closePinCells}
                  onChange={setClosePinCells}
                  length={4}
                  disabled={closingCase}
                  autoFocus={closeCaseDialogOpen}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="close-comment">Хаах шалтгаан / тайлбар</Label>
                <Textarea
                  id="close-comment"
                  value={closeComment}
                  onChange={(e) => setCloseComment(e.target.value)}
                  rows={3}
                  placeholder="Заавал бөглөнө"
                />
              </div>
              {closeCaseError && (
                <p className="text-sm text-destructive">{closeCaseError}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCloseCaseDialogOpen(false)}>
                Болих
              </Button>
              <Button type="button" onClick={submitCloseCase} disabled={closingCase}>
                {closingCase ? "Хааж байна…" : "Хаах"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={historyNotesLog !== null} onOpenChange={(open) => !open && setHistoryNotesLog(null)}>
          <DialogContent className="max-w-md sm:max-w-xl h-dvh max-h-dvh min-h-0 overflow-hidden">
            <DialogHeader className="shrink-0">
              <DialogTitle>Тэмдэглэл</DialogTitle>
              <DialogDescription className="space-y-1">
                {historyNotesLog && (
                  <>
                    <span className="block text-foreground/90">
                      {CASE_HISTORY_ACTION_LABELS[historyNotesLog.action] ?? historyNotesLog.action}
                      {historyNotesLog.message?.trim() ? ` — ${historyNotesLog.message}` : ""}
                    </span>
                    <span className="block text-xs">
                      {new Date(historyNotesLog.createdAt).toLocaleString("mn-MN", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            {data && historyNotesLog && (
              <div className="min-h-0 flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
                {(() => {
                  const stepId = parseAuditStepId(historyNotesLog.data);
                  const auditStageLabel = parseAuditStageLabel(historyNotesLog.data);
                  const step = stepId ? data.steps.find((s) => s.id === stepId) : undefined;

                  if (!stepId) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        Энэ үйл явцын түүхийн бүртгэл тодорхой алхамтай холбогдоогүй тул тухайн үе шатны тэмдэглэл
                        харуулах боломжгүй.
                      </p>
                    );
                  }

                  if (!step) {
                    return (
                      <div className="space-y-2 rounded-lg border border-border/70 bg-muted/15 px-3 py-2.5">
                        <div className="text-xs font-medium text-muted-foreground">
                          {auditStageLabel ?? "Алхам"}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Энэ алхам одоогийн хэрэгт олдсонгүй (устгагдсан эсвэл шилжсэн байж магадгүй).
                        </p>
                      </div>
                    );
                  }

                  const body = formatCaseStepNoteForDisplay(step.note);
                  return (
                    <section className="rounded-lg border border-border/80 bg-background px-3 py-2.5">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {step.stageLabel}
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                        {body.trim() ? body : "—"}
                      </p>
                    </section>
                  );
                })()}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={historyFilesLog !== null} onOpenChange={(open) => !open && setHistoryFilesLog(null)}>
          <DialogContent className="max-w-md sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Хавсралтай файл</DialogTitle>
              <DialogDescription className="space-y-1">
                {historyFilesLog && (
                  <>
                    <span className="block text-foreground/90">
                      {CASE_HISTORY_ACTION_LABELS[historyFilesLog.action] ?? historyFilesLog.action}
                      {historyFilesLog.message ? ` — ${historyFilesLog.message}` : ""}
                    </span>
                    <span className="block text-xs">
                      {new Date(historyFilesLog.createdAt).toLocaleString("mn-MN", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            {historyFilesLog &&
              (() => {
                const rowFiles = parseAuditAttachmentsFromData(historyFilesLog.data);
                return rowFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Энэ үйлдлийн түүхэнд хадгалсан хавсаргасан файл байхгүй (эсвэл хуучин бүртгэл — тухайн үед файл
                    холбогдоогүй).
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">
                      Зөвхөн энэ үйлдлээр холбогдсон файл.
                    </p>
                    <details open className="rounded-md border border-border/70 bg-muted/15 px-3 py-2">
                      <summary className="cursor-pointer list-none text-sm font-medium [&::-webkit-details-marker]:hidden flex items-center gap-2 select-none">
                        <FolderOpen className="size-4 shrink-0 text-amber-600/90" aria-hidden />
                        Файлууд ({rowFiles.length})
                      </summary>
                      <ul className="mt-3 space-y-2 pl-1">
                        {rowFiles.map((f, i) => (
                          <li key={`${f.url}-${i}`} className="flex items-start gap-2 text-xs">
                            <FileText className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" aria-hidden />
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline underline-offset-2 break-all hover:text-primary/90"
                            >
                              {f.title || "Файл"}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </>
                );
              })()}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

