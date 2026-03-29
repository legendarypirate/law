"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const [hasCustomPin, setHasCustomPin] = useState<boolean | null>(null);
  const [defaultHint, setDefaultHint] = useState<string | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings/case-close-pin");
        const data = await res.json();
        if (!cancelled && res.ok) {
          setHasCustomPin(Boolean(data.hasCustomPin));
          setDefaultHint(typeof data.defaultPinHint === "string" ? data.defaultPinHint : null);
        }
      } catch {
        if (!cancelled) setError("Тохиргоо ачаалж чадсангүй");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch("/api/settings/case-close-pin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin, confirmPin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Алдаа гарлаа");
        return;
      }
      setMessage("PIN амжилттай шинэчлэгдлээ.");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setHasCustomPin(true);
      setDefaultHint(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Тохиргоо</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Хэрэг хаах PIN</CardTitle>
          <CardDescription>
            Хэргүүдийн жагсаалт болон хэргийн дэлгэрэнгүй дээрх «Хэрэг хаах» товч PIN болон тайлбар шаарддаг.
            {hasCustomPin === false && defaultHint && (
              <span className="mt-2 block text-foreground/90">
                Одоогоор өөрийн PIN тохируулаагүй тул анхдагч PIN: <span className="font-mono">{defaultHint}</span>
              </span>
            )}
            {hasCustomPin === true && (
              <span className="mt-2 block text-foreground/90">Өөрийн PIN тохируулсан байна.</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-pin">Одоогийн PIN</Label>
              <Input
                id="current-pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pin">Шинэ PIN (хамгийн багадаа 4 тэмдэгт)</Label>
              <Input
                id="new-pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pin">Шинэ PIN давтах</Label>
              <Input
                id="confirm-pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
            <Button type="submit" disabled={saving}>
              {saving ? "Хадгалж байна…" : "PIN хадгалах"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
