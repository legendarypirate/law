/**
 * Алхам 9 «Хяналтын шатны шүүх хуралдаан» — JSON тэмдэглэл (`note`).
 * Алхам 8-тай ижил бүтэц; «Хэргийг түдгэлзүүлэх»-ийн оронд «Магадлалыг… давж заалдах… буцаах» (9 → 8).
 */

import { parseGomdolGargsanTaluudEntries } from "@/lib/ankhanShuukhShiidverNote";
import {
  DAVJ_KHRALIIN_SHIIDVER_HEVEER_ULDEKH,
  DAVJ_KHRALIIN_SHIIDVER_HUCHINGUI_BOLGOH,
  DAVJ_KHRALIIN_SHIIDVER_HURAL_HOYSHLUULAH,
  DAVJ_KHRALIIN_SHIIDVER_LEGACY_RETURN_ANKHAN_SHUUKH_HURALDAAN,
  DAVJ_KHRALIIN_SHIIDVER_LEGACY_RETURN_PROKUROR_LONG,
  DAVJ_KHRALIIN_SHIIDVER_OORCHLOLT,
  DAVJ_KHRALIIN_SHIIDVER_DAVJ_MAGADLAL_OORCHLOLT,
  DAVJ_KHRALIIN_SHIIDVER_RETURN_ANKHAN_SHUUKH_HURALDAAN,
  DAVJ_KHRALIIN_SHIIDVER_RETURN_PROKUROR,
  DAVJ_KHRALIIN_SHIIDVER_RETURN_URIDCHILSAN_HELELTSUULEG,
  davjKhuraliinShiidverProgressStepIndex,
  davjKhuraliinShiidverProgressWhenGomdolUgvi,
  davjKhuraliinShiidverShowsHoyshluulahDate,
  davjKhuralynTovToDeadlineIso,
  type DavjShuukhHuraldaanFields,
  emptyDavjShuukhHuraldaanFields,
} from "@/lib/davjShuukhHuraldaanNote";
import { PARTICIPATION_STAGE_VALUES } from "@/lib/caseStages";

export const HYNALT_SHUUKH_HURALDAAN_NOTE_KIND = "hynalt_shuukh_huraldaan_v1" as const;

/** Алхам 9 — Шүүхийн нэр тогтмол */
export const HYNALT_SHUUGIIN_NER_STATIC = "УДШ" as const;

/** Алхам 9 — 1-р дэд алхам: «Нийт шүүгчдийн хуралдаанаас гарсан тогтоол» */
export const HYNALT_NIIT_SHUUGCHIDIN_TOGTOOL_HELELTSEKH = "Хэлэлцэхээр шийдвэрлэсэн" as const;
export const HYNALT_NIIT_SHUUGCHIDIN_TOGTOOL_TATGALZSAN = "Хэлэлцэхээс татгалзсан" as const;

export const HYNALT_NIIT_SHUUGCHIDIN_TOGTOOL_OPTIONS = [
  HYNALT_NIIT_SHUUGCHIDIN_TOGTOOL_HELELTSEKH,
  HYNALT_NIIT_SHUUGCHIDIN_TOGTOOL_TATGALZSAN,
] as const;

/** Алхам 8-ын «Хэргийг түдгэлзүүлэх»-ийн оронд — 9-аас 8 руу */
export const HYNALT_KHRALIIN_SHIIDVER_RETURN_TO_DAVJ =
  "Магадлалыг хүчингүй болгож давж заалдах шатны шүүхээр дахин хэлэлцүүлэхээр буцаах" as const;

/** Тогтмол биш хадгалалт / NFC зөрүүг илэрхийлэх */
const HYNALT_RETURN_TO_DAVJ_SUBSTRING =
  "Давж заалдах шатны шүүхээр дахин хэлэлцүүлэхээр буцаах" as const;

export function isHynaltKhuraliinShiidverReturnToDavj(khuraliinShiidver: string): boolean {
  const t = khuraliinShiidver.trim().normalize("NFC");
  if (!t) return false;
  if (t === HYNALT_KHRALIIN_SHIIDVER_RETURN_TO_DAVJ.normalize("NFC")) return true;
  return t.includes(HYNALT_RETURN_TO_DAVJ_SUBSTRING.normalize("NFC"));
}

