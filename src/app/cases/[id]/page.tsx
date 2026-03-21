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
  Plus,
  StickyNote,
} from "lucide-react";
import { PARTICIPATION_STAGE_VALUES } from "@/lib/caseStages";
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
import { cn, formatNumberWithCommas } from "@/lib/utils";

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
  caseClassification: { id: string; name: string } | null;
  contractFiles: { url: string; title: string }[] | null;
  contractFee: number | null;
  paymentSchedule: { date: string; amount: number }[] | null;
  contractTerm: string | null;
  caseProgressStepIndex: number | null;
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

function StepDetailContent({
  step,
  caseId,
  savingParticipants,
  onSaveParticipants,
  onStepUpdate,
}: {
  step: CaseStep;
  caseId: string;
  savingParticipants: boolean;
  onSaveParticipants: (stepId: string, participants: Record<string, string[]>) => Promise<void>;
  onStepUpdate: (updated: Partial<CaseStep>) => void;
}) {
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docError, setDocError] = useState("");

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
      {step.note && (
        <p className="mt-2 text-sm text-muted-foreground">{step.note}</p>
      )}

      <StepParticipantsEditor
        step={step}
        saving={savingParticipants}
        onSave={onSaveParticipants}
      />

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
        if (key === "expert") continue;
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
        excludeRoleKeys={["expert"]}
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
      return {
        shiidver: typeof o.shiidver === "string" ? o.shiidver : "",
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
  onStepUpdate,
  onAfterProgressToStep,
  reloadCase,
}: {
  step: CaseStep;
  caseId: string;
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

  /** Хадгалагдсан тэмдэглэл дээр шийдвэр «Хэргийг прокурорт буцаах» болсон үед л гомдлын хэсгийг харуулна */
  const showGomdolEserguutselSection = useMemo(() => {
    const saved = parseUridchilisanHeleltsuulegNote(step.note).shiidver.trim();
    return saved === URIDCHILSAN_SHIIDVER_PROKUROR;
  }, [step.note]);

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
      if (showGomdolEserguutselSection) {
        if (gomdolEserguutselStatus === GOMDOL_ESERGUUTSEL_STATUS_YES) {
          uridGomdolProgressMark = URID_GOMDOL_MARK_SKIP_ANKHAN;
        } else if (gomdolEserguutselStatus === GOMDOL_ESERGUUTSEL_STATUS_NO) {
          uridGomdolProgressMark = URID_GOMDOL_MARK_RETURN_PROKUROR;
        } else {
          uridGomdolProgressMark = null;
        }
      }
      const payload = {
        kind: URIDCHILSAN_HELELTSUULEG_NOTE_KIND,
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

      if (showGomdolEserguutselSection) {
        if (gomdolEserguutselStatus === GOMDOL_ESERGUUTSEL_STATUS_YES && SHUUKH_PROGRESS_DAVJ_ZAALDAN >= 0) {
          const progressRes = await fetch(`/api/cases/${caseId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ caseProgressStepIndex: SHUUKH_PROGRESS_DAVJ_ZAALDAN }),
          });
          if (progressRes.ok) {
            await reloadCase?.();
            onAfterProgressToStep?.(SHUUKH_PROGRESS_DAVJ_ZAALDAN);
          }
        } else if (gomdolEserguutselStatus === GOMDOL_ESERGUUTSEL_STATUS_NO && SHUUKH_PROGRESS_PROKUROR_HYANALT >= 0) {
          const progressRes = await fetch(`/api/cases/${caseId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ caseProgressStepIndex: SHUUKH_PROGRESS_PROKUROR_HYANALT }),
          });
          if (progressRes.ok) {
            await reloadCase?.();
            onAfterProgressToStep?.(SHUUKH_PROGRESS_PROKUROR_HYANALT);
          }
        }
      }

      if (sh === URIDCHILSAN_SHIIDVER_SHILEGUULEH && SHUUKH_PROGRESS_ANKHAN_SHUUKH >= 0) {
        const progressRes = await fetch(`/api/cases/${caseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseProgressStepIndex: SHUUKH_PROGRESS_ANKHAN_SHUUKH }),
        });
        if (progressRes.ok) {
          await reloadCase?.();
          onAfterProgressToStep?.(SHUUKH_PROGRESS_ANKHAN_SHUUKH);
        }
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
        {showGomdolEserguutselSection && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Хэргийг прокурорт буцаах: Гомдол эсэргүүцэл гарсан эсэх</Label>
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
        {!showGomdolEserguutselSection && (
          <div className="space-y-1.5">
            <Label className="text-xs">Урьдчилсан хэлэлцүүлэгээс гарсан шийдвэр</Label>
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
        )}
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
        {shiidver === URIDCHILSAN_SHIIDVER_PROKUROR && !showGomdolEserguutselSection && (
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

const PROSECUTOR_DECISION_OPTIONS = [
  "Хэрэг бүртгэлтийн хэрэг нээх",
  "Хэрэг бүртгэлтийн хэрэг нээхээс татгалзах",
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
        decision === "Хэрэг бүртгэлтийн хэрэг нээхээс татгалзах" && followUp === "Үгүй";
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
                        {PROSECUTOR_DECISION_FOLLOW_UP_OPTIONS.map((opt) => (
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
}: {
  step: CaseStep;
  saving: boolean;
  onSave: (stepId: string, participants: Record<string, string[]>) => Promise<void>;
  excludeRoleKeys?: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [newNames, setNewNames] = useState<Record<string, string>>({});
  const byRole = participantsByRole(step.participants);
  const roles = excludeRoleKeys?.length
    ? PARTICIPANT_ROLES.filter((r) => !excludeRoleKeys.includes(r.key))
    : PARTICIPANT_ROLES;

  const orderedRoles = PARTICIPANT_GRID_ORDER_KEYS.map((k) => roles.find((r) => r.key === k)).filter(
    (r): r is (typeof roles)[number] => r != null
  );

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

  const renderRoleColumn = (key: string, label: string, className?: string) => (
    <div key={key} className={cn("space-y-1.5", className)}>
      <Label className="text-xs">{label}</Label>
      <ul className="flex flex-wrap gap-1">
        {(byRole[key] || []).map((name, i) => (
          <li key={`${key}-${i}`} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs">
            <span>{name}</span>
            {editing && (
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
      {editing && (
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

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Оролцогчид (алхам дээр)
        </span>
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
      </div>
      {orderedRoles.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {orderedRoles.map(({ key, label }, i) => {
            const lastAlone = orderedRoles.length % 2 === 1 && i === orderedRoles.length - 1;
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
  /** «Хаах» хаана хадгалснаас хамааран цурам эхлэх индекс (дугуй 2 = index 1). */
  const strikeStartIndex = closeCaseDecisionAt != null ? closeCaseDecisionAt + 1 : 1;

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

  return (
    <div ref={containerRef} className="relative flex border-b border-border bg-muted/30">
      {allStages.map((stageLabel, index) => {
        const step = stepByStage.get(stageLabel) ?? null;
        const progressIndexInner = data.caseProgressStepIndex != null ? Number(data.caseProgressStepIndex) : null;
        const isActive = index === activeIndex;
        const skipStrikeIndex =
          uridSkippedAnkhanShuukh && SHUUKH_PROGRESS_ANKHAN_SHUUKH >= 0 ? SHUUKH_PROGRESS_ANKHAN_SHUUKH : -1;
        const isCompleted = step10IsCurrent
          ? index === 0 || (closeCaseDecisionAt != null && index <= closeCaseDecisionAt)
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
          aria-label="Урьдчилсан хэлэлцүүлгээс Прокурорын хяналт руу буцсан"
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
  const [caseTypes, setCaseTypes] = useState<{ id: string; name: string; categories: { id: string; name: string }[] }[]>([]);
  const [updatingCase, setUpdatingCase] = useState(false);
  const [closingCase, setClosingCase] = useState(false);
  const [detailTab, setDetailTab] = useState<"detail" | "process" | "history">("detail");
  const [savingStepParticipants, setSavingStepParticipants] = useState<string | null>(null);
  const [caseHistoryLogs, setCaseHistoryLogs] = useState<CaseAuditLog[] | null>(null);
  const [caseHistoryLoading, setCaseHistoryLoading] = useState(false);
  /** Audit row whose attachments drawer is open */
  const [historyFilesLog, setHistoryFilesLog] = useState<CaseAuditLog | null>(null);
  /** Audit row from which “View Note” was opened (drawer shows case + step notes) */
  const [historyNotesLog, setHistoryNotesLog] = useState<CaseAuditLog | null>(null);

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

  const closeCase = async () => {
    if (!caseId || !data || data.status === "CLOSED") return;
    if (!confirm("Хэргийг хаах уу?")) return;
    setClosingCase(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });
      if (res.ok) {
        setData((prev) => (prev ? { ...prev, status: "CLOSED" } : null));
      }
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
                  onClick={closeCase}
                  disabled={closingCase}
                >
                  {closingCase ? "Хааж байна…" : "Хэрэг хаах"}
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
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Хэргийн бүртгэлийн мэдээлэл
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm">
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">Гарчиг:</dt><dd className="font-medium">{data.title}</dd></div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">Шүүхийн / Шүүхийн бус:</dt><dd className="font-medium">{data.caseKind === "judicial" ? "Шүүхийн" : data.caseKind === "non_judicial" ? "Шүүхийн бус" : "—"}</dd></div>
                {data.caseKind === "judicial" && (
                  <>
                    <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">Ангилал:</dt><dd className="font-medium">{data.caseJudicialCategory ?? "—"}</dd></div>
                    {data.caseJudicialCategory === "иргэний" && (
                      <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">Иргэний төрөл:</dt><dd className="font-medium">{data.caseCivilProcedureType ?? "—"}</dd></div>
                    )}
                  </>
                )}
                {data.caseKind === "non_judicial" && (
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">Үйлчилгээний төрөл:</dt><dd className="font-medium">{data.caseJudicialCategory ?? "—"}</dd></div>
                )}
                {data.description && (
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">Тайлбар:</dt><dd className="mt-0.5 font-medium">{data.description}</dd></div>
                )}
              </dl>
            </div>

            <div>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm">
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">Үйлчлүүлэгч:</dt><dd className="font-medium">{data.client.name}</dd></div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">Үйлчлүүлэгийн төрөл:</dt><dd className="font-medium">{data.clientType ?? "—"}</dd></div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">Имэйл:</dt><dd className="font-medium">{data.contactEmail ?? "—"}</dd></div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">Утас:</dt><dd className="font-medium">{data.contactPhone ?? "—"}</dd></div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">Субъектийн төрөл:</dt><dd className="font-medium">{data.subjectType ?? "—"}</dd></div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">Оролцогчийн тоо:</dt><dd className="font-medium">{data.participantCount ?? "—"}</dd></div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">ТСАХ-ний төрөл:</dt><dd className="font-medium">{Array.isArray(data.caseTsahTypes) && data.caseTsahTypes.length > 0 ? data.caseTsahTypes.join(", ") : "—"}</dd></div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">Оролцож эхэлсэн үе шат:</dt><dd className="font-medium">{data.caseParticipationStage ?? "—"}</dd></div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">Хэргийн зүйлчлэл:</dt><dd className="font-medium">{data.caseClassification?.name ?? "—"}</dd></div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">Төлөв:</dt><dd><StatusBadge status={data.status} /></dd></div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">Хариуцсан:</dt><dd className="font-medium">{data.assignedTo?.name ?? "—"}</dd></div>
              </dl>
            </div>

            <div>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm">
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline">
                  <dt className="text-muted-foreground">Гэрээ (файлууд):</dt>
                  <dd className="mt-1">
                    {Array.isArray(data.contractFiles) && data.contractFiles.length > 0 ? (
                      <ul className="space-y-1">
                        {data.contractFiles.map((f, i) => (
                          <li key={i}>
                            <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{f.title || "Файл"}</a>
                          </li>
                        ))}
                      </ul>
                    ) : "—"}
                  </dd>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">Гэрээний хөлс:</dt><dd className="font-medium">{data.contractFee != null ? formatNumberWithCommas(data.contractFee) : "—"}</dd></div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 items-baseline"><dt className="text-muted-foreground">Гэрээний хугацаа:</dt><dd className="font-medium">{data.contractTerm ?? "—"}</dd></div>
                <div className="flex flex-col gap-1.5">
                  <dt className="text-muted-foreground">Төлбөрийн хуваарь:</dt>
                  <dd className="mt-0">
                    {Array.isArray(data.paymentSchedule) && data.paymentSchedule.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[200px] text-xs">
                          <thead><tr className="border-b"><th className="text-left py-1 pr-2 text-muted-foreground">Огноо</th><th className="text-right text-muted-foreground">Дүн</th></tr></thead>
                          <tbody>
                            {data.paymentSchedule.map((row, i) => (
                              <tr key={i} className="border-b border-border/50"><td className="py-1 pr-2">{row.date}</td><td className="text-right font-medium">{formatNumberWithCommas(row.amount)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : "—"}
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
            {data.steps.some((s) => s.deadline && getDeadlineRemaining(s.deadline)?.isUpcoming) && (
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                <span className="font-medium">Дуусах хугацаа:</span>{" "}
                {data.steps
                  .filter((s) => s.deadline && getDeadlineRemaining(s.deadline)?.isUpcoming)
                  .map((s) => {
                    const r = getDeadlineRemaining(s.deadline!);
                    return r ? `${s.stageLabel} — ${r.text}` : null;
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

