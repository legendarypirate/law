"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight, ChevronUp, Plus } from "lucide-react";
import { PARTICIPATION_STAGE_VALUES } from "@/lib/caseStages";
import { cn, formatNumberWithCommas } from "@/lib/utils";

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

const PARTICIPANT_ROLES: { key: string; label: string }[] = [
  { key: "judge", label: "Шүүгчийн нэр" },
  { key: "defendant", label: "Шүүгдэгчийн нэр" },
  { key: "prosecutor", label: "Улсын яллагч" },
  { key: "attorney", label: "Өмгөөлөгч" },
  { key: "victim", label: "Хохирогч" },
  { key: "witness", label: "Гэрч" },
  { key: "expert", label: "Шинжээч" },
];

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
  const out: Record<string, string[]> = {
    judge: [], defendant: [], prosecutor: [], attorney: [], victim: [], witness: [], expert: [],
  };
  for (const p of participants) {
    if (out[p.role]) out[p.role].push(p.name);
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

      {/* Documents section: upload (Cloudinary), view, edit title, delete */}
      <div className="mt-4 space-y-3">
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

      <StepParticipantsEditor
        step={step}
        saving={savingParticipants}
        onSave={onSaveParticipants}
      />
    </>
  );
}

const PROSECUTOR_DECISION_OPTIONS = [
  "Хэрэг бүртгэлтийн хэрэг нээх",
  "Хэрэг бүртгэлтийн хэрэг нээхээс татгалзах",
  "Харьяаллын дагуу шилжүүлэх",
  "Эрүүгийн хэрэг үүсгэж яллагдагчаар татах",
] as const;

/** Step 2 (Хэрэг бүртгэлт) prosecutor decision: Ажиллагаатай холбоотой (first 5) */
const PROSECUTOR_DECISION_STEP2_AJILLAGAATAI = [
  "Прокурорын зөвшөөрөл",
  "Прокурорын даалгавар",
  "Прокурорын тогтоол",
  "Сэжигтнийг баривчилсныг хүчинтэйд тооцуулах",
  "Хэрэг бүртгэлийн хугацааг сунгах",
] as const;
/** Step 2: Хэрэг бүртгэлийн хэрэгтэй холбоотой (last 2) */
const PROSECUTOR_DECISION_STEP2_XEREG_BURTGEL = [
  "Хэрэг бүртгэлийн хэргийг хаах",
  "Эрүүгийн хэрэг үүсгэж яллагдагчаар татах",
] as const;
const STEP2_CATEGORY_AJILLAGAATAI = "Ажиллагаатай холбоотой";
const STEP2_CATEGORY_XEREG_BURTGEL = "Хэрэг бүртгэлийн хэрэгтэй холбоотой";

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

