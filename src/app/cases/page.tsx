"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { emptyPinCells, PinCodeInput, pinCellsToString } from "@/components/PinCodeInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PARTICIPATION_STAGE_OPTIONS } from "@/lib/caseStages";

/** Сэргээхэд сонгох үе шат (индекс 0–8), «Хэрэг хаагдсан» биш */
const REOPEN_STAGE_OPTIONS = PARTICIPATION_STAGE_OPTIONS.slice(0, 9);
import { sortCaseClassifications } from "@/lib/caseClassifications";
import { cn, formatNumberWithCommas, parseFormattedNumber, sanitizeNumericInput } from "@/lib/utils";

type Client = { id: string; name: string; email: string | null };
type User = { id: string; name: string; email: string };
type CaseItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
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
  caseClassificationId: string | null;
  caseClassification: { id: string; name: string } | null;
  contractFiles: { url: string; title: string }[] | null;
  contractFee: number | null;
  paymentSchedule: { date: string; amount: number }[] | null;
  contractTerm: string | null;
  client: Client;
  assignedTo: User | null;
};

const CASE_KIND_LABELS: Record<string, string> = {
  judicial: "Шүүхийн",
  non_judicial: "Шүүхийн бус",
};

const JUDICIAL_CATEGORIES = [
  { value: "эрүүгийн", label: "Эрүүгийн" },
  { value: "захиргааны", label: "Захиргааны" },
  { value: "иргэний", label: "Иргэний" },
  { value: "зөрчлийн", label: "Зөрчлийн" },
];

const CIVIL_PROCEDURE_TYPES = [
  { value: "Ердийн", label: "Ердийн" },
  { value: "Хялбаршуулсан", label: "Хялбаршуулсан" },
  { value: "Эвлэрүүлэн зуучлал", label: "Эвлэрүүлэн зуучлал" },
  { value: "Арбитр", label: "Арбитр" },
];

const NON_JUDICIAL_CATEGORIES = [
  { value: "Зөвлөгөө", label: "Зөвлөгөө" },
  { value: "Байнгын гэрээт", label: "Байнгын гэрээт" },
  { value: "Байгуулагад үзүүлэх үйлчилгээ", label: "Байгуулагад үзүүлэх үйлчилгээ" },
  { value: "Тодорхой төрлийн үйлчилгээ", label: "Тодорхой төрлийн үйлчилгээ" },
  { value: "Багц ажил", label: "Багц ажил" },
];

const CLIENT_TYPE_OPTIONS = [
  { value: "Хүн", label: "Хүн" },
  { value: "хуулийн этгээд", label: "хуулийн этгээд" },
];

const SUBJECT_TYPE_OPTIONS = [
  { value: "Хохирогч", label: "Хохирогч" },
  { value: "сэжигтэн", label: "сэжигтэн" },
  { value: "яллагдагч", label: "яллагдагч" },
  { value: "шүүгчдэгч", label: "шүүгчдэгч" },
  { value: "иргэний хариуцагч", label: "иргэний хариуцагч" },
  { value: "иргэний нэхэмжлэгч", label: "иргэний нэхэмжлэгч" },
  { value: "гэрчи", label: "гэрчи" },
  { value: "хуулийн этгээд холбогдсон", label: "хуулийн этгээд холбогдсон" },
];

const PARTICIPANT_COUNT_OPTIONS = [
  { value: "1-5", label: "1-5" },
  { value: "6-10", label: "6-10" },
  { value: "11-с дээш", label: "11-с дээш" },
];

