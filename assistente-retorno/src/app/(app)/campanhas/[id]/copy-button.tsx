"use client";

import { useState } from "react";
import { buttonClasses } from "@/components/ui";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  return (
    <button
      type="button"
      className={buttonClasses("secondary", "sm")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied("ok");
        } catch {
          setCopied("fail");
        }
        setTimeout(() => setCopied(null), 2500);
      }}
    >
      {copied === "ok" ? "Copiado!" : copied === "fail" ? "Não foi possível copiar" : "Copiar texto"}
    </button>
  );
}
