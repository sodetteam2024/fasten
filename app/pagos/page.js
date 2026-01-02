"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { Card, CardContent } from "@/components/ui/card";
import MyChargesSection from "@/components/MyChargesSection";
import PaymentsHistorySection from "@/components/PaymentsHistorySection";
import PayTransferModal from "@/components/PayTransferModal";

/* helpers */
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

function RedirectTo({ path }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(path);
  }, [path, router]);
  return null;
}

export default function PagosPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useUser();

  const [usuarioDb, setUsuarioDb] = useState(null);
  const [perfilDb, setPerfilDb] = useState(null);

  const [cargos, setCargos] = useState([]);
  const [pagos, setPagos] = useState([]);

  const [cuentas, setCuentas] = useState([]); // desde pagos_config.cuentas
  const [loading, setLoading] = useState(true);

  // filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all|pendiente|pagado|anulado

  // selección
  const [selectedIds, setSelectedIds] = useState([]); // string ids

  // modal pago transferencia
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingIds, setPayingIds] = useState([]); // cargoIds
  const [startingPayment, setStartingPayment] = useState(false);

  const userName =
    (perfilDb?.nombre
      ? `${perfilDb.nombre} ${perfilDb.apellido || ""}`.trim()
      : user?.fullName || user?.username) || "Usuario";

  const loadAll = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);

    // 1) usuario
    const { data: usuario, error: errUsuario } = await supabase
      .from("usuarios")
      .select("id_usuario, idrol")
      .eq("clerk_id", user.id)
      .single();

    if (errUsuario || !usuario) {
      console.error("No se encontró usuario:", errUsuario);
      setUsuarioDb(null);
      setPerfilDb(null);
      setCargos([]);
      setPagos([]);
      setCuentas([]);
      setLoading(false);
      return;
    }
    setUsuarioDb(usuario);

    // 2) perfil (unidad + nombre)
    const { data: perfil, error: errPerfil } = await supabase
      .from("perfilesusuarios")
      .select("id_unidad, nombre, apellido")
      .eq("id_usuario", usuario.id_usuario)
      .single();

    if (errPerfil || !perfil) {
      console.error("No se encontró perfil:", errPerfil);
      setPerfilDb(null);
      setCargos([]);
      setPagos([]);
      setCuentas([]);
      setLoading(false);
      return;
    }
    setPerfilDb(perfil);

    // 3) config cuentas (pagos_config)
    const { data: cfg, error: errCfg } = await supabase
      .from("pagos_config")
      .select("cuentas")
      .eq("idunidad", perfil.id_unidad)
      .single();

    if (errCfg) {
      console.warn("No se pudo cargar pagos_config:", errCfg?.message || errCfg);
      setCuentas([]);
    } else {
      const list = Array.isArray(cfg?.cuentas) ? cfg.cuentas : [];
      setCuentas(list.filter((c) => c?.is_active !== false));
    }

    // 4) cargos del usuario (filtrando valor > 0)
    const { data: cargosDb, error: errCargos } = await supabase
      .from("cargos")
      .select(
        "id, idunidad, idusuario, concepto, valor, estado, fecha_emision, fecha_vencimiento, source_type, source_id, created_at"
      )
      .eq("idusuario", usuario.id_usuario)
      .eq("idunidad", perfil.id_unidad)
      .order("created_at", { ascending: false });

    if (errCargos) {
      console.error("Error cargando cargos:", errCargos);
      setCargos([]);
    } else {
      setCargos((cargosDb || []).filter((c) => Number(c.valor || 0) > 0));
    }

    // 5) pagos + detalle
    const { data: pagosDb, error: errPagos } = await supabase
      .from("pagos")
      .select(
        `
        id,
        id_usuario,
        total,
        estado,
        metodo,
        proveedor,
        ref_externa,
        created_at,
        comprobante_path,
        nota,
        pagos_detalle (
          id,
          id_cargo,
          valor,
          created_at,
          cargos ( id, concepto )
        )
      `
      )
      .eq("id_usuario", usuario.id_usuario)
      .order("created_at", { ascending: false });

    if (errPagos) {
      console.error("Error cargando pagos:", errPagos);
      setPagos([]);
    } else {
      setPagos(pagosDb || []);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // cargos incluidos en pagos "en proceso"
  const pendingPaymentCargoIds = useMemo(() => {
    const ids = new Set();
    for (const p of pagos || []) {
      const pe = normalize(p?.estado);
      const inProgress = pe === "pendiente" || pe === "pendiente_verificacion";
      if (!inProgress) continue;
      for (const d of p?.pagos_detalle || []) {
        if (d?.id_cargo) ids.add(String(d.id_cargo));
      }
    }
    return ids;
  }, [pagos]);

  // regla de selección
  const canSelectCargo = useCallback(
    (cargo) => {
      const est = normalize(cargo?.estado);
      if (est === "pagado") return false;
      if (est === "anulado") return false;
      if (pendingPaymentCargoIds.has(String(cargo?.id))) return false;
      return true;
    },
    [pendingPaymentCargoIds]
  );

  const toggleSelect = useCallback(
    (cargo) => {
      if (!cargo?.id) return;
      if (!canSelectCargo(cargo)) return;

      const id = String(cargo.id);
      setSelectedIds((prev) => {
        const has = prev.includes(id);
        if (has) return prev.filter((x) => x !== id);
        return [...prev, id];
      });
    },
    [canSelectCargo]
  );

  // resumen: vencida = pendiente y fecha_vencimiento < hoy
  const deudaVencida = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (cargos || [])
      .filter((c) => {
        const est = normalize(c.estado);
        if (est !== "pendiente") return false;
        if (!c.fecha_vencimiento) return false;
        const d = new Date(String(c.fecha_vencimiento));
        d.setHours(0, 0, 0, 0);
        return d < today;
      })
      .reduce((s, c) => s + Number(c.valor || 0), 0);
  }, [cargos]);

  const deudaPendiente = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (cargos || [])
      .filter((c) => {
        const est = normalize(c.estado);
        if (est !== "pendiente") return false;

        // si tiene vencimiento y ya pasó -> no contarla aquí (va en vencida)
        if (c.fecha_vencimiento) {
          const d = new Date(String(c.fecha_vencimiento));
          d.setHours(0, 0, 0, 0);
          if (d < today) return false;
        }
        return true;
      })
      .reduce((s, c) => s + Number(c.valor || 0), 0);
  }, [cargos]);

  const ultimoPagoConfirmado = useMemo(() => {
    return (pagos || []).find((p) => normalize(p.estado) === "confirmado") || null;
  }, [pagos]);

  const ultimoCargoPagado = useMemo(() => {
    if (!ultimoPagoConfirmado) return null;
    const det = (ultimoPagoConfirmado.pagos_detalle || [])[0];
    if (!det) return null;
    return {
      concepto: det?.cargos?.concepto || "Cargo",
      valor: det?.valor || ultimoPagoConfirmado.total,
      fecha: ultimoPagoConfirmado.created_at,
    };
  }, [ultimoPagoConfirmado]);

  const totalPaying = useMemo(() => {
    const setIds = new Set(payingIds.map(String));
    return (cargos || [])
      .filter((c) => setIds.has(String(c.id)))
      .reduce((s, c) => s + Number(c.valor || 0), 0);
  }, [payingIds, cargos]);

  // abrir modal
  const paySingle = (cargoId) => {
    setPayingIds([String(cargoId)]);
    setPayModalOpen(true);
  };

  const paySelected = (ids) => {
    const uniq = Array.from(new Set((ids || []).map(String)));
    if (!uniq.length) return;
    setPayingIds(uniq);
    setPayModalOpen(true);
  };

  // autoselect por querystring (viene desde reservas)
  useEffect(() => {
    const source_type = params?.get("source_type");
    const source_id = params?.get("source_id");
    if (!source_type || !source_id) return;
    if (!cargos?.length) return;

    const found = cargos.find(
      (c) =>
        normalize(c?.estado) !== "pagado" &&
        String(c?.source_type || "").toLowerCase() === String(source_type).toLowerCase() &&
        String(c?.source_id || "") === String(source_id)
    );

    if (found?.id) {
      const id = String(found.id);
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      // y opcionalmente abrir modal directo:
      // paySingle(found.id);
    }
  }, [params, cargos]);

  // callback cuando modal crea pago pendiente_verificacion
  const onPaymentCreated = async () => {
    setPayModalOpen(false);
    setPayingIds([]);
    setSelectedIds([]);
    await loadAll();
  };

  return (
    <>
      <SignedOut>
        <RedirectTo path="/" />
      </SignedOut>

      <SignedIn>
        <div className="min-h-screen text-foreground">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/55 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.55)] p-6 sm:p-8">
              <div className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] bg-clip-text text-transparent mb-2">
                  Pagos
                </h1>
                <p className="text-slate-600 dark:text-slate-300">
                  Hola, <span className="font-semibold">{userName}</span>. Aquí ves tus cargos e historial.
                </p>
              </div>

              {loading ? (
                <Card className="shadow-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black">
                  <CardContent className="p-8 text-slate-600 dark:text-slate-300">
                    Cargando información...
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Resumen */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card className="border-red-200 bg-red-50/70 dark:bg-red-900/20">
                      <CardContent className="p-5">
                        <p className="text-sm text-red-700 font-semibold">Deuda vencida</p>
                        <p className="text-2xl font-bold text-red-800">{money(deudaVencida)}</p>
                        <p className="text-xs text-red-600">Pendientes fuera de fecha</p>
                      </CardContent>
                    </Card>

                    <Card className="border-yellow-200 bg-yellow-50/70 dark:bg-yellow-900/20">
                      <CardContent className="p-5">
                        <p className="text-sm text-yellow-700 font-semibold">Pendiente por pagar</p>
                        <p className="text-2xl font-bold text-yellow-800">{money(deudaPendiente)}</p>
                        <p className="text-xs text-yellow-600">Aún dentro de plazo</p>
                      </CardContent>
                    </Card>

                    <Card className="border-green-200 bg-green-50/70 dark:bg-green-900/20">
                      <CardContent className="p-5">
                        <p className="text-sm text-green-700 font-semibold">Último cargo pagado</p>
                        {ultimoCargoPagado ? (
                          <>
                            <p className="text-sm font-semibold text-green-900 truncate">
                              {ultimoCargoPagado.concepto}
                            </p>
                            <p className="text-2xl font-bold text-green-800">
                              {money(ultimoCargoPagado.valor)}
                            </p>
                            <p className="text-xs text-green-600">
                              {new Date(ultimoCargoPagado.fecha).toLocaleDateString("es-CO")}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Aún no hay pagos</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Secciones verticales */}
                  <div className="space-y-6">
                    <MyChargesSection
                      cargos={cargos}
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      filterStatus={filterStatus}
                      setFilterStatus={setFilterStatus}
                      selectedIds={selectedIds}
                      onToggle={toggleSelect}
                      canSelectCargo={canSelectCargo}
                      pendingPaymentCargoIds={pendingPaymentCargoIds}
                      onPaySingle={paySingle}
                      onPaySelected={paySelected}
                    />

                    <PaymentsHistorySection pagos={pagos} />
                  </div>
                </>
              )}

              <PayTransferModal
                open={payModalOpen}
                onClose={() => {
                  if (startingPayment) return;
                  setPayModalOpen(false);
                  setPayingIds([]);
                }}
                usuarioDb={usuarioDb}
                perfilDb={perfilDb}
                payingIds={payingIds}
                cargos={cargos}
                onDone={loadAll}
              />

            </div>
          </main>
        </div>
      </SignedIn>
    </>
  );
}
