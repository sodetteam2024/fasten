"use client";

import { useMemo } from "react";
import {
  Search,
  Filter,
  CalendarDays,
  AlertTriangle,
  Receipt,
  Lock,
  CheckCircle2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function money(v) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(Number(v || 0));
}

function normalize(x) {
  return String(x || "").toLowerCase().trim();
}

function isoDate(d) {
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

// vencido SOLO si: estado pendiente + fecha_vencimiento < hoy
function isOverdue(c) {
  const est = normalize(c?.estado);
  if (est !== "pendiente") return false;
  if (!c?.fecha_vencimiento) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = new Date(String(c.fecha_vencimiento));
  d.setHours(0, 0, 0, 0);

  return d < today;
}

// ✅ Badge único (prioridad visual)
function singleStatusBadge({ cargoEstado, locked, overdue }) {
  // locked = está dentro de un pago en proceso (pendiente_verificacion / pendiente)
  // overdue = vencido por fecha
  const s = normalize(cargoEstado);

  // 1) Pagado
  if (s === "pagado") {
    return {
      text: "Pagado",
      cls: "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-200 dark:border-green-500/20",
    };
  }

  // 2) Anulado
  if (s === "anulado") {
    return {
      text: "Anulado",
      cls: "bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 border-slate-200 dark:from-white/10 dark:to-white/5 dark:text-white/80 dark:border-white/10",
    };
  }

  // 3) En verificación (si está locked)
  if (locked) {
    return {
      text: "En verificación",
      cls: "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200 dark:from-blue-900/25 dark:to-cyan-900/25 dark:text-blue-200 dark:border-blue-500/20",
    };
  }

  // 4) Vencido (solo si NO locked)
  if (overdue) {
    return {
      text: "Vencido",
      cls: "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border-red-200 dark:from-red-900/25 dark:to-rose-900/25 dark:text-red-200 dark:border-red-500/20",
    };
  }

  // 5) Pendiente (default)
  return {
    text: "Pendiente",
    cls: "bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border-orange-200 dark:from-yellow-900/25 dark:to-orange-900/25 dark:text-orange-200 dark:border-orange-500/20",
  };
}

function smartConcept(concepto) {
  return String(concepto || "").trim();
}

export default function MyChargesSection({
  cargos,
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  selectedIds,
  onToggle,
  canSelectCargo,
  pendingPaymentCargoIds,
  onPaySingle,
  onPaySelected,
}) {
  const filtered = useMemo(() => {
    const s = (searchTerm || "").trim().toLowerCase();

    return (cargos || []).filter((c) => {
      const est = normalize(c.estado);

      // filtro: all|pendiente|pagado|anulado|vencido
      // "vencido" no existe como estado en bd, es calculado
      const overdue = isOverdue(c);
      const matchesStatus =
        filterStatus === "all"
          ? true
          : normalize(filterStatus) === "vencido"
          ? overdue && est === "pendiente"
          : est === normalize(filterStatus);

      const matchesSearch =
        !s ||
        String(c.concepto || "").toLowerCase().includes(s) ||
        String(c.source_type || "").toLowerCase().includes(s);

      return matchesStatus && matchesSearch;
    });
  }, [cargos, searchTerm, filterStatus]);

  const selectedSet = useMemo(
    () => new Set((selectedIds || []).map(String)),
    [selectedIds]
  );

  const selectedCount = selectedSet.size;

  const selectedTotal = useMemo(() => {
    const setIds = new Set((selectedIds || []).map(String));
    return (cargos || [])
      .filter((c) => setIds.has(String(c.id)))
      .reduce((s, c) => s + Number(c.valor || 0), 0);
  }, [selectedIds, cargos]);

  return (
    <Card className="shadow-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-purple-500" />
            Mis cargos
          </CardTitle>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar (concepto / tipo)..."
                className="pl-9 w-[240px] bg-white/70 dark:bg-white/5"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px] bg-white/70 dark:bg-white/5">
                <Filter className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
                <SelectItem value="anulado">Anulado</SelectItem>
              </SelectContent>
            </Select>

            {selectedCount >= 2 && (
              <Button
                type="button"
                onClick={() => onPaySelected(Array.from(selectedSet))}
                className="bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] text-white"
              >
                <Lock className="h-4 w-4 mr-2" />
                Pagar {selectedCount} ({money(selectedTotal)})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 dark:border-white/10 p-6 text-sm text-muted-foreground">
            No tienes cargos que coincidan con tu filtro.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const locked = pendingPaymentCargoIds?.has?.(String(c.id)); // en pago en proceso
              const overdue = !locked && isOverdue(c); // ✅ si locked, NO puede verse vencido

              const selectable = canSelectCargo?.(c); // ya contempla locked / pagado / anulado
              const checked = selectedSet.has(String(c.id));

              // ✅ único badge
              const badge = singleStatusBadge({
                cargoEstado: c.estado,
                locked,
                overdue,
              });

              // ✅ pagar permitido si NO pagado/anulado y NO locked
              // (vencido sigue pagando, porque overdue no bloquea)
              const canPay =
                !locked &&
                normalize(c.estado) !== "pagado" &&
                normalize(c.estado) !== "anulado";

              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        {/* checkbox (sin texto) */}
                        <label className="mt-1 inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!selectable}
                            onChange={() => onToggle?.(c)}
                            className="h-4 w-4 rounded border-black/20 dark:border-white/20 bg-white/70 dark:bg-white/10"
                            title={
                              locked
                                ? "Este cargo ya está en un pago en verificación."
                                : !selectable
                                ? "No se puede seleccionar."
                                : "Seleccionar"
                            }
                          />
                        </label>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                              {smartConcept(c.concepto)}
                            </p>

                            {/* ✅ solo un badge */}
                            <Badge className={badge.cls}>{badge.text}</Badge>
                          </div>

                          <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" />
                              Emisión: {c.fecha_emision || isoDate(c.created_at)}
                            </span>

                            {c.fecha_vencimiento ? (
                              <span className="inline-flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Vence: {c.fecha_vencimiento}
                              </span>
                            ) : null}

                            {c.source_type ? (
                              <span className="inline-flex items-center gap-1">
                                <Receipt className="h-3.5 w-3.5" />
                                Origen: {c.source_type}
                                {c.source_id ? ` #${c.source_id}` : ""}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {money(c.valor)}
                      </p>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onPaySingle?.(c.id)}
                        disabled={!canPay}
                        className="bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] text-white"
                        title={locked ? "Está en verificación." : "Pagar este cargo"}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Pagar
                      </Button>

                      {checked && selectedCount === 1 && (
                        <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Seleccionado
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedCount === 1 && checked ? (
                    <>
                      <Separator className="my-3" />
                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          onClick={() => onPaySelected([String(c.id)])}
                          disabled={!canPay}
                          className="bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] text-white"
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Pagar seleccionado ({money(c.valor)})
                        </Button>
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
