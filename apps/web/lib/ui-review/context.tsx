"use client";

import { createContext, useContext } from "react";

/**
 * Marks the admin popup-inspector stage (`/admin/popups`). Surfaces that fire
 * side effects (analytics, server actions, programmatic form submits) check
 * this and short-circuit so the tour can mount them inertly.
 */
const UiReviewContext = createContext(false);

export const UiReviewProvider = UiReviewContext.Provider;

export function useUiReview(): boolean {
  return useContext(UiReviewContext);
}

/**
 * When the tour's viewport toggle is set, width-based media queries are
 * forced so forked surfaces (dialog ↔ sheet) render the chosen presentation
 * without resizing the window. `null` = real viewport.
 */
export type UiReviewViewport = "desktop" | "mobile" | null;

const UiReviewViewportContext = createContext<UiReviewViewport>(null);

export const UiReviewViewportProvider = UiReviewViewportContext.Provider;

export function useUiReviewViewport(): UiReviewViewport {
  return useContext(UiReviewViewportContext);
}
