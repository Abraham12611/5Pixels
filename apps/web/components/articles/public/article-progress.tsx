"use client";

import { useEffect, useState } from "react";

/**
 * Thin reading-progress bar pinned under the header. Decorative only —
 * aria-hidden so it adds nothing to the a11y tree.
 */
export function ArticleProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      setProgress(total > 0 ? Math.min(1, window.scrollY / total) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="bg-lime-500/80 fixed top-0 left-0 z-50 h-0.5 transition-[width] duration-100 motion-reduce:transition-none"
      style={{ width: `${progress * 100}%` }}
    />
  );
}
