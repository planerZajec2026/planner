"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-renders the server components every few seconds while a job is queued or running. */
export function AutoOdswiezanie({ aktywne, co = 5000 }: { aktywne: boolean; co?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!aktywne) return;
    const id = setInterval(() => router.refresh(), co);
    return () => clearInterval(id);
  }, [aktywne, co, router]);
  return null;
}
