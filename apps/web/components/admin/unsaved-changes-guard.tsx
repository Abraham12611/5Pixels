"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Unsaved-changes navigation guard for the preset editor (#222).
 *
 * Covers the three ways edits can be lost:
 *  - `beforeunload` for tab close / hard reload.
 *  - Same-origin anchor clicks — Next.js client-side navigations are anchor
 *    clicks, so a capture-phase listener intercepts them while dirty and
 *    routes through a Stay/Discard dialog instead of a global link hijack.
 *  - Browser back/forward — a history sentinel is pushed once per mount; a
 *    pop while dirty re-arms and prompts rather than silently navigating.
 */
type PendingNav = { kind: "link"; href: string } | { kind: "history" };

export function UnsavedChangesGuard({ active }: { active: boolean }) {
  const router = useRouter();
  const [pendingNav, setPendingNav] = useState<PendingNav | null>(null);
  const bypassNextPopRef = useRef(false);
  const armedRef = useRef(false);
  const editorUrlRef = useRef("");

  // Hard navigations and tab close.
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);

  // Same-origin link clicks → Stay/Discard instead of instant navigation.
  useEffect(() => {
    if (!active) return;
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)
        ?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }
      const href = anchor.getAttribute("href") ?? "";
      if (!href || href.startsWith("#")) return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setPendingNav({ kind: "link", href });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active]);

  // Back/forward: the sentinel gives popstate something to land on; a pop
  // while dirty re-pushes the editor URL and prompts. Armed once per mount —
  // repeated dirty cycles reuse the same entry instead of stacking them.
  useEffect(() => {
    if (!active) return;
    if (!armedRef.current) {
      armedRef.current = true;
      editorUrlRef.current = window.location.href;
      history.pushState({ unsavedGuard: true }, "", window.location.href);
    }
    const onPop = () => {
      if (bypassNextPopRef.current) {
        bypassNextPopRef.current = false;
        return;
      }
      history.pushState({ unsavedGuard: true }, "", editorUrlRef.current);
      setPendingNav({ kind: "history" });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [active]);

  const stay = () => setPendingNav(null);
  const discard = () => {
    const nav = pendingNav;
    setPendingNav(null);
    if (nav?.kind === "link") {
      router.push(nav.href);
    } else {
      // The stack is [previous page, editor entry, re-armed sentinel], so a
      // single step back only reaches the editor's own history entry. Going
      // back two traverses both copies and lands on the real previous page;
      // the resulting pop is swallowed by the bypass flag.
      bypassNextPopRef.current = true;
      history.go(-2);
    }
  };

  return (
    <Dialog
      open={active && pendingNav !== null}
      onOpenChange={(open) => {
        if (!open) stay();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Discard unsaved changes?</DialogTitle>
          <DialogDescription>
            You have edits that haven&apos;t been saved. Leaving this page
            will discard them.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={stay} autoFocus>
            Stay
          </Button>
          <Button type="button" variant="destructive" onClick={discard}>
            Discard changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
