/**
 * Алхам 7 «Анхан шатны шүүх хуралдаан» — «Шүүхээс гарсан шийдвэр» JSON тэмдэглэл.
 */

export const ANKHAN_SHUUKH_SHIIDVER_NOTE_KIND = "ankhan_shuukh_shiidver" as const;

export const ANKHAN_SHIIDVER_OPTIONS = [
  "Шүүх хуралдааныг хойшлуулах",
  "Хэрэг хэлэлцэхийг 60 хүртэлх хоногоор хойшлуулах",
  "Ажлын 5 хүртэлх хоногоор завсарлуулах",
  "Шийтгэх тогтоол",
  "Цагаатгах тогтоол",
] as const;

export type AnkhanShiidverOption = (typeof ANKHAN_SHIIDVER_OPTIONS)[number];

/** Эхний 3 сонголт (хойшлуулах / завсарлуулах) — «Гомдол гаргасан эсэх» хэсэггүй */
const ANKHAN_SHIIDVER_EXCLUDES_GOMDOL_SET = new Set<string>(ANKHAN_SHIIDVER_OPTIONS.slice(0, 3));

export function ankhanShiidverExcludesGomdolSection(shiidver: string): boolean {
  return ANKHAN_SHIIDVER_EXCLUDES_GOMDOL_SET.has(shiidver.trim());
}

/** «Гомдол гаргасан эсэх» сонголтууд */
export const ANKHAN_GOMDOL_GARGSAN_ESEH_OPTIONS = ["Хүлээгдэж буй", "Тийм", "Үгүй"] as const;

/** «Тийм» үед — гомдол гаргасан талууд (олон сонголт) */
export const ANKHAN_GOMDOL_GARGSAN_TALUUD_OPTIONS = [
  "Улсын яллагч",
  "Шүүгдэгч",
  "Хохирогч",
  "Хохирогчийн өмгөөлөгч",
  "Шүүгдэгчийн өмгөөлөгч",
  "Иргэний нэхэмжлэгч, хариуцагч",
  "Бусад",
] as const;

/** Хуучин хадгалалтыг шинэ нэршилд шилжүүлнэ */
const GOMDOL_TAL_LEGACY_TO_CURRENT: Record<string, string> = {
  Прокурор: "Улсын яллагч",
  Яллагдагч: "Шүүгдэгч",
  Шүүгчдэгч: "Шүүгдэгч",
  "Яллагдагчийн өмгөөлөгч": "Шүүгдэгчийн өмгөөлөгч",
};

export type AnkhanGomdolTalFile = { title: string; url: string };

/** Нэг тал — тэмдэглэл + хавсаргасан файл */
export type AnkhanGomdolTalEntry = {
  id: string;
  tal: string;
  temdeglel: string;
  files: AnkhanGomdolTalFile[];
};

