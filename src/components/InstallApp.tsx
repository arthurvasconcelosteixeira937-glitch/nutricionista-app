"use client";

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Botón "Instalar app": usa el aviso nativo en Android y muestra pasos en iPhone. */
export function InstallApp() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!deferred && !isIOS)) return null;

  return (
    <>
      <Button
        variant="secondary"
        size="lg"
        full
        icon={<Download className="h-5 w-5" />}
        onClick={async () => {
          if (deferred) {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          } else {
            setHelp(true);
          }
        }}
      >
        Instalar app en mi celular
      </Button>
      <Sheet open={help} onClose={() => setHelp(false)} title="Instalar en iPhone">
        <ol className="space-y-4 text-[17px]">
          <li className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light font-bold text-brand">1</span>
            <span>
              Toca el botón <Share className="inline h-5 w-5 align-text-bottom text-blue-600" /> <strong>Compartir</strong> abajo en Safari.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light font-bold text-brand">2</span>
            <span>
              Elige <SquarePlus className="inline h-5 w-5 align-text-bottom" /> <strong>Agregar a inicio</strong>.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light font-bold text-brand">3</span>
            <span>
              Toca <strong>Agregar</strong>. ¡Listo! Cóbralo aparecerá como una app.
            </span>
          </li>
        </ol>
        <Button full size="lg" className="mt-6" onClick={() => setHelp(false)}>
          Entendido
        </Button>
      </Sheet>
    </>
  );
}
