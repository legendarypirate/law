/**
 * Audit log `data.attachments`: files tied to that single history row (not whole case).
 */
export type AuditAttachment = { title: string; url: string };

export function parseAuditAttachmentsFromData(data: unknown): AuditAttachment[] {
  if (!data || typeof data !== "object") return [];
  const raw = (data as { attachments?: unknown }).attachments;
  if (!Array.isArray(raw)) return [];
  const out: AuditAttachment[] = [];
  for (const x of raw) {
    if (x && typeof x === "object" && typeof (x as { url?: unknown }).url === "string") {
      const url = (x as { url: string }).url;
      if (!url) continue;
      out.push({
        url,
        title: typeof (x as { title?: unknown }).title === "string" ? (x as { title: string }).title : "Файл",
      });
    }
  }
  return out;
}

export function attachmentsFromDocuments(
  docs: { title: string; url: string | null }[]
): AuditAttachment[] {
  return docs
    .filter((d): d is { title: string; url: string } => Boolean(d.url))
    .map((d) => ({ title: d.title, url: d.url }));
}

export function attachmentsFromContractFilesInput(input: unknown): AuditAttachment[] {
  if (!Array.isArray(input)) return [];
  const out: AuditAttachment[] = [];
  for (const x of input) {
    if (x && typeof x === "object" && typeof (x as { url?: unknown }).url === "string") {
      const url = (x as { url: string }).url;
      if (!url) continue;
      out.push({
        title: typeof (x as { title?: unknown }).title === "string" ? (x as { title: string }).title : "Файл",
        url,
      });
    }
  }
  return out;
}

/** Same shape as step note JSON (gomdol / step2 fields with file arrays). */
export function extractFilesFromCaseNoteJson(note: string | null): AuditAttachment[] {
  if (!note?.trim()) return [];
  try {
    const o = JSON.parse(note) as Record<string, unknown>;
    const result: AuditAttachment[] = [];
    const addFromFiles = (files: unknown) => {
      if (!Array.isArray(files)) return;
      for (const f of files) {
        if (f && typeof f === "object") {
          const url = typeof (f as { url?: unknown }).url === "string" ? (f as { url: string }).url : "";
          const title =
            typeof (f as { title?: unknown }).title === "string" ? (f as { title: string }).title : "Файл";
          if (url) result.push({ title, url });
        }
      }
    };
    const om = o.omgoologchHuseltGomdol;
    if (Array.isArray(om)) {
      for (const entry of om) {
        if (entry && typeof entry === "object") addFromFiles((entry as { files?: unknown }).files);
      }
    }
    const cl = o.complaintLevels;
    if (cl && typeof cl === "object" && !Array.isArray(cl)) {
      for (const key of ["duurgiin", "niislel", "ulsynEronhii"] as const) {
        const level = (cl as Record<string, unknown>)[key];
        if (!level || typeof level !== "object") continue;
        const pc = (level as { participantComplaint?: { files?: unknown } }).participantComplaint;
        addFromFiles(pc?.files);
        const pr = (level as { prosecutorResponse?: { files?: unknown } }).prosecutorResponse;
        addFromFiles(pr?.files);
      }
    }
    const pdb = o.prosecutorDecisionBlocks;
    if (Array.isArray(pdb)) {
      for (const b of pdb) {
        if (b && typeof b === "object") addFromFiles((b as { files?: unknown }).files);
      }
    }
    return result;
  } catch {
    return [];
  }
}

/** Files that appear in newNote but not in oldNote (by URL). */
export function diffNoteFileAttachments(oldNote: string | null, newNote: string | null): AuditAttachment[] {
  const oldUrls = new Set(extractFilesFromCaseNoteJson(oldNote).map((f) => f.url));
  return extractFilesFromCaseNoteJson(newNote).filter((f) => !oldUrls.has(f.url));
}

export function mergeAttachmentsDedupe(...lists: AuditAttachment[][]): AuditAttachment[] {
  const seen = new Set<string>();
  const out: AuditAttachment[] = [];
  for (const list of lists) {
    for (const a of list) {
      if (seen.has(a.url)) continue;
      seen.add(a.url);
      out.push(a);
    }
  }
  return out;
}
