import { NextResponse } from "next/server";
import { hasCustomCaseClosePin, setCaseClosePin, DEFAULT_CASE_CLOSE_PIN } from "@/lib/caseClosePin";

export async function GET() {
  try {
    const hasCustom = await hasCustomCaseClosePin();
    return NextResponse.json({
      hasCustomPin: hasCustom,
      defaultPinHint: hasCustom ? null : DEFAULT_CASE_CLOSE_PIN,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Тохиргоо уншиж чадсангүй" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const currentPin = typeof body?.currentPin === "string" ? body.currentPin : "";
    const newPin = typeof body?.newPin === "string" ? body.newPin : "";
    const confirmPin = typeof body?.confirmPin === "string" ? body.confirmPin : "";

    if (newPin !== confirmPin) {
      return NextResponse.json({ error: "Шинэ PIN таарахгүй байна" }, { status: 400 });
    }

    const result = await setCaseClosePin(currentPin, newPin);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Алдаа" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "PIN шинэчлэхэд алдаа гарлаа" }, { status: 500 });
  }
}