/** Алхам 9 UI — алхам 8-ын «Анхан шатны шийдвэрт өөрчлөлт оруулах» (канон) сонголтын гарчиг */
export const HYNALT_KHRALIIN_SHIIDVER_OORCHLOLT_DISPLAY =
  "Магадлалыг хүчингүй болгож анхан шатны шүүхийн шийдвэрийг хэвээр үлдээх" as const;

export const HYNALT_KHRALIIN_SHIIDVER_OPTIONS = [
  DAVJ_KHRALIIN_SHIIDVER_HURAL_HOYSHLUULAH,
  DAVJ_KHRALIIN_SHIIDVER_HEVEER_ULDEKH,
  DAVJ_KHRALIIN_SHIIDVER_OORCHLOLT,
  DAVJ_KHRALIIN_SHIIDVER_DAVJ_MAGADLAL_OORCHLOLT,
  DAVJ_KHRALIIN_SHIIDVER_HUCHINGUI_BOLGOH,
  DAVJ_KHRALIIN_SHIIDVER_RETURN_URIDCHILSAN_HELELTSUULEG,
  DAVJ_KHRALIIN_SHIIDVER_RETURN_ANKHAN_SHUUKH_HURALDAAN,
  DAVJ_KHRALIIN_SHIIDVER_RETURN_PROKUROR,
  HYNALT_KHRALIIN_SHIIDVER_RETURN_TO_DAVJ,
] as const;

export type HynaltShuukhHuraldaanFields = DavjShuukhHuraldaanFields;

export function emptyHynaltShuukhHuraldaanFields(): HynaltShuukhHuraldaanFields {
  return {
    ...emptyDavjShuukhHuraldaanFields(),
    shuugiinNer: HYNALT_SHUUGIIN_NER_STATIC,
    shuugch: "",
    shuugchiinTuslah: "",
  };
}

export { davjKhuralynTovToDeadlineIso as hynaltKhuralynTovToDeadlineIso } from "@/lib/davjShuukhHuraldaanNote";

/** Алхам 9 UI / харагдах текст — JSON-д давжийн канон утга хэвээр */
export function formatHynaltKhuraliinShiidverForDisplay(khuraliinShiidver: string): string {
  if (khuraliinShiidver.trim().normalize("NFC") === DAVJ_KHRALIIN_SHIIDVER_OORCHLOLT.normalize("NFC")) {
    return HYNALT_KHRALIIN_SHIIDVER_OORCHLOLT_DISPLAY;
  }
  return khuraliinShiidver.replaceAll("Анхан шатны", "Анхан болон давж заалдах шатны");
}

export function hynaltKhuraliinShiidverShowsHoyshluulahDate(khuraliinShiidver: string): boolean {
  return davjKhuraliinShiidverShowsHoyshluulahDate(khuraliinShiidver);
}

/** Алхам 9-д «Гомдол гаргасан эсэх» асуулгүй — ихэнхдээ давжийн «Үгүй» дүрэм; «Хэвээр үлдээх» л 10-р шат руу хаалтгүй */
export function hynaltKhuraliinShiidverShowsGomdolSection(_khuraliinShiidver: string): boolean {
  return false;
}

/**
 * Алхам 9 — гомдол асуулгүй үед `caseProgressStepIndex`.
 * «Анхан … хэвээр үлдээх» (UI: «Анхан болон давж заалдах шатны …») → «Хэрэг хаагдсан», хэргийг CLOSED болгохгүй.
 */
export function hynaltKhuraliinShiidverImplicitUgviProgress(khuraliinShiidver: string): {
  stepIndex: number;
  closeCase: boolean;
} | null {
  const kh = khuraliinShiidver.trim();
  if (kh === DAVJ_KHRALIIN_SHIIDVER_HEVEER_ULDEKH) {
    const i = PARTICIPATION_STAGE_VALUES.indexOf("Хэрэг хаагдсан");
    return i >= 0 ? { stepIndex: i, closeCase: false } : null;
  }
  return davjKhuraliinShiidverProgressWhenGomdolUgvi(khuraliinShiidver);
}

