"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const COMPROBANTE_BUCKET = "comprobante_path";

export default function AdminPagosAprobar() {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);

    const { data } = await supabase
      .from("pagos")
      .select(
        `
        id,
        total,
        estado,
        comprobante_path,
        created_at,
        pagos_detalle (
          id_cargo
        )
      `
      )
      .eq("estado", "pendiente_verificacion")
      .order("created_at", { ascending: true });

    setPagos(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (pago) => {
    if (!confirm("¿Aprobar este pago?")) return;

    await supabase
      .from("pagos")
      .update({ estado: "confirmado" })
      .eq("id", pago.id);

    const cargoIds = pago.pagos_detalle.map((d) => d.id_cargo);

    await supabase
      .from("cargos")
      .update({ estado: "pagado" })
      .in("id", cargoIds);

    load();
  };

  const reject = async (pago) => {
    if (!confirm("¿Rechazar este pago?")) return;

    await supabase
      .from("pagos")
      .update({ estado: "rechazado" })
      .eq("id", pago.id);

    load();
  };

  if (loading) {
    return <p className="text-muted-foreground">Cargando pagos…</p>;
  }

  return (
    <div className="space-y-4">
      {pagos.length === 0 && (
        <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          No hay pagos pendientes de verificación.
        </div>
      )}

      {pagos.map((p) => (
        <div
          key={p.id}
          className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Pago #{p.id}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(p.created_at).toLocaleString("es-CO")}
              </p>
            </div>
            <p className="font-bold text-lg">
              ${p.total.toLocaleString("es-CO")}
            </p>
          </div>

          {p.comprobante_path ? (
            <img
              src={
                supabase.storage
                  .from(COMPROBANTE_BUCKET)
                  .getPublicUrl(p.comprobante_path).data.publicUrl
              }
              alt="Comprobante"
              className="max-h-64 rounded-lg border"
            />
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              Sin comprobante
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => reject(p)}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 text-white px-4 py-2"
            >
              <XCircle className="h-4 w-4" />
              Rechazar
            </button>

            <button
              onClick={() => approve(p)}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 text-white px-4 py-2"
            >
              <CheckCircle className="h-4 w-4" />
              Aprobar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
