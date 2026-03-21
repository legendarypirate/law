import { STEP_PARTICIPANT_ROLES } from "@/lib/stepParticipantRoles";

/** Step note JSON `kind` for «Прокурорын хяналт» (алхам 4). */
export const PROKUROR_HYANGAL_NOTE_KIND = "prokuror_hyangal_v1" as const;

/** Step note JSON `kind` for «Шүүхэд хэрэг хүргүүлсэн» (алхам 5). */
export const SHUUKH_HARMGVIUL_NOTE_KIND = "shuukh_harmgviul_v1" as const;

/** Step note JSON `kind` for «Урьдчилсан хэлэлцүүлэг» (алхам 6). */
export const URIDCHILSAN_HELELTSUULEG_NOTE_KIND = "uridchilisan_heleltsuuleg_v1" as const;

/**
 * Human-readable text from case step `note` JSON (гомдол / хэрэг бүртгэлт г.м.).
 */
export function formatCaseStepNoteForDisplay(note: string | null): string {
  if (!note?.trim()) return "";
  try {
    const o = JSON.parse(note) as Record<string, unknown>;
    const parts: string[] = [];

    if (o.kind === PROKUROR_HYANGAL_NOTE_KIND) {
      const sa = typeof o.supervisionActivities === "string" ? o.supervisionActivities.trim() : "";
      const rc = typeof o.requirementsAndConclusion === "string" ? o.requirementsAndConclusion.trim() : "";
      if (sa) parts.push(`Хяналтын ажиллагаа, тэмдэглэл: ${sa}`);
      if (rc) parts.push(`Шаардлага, дүгнэлт: ${rc}`);
      if (parts.length > 0) return parts.join("\n\n");
    }

    if (o.kind === SHUUKH_HARMGVIUL_NOTE_KIND) {
      const m = typeof o.medeelel === "string" ? o.medeelel.trim() : "";
      const d = typeof o.huleenAwsanOgnoo === "string" ? o.huleenAwsanOgnoo.trim() : "";
      const c = typeof o.huleenAwsanShuuh === "string" ? o.huleenAwsanShuuh.trim() : "";
      const uh =
        o.uridchilisanHeleltsuulegHuseltGargasan === true
          ? "Тийм"
          : o.uridchilisanHeleltsuulegHuseltGargasan === false
            ? "Үгүй"
            : "";
      if (uh) parts.push(`Урьдчилсан хэлэлцүүлэгийн хүсэлт гаргасан эсэх: ${uh}`);
      if (o.uridchilisanHeleltsuulegHuseltGargasan === true) {
        const uo =
          typeof o.uridchilisanHeleltsuulegOgnoo === "string" ? o.uridchilisanHeleltsuulegOgnoo.trim() : "";
        const ht = typeof o.huseltGargasanTal === "string" ? o.huseltGargasanTal.trim() : "";
        const tk = typeof o.tovchKhuraangui === "string" ? o.tovchKhuraangui.trim() : "";
        if (uo) parts.push(`Урьдчилсан хэлэлцүүлэгийн огноо: ${uo}`);
        if (ht) parts.push(`Хүсэлт гаргасан тал: ${ht}`);
        const gfs = o.garagsanHuseltFiles;
        if (Array.isArray(gfs) && gfs.length > 0) {
          const titles = gfs
            .filter((f): f is { title?: unknown } => f != null && typeof f === "object")
            .map((f) => (typeof f.title === "string" && f.title.trim() ? f.title.trim() : "Файл"));
          if (titles.length) parts.push(`Гаргасан хүсэлт (файл): ${titles.join(", ")}`);
        }
        if (tk) parts.push(`Товч хураангүй: ${tk}`);
      }
      if (m) parts.push(`Мэдээлэл: ${m}`);
      if (d) parts.push(`Хүлээн авсан огноо: ${d}`);
      if (c) parts.push(`Хүлээн авсан шүүх: ${c}`);
      if (parts.length > 0) return parts.join("\n\n");
    }

    if (o.kind === URIDCHILSAN_HELELTSUULEG_NOTE_KIND) {
      const sh = typeof o.shiidver === "string" ? o.shiidver.trim() : "";
      const t = typeof o.temdeglel === "string" ? o.temdeglel.trim() : "";
      const ho = typeof o.hoyshluulahOgnoo === "string" ? o.hoyshluulahOgnoo.trim() : "";
      const kt = typeof o.kuuchinTogoldorBolohOgnoo === "string" ? o.kuuchinTogoldorBolohOgnoo.trim() : "";
      const sk = typeof o.shuukhKhuraldaanTov === "string" ? o.shuukhKhuraldaanTov.trim() : "";
      if (sh) parts.push(`Урьдчилсан хэлэлцүүлэгээс гарсан шийдвэр: ${sh}`);
      if (ho) parts.push(`Хойшлуулах огноо: ${ho}`);
      if (kt) parts.push(`Хүчин төгөлдөр болох огноо: ${kt}`);
      if (sk) parts.push(`Шүүх хуралдааны тов: ${sk}`);
      /** Гомдлын талбарууд зөвхөн «Хэргийг прокурорт буцаах» шийдвэрт хадгалагддаг */
      if (sh === "Хэргийг прокурорт буцаах") {
        const gsRaw = typeof o.gomdolEserguutselStatus === "string" ? o.gomdolEserguutselStatus.trim() : "";
        const gomdolStatuses = new Set(["Хүлээгдэж байгаа", "Тийм", "Үгүй"]);
        let gs = gsRaw;
        if (!gomdolStatuses.has(gs)) {
          const ge = o.gomdolEserguutselGarsan;
          if (ge === true) gs = "Тийм";
          else if (ge === false) gs = "Үгүй";
          else gs = "Хүлээгдэж байгаа";
        }
        parts.push(`Гомдол эсэргүүцэл гарсан эсэх: ${gs}`);
        if (gs === "Тийм") {
          const rk =
            typeof o.gomdolEserguutselHeneesRoleKey === "string"
              ? o.gomdolEserguutselHeneesRoleKey.trim()
              : "";
          const heneesExcluded = new Set(["judge", "judgeAssistant"]);
          if (rk && !heneesExcluded.has(rk)) {
            const role = STEP_PARTICIPANT_ROLES.find((r) => r.key === rk);
            parts.push(`Хэнээс: ${role?.label ?? rk}`);
          }
        }
      }
      if (t) parts.push(`Тэмдэглэл: ${t}`);
      if (parts.length > 0) return parts.join("\n\n");
    }

    if (typeof o.complaintContent === "string" && o.complaintContent.trim()) {
      parts.push(o.complaintContent.trim());
    }

    const blocks = o.prosecutorDecisionBlocks;
    if (Array.isArray(blocks)) {
      for (const b of blocks) {
        if (!b || typeof b !== "object") continue;
        const x = b as Record<string, unknown>;
        const cat = typeof x.decisionCategory === "string" ? x.decisionCategory.trim() : "";
        const dec = typeof x.decision === "string" ? x.decision.trim() : "";
        const fu = typeof x.followUp === "string" ? x.followUp.trim() : "";
        const ta = typeof x.transferAddress === "string" ? x.transferAddress.trim() : "";
        const nt = typeof x.note === "string" ? x.note.trim() : "";
        const head = cat && dec ? `${cat} — ${dec}` : cat || dec;
        const rest = [fu, ta, nt].filter(Boolean).join("\n");
        const line = [head, rest].filter(Boolean).join("\n");
        if (line) parts.push(line);
        const files = x.files;
        if (Array.isArray(files) && files.length > 0) {
          const titles = files
            .filter((f): f is { title?: unknown } => f != null && typeof f === "object")
            .map((f) => (typeof f.title === "string" && f.title.trim() ? f.title.trim() : "Файл"));
          if (titles.length) parts.push(`Хавсаргасан файл: ${titles.join(", ")}`);
        }
      }
    }

    const om = o.omgoologchHuseltGomdol;
    if (Array.isArray(om)) {
      for (const e of om) {
        if (!e || typeof e !== "object") continue;
        const t = typeof (e as { type?: unknown }).type === "string" ? (e as { type: string }).type.trim() : "";
        const n = typeof (e as { note?: unknown }).note === "string" ? (e as { note: string }).note.trim() : "";
        if (t || n) parts.push([t, n].filter(Boolean).join(": "));
      }
    }

    const cl = o.complaintLevels;
    if (cl && typeof cl === "object" && !Array.isArray(cl)) {
      const keys = ["duurgiin", "niislel", "ulsynEronhii"] as const;
      const labels: Record<(typeof keys)[number], string> = {
        duurgiin: "Дүүрэг",
        niislel: "Нийслэл",
        ulsynEronhii: "Улсын Ерөнхий прокурор",
      };
      for (const k of keys) {
        const level = (cl as Record<string, unknown>)[k];
        if (!level || typeof level !== "object") continue;
        const pc = (level as { participantComplaint?: { note?: string } }).participantComplaint;
        const pn = pc?.note?.trim();
        if (pn) parts.push(`${labels[k]} — оролцогчийн гомдол: ${pn}`);
      }
    }

    if (Array.isArray(o.investigatorActionIds) && o.investigatorActionIds.length > 0) {
      parts.push(`Мөрдөгчийн сонгосон ажиллагаа: ${o.investigatorActionIds.length} төрөл`);
    }

    if (parts.length > 0) return parts.join("\n\n—\n\n");
  } catch {
    /* fall through */
  }
  return note.trim();
}

export function parseAuditStepId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const id = (data as { stepId?: unknown }).stepId;
  return typeof id === "string" && id.trim() ? id : null;
}

/** Үйл явцын түүхийн `data.stageLabel` (алхам олдохгүй үед харуулах). */
export function parseAuditStageLabel(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const l = (data as { stageLabel?: unknown }).stageLabel;
  return typeof l === "string" && l.trim() ? l.trim() : null;
}
