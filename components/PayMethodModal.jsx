"use client";

import { X, CreditCard, Smartphone, Banknote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PayMethodModal({
  open,
  onClose,
  totalLabel,
  canUsePse = true,
  loading = false,
  onConfirm, // async (method) => void
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-black/85 shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10">
          <div>
            <p className="text-base font-semibold">Pagar</p>
            <p className="text-xs text-muted-foreground">
              Total: <span className="font-semibold">{totalLabel}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => !loading && onClose?.()}
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60"
            disabled={loading}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm font-semibold">Método</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => onConfirm?.("wompi_card")}
              className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-3 flex items-center gap-2 justify-center hover:bg-black/5 dark:hover:bg-white/10 transition disabled:opacity-60"
            >
              <CreditCard className="h-4 w-4" />
              Tarjeta
            </button>

            <button
              type="button"
              disabled={loading || !canUsePse}
              onClick={() => onConfirm?.("wompi_pse")}
              className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-3 flex items-center gap-2 justify-center hover:bg-black/5 dark:hover:bg-white/10 transition disabled:opacity-60"
              title={!canUsePse ? "PSE no habilitado" : ""}
            >
              <Smartphone className="h-4 w-4" />
              PSE
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => onConfirm?.("cash")}
              className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-3 flex items-center gap-2 justify-center hover:bg-black/5 dark:hover:bg-white/10 transition disabled:opacity-60"
              title="Queda pendiente de verificación por el administrador"
            >
              <Banknote className="h-4 w-4" />
              Efectivo
            </button>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onClose?.()}
              disabled={loading}
            >
              Cerrar
            </Button>
          </div>

          {loading ? (
            <div className="pt-1 text-xs text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparando pago...
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
