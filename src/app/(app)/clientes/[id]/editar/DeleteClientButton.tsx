"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/validation";

export function DeleteClientButton({ clientId, name }: { clientId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function remove() {
    setLoading(true);
    const { error } = await createClient().from("clients").delete().eq("id", clientId);
    if (error) {
      toast(friendlyError(error), "error");
      setLoading(false);
      return;
    }
    toast("Cliente borrado");
    router.replace("/clientes");
    router.refresh();
  }

  return (
    <>
      <Button variant="danger" full icon={<Trash2 className="h-5 w-5" />} onClick={() => setOpen(true)}>
        Borrar cliente
      </Button>
      <ConfirmSheet
        open={open}
        onClose={() => setOpen(false)}
        title="¿Borrar cliente?"
        text={
          <>
            Se borrará a <strong>{name}</strong> junto con todos sus trabajos, pagos y cobros. Esto no se puede deshacer.
          </>
        }
        confirmLabel="Sí, borrar"
        onConfirm={remove}
        loading={loading}
      />
    </>
  );
}
