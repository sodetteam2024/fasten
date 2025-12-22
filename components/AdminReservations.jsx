"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";
import { Check, X, Search, Filter, FileText, RefreshCw } from "lucide-react";

function money(v) {
  return `$${Number(v || 0).toLocaleString("es-CO")}`;
}

function hoursBetween(fecha_ini, fecha_fin) {
  const start = new Date(fecha_ini).getTime();
  const end = new Date(fecha_fin).getTime();
  const diff = Math.max(0, end - start);
  return diff / (1000 * 60 * 60);
}

function fmtDateTime(iso) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminReservations() {
  const { user } = useUser();

  const [roleId, setRoleId] = useState(null);
  const [perfil, setPerfil] = useState(null);

  const [loading, setLoading] = useState(true);
  const [reservas, setReservas] = useState([]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all"); // all | pendiente | aprobada | confirmada | cancelada | rechazada | completada

  const canAdmin = roleId === 1 || roleId === 2;

  const load = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);

    // 1) usuario (rol)
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id_usuario, idrol")
      .eq("clerk_id", user.id)
      .single();

    setRoleId(usuario?.idrol ?? null);

    // 2) perfil (unidad)
    const { data: perfilDb } = await supabase
      .from("perfilesusuarios")
      .select("id_unidad")
      .eq("id_usuario", usuario?.id_usuario)
      .single();

    setPerfil(perfilDb ?? null);

    if (!perfilDb?.id_unidad) {
      setReservas([]);
      setLoading(false);
      return;
    }

    // 3) traer áreas de la unidad (forma robusta)
    const { data: areas, error: errAreas } = await supabase
      .from("areas")
      .select("id, idunidad, nombre, pricing_type, valor_hora, valor_fijo, max_horas_fijo, estado")
      .eq("idunidad", perfilDb.id_unidad);

    if (errAreas) console.error("Error cargando áreas:", errAreas);

    const areaIds = (areas || []).map((a) => a.id);
    if (areaIds.length === 0) {
      setReservas([]);
      setLoading(false);
      return;
    }

    // 4) reservas de esas áreas
    const { data: reservasDb, error: errRes } = await supabase
      .from("reservas")
      .select(
        `
        id,
        id_area,
        id_usuario,
        fecha_ini,
        fecha_fin,
        num_personas,
        estado,
        created_at,
        usuarios (
          id_usuario,
          email,
          nombre_usuario
        )
      `
      )
      .in("id_area", areaIds)
      .order("created_at", { ascending: false });

    if (errRes) console.error("Error cargando reservas:", errRes);

    // 5) cargos asociados (source_type=reserva y source_id in ids)
    const reservaIds = (reservasDb || []).map((r) => r.id);
    let cargosMap = new Map();

    if (reservaIds.length > 0) {
      const { data: cargos, error: errCargos } = await supabase
        .from("cargos")
        .select("id, valor, estado, source_id")
        .eq("source_type", "reserva")
        .in("source_id", reservaIds);

      if (errCargos) {
        console.warn("No se pudieron cargar cargos:", errCargos);
      } else {
        for (const c of cargos || []) {
          cargosMap.set(String(c.source_id), c);
        }
      }
    }

    // 6) armar el objeto final, pegando área + cargo
    const areaMap = new Map((areas || []).map((a) => [String(a.id), a]));

    const merged =
      (reservasDb || []).map((r) => {
        const area = areaMap.get(String(r.id_area)) || null;
        const cargo = cargosMap.get(String(r.id)) || null;
        return {
          ...r,
          areas: area, // para mantener tu misma interfaz de UI
          _cargo: cargo,
        };
      }) ?? [];

    setReservas(merged);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    return reservas.filter((r) => {
      const matchesStatus = status === "all" || (r.estado || "") === status;
      if (!matchesStatus) return false;

      if (!s) return true;

      const areaName = r.areas?.nombre || "";
      const userName = r.usuarios?.nombre_usuario || r.usuarios?.email || "";
      return (
        areaName.toLowerCase().includes(s) ||
        userName.toLowerCase().includes(s) ||
        String(r.id).includes(s)
      );
    });
  }, [reservas, q, status]);

  const stats = useMemo(() => {
    const c = { total: reservas.length };
    for (const r of reservas) {
      const k = r.estado || "desconocido";
      c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [reservas]);

  async function insertHistorial(reservaId, estadoAnterior, estadoNuevo, nota = null) {
    // opcional: si aún no creaste la tabla, no rompe
    try {
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("id_usuario")
        .eq("clerk_id", user.id)
        .single();

      if (!usuario?.id_usuario) return;

      await supabase.from("reservas_historial").insert([
        {
          reserva_id: reservaId,
          estado_anterior: estadoAnterior,
          estado_nuevo: estadoNuevo,
          changed_by: usuario.id_usuario,
          nota,
        },
      ]);
    } catch (e) {
      console.warn("historial no insertado:", e?.message || e);
    }
  }

  async function approveReserva(r) {
    if (!canAdmin) return;

    if (!confirm(`¿Pre-aprobar reserva #${r.id} y generar cargo?`)) return;

    const area = r.areas;
    if (!area) return alert("No se encontró el área.");

    // cálculo valor
    const hrs = hoursBetween(r.fecha_ini, r.fecha_fin);
    if (hrs <= 0) return alert("Horario inválido.");

    let valor = 0;
    const pricingType = area.pricing_type || "hora"; // default seguro

    if (pricingType === "fijo") {
      const maxH = Number(area.max_horas_fijo || 0);
      if (maxH > 0 && hrs > maxH) {
        return alert(
          `Esta reserva dura ${hrs.toFixed(2)}h y supera el máximo (${maxH}h) para precio fijo.`
        );
      }
      valor = Number(area.valor_fijo || 0);
    } else {
      valor = Math.round(hrs * Number(area.valor_hora || 0));
    }

    const estadoAnterior = r.estado;

    // 1) update reserva -> aprobada
    const { error: errUp } = await supabase
      .from("reservas")
      .update({ estado: "aprobada" })
      .eq("id", r.id);

    if (errUp) {
      console.error(errUp);
      return alert("No se pudo aprobar la reserva.");
    }

    // 2) crear cargo solo si no existe ya
    if (!r._cargo) {
      const concepto = `Reserva: ${area.nombre} · ${fmtDateTime(r.fecha_ini)} - ${fmtDateTime(
        r.fecha_fin
      )}`;

      const { error: errCargo } = await supabase.from("cargos").insert([
        {
          idunidad: area.idunidad,
          idusuario: r.id_usuario,
          concepto,
          valor: Math.max(0, parseInt(valor, 10)),
          estado: "pendiente",
          source_type: "reserva",
          source_id: r.id,
        },
      ]);

      if (errCargo) {
        console.error(errCargo);
        alert("Reserva aprobada, pero NO se pudo crear el cargo. Revisa RLS/permisos.");
      }
    }

    await insertHistorial(r.id, estadoAnterior, "aprobada", "Pre-aprobación + creación de cargo");

    // refrescar (para que aparezca el cargo)
    await load();
  }

  async function rejectReserva(r) {
    if (!canAdmin) return;

    const reason = prompt("Motivo del rechazo (opcional):") || null;

    const estadoAnterior = r.estado;
    const { error } = await supabase
      .from("reservas")
      .update({ estado: "rechazada" })
      .eq("id", r.id);

    if (error) {
      console.error(error);
      return alert("No se pudo rechazar la reserva.");
    }

    await insertHistorial(r.id, estadoAnterior, "rechazada", reason);

    setReservas((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, estado: "rechazada" } : x))
    );
  }

  if (!canAdmin) {
    return (
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-5">
        <p className="font-semibold mb-2">Reservas</p>
        <p className="text-muted-foreground text-sm">
          No tienes permisos para administrar reservas.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
        <div>
          <h2 className="text-lg font-semibold">Reservas</h2>
          <p className="text-sm text-muted-foreground">
            Pre-aprueba para generar cargo. Cuando el pago se confirme, la reserva debería pasar a{" "}
            <b>confirmada</b> (idealmente con trigger).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Refrescar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full px-3 py-1 bg-black/5 dark:bg-white/5">
          Total: <b>{stats.total}</b>
        </span>
        {Object.entries(stats)
          .filter(([k]) => k !== "total")
          .map(([k, v]) => (
            <span key={k} className="rounded-full px-3 py-1 bg-black/5 dark:bg-white/5">
              {k}: <b>{v}</b>
            </span>
          ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por área, usuario o ID..."
            className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400/40"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
          >
            <option value="all">Todos</option>
            <option value="pendiente">pendiente</option>
            <option value="aprobada">aprobada</option>
            <option value="confirmada">confirmada</option>
            <option value="completada">completada</option>
            <option value="cancelada">cancelada</option>
            <option value="rechazada">rechazada</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
        <div className="grid grid-cols-12 bg-black/5 dark:bg-white/5 px-4 py-3 text-xs font-semibold text-muted-foreground">
          <div className="col-span-4">Reserva</div>
          <div className="col-span-4">Horario</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-muted-foreground">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">No hay reservas.</div>
        ) : (
          <div className="divide-y divide-black/10 dark:divide-white/10">
            {filtered.map((r) => {
              const area = r.areas;
              const userName = r.usuarios?.nombre_usuario || r.usuarios?.email || "Usuario";
              const hrs = hoursBetween(r.fecha_ini, r.fecha_fin);

              const pricingType = area?.pricing_type || "hora";
              let estimated = 0;
              if (pricingType === "fijo") estimated = Number(area?.valor_fijo || 0);
              else estimated = Math.round(hrs * Number(area?.valor_hora || 0));

              const cargo = r._cargo;

              return (
                <div key={r.id} className="grid grid-cols-12 px-4 py-4 items-start gap-3">
                  <div className="col-span-4">
                    <p className="font-semibold">
                      #{r.id} · {area?.nombre || "Área"}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {userName} · {r.num_personas} persona(s)
                    </p>

                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <FileText className="h-3 w-3" />
                      Estimado: <b className="text-foreground">{money(estimated)}</b>
                      <span className="opacity-70">
                        ({pricingType === "fijo" ? "fijo" : "por hora"} · {hrs.toFixed(2)}h)
                      </span>
                    </p>

                    {/* Cargo asociado */}
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Cargo:{" "}
                      {cargo ? (
                        <>
                          <b className="text-foreground">{money(cargo.valor)}</b>{" "}
                          <span className="opacity-70">({cargo.estado})</span>
                        </>
                      ) : (
                        <span className="opacity-70">— (aún no generado)</span>
                      )}
                    </p>
                  </div>

                  <div className="col-span-4 text-sm">
                    <p>
                      <b>Inicio:</b> {fmtDateTime(r.fecha_ini)}
                    </p>
                    <p>
                      <b>Fin:</b> {fmtDateTime(r.fecha_fin)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Creada: {fmtDateTime(r.created_at)}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        r.estado === "pendiente"
                          ? "bg-yellow-500/15 text-yellow-600"
                          : r.estado === "aprobada"
                          ? "bg-blue-500/15 text-blue-600"
                          : r.estado === "confirmada"
                          ? "bg-emerald-500/15 text-emerald-600"
                          : r.estado === "rechazada"
                          ? "bg-rose-500/15 text-rose-600"
                          : "bg-slate-500/15 text-slate-500"
                      }`}
                    >
                      {r.estado}
                    </span>
                  </div>

                  <div className="col-span-2 flex justify-end gap-2">
                    {r.estado === "pendiente" && (
                      <>
                        <button
                          type="button"
                          onClick={() => approveReserva(r)}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-3 py-2 text-xs font-semibold hover:bg-emerald-700 transition"
                        >
                          <Check className="h-4 w-4" />
                          Pre-aprobar
                        </button>

                        <button
                          type="button"
                          onClick={() => rejectReserva(r)}
                          className="inline-flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 px-3 py-2 text-xs font-semibold hover:bg-rose-500/10 transition"
                        >
                          <X className="h-4 w-4 text-rose-500" />
                          Rechazar
                        </button>
                      </>
                    )}

                    {r.estado !== "pendiente" && (
                      <span className="text-xs text-muted-foreground self-center">
                        (sin acciones aquí)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
