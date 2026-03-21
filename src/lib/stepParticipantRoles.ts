/**
 * Case step participant `role` string values (CaseStepParticipant.role).
 * Keep API routes and UI in sync with this list.
 */
export const STEP_PARTICIPANT_ROLE_KEYS = [
  "judge",
  "judgeAssistant",
  "prosecutor",
  "witness",
  "defendant",
  "defendantAttorney",
  "victim",
  "attorney",
  "expert",
  "civilClaimantRespondent",
  "civilClaimantRespondentAttorney",
] as const;

export type StepParticipantRoleKey = (typeof STEP_PARTICIPANT_ROLE_KEYS)[number];

/** Хуучин хадгалалтыг нэг талбарт нэгтгэж харуулна / хадгална. */
export const LEGACY_CIVIL_PARTICIPANT_ROLES = ["civilClaimant", "civilDefendantAttorney"] as const;

export function normalizeStepParticipantRole(role: string): string {
  if ((LEGACY_CIVIL_PARTICIPANT_ROLES as readonly string[]).includes(role)) {
    return "civilClaimantRespondent";
  }
  return role;
}

export const STEP_PARTICIPANT_ROLES: { key: StepParticipantRoleKey; label: string }[] = [
  { key: "judge", label: "Шүүгч" },
  { key: "judgeAssistant", label: "Шүүгчийн туслах" },
  { key: "prosecutor", label: "Прокурор" },
  { key: "witness", label: "Бусад оролцогч" },
  { key: "defendant", label: "Яллагдагч" },
  { key: "defendantAttorney", label: "Яллагдагчийн өмгөөлөгч" },
  { key: "victim", label: "Хохирогч" },
  { key: "attorney", label: "Хохирогчийн өмгөөлөгч" },
  { key: "expert", label: "Шинжээч" },
  { key: "civilClaimantRespondent", label: "Иргэний нэхэмжлэгч, хариуцагч" },
  {
    key: "civilClaimantRespondentAttorney",
    label: "Иргэний нэхэмжлэгч, хариуцагчийн өмгөөлөгч",
  },
];

/**
 * Оролцогчдын харуулалт: багана 2 (`sm:grid-cols-2`), мөр бүр 2 талбар.
 * Доод: Шинжээч | Иргэний нэхэмжлэгч, хариуцагч, түүний дараа өмгөөлөгч (сүүлийн нэг багана `col-span-2`).
 */
export const PARTICIPANT_GRID_ORDER_KEYS: readonly StepParticipantRoleKey[] = [
  "judge",
  "judgeAssistant",
  "prosecutor",
  "witness",
  "defendant",
  "defendantAttorney",
  "victim",
  "attorney",
  "expert",
  "civilClaimantRespondent",
  "civilClaimantRespondentAttorney",
];
