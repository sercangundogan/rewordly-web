"use client";

import { useEffect } from "react";
import { createSupabaseBrowser } from "../lib/supabase-browser";

const AUTH_LINK_IDS = ["nav-auth-link", "nav-auth-link-mobile"];

/**
 * Client-only: upgrades the static "Log in" link to "Dashboard" when the user is logged in.
 */
export default function NavAuthLinks() {
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      AUTH_LINK_IDS.forEach((id) => {
        const el = typeof document !== "undefined" ? document.getElementById(id) : null;
        if (el && el instanceof HTMLAnchorElement) {
          el.href = "/dashboard";
          el.textContent = "Dashboard";
        }
      });
    });
  }, []);

  return null;
}