export function hynaltKhuraliinShiidverProgressStepIndex(khuraliinShiidver: string): number | null {
  if (isHynaltKhuraliinShiidverReturnToDavj(khuraliinShiidver)) {
    const i = PARTICIPATION_STAGE_VALUES.indexOf("Давж заалдах шатны шүүх хуралдаан");
    return i >= 0 ? i : null;
  }
  return davjKhuraliinShiidverProgressStepIndex(khuraliinShiidver);
}

export { davjKhuraliinShiidverProgressWhenGomdolUgvi as hynaltKhuraliinShiidverProgressWhenGomdolUgvi } from "@/lib/davjShuukhHuraldaanNote";

const LEGACY_TSAGAATGAH = "Цагаатгах" as const;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x === "string" && x.trim()) out.push(x.trim());
  }
  return out;
}

function parseKhuraliinShiidverFiles(
  raw: unknown
): { title: string; url: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { title: string; url: string }[] = [];
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

function shuugchSingleFromJson(o: Record<string, unknown>, key: "shuugch" | "shuugchiinTuslah"): string {
  const raw = o[key];
  if (typeof raw === "string") return raw.trim();
  const a = strArr(raw);
  return a.length ? a.join(", ") : "";
}

function inferHynaltUiStage(o: Record<string, unknown>): 1 | 2 | 3 | 4 {
  const explicit = o.davjUiStage;
  if (typeof explicit === "number" && explicit >= 1 && explicit <= 4) {
    return Math.floor(explicit) as 1 | 2 | 3 | 4;
  }
  const ks = str(o.khuraliinShiidver);
  if (ks) return 4;
  const kt = str(o.khuralynTov);
  if (kt) return 3;
  const niit = str(o.niitShuugchidinKhuraldaanaasGarssanTogtool);
  if (niit === HYNALT_NIIT_SHUUGCHIDIN_TOGTOOL_TATGALZSAN) return 1;
  const khDate = str(o.kheregHuleenAwsanOgnoo);
  if (
    khDate &&
    (niit === HYNALT_NIIT_SHUUGCHIDIN_TOGTOOL_HELELTSEKH || !niit)
  ) {
    return 2;
  }
  const sh = shuugchSingleFromJson(o, "shuugch");
  const tus = shuugchSingleFromJson(o, "shuugchiinTuslah");
  if (sh || tus) return 2;
  return 1;
}

export function isHynaltShuukhHuraldaanStructuredNote(note: string | null): boolean {
  if (!note?.trim()) return false;
  try {
    const o = JSON.parse(note) as Record<string, unknown>;
    return o.kind === HYNALT_SHUUKH_HURALDAAN_NOTE_KIND;
  } catch {
    return false;
  }
}

export function parseHynaltShuukhHuraldaanNote(note: string | null): {
  fields: HynaltShuukhHuraldaanFields;
  legacyPlainText: string | null;
} {
  const base = emptyHynaltShuukhHuraldaanFields();
  if (!note?.trim()) {
    return { fields: base, legacyPlainText: null };
  }
  try {
    const o = JSON.parse(note) as Record<string, unknown>;
    if (o.kind === HYNALT_SHUUKH_HURALDAAN_NOTE_KIND) {
      const kheregHuleenAwsanOgnoo = str(o.kheregHuleenAwsanOgnoo);
      const shuugiinNer = HYNALT_SHUUGIIN_NER_STATIC;
      const khuralynTov = str(o.khuralynTov);
      const shuugch = "";
      const shuugchiinTuslah = "";
      let khuraliinShiidver = str(o.khuraliinShiidver);
      if (khuraliinShiidver === DAVJ_KHRALIIN_SHIIDVER_LEGACY_RETURN_PROKUROR_LONG) {
        khuraliinShiidver = DAVJ_KHRALIIN_SHIIDVER_RETURN_PROKUROR;
      }
      if (khuraliinShiidver === DAVJ_KHRALIIN_SHIIDVER_LEGACY_RETURN_ANKHAN_SHUUKH_HURALDAAN) {
        khuraliinShiidver = DAVJ_KHRALIIN_SHIIDVER_RETURN_ANKHAN_SHUUKH_HURALDAAN;
      }
      if (khuraliinShiidver === LEGACY_TSAGAATGAH) {
        khuraliinShiidver = DAVJ_KHRALIIN_SHIIDVER_HUCHINGUI_BOLGOH;
      }
      if (isHynaltKhuraliinShiidverReturnToDavj(khuraliinShiidver)) {
        khuraliinShiidver = HYNALT_KHRALIIN_SHIIDVER_RETURN_TO_DAVJ;
      }
      const khuraliinShiidverTemdeglel = str(o.khuraliinShiidverTemdeglel);
      const khuraliinShiidverFiles = parseKhuraliinShiidverFiles(o.khuraliinShiidverFiles);
      const khuralHoyshluulahKhuralOgnoo = str(o.khuralHoyshluulahKhuralOgnoo);
      const davjGomdolGargsanEseh = str(o.davjGomdolGargsanEseh);
      const davjGomdolGargsanTaluudEntries = parseGomdolGargsanTaluudEntries({
        gomdolGargsanTaluudEntries: o.davjGomdolGargsanTaluudEntries,
        gomdolGargsanTaluud: o.davjGomdolGargsanTaluud,
      } as Record<string, unknown>);
      const niitShuugchidinKhuraldaanaasGarssanTogtool = str(o.niitShuugchidinKhuraldaanaasGarssanTogtool);
      const withoutStage = {
        kheregHuleenAwsanOgnoo,
        shuugiinNer,
        khuralynTov,
        shuugch,
        shuugchiinTuslah,
        khuraliinShiidver,
        khuraliinShiidverTemdeglel,
        khuraliinShiidverFiles,
        khuralHoyshluulahKhuralOgnoo,
        davjGomdolGargsanEseh,
        davjGomdolGargsanTaluudEntries,
        davjKheregTudgelzsen: false,
        niitShuugchidinKhuraldaanaasGarssanTogtool,
      };
      const davjUiStage = inferHynaltUiStage(o);
      return {
        fields: { ...withoutStage, davjUiStage },
        legacyPlainText: null,
      };
    }
  } catch {
    /* fall through */
  }
  return { fields: base, legacyPlainText: note.trim() };
}

export function buildHynaltShuukhHuraldaanNoteJson(fields: HynaltShuukhHuraldaanFields): string {
  return JSON.stringify({
    kind: HYNALT_SHUUKH_HURALDAAN_NOTE_KIND,
    kheregHuleenAwsanOgnoo: fields.kheregHuleenAwsanOgnoo,
    shuugiinNer: HYNALT_SHUUGIIN_NER_STATIC,
    khuralynTov: fields.khuralynTov,
    shuugch: "",
    shuugchiinTuslah: "",
    davjUiStage: fields.davjUiStage,
    khuraliinShiidver: fields.khuraliinShiidver,
    khuraliinShiidverTemdeglel: fields.khuraliinShiidverTemdeglel,
    khuraliinShiidverFiles: fields.khuraliinShiidverFiles,
    khuralHoyshluulahKhuralOgnoo: fields.khuralHoyshluulahKhuralOgnoo,
    davjGomdolGargsanEseh: fields.davjGomdolGargsanEseh,
    davjGomdolGargsanTaluudEntries: fields.davjGomdolGargsanTaluudEntries,
    davjKheregTudgelzsen: false,
    niitShuugchidinKhuraldaanaasGarssanTogtool: fields.niitShuugchidinKhuraldaanaasGarssanTogtool,
  });
}

export function getHynaltKhuralynTovDeadlineFromNote(note: string | null): string | null {
  const { fields } = parseHynaltShuukhHuraldaanNote(note);
  return davjKhuralynTovToDeadlineIso(fields.khuralynTov);
}
