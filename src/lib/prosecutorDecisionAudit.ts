/**
 * Parse last prosecutor decision block from case step `note` JSON (Гомдол / Хэрэг бүртгэлт).
 */
export type ParsedProsecutorBlock = {
  decision: string;
  decisionCategory?: string;
};

export function parseLastProsecutorBlockFromNote(note: string | null): ParsedProsecutorBlock | null {
  if (!note?.trim()) return null;
  try {
    const o = JSON.parse(note) as { prosecutorDecisionBlocks?: unknown };
    const blocks = o.prosecutorDecisionBlocks;
    if (!Array.isArray(blocks) || blocks.length === 0) return null;
    const last = blocks[blocks.length - 1];
    if (!last || typeof last !== "object") return null;
    const d = last as { decision?: unknown; decisionCategory?: unknown };
    const decision = typeof d.decision === "string" ? d.decision.trim() : "";
    const decisionCategory =
      typeof d.decisionCategory === "string" ? d.decisionCategory.trim() : "";
    return {
      decision,
      ...(decisionCategory ? { decisionCategory } : {}),
    };
  } catch {
    return null;
  }
}

/** Stable string for equality (category + decision). */
export function prosecutorSelectionSignature(block: ParsedProsecutorBlock | null): string {
  if (!block) return "";
  return `${block.decisionCategory ?? ""}\t${block.decision}`;
}

/** Human-readable line for audit / history Тайлбар: main selection. */
export function formatProsecutorSelectionMessage(block: ParsedProsecutorBlock): string {
  const cat = block.decisionCategory?.trim() ?? "";
  const dec = block.decision?.trim() ?? "";
  if (cat && dec) return `${cat} — ${dec}`;
  if (dec) return dec;
  if (cat) return cat;
  return "";
}

export function shouldLogProsecutorSelection(
  prev: ParsedProsecutorBlock | null,
  next: ParsedProsecutorBlock | null
): boolean {
  const prevSig = prosecutorSelectionSignature(prev);
  const nextSig = prosecutorSelectionSignature(next);
  if (prevSig === nextSig) return false;
  const msg = next ? formatProsecutorSelectionMessage(next) : "";
  return Boolean(msg);
}