const TSAH_TYPE_OPTIONS = [
  { value: "Үгүй", label: "Үгүй" },
  { value: "Хувийн баталгаа гаргах", label: "Хувийн баталгаа гаргах" },
  { value: "Цагдан хорих", label: "Цагдан хорих" },
  { value: "Түдгэлзүүлэх", label: "Түдгэлзүүлэх" },
  { value: "Хязгаарлалт тогтоох", label: "Хязгаарлалт тогтоох" },
  { value: "Барьцаа авах", label: "Барьцаа авах" },
  { value: "Цэргийн ангийн удирдлагад харгалзуулах", label: "Цэргийн ангийн удирдлагад харгалзуулах" },
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

export default function CasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CaseItem | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [caseKind, setCaseKind] = useState<string>("");
  const [caseJudicialCategory, setCaseJudicialCategory] = useState<string>("");
  const [caseCivilProcedureType, setCaseCivilProcedureType] = useState<string>("");
  const [clientId, setClientId] = useState("");
  const [registerNewClient, setRegisterNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientCompany, setNewClientCompany] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [newClientNotes, setNewClientNotes] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [clientType, setClientType] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [subjectType, setSubjectType] = useState("");
  const [participantCount, setParticipantCount] = useState("");
  const [caseTsahTypes, setCaseTsahTypes] = useState<string[]>([]);
  const [caseParticipationStage, setCaseParticipationStage] = useState("");
  const [mordonBaitsaaltynKharyaalal, setMordonBaitsaaltynKharyaalal] = useState("");
  const [prokurorynKharyaalal, setProkurorynKharyaalal] = useState("");
  const [caseClassificationId, setCaseClassificationId] = useState("");
  const [classifications, setClassifications] = useState<{ id: string; name: string; order: number }[]>([]);
  const [classificationOpen, setClassificationOpen] = useState(false);
  const [classificationSearch, setClassificationSearch] = useState("");
  const classificationDropdownRef = useRef<HTMLDivElement>(null);
  const [contractFiles, setContractFiles] = useState<{ url: string; title: string }[]>([]);
  const [contractFee, setContractFee] = useState("");
  const [paymentSchedule, setPaymentSchedule] = useState<{ date: string; amount: string }[]>([]);
  const [contractTerm, setContractTerm] = useState("");
  const [contractUploading, setContractUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [wizardStep, setWizardStep] = useState(1);
  const [closeTarget, setCloseTarget] = useState<CaseItem | null>(null);
  const [closePinCells, setClosePinCells] = useState<string[]>(() => emptyPinCells(4));
  const [closeComment, setCloseComment] = useState("");
  const [closingCase, setClosingCase] = useState(false);
  const [closeCaseError, setCloseCaseError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CaseItem | null>(null);
  const [deletePinCells, setDeletePinCells] = useState<string[]>(() => emptyPinCells(4));
  const [deletingCase, setDeletingCase] = useState(false);
  const [deleteCaseError, setDeleteCaseError] = useState("");
  const [reopenTarget, setReopenTarget] = useState<CaseItem | null>(null);
  const [reopenStageIndex, setReopenStageIndex] = useState("0");
  const [reopenPinCells, setReopenPinCells] = useState<string[]>(() => emptyPinCells(4));
  const [reopeningCase, setReopeningCase] = useState(false);
  const [reopenError, setReopenError] = useState("");

  const fetchCases = async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search.trim()) params.set("q", search.trim());
    const url = params.toString() ? `/api/cases?${params}` : "/api/cases";
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) setCases(data);
    setLoading(false);
  };

  const fetchClients = async () => {
    const res = await fetch("/api/clients");
    const data = await res.json();
    if (res.ok) {
      setClients(data);
      if (!clientId && data.length) setClientId(data[0].id);
    }
  };

  const fetchUsers = async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    if (res.ok) setUsers(data);
  };

  const fetchClassifications = async () => {
    const res = await fetch("/api/case-classifications");
    const data = await res.json();
    if (res.ok && Array.isArray(data)) {
      setClassifications(sortCaseClassifications(data));
    }
  };

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => fetchCases(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [statusFilter, search]);

  useEffect(() => {
    fetchClients();
    fetchUsers();
    fetchClassifications();
  }, []);

  useEffect(() => {
    if (!classificationOpen) return;
    const handle = (e: MouseEvent) => {
      if (classificationDropdownRef.current && !classificationDropdownRef.current.contains(e.target as Node)) {
        setClassificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [classificationOpen]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setStatus("OPEN");
    setCaseKind("");
    setCaseJudicialCategory("");
    setCaseCivilProcedureType("");
    setClientId(clients[0]?.id || "");
    setRegisterNewClient(clients.length === 0);
    setNewClientName("");
    setNewClientEmail("");
    setNewClientPhone("");
    setNewClientCompany("");
    setNewClientAddress("");
    setNewClientNotes("");
    setAssignedToId("");
    setClientType("");
    setContactEmail("");
    setContactPhone("");
    setSubjectType("");
    setParticipantCount("");
    setCaseTsahTypes([]);
    setCaseParticipationStage("");
    setMordonBaitsaaltynKharyaalal("");
    setProkurorynKharyaalal("");
    setCaseClassificationId("");
    setClassificationOpen(false);
    setClassificationSearch("");
    setContractFiles([]);
    setContractFee("");
    setPaymentSchedule([]);
    setContractTerm("");
    setError("");
    setWizardStep(1);
    setOpen(true);
  };

  const openEdit = (c: CaseItem) => {
    setEditing(c);
    setTitle(c.title);
    setDescription(c.description || "");
    setStatus(c.status);
    setCaseKind(c.caseKind || "");
    setCaseJudicialCategory(c.caseJudicialCategory || "");
    setCaseCivilProcedureType(c.caseCivilProcedureType || "");
    setClientId(c.client.id);
    setAssignedToId(c.assignedTo?.id || "");
    setClientType(c.clientType || "");
    setContactEmail(c.contactEmail || "");
    setContactPhone(c.contactPhone || "");
    setSubjectType(c.subjectType || "");
    setParticipantCount(c.participantCount || "");
    setCaseTsahTypes(Array.isArray(c.caseTsahTypes) ? c.caseTsahTypes : []);
    setCaseParticipationStage(c.caseParticipationStage || "");
    setMordonBaitsaaltynKharyaalal(c.mordonBaitsaaltynKharyaalal || "");
    setProkurorynKharyaalal(c.prokurorynKharyaalal || "");
    setCaseClassificationId(c.caseClassificationId || "");
    setClassificationOpen(false);
    setClassificationSearch("");
    setContractFiles(Array.isArray(c.contractFiles) ? c.contractFiles : []);
    setContractFee(c.contractFee != null ? formatNumberWithCommas(c.contractFee) : "");
    setPaymentSchedule(
      Array.isArray(c.paymentSchedule)
        ? c.paymentSchedule.map((p) => ({ date: p.date || "", amount: formatNumberWithCommas(p.amount ?? 0) }))
        : []
    );
    setContractTerm(c.contractTerm || "");
    setError("");
    setWizardStep(1);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
  };

  const submit = async () => {
    setError("");
    let effectiveClientId = clientId;

    if (!editing) {
      const needNewClient = registerNewClient || clients.length === 0;
      if (needNewClient) {
        if (!newClientName.trim()) {
          setError("Үйлчлүүлэгчийн нэр оруулна уу.");
          return;
        }
      } else if (!clientId) {
        setError("Үйлчлүүлэгч сонгоно уу.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (!editing && (registerNewClient || clients.length === 0)) {
        const cr = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newClientName.trim(),
            email: newClientEmail.trim() || null,
            phone: newClientPhone.trim() || null,
            company: newClientCompany.trim() || null,
            address: newClientAddress.trim() || null,
            notes: newClientNotes.trim() || null,
          }),
        });
        const cd = await cr.json();
        if (!cr.ok) {
          setError(typeof cd.error === "string" ? cd.error : "Үйлчлүүлэгч бүртгэхэд алдаа");
          return;
        }
        effectiveClientId = cd.id as string;
      }

      const url = editing ? `/api/cases/${editing.id}` : "/api/cases";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          status,
          caseKind: caseKind === "judicial" || caseKind === "non_judicial" ? caseKind : null,
          caseJudicialCategory:
            (caseKind === "judicial" || caseKind === "non_judicial") && caseJudicialCategory ? caseJudicialCategory : null,
          caseCivilProcedureType:
            caseKind === "judicial" && caseJudicialCategory === "иргэний" && caseCivilProcedureType ? caseCivilProcedureType : null,
          clientId: effectiveClientId,
          assignedToId: assignedToId || null,
          clientType: clientType || null,
          contactEmail: contactEmail.trim() || null,
          contactPhone: contactPhone.trim() || null,
          subjectType: subjectType || null,
          participantCount: participantCount || null,
          caseTsahTypes: caseTsahTypes.length ? caseTsahTypes : null,
          caseParticipationStage: caseParticipationStage || null,
          mordonBaitsaaltynKharyaalal: mordonBaitsaaltynKharyaalal.trim() || null,
          prokurorynKharyaalal: prokurorynKharyaalal.trim() || null,
          caseClassificationId: caseClassificationId || null,
          contractFiles: contractFiles.length ? contractFiles : null,
          contractFee: contractFee.trim() ? parseFormattedNumber(contractFee) : null,
          paymentSchedule:
            paymentSchedule.length > 0
              ? paymentSchedule
                  .map((p) => ({ date: p.date.trim(), amount: parseFormattedNumber(p.amount) }))
                  .filter((p) => p.date)
              : null,
          contractTerm: contractTerm.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Request failed");
        return;
      }
      closeModal();
      fetchCases();
      fetchClients();
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteCase = (c: CaseItem) => {
    setDeleteTarget(c);
    setDeletePinCells(emptyPinCells(4));
    setDeleteCaseError("");
  };

  const submitDeleteCase = async () => {
    if (!deleteTarget) return;
    setDeleteCaseError("");
    setDeletingCase(true);
    try {
      const res = await fetch(`/api/cases/${deleteTarget.id}/delete-with-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinCellsToString(deletePinCells) }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteCaseError(typeof payload?.error === "string" ? payload.error : "Алдаа гарлаа");
        return;
      }
      const t = deleteTarget.title;
      setDeleteTarget(null);
      fetchCases();
      window.alert(`«${t}» хэрэг устгагдлаа.`);
    } finally {
      setDeletingCase(false);
    }
  };

  const openReopenCase = (c: CaseItem) => {
    if (c.status !== "CLOSED") return;
    setReopenTarget(c);
    setReopenStageIndex("0");
    setReopenPinCells(emptyPinCells(4));
    setReopenError("");
  };

  const submitReopen = async () => {
    if (!reopenTarget) return;
    const stageIndex = parseInt(reopenStageIndex, 10);
    if (Number.isNaN(stageIndex) || stageIndex < 0 || stageIndex >= REOPEN_STAGE_OPTIONS.length) {
      setReopenError("Үе шат сонгоно уу");
      return;
    }
    setReopenError("");
    setReopeningCase(true);
    try {
      const res = await fetch(`/api/cases/${reopenTarget.id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: pinCellsToString(reopenPinCells),
          caseProgressStepIndex: stageIndex,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReopenError(typeof payload?.error === "string" ? payload.error : "Алдаа гарлаа");
        return;
      }
      const t = reopenTarget.title;
      setReopenTarget(null);
      fetchCases();
      window.alert(`«${t}» хэрэг сэргээгдлээ.`);
    } finally {
      setReopeningCase(false);
    }
  };

  const openCloseCase = (c: CaseItem) => {
    if (c.status === "CLOSED") return;
    setCloseTarget(c);
    setClosePinCells(emptyPinCells(4));
    setCloseComment("");
    setCloseCaseError("");
  };

  const submitCloseCase = async () => {
    if (!closeTarget || closeTarget.status === "CLOSED") return;
    setCloseCaseError("");
    setClosingCase(true);
    try {
      const res = await fetch(`/api/cases/${closeTarget.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinCellsToString(closePinCells), comment: closeComment }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCloseCaseError(typeof payload?.error === "string" ? payload.error : "Алдаа гарлаа");
        return;
      }
      const closedTitle = closeTarget.title;
      setCloseTarget(null);
      fetchCases();
      window.alert(`«${closedTitle}» хэрэг амжилттай хаагдлаа.`);
    } finally {
      setClosingCase(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Хэргүүд
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="search"
            placeholder="Хэрэг, харилцагч хайх…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 min-w-0 sm:w-56"
          />
          <Select
            value={statusFilter || "all"}
            onValueChange={(v) => setStatusFilter(v === "all" || v == null ? "" : v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Бүх төлөв" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх төлөв</SelectItem>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate}>Хэрэг нэмэх</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Ачаалж байна…</p>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Гарчиг</TableHead>
                <TableHead>Үйлчлүүлэгч</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead>Хариуцсан</TableHead>
                <TableHead className="w-24">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/cases/${c.id}`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {c.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.client.name}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.assignedTo?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-primary"
                      onClick={() => openEdit(c)}
                    >
                      Засах
                    </Button>
                    <span className="mx-1 text-muted-foreground">·</span>
                    {c.status !== "CLOSED" && (
                      <>
                        <Button
                          variant="link"
                          className="h-auto p-0 text-primary"
                          onClick={() => openCloseCase(c)}
                        >
                          Хэрэг хаах
                        </Button>
                        <span className="mx-1 text-muted-foreground">·</span>
                      </>
                    )}
                    {c.status === "CLOSED" && (
                      <>
                        <Button
                          variant="link"
                          className="h-auto p-0 text-primary"
                          onClick={() => openReopenCase(c)}
                        >
                          Сэргээх
                        </Button>
                        <span className="mx-1 text-muted-foreground">·</span>
                      </>
                    )}
                    <Button
                      variant="link"
                      className="h-auto p-0 text-destructive hover:text-destructive"
                      onClick={() => openDeleteCase(c)}
                    >
                      Устгах
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog
        open={closeTarget !== null}
        onOpenChange={(v) => {
          if (!v) {
            setCloseTarget(null);
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
              {closeTarget ? `«${closeTarget.title}» — PIN болон тайлбар оруулна уу.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-3">
              <Label>PIN код</Label>
              <PinCodeInput
                key={closeTarget?.id ?? "pin"}
                value={closePinCells}
                onChange={setClosePinCells}
                length={4}
                disabled={closingCase}
                autoFocus={closeTarget !== null}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cases-close-comment">Хаах шалтгаан / тайлбар</Label>
              <Textarea
                id="cases-close-comment"
                value={closeComment}
                onChange={(e) => setCloseComment(e.target.value)}
                rows={3}
                placeholder="Заавал бөглөнө"
              />
            </div>
            {closeCaseError && <p className="text-sm text-destructive">{closeCaseError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCloseTarget(null)}>
              Болих
            </Button>
            <Button type="button" onClick={submitCloseCase} disabled={closingCase}>
              {closingCase ? "Хааж байна…" : "Хаах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteTarget(null);
            setDeleteCaseError("");
            setDeletePinCells(emptyPinCells(4));
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Хэрэг устгах</DialogTitle>
            <DialogDescription>
              {deleteTarget ? `«${deleteTarget.title}» — бүрмэлсэнгүй устгана. PIN оруулна уу.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-3">
              <Label>PIN код</Label>
              <PinCodeInput
                key={deleteTarget?.id ?? "del-pin"}
                value={deletePinCells}
                onChange={setDeletePinCells}
                length={4}
                disabled={deletingCase}
                autoFocus={deleteTarget !== null}
              />
            </div>
            {deleteCaseError && <p className="text-sm text-destructive">{deleteCaseError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Болих
            </Button>
            <Button type="button" variant="destructive" onClick={submitDeleteCase} disabled={deletingCase}>
              {deletingCase ? "Устгаж байна…" : "Устгах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reopenTarget !== null}
        onOpenChange={(v) => {
          if (!v) {
            setReopenTarget(null);
            setReopenStageIndex("0");
            setReopenError("");
            setReopenPinCells(emptyPinCells(4));
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Хэрэг сэргээх</DialogTitle>
            <DialogDescription>
              {reopenTarget
                ? `«${reopenTarget.title}» — PIN оруулж, хаалтаас нээх үе шатыг сонгоно уу.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-3">
              <Label>PIN код</Label>
              <PinCodeInput
                key={reopenTarget?.id ?? "reopen-pin"}
                value={reopenPinCells}
                onChange={setReopenPinCells}
                length={4}
                disabled={reopeningCase}
                autoFocus={reopenTarget !== null}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reopen-stage">Сэргээх үе шат</Label>
              <Select
                value={reopenStageIndex}
                onValueChange={(v) => v != null && setReopenStageIndex(v)}
                disabled={reopeningCase}
              >
                <SelectTrigger id="reopen-stage" className="w-full">
                  <SelectValue placeholder="Сонгох" />
                </SelectTrigger>
                <SelectContent>
                  {REOPEN_STAGE_OPTIONS.map((opt, i) => (
                    <SelectItem key={opt.value} value={String(i)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {reopenError && <p className="text-sm text-destructive">{reopenError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReopenTarget(null)} disabled={reopeningCase}>
              Болих
            </Button>
            <Button
              type="button"
              onClick={() => void submitReopen()}
              disabled={reopeningCase || pinCellsToString(reopenPinCells).length < 4}
            >
              {reopeningCase ? "Сэргээж байна…" : "Сэргээх"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={(v) => !v && closeModal()}>
        <DialogContent className="h-full min-h-screen overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Хэрэг засах" : "Шинэ хэрэг"}</DialogTitle>
            <DialogDescription>
              {editing ? "Хэргийн мэдээллийг шинэчлэнэ." : "Шинэ хэрэг үүсгэнэ."}
              <span className="mt-2 block text-muted-foreground">Алхам {wizardStep}/3</span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            {wizardStep === 1 && (
            <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="case-title">Гарчиг *</Label>
                <Input
                  id="case-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Шүүхийн / Шүүхийн бус</Label>
                <Select
                  value={caseKind || "none"}
                  onValueChange={(v) => {
                    setCaseKind(v === "none" || v == null ? "" : v);
                    setCaseJudicialCategory("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <span className="truncate">
                      {caseKind === "judicial"
                        ? CASE_KIND_LABELS.judicial
                        : caseKind === "non_judicial"
                          ? CASE_KIND_LABELS.non_judicial
                          : "Сонгох"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Сонгоогүй —</SelectItem>
                    <SelectItem value="judicial">{CASE_KIND_LABELS.judicial}</SelectItem>
                    <SelectItem value="non_judicial">{CASE_KIND_LABELS.non_judicial}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {caseKind === "judicial" && (
              <div className="space-y-2">
                <Label>Эрүүгийн / Захиргааны / Иргэний / Зөрчлийн</Label>
                <Select
                  value={caseJudicialCategory || "none"}
                  onValueChange={(v) => {
                    const val = v === "none" || v == null ? "" : v;
                    setCaseJudicialCategory(val);
                    if (val !== "иргэний") setCaseCivilProcedureType("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <span className="truncate">
                      {caseJudicialCategory
                        ? JUDICIAL_CATEGORIES.find((j) => j.value === caseJudicialCategory)?.label ?? caseJudicialCategory
                        : "Сонгох"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Сонгоогүй —</SelectItem>
                    {JUDICIAL_CATEGORIES.map((j) => (
                      <SelectItem key={j.value} value={j.value}>
                        {j.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {caseKind === "judicial" && caseJudicialCategory === "иргэний" && (
              <div className="space-y-2">
                <Label>Иргэний хэргийн төрөл</Label>
                <Select
                  value={caseCivilProcedureType || "none"}
                  onValueChange={(v) => setCaseCivilProcedureType(v === "none" || v == null ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <span className="truncate">
                      {caseCivilProcedureType
                        ? CIVIL_PROCEDURE_TYPES.find((c) => c.value === caseCivilProcedureType)?.label ?? caseCivilProcedureType
                        : "Сонгох"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Сонгоогүй —</SelectItem>
                    {CIVIL_PROCEDURE_TYPES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {caseKind === "non_judicial" && (
              <div className="space-y-2">
                <Label>Үйлчилгээний төрөл</Label>
                <Select
                  value={caseJudicialCategory || "none"}
                  onValueChange={(v) => setCaseJudicialCategory(v === "none" || v == null ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <span className="truncate">
                      {caseJudicialCategory
                        ? NON_JUDICIAL_CATEGORIES.find((n) => n.value === caseJudicialCategory)?.label ?? caseJudicialCategory
                        : "Сонгох"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Сонгоогүй —</SelectItem>
                    {NON_JUDICIAL_CATEGORIES.map((n) => (
                      <SelectItem key={n.value} value={n.value}>
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="case-desc">Тайлбар</Label>
              <textarea
                id="case-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className={cn(
                  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                )}
              />
            </div>
            </>
            )}
            {wizardStep === 2 && (
            <div className="space-y-4">
              {!editing && clients.length > 0 && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="case-wizard-register-client"
                    checked={registerNewClient}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setRegisterNewClient(on);
                      if (on) setClientId("");
                      else setClientId(clients[0]?.id || "");
                    }}
                    className="size-4 shrink-0 rounded border-input accent-primary"
                  />
                  <Label htmlFor="case-wizard-register-client" className="cursor-pointer font-normal">
                    Шинээр бүртгэх
                  </Label>
                </div>
              )}
              {!editing && (registerNewClient || clients.length === 0) ? (
                <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">
                    Шинэ үйлчлүүлэгчийг энд бүртгэнэ. Хэрэг үүсгэхтэй зэрэг хадгалагдана.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="case-wizard-nc-name">Нэр *</Label>
                    <Input
                      id="case-wizard-nc-name"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Овог нэр эсвэл байгууллагын нэр"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="case-wizard-nc-email">Имэйл</Label>
                      <Input
                        id="case-wizard-nc-email"
                        type="email"
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="case-wizard-nc-phone">Утас</Label>
                      <Input
                        id="case-wizard-nc-phone"
                        type="tel"
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="case-wizard-nc-company">Байгууллага</Label>
                    <Input
                      id="case-wizard-nc-company"
                      value={newClientCompany}
                      onChange={(e) => setNewClientCompany(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="case-wizard-nc-address">Хаяг</Label>
                    <Input
                      id="case-wizard-nc-address"
                      value={newClientAddress}
                      onChange={(e) => setNewClientAddress(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="case-wizard-nc-notes">Тэмдэглэл</Label>
                    <Input
                      id="case-wizard-nc-notes"
                      value={newClientNotes}
                      onChange={(e) => setNewClientNotes(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Үйлчлүүлэгч *</Label>
                  <Select
                    value={clientId}
                    onValueChange={(v) => setClientId(v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <span className="truncate">
                        {clientId
                          ? clients.find((c) => c.id === clientId)?.name ?? "Үйлчлүүлэгч сонгох"
                          : "Үйлчлүүлэгч сонгох"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Үйлчлүүлэгийн төрөл / Хүн, хуулийн этгээд</Label>
                <Select
                  value={clientType || "none"}
                  onValueChange={(v) => setClientType(v === "none" || v == null ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Сонгох" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Сонгоогүй —</SelectItem>
                    {CLIENT_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Холбоо барих мэдээлэл — Имэйл</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Имэйл"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Холбоо барих мэдээлэл — Утас</Label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Утас"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Субъектийн төрөл</Label>
                <Select
                  value={subjectType || "none"}
                  onValueChange={(v) => setSubjectType(v === "none" || v == null ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <span className="truncate">
                      {subjectType
                        ? SUBJECT_TYPE_OPTIONS.find((s) => s.value === subjectType)?.label ?? subjectType
                        : "Хохирогч, сэжигтэн, яллагдагч… сонгох"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Сонгоогүй —</SelectItem>
                    {SUBJECT_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Оролцогчийн тоо</Label>
                <Select
                  value={participantCount || "none"}
                  onValueChange={(v) => setParticipantCount(v === "none" || v == null ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="1-5, 6-10, 11-с дээш" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Сонгоогүй —</SelectItem>
                    {PARTICIPANT_COUNT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ТСАХ-ний төрөл</Label>
                <div className="rounded-lg border border-input bg-transparent p-3">
                  <div className="flex flex-col gap-2">
                    {TSAH_TYPE_OPTIONS.map((o) => (
                      <label
                        key={o.value}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={caseTsahTypes.includes(o.value)}
                          onChange={() => {
                            setCaseTsahTypes((prev) =>
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
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <Label>Оролцож эхэлсэн үе шат</Label>
                  <Select
                    value={caseParticipationStage || "none"}
                    onValueChange={(v) => setCaseParticipationStage(v === "none" || v == null ? "" : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Сонгох" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Сонгоогүй —</SelectItem>
                      {PARTICIPATION_STAGE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="case-mordon-kharyaalal">Мөрдөн байцаалтын харъяалал</Label>
                  <Input
                    id="case-mordon-kharyaalal"
                    value={mordonBaitsaaltynKharyaalal}
                    onChange={(e) => setMordonBaitsaaltynKharyaalal(e.target.value)}
                    placeholder="Бичнэ үү"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="case-prokuror-kharyaalal">Прокурорын харъяалал</Label>
                  <Input
                    id="case-prokuror-kharyaalal"
                    value={prokurorynKharyaalal}
                    onChange={(e) => setProkurorynKharyaalal(e.target.value)}
                    placeholder="Бичнэ үү"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Хэргийн зүйлчлэл</Label>
                <div className="relative" ref={classificationDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setClassificationOpen((o) => !o);
                      if (!classificationOpen) setClassificationSearch("");
                    }}
                    className={cn(
                      "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm outline-none transition-colors",
                      "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                      "data-[placeholder]:text-muted-foreground"
                    )}
                  >
                    <span className="truncate text-left">
                      {caseClassificationId
                        ? classifications.find((c) => c.id === caseClassificationId)?.name ?? "Сонгосон"
                        : "Сонгох"}
                    </span>
                    <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                  {classificationOpen && (
                    <div className="absolute top-full z-50 mt-1 w-full min-w-[var(--anchor-width)] overflow-hidden rounded-lg border border-input bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
                      <div className="border-b border-input p-1.5">
                        <Input
                          placeholder="Хайх…"
                          value={classificationSearch}
                          onChange={(e) => setClassificationSearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="h-7 text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCaseClassificationId("");
                            setClassificationOpen(false);
                            setClassificationSearch("");
                          }}
                          className={cn(
                            "flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-left text-sm",
                            !caseClassificationId
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          — Сонгоогүй —
                        </button>
                        {classifications
                          .filter((c) =>
                            !classificationSearch.trim()
                              ? true
                              : c.name.toLowerCase().includes(classificationSearch.trim().toLowerCase())
                          )
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setCaseClassificationId(c.id);
                                setClassificationOpen(false);
                                setClassificationSearch("");
                              }}
                              className={cn(
                                "flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-left text-sm",
                                caseClassificationId === c.id
                                  ? "bg-accent text-accent-foreground"
                                  : "hover:bg-muted"
                              )}
                            >
                              {c.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Төлөв</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v ?? "OPEN")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Хариуцсан</Label>
                <Select
                  value={assignedToId || "none"}
                  onValueChange={(v) => setAssignedToId(v === "none" || v == null ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Хэн ч хариуцаагүй" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Хэн ч хариуцаагүй</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            )}
            {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Гэрээ (файлууд)</Label>
                <div className="rounded-lg border border-dashed border-input p-4">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    id="contract-files"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files?.length) return;
                      setContractUploading(true);
                      setError("");
                      try {
                        const formData = new FormData();
                        for (let i = 0; i < files.length; i++) formData.append("files", files[i]);
                        const res = await fetch("/api/upload/cloudinary", { method: "POST", body: formData });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Файл байршуулахад алдаа");
                        const newFiles = (data.uploads || []).map((u: { url: string; title: string }) => ({ url: u.url, title: u.title }));
                        setContractFiles((prev) => [...prev, ...newFiles]);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Файл байршуулахад алдаа");
                      } finally {
                        setContractUploading(false);
                        e.target.value = "";
                      }
                    }}
                    disabled={contractUploading}
                  />
                  <label htmlFor="contract-files" className="flex cursor-pointer flex-col items-center gap-2 text-sm text-muted-foreground">
                    <span>{contractUploading ? "Байршуулж байна…" : "Файл сонгох эсвэл энд чирж хаяна"}</span>
                  </label>
                  {contractFiles.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {contractFiles.map((f, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 text-sm">
                          <a href={f.url} target="_blank" rel="noopener noreferrer" className="truncate text-primary underline">
                            {f.title || "Файл"}
                          </a>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-destructive hover:text-destructive"
                            onClick={() => setContractFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          >
                            Устгах
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contract-fee">Гэрээний хөлс</Label>
                <Input
                  id="contract-fee"
                  type="text"
                  inputMode="decimal"
                  value={contractFee}
                  onChange={(e) => setContractFee(sanitizeNumericInput(e.target.value))}
                  onBlur={() => setContractFee((v) => (v.trim() ? formatNumberWithCommas(parseFormattedNumber(v)) : ""))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Төлбөрийн хуваарь (огноо, дүн)</Label>
                <div className="space-y-2 rounded-lg border border-input p-3">
                  {paymentSchedule.map((row, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <Input
                        type="date"
                        value={row.date}
                        onChange={(e) =>
                          setPaymentSchedule((prev) =>
                            prev.map((r, idx) => (idx === i ? { ...r, date: e.target.value } : r))
                          )
                        }
                        className="w-40"
                      />
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="Дүн"
                        value={row.amount}
                        onChange={(e) =>
                          setPaymentSchedule((prev) =>
                            prev.map((r, idx) => (idx === i ? { ...r, amount: sanitizeNumericInput(e.target.value) } : r))
                          )
                        }
                        onBlur={() =>
                          setPaymentSchedule((prev) =>
                            prev.map((r, idx) =>
                              idx === i
                                ? { ...r, amount: r.amount.trim() ? formatNumberWithCommas(parseFormattedNumber(r.amount)) : "" }
                                : r
                            )
                          )
                        }
                        className="w-32"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setPaymentSchedule((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        Устгах
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentSchedule((prev) => [...prev, { date: "", amount: "" }])}
                  >
                    + Мөр нэмэх
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contract-term">Гэрээний хугацаа</Label>
                <Input
                  id="contract-term"
                  value={contractTerm}
                  onChange={(e) => setContractTerm(e.target.value)}
                  placeholder="Жишээ: 1 жил, 2 сар эсвэл 1 жил 2 сар"
                />
              </div>
            </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              {wizardStep === 1 ? (
                <>
                  <Button type="button" variant="outline" onClick={closeModal}>
                    Цуцлах
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!title.trim()) {
                        setError("Гарчиг оруулна уу.");
                        return;
                      }
                      setError("");
                      setWizardStep(2);
                    }}
                  >
                    Дараах
                  </Button>
                </>
              ) : wizardStep === 2 ? (
                <>
                  <Button type="button" variant="outline" onClick={() => setWizardStep(1)}>
                    Буцаах
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!editing) {
                        const needNew = registerNewClient || clients.length === 0;
                        if (needNew) {
                          if (!newClientName.trim()) {
                            setError("Үйлчлүүлэгчийн нэр оруулна уу.");
                            return;
                          }
                        } else if (!clientId) {
                          setError("Үйлчлүүлэгч сонгоно уу.");
                          return;
                        }
                      }
                      setError("");
                      setWizardStep(3);
                    }}
                  >
                    Дараах
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => setWizardStep(2)}>
                    Буцаах
                  </Button>
                  <Button type="button" disabled={submitting} onClick={submit}>
                    {submitting ? "Хадгалж байна…" : editing ? "Хадгалах" : "Үүсгэх"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
