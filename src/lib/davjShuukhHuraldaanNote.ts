/**
 * Алхам 8 «Давж заалдах шатны шүүх хуралдаан» — JSON тэмдэглэл (`note`).
 * UI алхам: 1) шүүгч/туслах → 2) хурлын тов → 3) оролцогчид → 4) хурлын шийдвэр.
 */

import type { AnkhanGomdolTalEntry } from "@/lib/ankhanShuukhShiidverNote";
import { parseGomdolGargsanTaluudEntries } from "@/lib/ankhanShuukhShiidverNote";
import { PARTICIPATION_STAGE_VALUES } from "@/lib/caseStages";

export const DAVJ_SHUUKH_HURALDAAN_NOTE_KIND = "davj_shuukh_huraldaan_v1" as const;

/** Хадгалах үед «Үйл явц»-ыг шилжүүлэх шийдвэрүүд */
export const DAVJ_KHRALIIN_SHIIDVER_RETURN_URIDCHILSAN_HELELTSUULEG =
  "Дахин хэлэлцэхээр УХ-д буцаах" as const;
export const DAVJ_KHRALIIN_SHIIDVER_RETURN_ANKHAN_SHUUKH_HURALDAAN =
  "Дахин хэлэлцүүлэхээр анхан шатны шүүх хуралдаанд буцаах" as const;
/** Өмнө нь «Дахин хэлэлцэхээр шүүх хуралдаанд буцаах» гэж хадгалагдсан */
export const DAVJ_KHRALIIN_SHIIDVER_LEGACY_RETURN_ANKHAN_SHUUKH_HURALDAAN =
  "Дахин хэлэлцэхээр шүүх хуралдаанд буцаах" as const;
export const DAVJ_KHRALIIN_SHIIDVER_RETURN_PROKUROR = "Нэмэлт ажиллагаа хийлгэхээр прокурорт буцаах" as const;
export const DAVJ_KHRALIIN_SHIIDVER_KHERGIIG_TUDGELZUULEH = "Хэргийг түдгэлзүүлэх" as const;
export const DAVJ_KHRALIIN_SHIIDVER_HUCHINGUI_BOLGOH = "Анхан шатны шүүхийн шийдвэрийг хүчингүй болгож хэргийг хэрэгсэхгүй болгох" as const;
export const DAVJ_KHRALIIN_SHIIDVER_HURAL_HOYSHLUULAH = "Шүүх хуралдааныг хойшлуулах" as const;
export const DAVJ_KHRALIIN_SHIIDVER_HEVEER_ULDEKH = "Анхан шатны шүүхийн шийдвэрийг хэвээр үлдээх" as const;
export const DAVJ_KHRALIIN_SHIIDVER_OORCHLOLT = "Анхан шатны шүүхийн шийдвэрт өөрчлөлт оруулах" as const;
export const DAVJ_KHRALIIN_SHIIDVER_DAVJ_MAGADLAL_OORCHLOLT =
  "Давж заалдах шатны шүүхийн магадлалд өөрчлөлт оруулах" as const;
/** Өмнө нь «Цагаатгах» гэж хадгалагдсан */
const DAVJ_KHRALIIN_SHIIDVER_LEGACY_TSAGAATGAH_LABEL = "Цагаатгах" as const;

/** Хуучин хадгалалт — шинэ сонголт руу харуулахад */
export const DAVJ_KHRALIIN_SHIIDVER_LEGACY_RETURN_PROKUROR_LONG =
  "Анхан шатны шүүхийн шийдвэрийг хүчингүй болгож прокурорт буцаах" as const;

/** Алхам 8 «Хурлын шийдвэр» сонголтууд */
export const DAVJ_KHRALIIN_SHIIDVER_OPTIONS = [
  DAVJ_KHRALIIN_SHIIDVER_HURAL_HOYSHLUULAH,
  DAVJ_KHRALIIN_SHIIDVER_HEVEER_ULDEKH,
  DAVJ_KHRALIIN_SHIIDVER_OORCHLOLT,
  DAVJ_KHRALIIN_SHIIDVER_DAVJ_MAGADLAL_OORCHLOLT,
  DAVJ_KHRALIIN_SHIIDVER_HUCHINGUI_BOLGOH,
  DAVJ_KHRALIIN_SHIIDVER_RETURN_URIDCHILSAN_HELELTSUULEG,
  DAVJ_KHRALIIN_SHIIDVER_RETURN_ANKHAN_SHUUKH_HURALDAAN,
  DAVJ_KHRALIIN_SHIIDVER_RETURN_PROKUROR,
  DAVJ_KHRALIIN_SHIIDVER_KHERGIIG_TUDGELZUULEH,
] as const;

