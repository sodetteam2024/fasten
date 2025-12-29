"use client";

import { CalendarDays, CreditCard, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/* helpers */
function normalize(x) {
  return String(x || "").toLowerCase();
}
function money(v) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(Number(v || 0));
}
function isoDate(d) {
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}
function estadoPagoBadge(estado) {
  const s = normalize(estado);
  if (s === "confirmado" || s === "pagado" || s === "paid")
    return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-200 dark:border-green-500/20";
  if (s === "fallido" || s === "rechazado" || s === "rejected" || s === "error")
    return "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border-red-200 dark:from-red-900/25 dark:to-rose-900/25 dark:text-red-200 dark:border-red-500/20";

  return "bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border-orange-200 dark:from-yellow-900/25 dark:to-orange-900/25 dark:text-orange-200 dark:border-orange-500/20";
}

export default function PaymentsHistorySection({ pagos = [] }) {
  return (
    <Card className="shadow-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-purple-500" />
          Historial de pagos
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        {(!pagos || pagos.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-black/10 dark:border-white/10 p-6 text-sm text-muted-foreground">
            Aún no tienes pagos registrados.
          </div>
        ) : (
          <div className="space-y-3">
            {pagos.slice(0, 20).map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        Pago #{p.id}
                      </p>
                      <Badge className={estadoPagoBadge(p.estado)}>
                        {String(p.estado || "pendiente")}
                      </Badge>
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {isoDate(p.created_at)}
                      </span>
                      {p.metodo ? (
                        <span className="inline-flex items-center gap-1">
                          <Lock className="h-3.5 w-3.5" />
                          Método: {p.metodo}
                        </span>
                      ) : null}
                    </div>

                    {(p.pagos_detalle?.length || 0) > 0 ? (
                      <>
                        <Separator className="my-3" />
                        <div className="space-y-1">
                          {(p.pagos_detalle || []).slice(0, 3).map((d) => (
                            <div
                              key={d.id}
                              className="flex items-center justify-between text-xs text-muted-foreground"
                            >
                              <span className="truncate pr-2">
                                • {d?.cargos?.concepto || `Cargo #${d.id_cargo}`}
                              </span>
                              <span className="font-semibold">
                                {money(d.valor)}
                              </span>
                            </div>
                          ))}
                          {(p.pagos_detalle || []).length > 3 ? (
                            <div className="text-xs text-muted-foreground">
                              + {(p.pagos_detalle || []).length - 3} más...
                            </div>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {money(p.total)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
