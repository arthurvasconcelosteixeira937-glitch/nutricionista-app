"use client";

import type { ReactNode } from "react";
import { useLinkStatus } from "next/link";
import { Spinner } from "@/components/ui/Spinner";

/** Contenido de un <Link> que muestra un spinner mientras la página carga. */
export function LinkPending({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className="h-5 w-5" /> : <>{children}</>;
}
