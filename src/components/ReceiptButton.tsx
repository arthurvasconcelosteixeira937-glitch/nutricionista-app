"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toaster";
import { whatsappLink } from "@/lib/messages";
import { buildReceiptPdf, receiptFileName, receiptNumber, receiptShareText, type ReceiptData } from "@/lib/receipt";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function ReceiptButton({ data, variant = "primary" }: { data: ReceiptData; variant?: "primary" | "secondary" }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [failed, setFailed] = useState(false);
  const name = receiptFileName(data.number, data.language);
  const text = receiptShareText(data);

  // El PDF se prepara al abrir para que "Compartir" responda de inmediato
  // (iPhone exige que el menú de compartir se abra justo después del toque).
  useEffect(() => {
    if (!open || file) return;
    let cancelled = false;
    buildReceiptPdf(data)
      .then((blob) => !cancelled && setFile(new File([blob], name, { type: "application/pdf" })))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [open, file, data, name]);

  const canShareFile = typeof navigator !== "undefined" && !!file && !!navigator.canShare?.({ files: [file] });

  async function share() {
    if (!file) return;
    if (canShareFile) {
      try {
        await navigator.share({ files: [file], text, title: name });
      } catch (e) {
        if ((e as Error).name !== "AbortError") toast("No se pudo compartir. Descarga el PDF.", "error");
      }
      return;
    }
    // Sin soporte para compartir archivos: descargamos y abrimos WhatsApp con el mensaje
    download(file, name);
    window.open(whatsappLink(data.clientPhone, text), "_blank", "noopener");
    toast("PDF descargado. Adjúntalo en WhatsApp.");
  }

  return (
    <>
      <Button variant={variant} size="lg" full icon={<FileText className="h-6 w-6" />} onClick={() => setOpen(true)}>
        Enviar recibo
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`Recibo N.º ${receiptNumber(data.number)}`}>
        <p className="text-[15px] text-ink-soft">
          Recibo en {data.language === "en" ? "inglés" : "español"} para <strong>{data.clientName}</strong>.
        </p>
        {failed ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-red-700">No pudimos crear el PDF. Intenta de nuevo.</p>
        ) : !file ? (
          <div className="flex items-center justify-center gap-3 py-10 text-ink-muted">
            <Spinner /> Preparando recibo…
          </div>
        ) : (
          <div className="mt-5 space-y-2">
            <Button variant="whatsapp" size="lg" full icon={<Share2 className="h-6 w-6" />} onClick={share}>
              Compartir por WhatsApp
            </Button>
            <Button variant="outline" size="lg" full icon={<Download className="h-6 w-6" />} onClick={() => download(file, name)}>
              Descargar PDF
            </Button>
            {canShareFile && (
              <p className="pt-1 text-center text-sm text-ink-muted">Al compartir, elige WhatsApp y el chat de tu cliente.</p>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}
