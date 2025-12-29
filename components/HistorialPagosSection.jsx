"use client";

import { CalendarDays, CreditCard, Lock } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function money(v) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(Number(v || 0));
}

function normalizeEstado(x) {
  return String(x || "").toLowerCase();
}

function estadoPagoBadge(estado) {
  const s = normalizeEstado(estado);
  if (s === "confirmado" || s === "pagado")
    return "bg-green-100 text-green-700 border-green-200";
  if (s === "fallido")
    return "bg-red-100 text-red-700 border-red-200";
  return "bg-yellow-100 text-yellow-700 border-yellow-200";
}

export default function HistorialPagosSection({ pagos = [] }) {
  return (
    <Card className="shadow-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-purple-500" />
          Historial de pagos
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {pagos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/10 p-6 text-sm text-muted-foreground">
            Aún no tienes pagos registrados.
          </div>
        ) : (
          pagos.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-black/10 bg-white/70 dark:bg-white/5 p-4"
            >
              <div className="flex justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">Pago #{p.id}</p>
                    <Badge className={estadoPagoBadge(p.estado)}>
                      {p.estado}
                    </Badge>
                  </div>

                  <div className="mt-1 text-xs text-muted-foreground flex gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(p.created_at).toLocaleDateString("es-CO")}
                    </span>

                    {p.metodo && (
                      <span className="inline-flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5" />
                        {p.metodo}
                      </span>
                    )}
                  </div>

                  {p.pagos_detalle?.length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <div className="space-y-1">
                        {p.pagos_detalle.map((d) => (
                          <div
                            key={d.id}
                            className="flex justify-between text-xs text-muted-foreground"
                          >
                            <span className="truncate pr-2">
                              • {d?.cargos?.concepto || `Cargo #${d.id_cargo}`}
                            </span>
                            <span className="font-semibold">{money(d.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">{money(p.total)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
