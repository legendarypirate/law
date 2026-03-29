import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";

const KEY = "caseClosePinHash";
/** Used when no custom hash is stored in AppSetting */
export const DEFAULT_CASE_CLOSE_PIN = "0000";

export async function verifyCaseClosePin(pin: string): Promise<boolean> {
  const trimmed = (pin ?? "").trim();
  if (!trimmed) return false;
  const row = await prisma.appSetting.findUnique({ where: { key: KEY } });
  if (!row?.value) {
    return trimmed === DEFAULT_CASE_CLOSE_PIN;
  }
  return verifyPassword(trimmed, row.value);
}

export async function setCaseClosePin(
  currentPin: string,
  newPin: string
): Promise<{ ok: boolean; error?: string }> {
  const currentOk = await verifyCaseClosePin(currentPin.trim());
  if (!currentOk) return { ok: false, error: "Одоогийн PIN буруу байна" };
  const np = newPin.trim();
  if (np.length < 4) return { ok: false, error: "Шинэ PIN хамгийн багадаа 4 тэмдэгт байх ёстой" };
  if (np.length > 64) return { ok: false, error: "PIN хэт урт байна" };
  const hash = await hashPassword(np);
  await prisma.appSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: hash },
    update: { value: hash },
  });
  return { ok: true };
}

export async function hasCustomCaseClosePin(): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({ where: { key: KEY } });
  return Boolean(row?.value);
}