/**
 * «Хадгалах» дарахад `caseProgressStepIndex` (PARTICIPATION_STAGE_VALUES) — зөвхөн буцаах/хүчингүй болгох сонголтуудад.
 */
export function davjKhuraliinShiidverProgressStepIndex(khuraliinShiidver: string): number | null {
  const s = khuraliinShiidver.trim();
  if (s === DAVJ_KHRALIIN_SHIIDVER_RETURN_URIDCHILSAN_HELELTSUULEG) {
    const i = PARTICIPATION_STAGE_VALUES.indexOf("Урьдчилсан хэлэлцүүлэг");
    return i >= 0 ? i : null;
  }
  if (
    s === DAVJ_KHRALIIN_SHIIDVER_RETURN_ANKHAN_SHUUKH_HURALDAAN ||
    s === DAVJ_KHRALIIN_SHIIDVER_LEGACY_RETURN_ANKHAN_SHUUKH_HURALDAAN
  ) {
    const i = PARTICIPATION_STAGE_VALUES.indexOf("Анхан шатны шүүх хуралдаан");
    return i >= 0 ? i : null;
  }
  if (s === DAVJ_KHRALIIN_SHIIDVER_RETURN_PROKUROR || s === DAVJ_KHRALIIN_SHIIDVER_LEGACY_RETURN_PROKUROR_LONG) {
    const i = PARTICIPATION_STAGE_VALUES.indexOf("Прокурорын хяналт");
    return i >= 0 ? i : null;
  }
  return null;
}

export function davjKhuraliinShiidverShowsHoyshluulahDate(khuraliinShiidver: string): boolean {
  return khuraliinShiidver.trim() === DAVJ_KHRALIIN_SHIIDVER_HURAL_HOYSHLUULAH;
}

/** «Гомдол гаргасан эсэх» — зөвхөн хойшлуулах, түдгэлзүүлэх-ээс бусад бүх «Хурлын шийдвэр» */
export function davjKhuraliinShiidverShowsGomdolSection(khuraliinShiidver: string): boolean {
  const t = khuraliinShiidver.trim();
  if (!t) return false;
  if (t === DAVJ_KHRALIIN_SHIIDVER_HURAL_HOYSHLUULAH) return false;
  if (t === DAVJ_KHRALIIN_SHIIDVER_KHERGIIG_TUDGELZUULEH) return false;
  return true;
}

/**
 * «Гомдол гаргасан эсэх» = Үгүй үед шийдвэр тус бүрийн `caseProgressStepIndex`.
 * `closeCase`: хэвээр үлдээх / өөрчлөлт / хүчингүй — Хэрэг хаагдсан + CLOSED.
 */
export function davjKhuraliinShiidverProgressWhenGomdolUgvi(khuraliinShiidver: string): {
  stepIndex: number;
  closeCase: boolean;
} | null {
  const s = khuraliinShiidver.trim();
  if (
    s === DAVJ_KHRALIIN_SHIIDVER_HEVEER_ULDEKH ||
    s === DAVJ_KHRALIIN_SHIIDVER_OORCHLOLT ||
    s === DAVJ_KHRALIIN_SHIIDVER_DAVJ_MAGADLAL_OORCHLOLT ||
    s === DAVJ_KHRALIIN_SHIIDVER_HUCHINGUI_BOLGOH
  ) {
    const i = PARTICIPATION_STAGE_VALUES.indexOf("Хэрэг хаагдсан");
    return i >= 0 ? { stepIndex: i, closeCase: true } : null;
  }
  if (s === DAVJ_KHRALIIN_SHIIDVER_RETURN_PROKUROR || s === DAVJ_KHRALIIN_SHIIDVER_LEGACY_RETURN_PROKUROR_LONG) {
    const i = PARTICIPATION_STAGE_VALUES.indexOf("Прокурорын хяналт");
    return i >= 0 ? { stepIndex: i, closeCase: false } : null;
  }
  if (s === DAVJ_KHRALIIN_SHIIDVER_RETURN_URIDCHILSAN_HELELTSUULEG) {
    const i = PARTICIPATION_STAGE_VALUES.indexOf("Урьдчилсан хэлэлцүүлэг");
    return i >= 0 ? { stepIndex: i, closeCase: false } : null;
  }
  if (
    s === DAVJ_KHRALIIN_SHIIDVER_RETURN_ANKHAN_SHUUKH_HURALDAAN ||
    s === DAVJ_KHRALIIN_SHIIDVER_LEGACY_RETURN_ANKHAN_SHUUKH_HURALDAAN
  ) {
    const i = PARTICIPATION_STAGE_VALUES.indexOf("Анхан шатны шүүх хуралдаан");
    return i >= 0 ? { stepIndex: i, closeCase: false } : null;
  }
  return null;
}

