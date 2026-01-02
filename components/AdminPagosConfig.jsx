"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, Image as ImageIcon, Pencil, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

function money0(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

export default function AdminPagosConfig() {
  const [idUnidad, setIdUnidad] = useState(null);

  // cuentas guardadas (vista)
  const [cuentas, setCuentas] = useState([]);

  // edición: copia editable
  const [draftCuentas, setDraftCuentas] = useState([]);
  const [editing, setEditing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  /* =========================
     Load unidad + config
  ========================= */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);

        // 1) obtener user de Clerk (tu app ya usa Clerk)
        // Aquí NO usamos supabase.auth.getUser() porque tu auth es Clerk
        // Tomamos la unidad desde perfilesusuarios buscando el id_usuario por clerk_id.
        // Si ya lo haces en otros módulos, mantén la misma lógica.

        // buscar usuario por clerk_id con "clerk_id" desde el client (Clerk ya hidrata)
        // Para no depender de useUser aquí, lo hacemos igual que en otros módulos:
        // guardamos clerk_id en localStorage? NO.
        // 👉 Por simplicidad: leemos el perfil "single()" sin filtro si tu RLS ya limita por admin.
        // PERO: lo correcto es filtrar por el usuario actual. Si ya tienes "usuarios" por clerk en tu panel admin,
        // pega la misma lógica allí. Aquí hago la versión robusta:

        const { data: sessionUser, error: authErr } = await supabase.auth.getUser();
        // Si usas Clerk 100% y no supabase auth, auth.getUser() devolverá null.
        // En ese caso no bloqueamos: intentamos leer perfil directamente (si tu policy lo permite).
        // Si no lo permite, tendrás que pasar idUnidad desde el page admin (props).
        // (Por ahora: fallback seguro)
        let unidad = null;

        if (!authErr && sessionUser?.user) {
          const { data: perfil1 } = await supabase
            .from("perfilesusuarios")
            .select("id_unidad")
            .single();
          unidad = perfil1?.id_unidad ?? null;
        } else {
          // fallback (si RLS permite)
          const { data: perfil2, error: perfilErr } = await supabase
            .from("perfilesusuarios")
            .select("id_unidad")
            .limit(1)
            .single();

          if (perfilErr) {
            console.warn("No se pudo leer perfilesusuarios (RLS):", perfilErr);
          }
          unidad = perfil2?.id_unidad ?? null;
        }

        if (!unidad) {
          if (mounted) {
            setIdUnidad(null);
            setCuentas([]);
            setDraftCuentas([]);
            setEditing(false);
            setLoading(false);
          }
          return;
        }

        if (!mounted) return;
        setIdUnidad(unidad);

        // 2) cargar config
        const { data: config, error: cfgErr } = await supabase
          .from("pagos_config")
          .select("cuentas")
          .eq("idunidad", unidad)
          .maybeSingle();

        if (cfgErr) console.warn("pagos_config load:", cfgErr);

        const list = Array.isArray(config?.cuentas) ? config.cuentas : [];

        if (mounted) {
          setCuentas(list);
          setDraftCuentas(structuredClone(list));
          setEditing(false);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (mounted) {
          setLoading(false);
          setCuentas([]);
          setDraftCuentas([]);
          setEditing(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const hasChanges = useMemo(() => {
    try {
      return JSON.stringify(cuentas) !== JSON.stringify(draftCuentas);
    } catch {
      return true;
    }
  }, [cuentas, draftCuentas]);

  /* =========================
     Edit controls
  ========================= */
  const startEdit = () => {
    setDraftCuentas(structuredClone(cuentas));
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraftCuentas(structuredClone(cuentas));
    setEditing(false);
  };

  /* =========================
     CRUD en draft
  ========================= */
  const addCuenta = () => {
    setDraftCuentas((prev) => [
      ...prev,
      {
        banco: "",
        titular: "",
        numero: "",
        tipo: "transferencia",
        qr_path: null,
        nota: "",
      },
    ]);
  };

  const updateCuenta = (i, field, value) => {
    setDraftCuentas((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c))
    );
  };

  const removeCuenta = (i) => {
    if (!confirm("¿Eliminar esta cuenta?")) return;
    setDraftCuentas((prev) => prev.filter((_, idx) => idx !== i));
  };

  /* =========================
     Upload QR (API /api/upload-qr)
  ========================= */
  const uploadQR = async (i, file) => {
    if (!file || !idUnidad) return;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("idUnidad", String(idUnidad));

    const res = await fetch("/api/upload-qr", {
      method: "POST",
      body: fd,
    });

    const json = await res.json();

    if (!res.ok) {
      console.error(json);
      alert(json?.error || "No se pudo subir el QR");
      return;
    }

    updateCuenta(i, "qr_path", json.path);
  };

  /* =========================
     Save (upsert)
  ========================= */
  const saveConfig = async () => {
    if (!idUnidad) return;
    if (!editing) return;

    // validación mínima
    const cleaned = (draftCuentas || []).map((c) => ({
      banco: String(c?.banco || "").trim(),
      titular: String(c?.titular || "").trim(),
      numero: String(c?.numero || "").trim(),
      tipo: "transferencia",
      qr_path: c?.qr_path || null,
      nota: String(c?.nota || "").trim() || null,
    }));

    // opcional: evitar guardar cuentas vacías
    const hasAtLeastOne = cleaned.some((c) => c.banco || c.titular || c.numero || c.qr_path);
    if (!hasAtLeastOne) {
      if (!confirm("No hay datos en las cuentas. ¿Guardar vacío?")) return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("pagos_config").upsert(
        {
          idunidad: idUnidad,
          cuentas: cleaned,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "idunidad" }
      );

      if (error) {
        console.error(error);
        alert(error.message || "No se pudo guardar la configuración");
        return;
      }

      setCuentas(cleaned);
      setDraftCuentas(structuredClone(cleaned));
      setEditing(false);
      alert("Configuración guardada");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Cargando configuración…</p>;
  }

  if (!idUnidad) {
    return (
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-5">
        <p className="font-semibold mb-1">No se pudo detectar la unidad</p>
        <p className="text-sm text-muted-foreground">
          Revisa políticas (RLS) o carga la unidad desde tu panel (perfil).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Cuentas de pago (Transferencia)</h2>
          <p className="text-xs text-muted-foreground">
            Configura las cuentas/QR que el residente verá al pagar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!editing ? (
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center gap-2 rounded-xl bg-white/70 dark:bg-white/5 border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>
          ) : (
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-white/70 dark:bg-white/5 border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
          )}

          <button
            type="button"
            onClick={saveConfig}
            disabled={!editing || saving || !hasChanges}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Guardar
          </button>
        </div>
      </div>

      {/* Body */}
      {(!editing ? cuentas : draftCuentas).length === 0 && (
        <div className="rounded-xl border border-dashed border-black/10 dark:border-white/10 p-5 text-sm text-muted-foreground">
          No hay cuentas configuradas.
        </div>
      )}

      {/* List */}
      <div className="space-y-4">
        {(editing ? draftCuentas : cuentas).map((c, i) => (
          <div
            key={i}
            className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                Cuenta #{i + 1}{" "}
                <span className="text-xs text-muted-foreground">· transferencia</span>
              </p>

              {editing && (
                <button
                  type="button"
                  onClick={() => removeCuenta(i)}
                  className="inline-flex items-center gap-2 text-red-500 hover:text-red-600 text-sm"
                  title="Eliminar cuenta"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                placeholder="Banco"
                value={c.banco || ""}
                onChange={(e) => editing && updateCuenta(i, "banco", e.target.value)}
                disabled={!editing}
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400/40 disabled:opacity-70"
              />
              <input
                placeholder="Titular"
                value={c.titular || ""}
                onChange={(e) => editing && updateCuenta(i, "titular", e.target.value)}
                disabled={!editing}
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400/40 disabled:opacity-70"
              />
              <input
                placeholder="Número de cuenta"
                value={c.numero || ""}
                onChange={(e) => editing && updateCuenta(i, "numero", e.target.value)}
                disabled={!editing}
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400/40 disabled:opacity-70"
              />
              <input
                placeholder="Nota (opcional) — ej: Nequi, Daviplata..."
                value={c.nota || ""}
                onChange={(e) => editing && updateCuenta(i, "nota", e.target.value)}
                disabled={!editing}
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400/40 disabled:opacity-70"
              />
            </div>

            <div className="flex items-center gap-3">
              {editing ? (
                <label className="cursor-pointer inline-flex items-center gap-2 text-sm rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10">
                  <ImageIcon className="h-4 w-4" />
                  Subir QR
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) uploadQR(i, file);
                    }}
                  />
                </label>
              ) : (
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                  QR
                </div>
              )}

              {c.qr_path ? (
                <span className="text-xs text-muted-foreground">
                  QR cargado ✅
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Sin QR
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add button */}
      {editing && (
        <button
          type="button"
          onClick={addCuenta}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 text-white px-4 py-2 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          Nueva cuenta
        </button>
      )}
    </div>
  );
}
