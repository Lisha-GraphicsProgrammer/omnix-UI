// src/lib/sidebarState.ts
//
// Dashboard.tsx and Rules.tsx are separate top-level routes, each rendering
// their own <Sidebar>. Before this, each one kept sidebarOpen as its own
// plain useState(true) — so navigating from one to the other threw away
// whatever the person had just set and silently reopened the sidebar every
// time. Backing the value with localStorage means every page reads the same
// last-known state on mount, so it only ever changes when the burger icon
// is actually clicked — never as a side effect of navigating.
import { useState } from "react";

const STORAGE_KEY = "onvxp_sidebar_open";

function readStored(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}

export function useSidebarOpen(): [boolean, () => void] {
  const [open, setOpen] = useState<boolean>(readStored);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // localStorage unavailable (private browsing, etc.) — toggle still
        // works for this session, it just won't persist across a reload.
      }
      return next;
    });
  };

  return [open, toggle];
}