export type DavjUiStage = 1 | 2 | 3 | 4;

export type DavjKhuraliinShiidverFile = { title: string; url: string };

export type DavjShuukhHuraldaanFields = {
  kheregHuleenAwsanOgnoo: string;
  shuugiinNer: string;
  khuralynTov: string;
  /** Нэг мөр */
  shuugch: string;
  /** Нэг мөр */
  shuugchiinTuslah: string;
  /** 1=шүүгч/туслах, 2=хурлын тов, 3=оролцогчид, 4=хурлын шийдвэр */
  davjUiStage: DavjUiStage;
  khuraliinShiidver: string;
  /** Сонгосон шийдвэр бүрийн тэмдэглэл */
  khuraliinShiidverTemdeglel: string;
  khuraliinShiidverFiles: DavjKhuraliinShiidverFile[];
  /** «Шүүх хуралдааныг хойшлуулах» — дараагийн хурлын огноо */
  khuralHoyshluulahKhuralOgnoo: string;
  /** Алхам 7-той ижил «Гомдол гаргасан эсэх» (давж заалдах шатны тодорхой шийдвэрүүдэд) */
  davjGomdolGargsanEseh: string;
  davjGomdolGargsanTaluudEntries: AnkhanGomdolTalEntry[];
  /** «Хэргийг түдгэлзүүлэх» хадгалсан — Сэргээх UI */
  davjKheregTudgelzsen: boolean;
  /** Зөвхөн алхам 9 (хяналт) — «Нийт шүүгчдийн хуралдаанаас гарсан тогтоол» */
  niitShuugchidinKhuraldaanaasGarssanTogtool: string;
};

export function emptyDavjShuukhHuraldaanFields(): DavjShuukhHuraldaanFields {
  return {
    kheregHuleenAwsanOgnoo: "",
    shuugiinNer: "",
    khuralynTov: "",
    shuugch: "",
    shuugchiinTuslah: "",
    davjUiStage: 1,
    khuraliinShiidver: "",
    khuraliinShiidverTemdeglel: "",
    khuraliinShiidverFiles: [],
    khuralHoyshluulahKhuralOgnoo: "",
    davjGomdolGargsanEseh: "",
    davjGomdolGargsanTaluudEntries: [],
    davjKheregTudgelzsen: false,
    niitShuugchidinKhuraldaanaasGarssanTogtool: "",
  };
}

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

