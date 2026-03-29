"use client";

import { useCallback, useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function emptyCells(length: number): string[] {
  return Array.from({ length }, () => "");
}

export type PinCodeInputProps = {
  id?: string;
  /** One string per cell; use with join("") when submitting */
  value: string[];
  onChange: (cells: string[]) => void;
  length?: number;
  disabled?: boolean;
  /** Focus first cell when true (e.g. when dialog opens) */
  autoFocus?: boolean;
  className?: string;
};

export function PinCodeInput({
  id,
  value,
  onChange,
  length = 4,
  disabled,
  autoFocus,
  className,
}: PinCodeInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const cells = (() => {
    const out = value.slice(0, length);
    while (out.length < length) out.push("");
    return out;
  })();

  const focusAt = useCallback((i: number) => {
    const el = refs.current[Math.max(0, Math.min(i, length - 1))];
    el?.focus();
    el?.select();
  }, [length]);

  useEffect(() => {
    if (autoFocus && !disabled) {
      const t = requestAnimationFrame(() => focusAt(0));
      return () => cancelAnimationFrame(t);
    }
  }, [autoFocus, disabled, focusAt]);

  const commit = (next: string[]) => {
    onChange(next.slice(0, length));
  };

  const handleChange = (i: number, raw: string) => {
    const ch = raw.slice(-1);
    const next = emptyCells(length);
    for (let j = 0; j < length; j++) next[j] = cells[j] ?? "";
    next[i] = ch === "" || ch === " " ? "" : ch;
    commit(next);
    if (ch && i < length - 1) focusAt(i + 1);
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (cells[i]) return;
      e.preventDefault();
      if (i > 0) {
        const next = emptyCells(length);
        for (let j = 0; j < length; j++) next[j] = cells[j] ?? "";
        next[i - 1] = "";
        commit(next);
        focusAt(i - 1);
      }
    }
    if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      focusAt(i - 1);
    }
    if (e.key === "ArrowRight" && i < length - 1) {
      e.preventDefault();
      focusAt(i + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\s/g, "");
    const next = emptyCells(length);
    for (let j = 0; j < length; j++) next[j] = text[j] ?? "";
    commit(next);
    const firstEmpty = next.findIndex((c) => !c);
    focusAt(firstEmpty === -1 ? length - 1 : firstEmpty);
  };

  return (
    <div
      id={id}
      className={cn("flex flex-wrap items-center justify-center gap-2 sm:gap-3", className)}
      role="group"
      aria-label="PIN код"
    >
      {cells.map((cell, i) => (
        <Input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="password"
          inputMode="text"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          name={i === 0 ? "pin-0" : `pin-${i}`}
          maxLength={1}
          disabled={disabled}
          value={cell}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className="h-12 w-11 shrink-0 rounded-lg border-2 px-0 text-center font-mono text-lg tracking-widest sm:h-14 sm:w-12 sm:text-xl"
          aria-label={`PIN ${i + 1} дахь орон`}
        />
      ))}
    </div>
  );
}

export function pinCellsToString(cells: string[]): string {
  return cells.join("");
}

export function emptyPinCells(length = 4): string[] {
  return emptyCells(length);
}