/** One prosecutor decision block; when decision is "Харьяаллын дагуу шилжүүлэх", transferAddress is used; note used in step 2. decisionCategory used in step 2 to show Ажиллагаатай vs Хэрэг бүртгэлийн хэрэгтэй. */
type ProsecutorDecisionBlock = {
  decision: string;
  followUp: string;
  transferAddress: string;
  note: string;
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
  const oneBlock = (): ProsecutorDecisionBlock[] => [{ decision: "", followUp: "", transferAddress: "", note: "" }];
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
          const x = b as { decision?: unknown; followUp?: unknown; transferAddress?: unknown; note?: unknown; decisionCategory?: unknown };
          return {
            decision: typeof x.decision === "string" ? x.decision : "",
            followUp: typeof x.followUp === "string" ? x.followUp : "",
            transferAddress: typeof x.transferAddress === "string" ? x.transferAddress : "",
            note: typeof x.note === "string" ? x.note : "",
            decisionCategory: typeof x.decisionCategory === "string" ? x.decisionCategory : undefined,
          };
        }
        return { decision: "", followUp: "", transferAddress: "", note: "" };
      });
    } else {
      blocks = [
        {
          decision: typeof o.prosecutorDecision === "string" ? o.prosecutorDecision : "",
          followUp: typeof o.prosecutorDecisionFollowUp === "string" ? o.prosecutorDecisionFollowUp : "",
          transferAddress: "",
          note: "",
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
          prosecutorDecisionBlocks: [...blocks, { decision: "", followUp: "", transferAddress: "", note: "" }],
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
      const eruuCombo = decision === "Эрүүгийн хэрэг үүсгэж яллагдагчаар татах";
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
                    <SelectTrigger className="w-full min-w-[200px] max-w-md">
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
                      <SelectTrigger className="w-full min-w-[160px] max-w-xs">
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

/** Step 2 (Хэрэг бүртгэлт): Мөрдөгчийн ажиллагаа + Прокурорын шийдвэр only (same as step 1, no complaint content/levels) */
function XeregBurtgelStepContent({
  step,
  caseId,
  onStepUpdate,
}: {
  step: CaseStep;
  caseId: string;
  onStepUpdate: (updated: Partial<CaseStep>) => void;
}) {
  const [sections, setSections] = useState<GomdolSections>(() => parseGomdolNote(step.note));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [openAddList, setOpenAddList] = useState(false);
  const [investigatorActionTypes, setInvestigatorActionTypes] = useState<InvestigatorActionTypeItem[]>([]);
  const [uploadingOmgoologch, setUploadingOmgoologch] = useState(false);
  const [uploadErrorOmgoologch, setUploadErrorOmgoologch] = useState("");

  useEffect(() => {
    setSections(parseGomdolNote(step.note));
  }, [step.id, step.note]);

  useEffect(() => {
    fetch("/api/investigator-action-types")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setInvestigatorActionTypes(data))
      .catch(() => {});
  }, []);

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
      const res = await fetch(`/api/cases/${caseId}/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: JSON.stringify(sections) }),
      });
      const updated = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(typeof updated?.error === "string" ? updated.error : "Хадгалахад алдаа гарлаа");
        return;
      }
      onStepUpdate({ note: updated.note ?? null });
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
      {/* Мөрдөгчийн ажиллагаа */}
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
              </div>
            ) : (
              <>
                {/* Category: Ажиллагаатай холбоотой (5 options) vs Хэрэг бүртгэлийн хэрэгтэй холбоотой (2 options) */}
                {(() => {
                  const inAjillagaa = (PROSECUTOR_DECISION_STEP2_AJILLAGAATAI as readonly string[]).includes(block.decision);
                  const inXeregBurtgel = (PROSECUTOR_DECISION_STEP2_XEREG_BURTGEL as readonly string[]).includes(block.decision);
                  const currentCategory =
                    block.decisionCategory ||
                    (inAjillagaa ? STEP2_CATEGORY_AJILLAGAATAI : inXeregBurtgel ? STEP2_CATEGORY_XEREG_BURTGEL : "");
                  const options =
                    currentCategory === STEP2_CATEGORY_AJILLAGAATAI
                      ? PROSECUTOR_DECISION_STEP2_AJILLAGAATAI
                      : currentCategory === STEP2_CATEGORY_XEREG_BURTGEL
                        ? PROSECUTOR_DECISION_STEP2_XEREG_BURTGEL
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
                          <SelectTrigger className="w-full max-w-md">
                            <SelectValue placeholder="Сонгох" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Сонгох —</SelectItem>
                            <SelectItem value={STEP2_CATEGORY_AJILLAGAATAI}>{STEP2_CATEGORY_AJILLAGAATAI}</SelectItem>
                            <SelectItem value={STEP2_CATEGORY_XEREG_BURTGEL}>{STEP2_CATEGORY_XEREG_BURTGEL}</SelectItem>
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
                            <SelectTrigger className="w-full min-w-[200px] max-w-md">
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
                })()}
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
                  <SelectTrigger className="w-full max-w-xs">
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
}: {
  step: CaseStep;
  saving: boolean;
  onSave: (stepId: string, participants: Record<string, string[]>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [newNames, setNewNames] = useState<Record<string, string>>({});
  const byRole = participantsByRole(step.participants);

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
      <div className="grid gap-3 sm:grid-cols-2">
        {PARTICIPANT_ROLES.map(({ key, label }) => (
          <div key={key} className="space-y-1.5">
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
        ))}
      </div>
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
  const [detailTab, setDetailTab] = useState<"detail" | "process">("detail");
  const [savingStepParticipants, setSavingStepParticipants] = useState<string | null>(null);

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
                  <SelectTrigger className="w-full max-w-xs h-8 text-xs">
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

        {/* Tabs: Дэлгэрэнгүй | Хэргийн үйл явц */}
        <div className="flex gap-0 border-b border-border">
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
            Хэргийн үйл явц
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

              const step10IsCurrent = progressIndex !== null && progressIndex === 9;
              return (
              <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
                {/* Horizontal tabs: full width; single strikethrough line over steps 2–9 when step 10 is current */}
                <div className="relative flex border-b border-border bg-muted/30">
                  {step10IsCurrent && (
                    <div
                      className="absolute left-[10%] right-[10%] top-[1.25rem] z-10 h-0.5 bg-muted-foreground/80 pointer-events-none"
                      aria-hidden
                    />
                  )}
                  {allStages.map((stageLabel, index) => {
                    const step = stepByStage.get(stageLabel) ?? null;
                    const progressIndexInner = data.caseProgressStepIndex != null ? Number(data.caseProgressStepIndex) : null;
                    const isActive = index === activeIndex;
                    // When step 10 is current (jump from 1 to 10), only step 1 is completed; 2–9 are skipped (no green check)
                    // Otherwise: current step and all previous steps are green checked (index <= progressIndex)
                    const isCompleted = step10IsCurrent
                      ? index === 0
                      : progressIndexInner != null
                        ? index <= progressIndexInner
                        : step != null && index <= activeIndex;
                    const remaining = step ? getDeadlineRemaining(step.deadline) : null;
                    const highlighted = step ? isStepHighlighted(step, index) : false;
                    const showArrowAfter = progressIndexInner != null && progressIndexInner > index && index < allStages.length - 1;
                    return (
                      <Fragment key={stageLabel}>
                        <button
                          type="button"
                          onClick={() => setExpandedStepIndex(index)}
                          className={cn(
                            "flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 border-b-2 px-2 py-2.5 text-center transition-colors",
                            isActive
                              ? "border-primary bg-background text-primary font-medium"
                              : "border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                            highlighted && (isCompleted || isActive) && "border-l-2 border-l-amber-500"
                          )}
                          title={remaining ? `${stageLabel} — ${remaining.text}` : stageLabel}
                        >
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-white",
                              isCompleted ? "bg-green-600" : isActive ? "bg-sky-500" : "bg-slate-400"
                            )}
                          >
                            {isCompleted ? "✓" : index + 1}
                          </span>
                          <span className="text-xs truncate w-full">
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
                          <span className="flex w-6 shrink-0 items-center justify-center text-muted-foreground text-xl font-bold tracking-tight" aria-hidden>
                            ➔
                          </span>
                        )}
                      </Fragment>
                    );
                  })}
                </div>

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
                      ) : selectedStageLabel === "Хэрэг бүртгэлт" ? (
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
      </div>
    </div>
  );
}

