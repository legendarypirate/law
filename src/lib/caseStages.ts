/**
 * Case participation stages (Оролцож эхэлсэн үе шат).
 * Used when creating a case and as the fixed list of steps for the case.
 * In detail view, steps start from the stage the user chose at creation.
 */
export const PARTICIPATION_STAGE_OPTIONS = [
  { value: "Гомдол мэдээлэл", label: "Гомдол мэдээлэл" },
  { value: "Хэрэг бүртгэлт", label: "Хэрэг бүртгэлт" },
  { value: "Мөрдөн байцаалт", label: "Мөрдөн байцаалт" },
  { value: "Прокурорын хяналт", label: "Прокурорын хяналт" },
  { value: "Шүүхэд хэрэг хүргүүлсэн", label: "Шүүхэд хэрэг хүргүүлсэн" },
  { value: "Урьдчилсан хэлэлцүүлэг", label: "Урьдчилсан хэлэлцүүлэг" },
  { value: "Анхан шатны шүүх хуралдаан", label: "Анхан шатны шүүх хуралдаан" },
  { value: "Давж заалдах шатны шүүх хуралдаан", label: "Давж заалдах шатны шүүх хуралдаан" },
  { value: "Хяналтын шатны шүүх хуралдаан", label: "Хяналтын шатны шүүх хуралдаан" },
  { value: "Хэрэг хаагдсан", label: "Хэрэг хаагдсан" },
] as const;

export const PARTICIPATION_STAGE_VALUES = PARTICIPATION_STAGE_OPTIONS.map((o) => o.value);

/**
 * Returns stage labels from the given start stage to the end of the list.
 * If startStage is null/empty or not in the list, returns all stages.
 */
export function getStagesFrom(startStage: string | null): string[] {
  if (!startStage?.trim()) return [...PARTICIPATION_STAGE_VALUES];
  const normalized = startStage.trim();
  // `PARTICIPATION_STAGE_VALUES` is a typed tuple of literals, but `startStage` is a plain string.
  // Cast for indexing; if it doesn't match, we fall back to returning all stages.
  const idx = PARTICIPATION_STAGE_VALUES.indexOf(
    normalized as (typeof PARTICIPATION_STAGE_VALUES)[number]
  );
  if (idx < 0) return [...PARTICIPATION_STAGE_VALUES];
  return PARTICIPATION_STAGE_VALUES.slice(idx);
}
