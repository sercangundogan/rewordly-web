"use client";

import { useEffect } from "react";
import { createSupabaseBrowser } from "../lib/supabase-browser";

const AUTH_LINK_ID = "nav-auth-link";

/**
 * Client-only: upgrades the static "Log in" link to "Dashboard" when the user is logged in.
 */
export default function NavAuthLinks() {
  useEffect(() => {
    const el = typeof document !== "undefined" ? document.getElementById(AUTH_LINK_ID) : null;
    if (!el || !(el instanceof HTMLAnchorElement)) return;

    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        el.href = "/dashboard";
        el.textContent = "Dashboard";
      }
    });
  }, []);

  return null;
}
