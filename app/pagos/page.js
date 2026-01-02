"use client";

import { useEffect, useMemo, useState, useCallback, Suspense } from "react"; // ✅ Agregado Suspense
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { Card, CardContent } from "@/components/ui/card";
import MyChargesSection from "@/components/MyChargesSection";
import PaymentsHistorySection from "@/components/PaymentsHistorySection";
import PayTransferModal from "@/components/PayTransferModal";

/* --- HELPERS (Igual que los tenías) --- */
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

function RedirectTo({ path }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(path);
  }, [path, router]);
  return null;
}

/* --- COMPONENTE DE LÓGICA --- */
function PagosContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useUser();

  const [usuarioDb, setUsuarioDb] = useState(null);
  const [perfilDb, setPerfilDb] = useState(null);
  const [cargos, setCargos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingIds, setPayingIds] = useState([]);
  const [startingPayment, setStartingPayment] = useState(false);

  const userName =
    (perfilDb?.nombre
      ? `${perfilDb.nombre} ${perfilDb.apellido || ""}`.trim()
      : user?.fullName || user?.username) || "Usuario";

  const loadAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id_usuario, idrol")
      .eq("clerk_id", user.id)
      .single();

    if (!usuario) {
      setLoading(false);
      return;
    }
    setUsuarioDb(usuario);

    const { data: perfil } = await supabase
      .from("perfilesusuarios")
      .select("id_unidad, nombre, apellido")
      .eq("id_usuario", usuario.id_usuario)
      .single();

    if (perfil) {
      setPerfilDb(perfil);
      const { data: cfg } = await supabase
        .from("pagos_config")
        .select("cuentas")
        .eq("idunidad", perfil.id_unidad)
        .single();

      if (cfg) setCuentas(Array.isArray(cfg.cuentas) ? cfg.cuentas : []);

      const { data: cargosDb } = await supabase
        .from("cargos")
        .select("*")
        .eq("idusuario", usuario.id_usuario)
        .eq("idunidad", perfil.id_unidad)
        .order("created_at", { ascending: false });

      setCargos((cargosDb || []).filter((c) => Number(c.valor || 0) > 0));
    }

    const { data: pagosDb } = await supabase
      .from("pagos")
      .select(`*, pagos_detalle(*, cargos(id, concepto))`)
      .eq("id_usuario", usuario.id_usuario)
      .order("created_at", { ascending: false });

    setPagos(pagosDb || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const pendingPaymentCargoIds = useMemo(() => {
    const ids = new Set();
    pagos.forEach(p => {
      const pe = normalize(p?.estado);
      if (pe === "pendiente" || pe === "pendiente_verificacion") {
        p.pagos_detalle?.forEach(d => ids.add(String(d.id_cargo)));
      }
    });
    return ids;
  }, [pagos]);

  const canSelectCargo = useCallback((cargo) => {
    const est = normalize(cargo?.estado);
    return est !== "pagado" && est !== "anulado" && !pendingPaymentCargoIds.has(String(cargo?.id));
  }, [pendingPaymentCargoIds]);

  const toggleSelect = (cargo) => {
    if (!canSelectCargo(cargo)) return;
    const id = String(cargo.id);
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const deudaVencida = useMemo(() => {
    const today = new Date().setHours(0,0,0,0);
    return cargos.filter(c => normalize(c.estado) === "pendiente" && new Date(c.fecha_vencimiento) < today)
                 .reduce((s, c) => s + Number(c.valor), 0);
  }, [cargos]);

  const deudaPendiente = useMemo(() => {
    const today = new Date().setHours(0,0,0,0);
    return cargos.filter(c => normalize(c.estado) === "pendiente" && new Date(c.fecha_vencimiento) >= today)
                 .reduce((s, c) => s + Number(c.valor), 0);
  }, [cargos]);

  useEffect(() => {
    const source_type = params?.get("source_type");
    const source_id = params?.get("source_id");
    if (source_type && source_id && cargos.length) {
      const found = cargos.find(c => normalize(c.estado) !== "pagado" && normalize(c.source_type) === normalize(source_type) && String(c.source_id) === String(source_id));
      if (found) setSelectedIds(prev => [...new Set([...prev, String(found.id)])]);
    }
  }, [params, cargos]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/55 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.55)] p-6 sm:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] bg-clip-text text-transparent mb-2">Pagos</h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm">Hola, <span className="font-semibold">{userName}</span>. Revisa tus cuentas aquí.</p>
        </div>

        {loading ? (
          <div className="p-8 text-center animate-pulse">Cargando información...</div>
        ) : (
          <div className="space-y-6">
            {/* Grid de Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
               <Card className="bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 p-4">
                 <p className="text-xs font-bold text-red-600 uppercase">Vencido</p>
                 <p className="text-2xl font-black text-red-700">{money(deudaVencida)}</p>
               </Card>
               <Card className="bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/30 p-4">
                 <p className="text-xs font-bold text-yellow-600 uppercase">Pendiente</p>
                 <p className="text-2xl font-black text-yellow-700">{money(deudaPendiente)}</p>
               </Card>
            </div>

            <MyChargesSection 
              cargos={cargos} 
              selectedIds={selectedIds} 
              onToggle={toggleSelect} 
              onPaySingle={(id) => { setPayingIds([String(id)]); setPayModalOpen(true); }}
              onPaySelected={(ids) => { setPayingIds(ids); setPayModalOpen(true); }}
              canSelectCargo={canSelectCargo}
              pendingPaymentCargoIds={pendingPaymentCargoIds}
              searchTerm={searchTerm} setSearchTerm={setSearchTerm}
              filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            />
            <PaymentsHistorySection pagos={pagos} />
          </div>
        )}

        <PayTransferModal 
          open={payModalOpen} 
          onClose={() => { if(!startingPayment) setPayModalOpen(false); }}
          usuarioDb={usuarioDb} perfilDb={perfilDb}
          payingIds={payingIds} cargos={cargos}
          onDone={loadAll}
        />
      </div>
    </main>
  );
}

/* --- EXPORT PRINCIPAL (El "escudo" para el build) --- */
export default function PagosPage() {
  return (
    <>
      <SignedOut>
        <RedirectTo path="/" />
      </SignedOut>

      <SignedIn>
        <div className="min-h-screen text-foreground">
          {/* ✅ Esto permite que useSearchParams funcione sin romper el build */}
          <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted-foreground">Cargando panel de pagos...</div>}>
            <PagosContent />
          </Suspense>
        </div>
      </SignedIn>
    </>
  );
}