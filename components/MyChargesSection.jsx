"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Receipt,
  AlertTriangle,
  CreditCard,
  Filter,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* =========================
   Helpers
========================= */
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

function estadoCargoBadge(estado) {
  const s = normalizeEstado(estado);
  if (s === "pagado" || s === "paid")
    return "bg-emerald-500/15 text-emerald-200 border-emerald-500/20";
  if (s === "vencido" || s === "overdue")
    return "bg-red-500/15 text-red-200 border-red-500/20";
  if (s === "anulado" || s === "cancelado" || s === "cancelled")
    return "bg-white/10 text-white/70 border-white/10";
  return "bg-amber-500/15 text-amber-200 border-amber-500/20"; // pendiente
}

function estadoPagoPendienteChip() {
  return "bg-sky-500/15 text-sky-200 border-sky-500/20";
}

function shortDate(d) {
  try {
    return new Date(d).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function shortTime(d) {
  try {
    return new Date(d).toLocaleTimeString("es-CO", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function sameDay(a, b) {
  try {
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  } catch {
    return false;
  }
}

// ✅ Formato: si es mismo día -> "29 dic 2025 · 8:00 p. m.–10:00 p. m."
// si es diferente -> "29 dic 2025 8:00 p. m. → 30 dic 2025 10:00 a. m."
function formatRange(fechaIni, fechaFin) {
  if (!fechaIni || !fechaFin) return "";
  const isSame = sameDay(fechaIni, fechaFin);
  if (isSame) {
    return `${shortDate(fechaIni)} · ${shortTime(fechaIni)}–${shortTime(fechaFin)}`;
  }
  return `${shortDate(fechaIni)} ${shortTime(fechaIni)} → ${shortDate(fechaFin)} ${shortTime(fechaFin)}`;
}

function isSelectable(c, pendingPaymentCargoIds) {
  const est = normalizeEstado(c?.estado);
  if (est === "pagado") return false;
  if (pendingPaymentCargoIds?.has?.(String(c?.id))) return false;
  return true;
}

/* =========================
   Component
========================= */
export default function MyChargesSection({
  cargos = [],
  pagos = [],
  selected = [],
  setSelected,
  onPaySingle, // (cargo) => void
  onPaySelected, // (cargoIds[]) => void
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // cargos ya metidos en pago pendiente/procesando (para bloquear checkbox)
  const pendingPaymentCargoIds = useMemo(() => {
    const ids = new Set();
    for (const p of pagos || []) {
      const pe = normalizeEstado(p?.estado);
      const inProgress = pe === "pendiente" || pe === "procesando";
      if (!inProgress) continue;
      for (const d of p?.pagos_detalle || []) {
        if (d?.id_cargo) ids.add(String(d.id_cargo));
      }
    }
    return ids;
  }, [pagos]);

  const filtered = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();

    return (cargos || []).filter((c) => {
      const matchesSearch =
        !s ||
        String(c?.concepto || "").toLowerCase().includes(s) ||
        String(c?.source_type || "").toLowerCase().includes(s);

      const est = normalizeEstado(c?.estado);
      const matchesFilter = filterStatus === "all" ? true : est === normalizeEstado(filterStatus);

      return matchesSearch && matchesFilter;
    });
  }, [cargos, searchTerm, filterStatus]);

  const selectedSet = useMemo(() => new Set(selected.map(String)), [selected]);

  const selectedCount = selected.length;

  const toggle = (cargo) => {
    if (!cargo?.id) return;
    if (!isSelectable(cargo, pendingPaymentCargoIds)) return;

    const id = String(cargo.id);
    setSelected?.((prev) => {
      const list = (prev || []).map(String);
      if (list.includes(id)) return list.filter((x) => x !== id);
      return [...list, id];
    });
  };

  const paySelectedNow = () => {
    if (!selectedCount) return;
    onPaySelected?.(selected.map(String));
  };

  const clear = () => setSelected?.([]);

  return (
    <div className="space-y-4">
      {/* Header + tools */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">Mis cargos</h2>
            <p className="text-xs text-white/60">
              Selecciona uno o varios cargos para pagar. Los cargos “en proceso” no se pueden seleccionar.
            </p>
          </div>

          {/* ✅ Cuando hay selección, botón al lado del filtro (como pediste) */}
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <Button
                type="button"
                onClick={paySelectedNow}
                className="bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] text-white shadow-[0_14px_40px_rgba(0,0,0,0.35)] hover:opacity-95"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pagar ({selectedCount})
              </Button>
            )}

            {selectedCount > 0 && (
              <Button type="button" variant="secondary" onClick={clear}>
                Limpiar
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar (concepto / tipo)..."
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/35"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[220px] bg-white/5 border-white/10 text-white">
              <Filter className="h-4 w-4 mr-2 text-white/40" />
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
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-white/60">
          No tienes cargos que coincidan con tu filtro.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const locked = pendingPaymentCargoIds.has(String(c.id));
            const disabled = !isSelectable(c, pendingPaymentCargoIds);
            const checked = selectedSet.has(String(c.id));

            // ✅ si es cargo de reserva y tienes fechas: usa rango
            const hasReservaRange = c?.source_type === "reserva" && c?.fecha_ini && c?.fecha_fin;
            const titleRight = hasReservaRange
              ? formatRange(c.fecha_ini, c.fecha_fin)
              : null;

            return (
              <div
                key={c.id}
                className={[
                  "rounded-2xl border backdrop-blur-xl shadow-[0_18px_55px_rgba(0,0,0,0.35)]",
                  "bg-white/5 border-white/10",
                  checked ? "ring-1 ring-[#f9b009]/30" : "",
                  disabled ? "opacity-75" : "",
                ].join(" ")}
              >
                <div className="p-4 sm:p-5">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white truncate">
                          {c?.concepto || `Cargo #${c.id}`}
                        </p>

                        <Badge className={`border ${estadoCargoBadge(c.estado)}`}>
                          {String(c.estado || "pendiente")}
                        </Badge>

                        {locked && (
                          <Badge className={`border ${estadoPagoPendienteChip()}`}>
                            En proceso
                          </Badge>
                        )}
                      </div>

                      {/* subtitle (date range cleaner) */}
                      {titleRight ? (
                        <p className="mt-1 text-xs text-white/70">
                          {titleRight}
                        </p>
                      ) : null}

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Emisión: {c.fecha_emision ? c.fecha_emision : shortDate(c.created_at)}
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

                    {/* Right: price */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className="text-lg font-bold text-white">
                        {money(c.valor)}
                      </p>
                    </div>
                  </div>

                  <Separator className="my-4 bg-white/10" />

                  {/* Actions row */}
                  <div className="flex items-center justify-between gap-3">
                    {/* ✅ Checkbox sin texto "Seleccionar" */}
                    <label className="inline-flex items-center gap-2 select-none">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(c)}
                        className="h-4 w-4 accent-[#f9b009] cursor-pointer disabled:cursor-not-allowed"
                        aria-label="Seleccionar cargo"
                      />
                      {/* opcional: microtexto solo si está bloqueado */}
                      {locked ? (
                        <span className="text-xs text-white/45">
                          ya está en un pago en proceso
                        </span>
                      ) : null}
                    </label>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={locked || normalizeEstado(c?.estado) === "pagado" || Number(c?.valor || 0) <= 0}
                        onClick={() => onPaySingle?.(c)}
                        className="bg-white/10 border border-white/10 text-white hover:bg-white/15"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pagar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