export function generateAnkhanGomdolEntryId(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `gomdol-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export type AnkhanShuukhShiidverFields = {
  shiidver: string;
  /** Гомдол гаргасан эсэх */
  gomdolGargsanEseh: string;
  /** «Тийм» үед — тал бүр тусдаа, тэмдэглэл + файл */
  gomdolGargsanTaluudEntries: AnkhanGomdolTalEntry[];
  /** Шүүх хуралдааныг хойшлуулах — дараагийн хурлын тов */
  daraagiinKhuralOgnoo: string;
  daraagiinKhuralTemdeglel: string;
  /** 60 хоногоор хойшлуулах */
  hoyshluulah60Ognoo: string;
  hoyshluulah60Temdeglel: string;
  /** Ажлын 5 хоногоор завсарлуулах */
  avasarluulahOgnoo: string;
  avasarluulahTemdeglel: string;
  /** Шийтгэх тогтоол */
  shiitgehTemdeglel: string;
  /** `/case-classifications`-д бүртгэсэн «Хэргийн зүйлчлэл» */
  kheregiinZuillelClassificationId: string;
  /** Харуулалт / түүхэнд хадгалах нэр (сонголтоос) */
  kheregiinZuillelName: string;
  yalynTorol: string;
  hugatsaa: string;
  juram: string;
  garguulsanHohirol: string;
  /** Цагаатгах тогтоол */
  tsagaatgahTemdeglel: string;
};

export function emptyAnkhanShuukhShiidverFields(): AnkhanShuukhShiidverFields {
  return {
    shiidver: "",
    gomdolGargsanEseh: "",
    gomdolGargsanTaluudEntries: [],
    daraagiinKhuralOgnoo: "",
    daraagiinKhuralTemdeglel: "",
    hoyshluulah60Ognoo: "",
    hoyshluulah60Temdeglel: "",
    avasarluulahOgnoo: "",
    avasarluulahTemdeglel: "",
    shiitgehTemdeglel: "",
    kheregiinZuillelClassificationId: "",
    kheregiinZuillelName: "",
    yalynTorol: "",
    hugatsaa: "",
    juram: "",
    garguulsanHohirol: "",
    tsagaatgahTemdeglel: "",
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

function parseGomdolTalFiles(raw: unknown): AnkhanGomdolTalFile[] {
  if (!Array.isArray(raw)) return [];
  const out: AnkhanGomdolTalFile[] = [];
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

function migrateTalLabel(t: string): string {
  return GOMDOL_TAL_LEGACY_TO_CURRENT[t] ?? t;
}

/** Алхам 8 davj note-д `davjGomdolGargsanTaluudEntries` гэх мэтээр дахин ашиглана */
export function parseGomdolGargsanTaluudEntries(o: Record<string, unknown>): AnkhanGomdolTalEntry[] {
  const entriesRaw = o.gomdolGargsanTaluudEntries;
  if (Array.isArray(entriesRaw) && entriesRaw.length > 0) {
    const first = entriesRaw[0];
    if (first && typeof first === "object" && first !== null && "tal" in first) {
      return entriesRaw.map((item, i) => {
        const x = item as Record<string, unknown>;
        const talRaw = typeof x.tal === "string" ? x.tal.trim() : "";
        const tal = migrateTalLabel(talRaw);
        const id =
          typeof x.id === "string" && x.id.trim()
            ? x.id.trim()
            : `${generateAnkhanGomdolEntryId()}-i${i}`;
        return {
          id,
          tal,
          temdeglel: typeof x.temdeglel === "string" ? x.temdeglel : "",
          files: parseGomdolTalFiles(x.files),
        };
      });
    }
  }
  const legacy = strArr(o.gomdolGargsanTaluud).map(migrateTalLabel);
  if (legacy.length === 0) return [];
  return legacy.map((tal, i) => ({
    id: `${generateAnkhanGomdolEntryId()}-m${i}`,
    tal,
    temdeglel: "",
    files: [],
  }));
}

export function parseAnkhanShuukhShiidverNote(note: string | null): {
  fields: AnkhanShuukhShiidverFields;
  legacyPlainText: string | null;
} {
  const base = emptyAnkhanShuukhShiidverFields();
  if (!note?.trim()) {
    return { fields: base, legacyPlainText: null };
  }
  try {
    const o = JSON.parse(note) as Record<string, unknown>;
    if (o.kind === ANKHAN_SHUUKH_SHIIDVER_NOTE_KIND) {
      let kheregiinZuillelClassificationId = str(o.kheregiinZuillelClassificationId);
      let kheregiinZuillelName = str(o.kheregiinZuillelName);
      const legacyZuillel = str(o.kheregiinZuillel);
      if (!kheregiinZuillelClassificationId && !kheregiinZuillelName && legacyZuillel) {
        kheregiinZuillelName = legacyZuillel;
      }
      const shiidver = str(o.shiidver);
      let gomdolGargsanEseh = str(o.gomdolGargsanEseh);
      let gomdolGargsanTaluudEntries = parseGomdolGargsanTaluudEntries(o);
      if (ankhanShiidverExcludesGomdolSection(shiidver)) {
        gomdolGargsanEseh = "";
        gomdolGargsanTaluudEntries = [];
      }
      return {
        fields: {
          shiidver,
          gomdolGargsanEseh,
          gomdolGargsanTaluudEntries,
          daraagiinKhuralOgnoo: str(o.daraagiinKhuralOgnoo),
          daraagiinKhuralTemdeglel: str(o.daraagiinKhuralTemdeglel),
          hoyshluulah60Ognoo: str(o.hoyshluulah60Ognoo),
          hoyshluulah60Temdeglel: str(o.hoyshluulah60Temdeglel),
          avasarluulahOgnoo: str(o.avasarluulahOgnoo),
          avasarluulahTemdeglel: str(o.avasarluulahTemdeglel),
          shiitgehTemdeglel: str(o.shiitgehTemdeglel),
          kheregiinZuillelClassificationId,
          kheregiinZuillelName,
          yalynTorol: str(o.yalynTorol),
          hugatsaa: str(o.hugatsaa),
          juram: str(o.juram),
          garguulsanHohirol: str(o.garguulsanHohirol),
          tsagaatgahTemdeglel: str(o.tsagaatgahTemdeglel),
        },
        legacyPlainText: null,
      };
    }
  } catch {
    /* fall through */
  }
  return { fields: base, legacyPlainText: note.trim() };
}

export function buildAnkhanShuukhShiidverNoteJson(fields: AnkhanShuukhShiidverFields): string {
  const hideGomdol = ankhanShiidverExcludesGomdolSection(fields.shiidver);
  const out: AnkhanShuukhShiidverFields = hideGomdol
    ? { ...fields, gomdolGargsanEseh: "", gomdolGargsanTaluudEntries: [] }
    : fields;
  return JSON.stringify({
    kind: ANKHAN_SHUUKH_SHIIDVER_NOTE_KIND,
    ...out,
  });
}