function parseKhuraliinShiidverFiles(raw: unknown): DavjKhuraliinShiidverFile[] {
  if (!Array.isArray(raw)) return [];
  const out: DavjKhuraliinShiidverFile[] = [];
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

/** Хуучин массив эсвэл шинэ ганц мөр */
function shuugchSingleFromJson(o: Record<string, unknown>, key: "shuugch" | "shuugchiinTuslah"): string {
  const raw = o[key];
  if (typeof raw === "string") return raw.trim();
  const a = strArr(raw);
  return a.length ? a.join(", ") : "";
}

function inferDavjUiStage(o: Record<string, unknown>): DavjUiStage {
  const explicit = o.davjUiStage;
  if (typeof explicit === "number" && explicit >= 1 && explicit <= 4) {
    return Math.floor(explicit) as DavjUiStage;
  }
  const ks = str(o.khuraliinShiidver);
  if (ks) return 4;
  const kt = str(o.khuralynTov);
  if (kt) return 3;
  const sh = shuugchSingleFromJson(o, "shuugch");
  const tus = shuugchSingleFromJson(o, "shuugchiinTuslah");
  if (sh || tus) return 2;
  return 1;
}

export function isDavjShuukhHuraldaanStructuredNote(note: string | null): boolean {
  if (!note?.trim()) return false;
  try {
    const o = JSON.parse(note) as Record<string, unknown>;
    return o.kind === DAVJ_SHUUKH_HURALDAAN_NOTE_KIND;
  } catch {
    return false;
  }
}

export function parseDavjShuukhHuraldaanNote(note: string | null): {
  fields: DavjShuukhHuraldaanFields;
  legacyPlainText: string | null;
} {
  const base = emptyDavjShuukhHuraldaanFields();
  if (!note?.trim()) {
    return { fields: base, legacyPlainText: null };
  }
  try {
    const o = JSON.parse(note) as Record<string, unknown>;
    if (o.kind === DAVJ_SHUUKH_HURALDAAN_NOTE_KIND) {
      const kheregHuleenAwsanOgnoo = str(o.kheregHuleenAwsanOgnoo);
      const shuugiinNer = str(o.shuugiinNer);
      const khuralynTov = str(o.khuralynTov);
      const shuugch = shuugchSingleFromJson(o, "shuugch");
      const shuugchiinTuslah = shuugchSingleFromJson(o, "shuugchiinTuslah");
      let khuraliinShiidver = str(o.khuraliinShiidver);
      if (khuraliinShiidver === DAVJ_KHRALIIN_SHIIDVER_LEGACY_RETURN_PROKUROR_LONG) {
        khuraliinShiidver = DAVJ_KHRALIIN_SHIIDVER_RETURN_PROKUROR;
      }
      if (khuraliinShiidver === DAVJ_KHRALIIN_SHIIDVER_LEGACY_RETURN_ANKHAN_SHUUKH_HURALDAAN) {
        khuraliinShiidver = DAVJ_KHRALIIN_SHIIDVER_RETURN_ANKHAN_SHUUKH_HURALDAAN;
      }
      if (khuraliinShiidver === DAVJ_KHRALIIN_SHIIDVER_LEGACY_TSAGAATGAH_LABEL) {
        khuraliinShiidver = DAVJ_KHRALIIN_SHIIDVER_HUCHINGUI_BOLGOH;
      }
      const khuraliinShiidverTemdeglel = str(o.khuraliinShiidverTemdeglel);
      const khuraliinShiidverFiles = parseKhuraliinShiidverFiles(o.khuraliinShiidverFiles);
      const khuralHoyshluulahKhuralOgnoo = str(o.khuralHoyshluulahKhuralOgnoo);
      const davjGomdolGargsanEseh = str(o.davjGomdolGargsanEseh);
      const davjGomdolGargsanTaluudEntries = parseGomdolGargsanTaluudEntries({
        gomdolGargsanTaluudEntries: o.davjGomdolGargsanTaluudEntries,
        gomdolGargsanTaluud: o.davjGomdolGargsanTaluud,
      } as Record<string, unknown>);
      const davjKheregTudgelzsen = o.davjKheregTudgelzsen === true;
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
        davjKheregTudgelzsen,
        niitShuugchidinKhuraldaanaasGarssanTogtool,
      };
      const davjUiStage = inferDavjUiStage(o);
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

export function buildDavjShuukhHuraldaanNoteJson(fields: DavjShuukhHuraldaanFields): string {
  return JSON.stringify({
    kind: DAVJ_SHUUKH_HURALDAAN_NOTE_KIND,
    kheregHuleenAwsanOgnoo: fields.kheregHuleenAwsanOgnoo,
    shuugiinNer: fields.shuugiinNer,
    khuralynTov: fields.khuralynTov,
    shuugch: fields.shuugch,
    shuugchiinTuslah: fields.shuugchiinTuslah,
    davjUiStage: fields.davjUiStage,
    khuraliinShiidver: fields.khuraliinShiidver,
    khuraliinShiidverTemdeglel: fields.khuraliinShiidverTemdeglel,
    khuraliinShiidverFiles: fields.khuraliinShiidverFiles,
    khuralHoyshluulahKhuralOgnoo: fields.khuralHoyshluulahKhuralOgnoo,
    davjGomdolGargsanEseh: fields.davjGomdolGargsanEseh,
    davjGomdolGargsanTaluudEntries: fields.davjGomdolGargsanTaluudEntries,
    davjKheregTudgelzsen: fields.davjKheregTudgelzsen,
  });
}

export function davjKhuralynTovToDeadlineIso(khuralynTov: string): string | null {
  const day = khuralynTov.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return `${day}T00:00:00.000Z`;
}

export function getDavjKhuralynTovDeadlineFromNote(note: string | null): string | null {
  const { fields } = parseDavjShuukhHuraldaanNote(note);
  return davjKhuralynTovToDeadlineIso(fields.khuralynTov);
}
