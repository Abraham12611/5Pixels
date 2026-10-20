"use client";

import type { FieldErrors } from "react-hook-form";
import {
  focusFieldInSection,
  sectionLabel,
  type EditorSectionDef,
} from "./editor-shell";

export interface FormErrorItem {
  path: string;
  message: string;
  sectionId: string;
}

/**
 * Flatten react-hook-form's nested error tree into {path, message} leaves.
 * Leaf nodes carry `message`; everything else (field-array indices, nested
 * configs) is recursed into so paths come out as `fields.0.label`.
 */
export function flattenFormErrors(
  errors: FieldErrors,
  prefix = ""
): { path: string; message: string }[] {
  const out: { path: string; message: string }[] = [];
  for (const [key, value] of Object.entries(errors ?? {})) {
    if (value == null || typeof value !== "object") continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof (value as { message?: unknown }).message === "string") {
      out.push({
        path,
        message: (value as { message: string }).message,
      });
    } else {
      out.push(...flattenFormErrors(value as FieldErrors, path));
    }
  }
  return out;
}

const MAX_LISTED = 12;

/**
 * Actionable validation summary (#222): count + per-error links that scroll
 * to the owning section and focus the invalid control. Rendered inside the
 * form under `role="alert"` so failed submits are announced.
 */
export function FormErrorSummary({
  items,
  sections,
}: {
  items: FormErrorItem[];
  sections: EditorSectionDef[];
}) {
  if (items.length === 0) return null;
  return (
    <div
      role="alert"
      className="border-error/30 bg-error/10 rounded-2xl border p-4"
    >
      <p className="text-error text-sm font-semibold">
        {items.length}{" "}
        {items.length === 1 ? "issue needs" : "issues need"} attention before
        saving
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.slice(0, MAX_LISTED).map((item) => (
          <li key={item.path}>
            <button
              type="button"
              onClick={() => focusFieldInSection(item.path)}
              className="text-cream-100 decoration-error/40 hover:text-cream-50 text-left text-sm underline underline-offset-2"
            >
              <span className="text-text-secondary">
                {sectionLabel(sections, item.sectionId)}:
              </span>{" "}
              {item.message}
            </button>
          </li>
        ))}
        {items.length > MAX_LISTED && (
          <li className="text-text-secondary text-sm">
            …and {items.length - MAX_LISTED} more
          </li>
        )}
      </ul>
    </div>
  );
}
