"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Mantiene la zona horaria del perfil igual a la del celular del usuario. */
export function TimezoneSync({ userId, timezone }: { userId: string; timezone: string }) {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || tz === timezone) return;
    createClient()
      .from("profiles")
      .update({ timezone: tz })
      .eq("id", userId)
      .then(({ error }) => {
        if (!error) router.refresh();
      });
  }, [userId, timezone, router]);
  return null;
}
