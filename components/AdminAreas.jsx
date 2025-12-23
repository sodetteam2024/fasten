"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Save,
  Loader2,
} from "lucide-react";

const MAX_PHOTOS = 6;

function moneyInputToInt(str) {
  const clean = String(str || "").replace(/[^\d]/g, "");
  return clean ? parseInt(clean, 10) : 0;
}

function intToMoneyStr(v) {
  return Number(v || 0).toLocaleString("es-CO");
}

export default function AdminAreas() {
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [roleId, setRoleId] = useState(null);
  const [unidadId, setUnidadId] = useState(null);

  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);

  // editor area
  const [edit, setEdit] = useState({
    nombre: "",
    estado: "activa",
    pricing_type: "hora", // "hora" | "fijo"
    valor_hora: "0",
    valor_fijo: "0",
    max_horas_fijo: "0",
  });

  // fotos
  const [photos, setPhotos] = useState([]); // [{id, path, orden}]
  const [photoUrls, setPhotoUrls] = useState({}); // path -> signedUrl
  const [uploading, setUploading] = useState(false);
  const [savingArea, setSavingArea] = useState(false);

  const canAdmin = roleId === 1 || roleId === 2;

  const selectedArea = useMemo(
    () => areas.find((a) => String(a.id) === String(selectedAreaId)) || null,
    [areas, selectedAreaId]
  );

  // -----------------------------
  // Load role + unidad + areas
  // -----------------------------
  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      setLoading(true);

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("id_usuario, idrol")
        .eq("clerk_id", user.id)
        .single();

      setRoleId(usuario?.idrol ?? null);

      const { data: perfil } = await supabase
        .from("perfilesusuarios")
        .select("id_unidad")
        .eq("id_usuario", usuario?.id_usuario)
        .single();

      const uid = perfil?.id_unidad ?? null;
      setUnidadId(uid);

      if (!uid) {
        setAreas([]);
        setLoading(false);
        return;
      }

      const { data: aData, error } = await supabase
        .from("areas")
        .select("id, idunidad, nombre, estado, pricing_type, valor_hora, valor_fijo, max_horas_fijo, created_at")
        .eq("idunidad", uid)
        .order("id", { ascending: true });

      if (error) console.error(error);

      setAreas(aData || []);
      setSelectedAreaId((prev) => prev || (aData?.[0]?.id ?? null));

      setLoading(false);
    };

    load();
  }, [user?.id]);

  // -----------------------------
  // Load selected area into editor
  // -----------------------------
  useEffect(() => {
    if (!selectedArea) return;

    setEdit({
      nombre: selectedArea.nombre ?? "",
      estado: selectedArea.estado ?? "activa",
      pricing_type: selectedArea.pricing_type ?? "hora",
      valor_hora: intToMoneyStr(selectedArea.valor_hora ?? 0),
      valor_fijo: intToMoneyStr(selectedArea.valor_fijo ?? 0),
      max_horas_fijo: String(selectedArea.max_horas_fijo ?? 0),
    });
  }, [selectedAreaId, selectedArea]);

  // -----------------------------
  // Load photos for selected area
  // -----------------------------
  useEffect(() => {
    if (!selectedAreaId) return;

    const loadPhotos = async () => {
      setPhotoUrls({});
      const { data, error } = await supabase
        .from("areas_fotos")
        .select("id, area_id, path, orden")
        .eq("area_id", selectedAreaId)
        .order("orden", { ascending: true });

      if (error) console.error(error);
      setPhotos(data || []);
    };

    loadPhotos();
  }, [selectedAreaId]);

  // -----------------------------
  // Create signed urls for images
  // -----------------------------
  useEffect(() => {
    if (!photos?.length) return;

    let cancelled = false;

    const run = async () => {
      const next = {};
      for (const p of photos) {
        // firma solo si no existe
        if (photoUrls[p.path]) {
          next[p.path] = photoUrls[p.path];
          continue;
        }

        const { data, error } = await supabase.storage
          .from("areas")
          .createSignedUrl(p.path, 60 * 30); // 30 min

        if (!error && data?.signedUrl) next[p.path] = data.signedUrl;
      }

      if (!cancelled) setPhotoUrls((prev) => ({ ...prev, ...next }));
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  // -----------------------------
  // Upload images
  // -----------------------------
  const handleUploadFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";

    if (!selectedAreaId) return;
    if (files.length === 0) return;

    const currentCount = photos.length;
    const room = Math.max(0, MAX_PHOTOS - currentCount);

    if (room <= 0) {
      alert(`Máximo ${MAX_PHOTOS} fotos por área.`);
      return;
    }

    const toUpload = files.slice(0, room);

    setUploading(true);
    try {
      // subimos a storage y luego insertamos en tabla
      const insertedRows = [];

      for (let i = 0; i < toUpload.length; i++) {
        const f = toUpload[i];
        const ext = f.name.includes(".") ? f.name.split(".").pop() : "jpg";

        // path recomendado: unidad/area/timestamp_rand.ext
        const path = `${unidadId}/${selectedAreaId}/${Date.now()}_${Math.random()
          .toString(16)
          .slice(2)}.${ext}`;

        const { error: upErr } = await supabase.storage.from("areas").upload(path, f, {
          cacheControl: "3600",
          upsert: false,
        });

        if (upErr) {
          console.error(upErr);
          continue;
        }

        insertedRows.push({
          area_id: selectedAreaId,
          path,
          orden: currentCount + i, // al final
        });
      }

      if (insertedRows.length > 0) {
        const { data: newRows, error: insErr } = await supabase
          .from("areas_fotos")
          .insert(insertedRows)
          .select("id, area_id, path, orden");

        if (insErr) console.error(insErr);

        setPhotos((prev) => {
          const merged = [...prev, ...(newRows || [])];
          merged.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
          return merged;
        });
      }
    } finally {
      setUploading(false);
    }
  };

  // -----------------------------
  // Delete photo (db + storage)
  // -----------------------------
  const handleDeletePhoto = async (photo) => {
    if (!canAdmin) return;
    if (!confirm("¿Eliminar esta foto?")) return;

    // 1) delete row
    const { error: delErr } = await supabase
      .from("areas_fotos")
      .delete()
      .eq("id", photo.id);

    if (delErr) {
      console.error(delErr);
      alert("No se pudo eliminar el registro en BD.");
      return;
    }

    // 2) delete file from storage (si falla, no rompemos)
    const { error: stErr } = await supabase.storage.from("areas").remove([photo.path]);
    if (stErr) console.warn("No se pudo borrar del storage:", stErr);

    // 3) update state
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    setPhotoUrls((prev) => {
      const copy = { ...prev };
      delete copy[photo.path];
      return copy;
    });

    // 4) reordenar (compactar orden)
    await compactOrders(selectedAreaId);
  };

  // -----------------------------
  // Reorder photos
  // -----------------------------
  const movePhoto = async (index, dir) => {
    if (!canAdmin) return;
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= photos.length) return;

    const a = photos[index];
    const b = photos[nextIndex];

    // swap orden
    const updates = [
      { id: a.id, orden: b.orden },
      { id: b.id, orden: a.orden },
    ];

    const { error } = await supabase.from("areas_fotos").upsert(updates, {
      onConflict: "id",
    });

    if (error) {
      console.error(error);
      alert("No se pudo reordenar.");
      return;
    }

    setPhotos((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], orden: updates[0].orden };
      copy[nextIndex] = { ...copy[nextIndex], orden: updates[1].orden };
      copy.sort((x, y) => (x.orden ?? 0) - (y.orden ?? 0));
      return copy;
    });
  };

  // compact orden 0..n-1
  const compactOrders = async (areaId) => {
    const { data } = await supabase
      .from("areas_fotos")
      .select("id, orden")
      .eq("area_id", areaId)
      .order("orden", { ascending: true });

    const rows = data || [];
    const patch = rows.map((r, idx) => ({ id: r.id, orden: idx }));

    if (patch.length === 0) return;

    const { error } = await supabase.from("areas_fotos").upsert(patch, {
      onConflict: "id",
    });

    if (error) console.warn("No se pudo compactar orden:", error);

    // reload local
    const { data: fresh } = await supabase
      .from("areas_fotos")
      .select("id, area_id, path, orden")
      .eq("area_id", areaId)
      .order("orden", { ascending: true });

    setPhotos(fresh || []);
  };

  // -----------------------------
  // Save area changes
  // -----------------------------
  const saveArea = async () => {
    if (!canAdmin) return;
    if (!selectedAreaId) return;

    const payload = {
      nombre: edit.nombre.trim(),
      estado: edit.estado,
      pricing_type: edit.pricing_type,
      valor_hora: moneyInputToInt(edit.valor_hora),
      valor_fijo: moneyInputToInt(edit.valor_fijo),
      max_horas_fijo: parseInt(edit.max_horas_fijo || "0", 10) || 0,
    };

    if (!payload.nombre) return alert("El nombre es obligatorio.");

    setSavingArea(true);
    const { error } = await supabase.from("areas").update(payload).eq("id", selectedAreaId);

    setSavingArea(false);

    if (error) {
      console.error(error);
      alert("No se pudo guardar el área.");
      return;
    }

    setAreas((prev) =>
      prev.map((a) => (String(a.id) === String(selectedAreaId) ? { ...a, ...payload } : a))
    );

    alert("Área guardada ✅");
  };

  // -----------------------------
  // UI
  // -----------------------------
  if (loading) {
    return (
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-5">
        Cargando...
      </div>
    );
  }

  if (!canAdmin) {
    return (
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-5">
        <p className="font-semibold mb-2">Áreas</p>
        <p className="text-muted-foreground text-sm">
          No tienes permisos para administrar áreas.
        </p>
      </div>
    );
  }

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Lista */}
      <div className="lg:col-span-4">
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 overflow-hidden">
          <div className="px-4 py-3 bg-black/5 dark:bg-white/5 text-sm font-semibold">
            Áreas
          </div>

          <div className="divide-y divide-black/10 dark:divide-white/10">
            {areas.map((a) => {
              const active = String(a.id) === String(selectedAreaId);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAreaId(a.id)}
                  className={[
                    "w-full text-left px-4 py-3 transition",
                    active
                      ? "bg-purple-500/10 text-purple-700 dark:text-purple-300"
                      : "hover:bg-black/5 dark:hover:bg-white/10",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{a.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        #{a.id} · {a.estado}
                      </p>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-black/5 dark:bg-white/5">
                      {a.pricing_type || "hora"}
                    </span>
                  </div>
                </button>
              );
            })}

            {areas.length === 0 && (
              <div className="px-4 py-4 text-sm text-muted-foreground">
                No hay áreas en esta unidad.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor + Galería */}
      <div className="lg:col-span-8">
        {!selectedArea ? (
          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-5">
            Selecciona un área.
          </div>
        ) : (
          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-5 space-y-6">
            {/* Editor básico */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Editar área</h2>
                <p className="text-sm text-muted-foreground">Configura precio y fotos.</p>
              </div>

              <button
                type="button"
                onClick={saveArea}
                disabled={savingArea}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 text-white px-4 py-2 text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
              >
                {savingArea ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Nombre</label>
                <input
                  value={edit.nombre}
                  onChange={(e) => setEdit((p) => ({ ...p, nombre: e.target.value }))}
                  className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Estado</label>
                <select
                  value={edit.estado}
                  onChange={(e) => setEdit((p) => ({ ...p, estado: e.target.value }))}
                  className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                >
                  <option value="activa">activa</option>
                  <option value="inactiva">inactiva</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tipo de precio</label>
                <select
                  value={edit.pricing_type}
                  onChange={(e) => setEdit((p) => ({ ...p, pricing_type: e.target.value }))}
                  className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                >
                  <option value="hora">por hora</option>
                  <option value="fijo">fijo</option>
                </select>
              </div>

              {edit.pricing_type === "hora" ? (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Valor por hora</label>
                  <input
                    value={edit.valor_hora}
                    onChange={(e) => setEdit((p) => ({ ...p, valor_hora: e.target.value }))}
                    className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                    placeholder="Ej: 20000"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Valor fijo</label>
                    <input
                      value={edit.valor_fijo}
                      onChange={(e) => setEdit((p) => ({ ...p, valor_fijo: e.target.value }))}
                      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                      placeholder="Ej: 50000"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Máx horas para fijo</label>
                    <input
                      value={edit.max_horas_fijo}
                      onChange={(e) => setEdit((p) => ({ ...p, max_horas_fijo: e.target.value }))}
                      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                      placeholder="Ej: 4"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Galería */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  <h3 className="font-semibold">Galería (máx {MAX_PHOTOS})</h3>
                </div>

                <label className="inline-flex items-center gap-2 rounded-xl bg-black/5 dark:bg-white/10 px-3 py-2 text-sm font-semibold cursor-pointer hover:bg-black/10 dark:hover:bg-white/15 transition">
                  <Plus className="h-4 w-4" />
                  {uploading ? "Subiendo..." : "Añadir fotos"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleUploadFiles}
                    className="hidden"
                    disabled={uploading || photos.length >= MAX_PHOTOS}
                  />
                </label>
              </div>

              <p className="text-xs text-muted-foreground">
                Fotos actuales: <b>{photos.length}</b> / {MAX_PHOTOS}
              </p>

              {photos.length === 0 ? (
                <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4 text-sm text-muted-foreground">
                  No hay fotos todavía. Sube hasta {MAX_PHOTOS}.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((p, idx) => {
                    const url = photoUrls[p.path];
                    return (
                      <div
                        key={p.id}
                        className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 overflow-hidden"
                      >
                        <div className="aspect-video bg-black/5 dark:bg-white/5 flex items-center justify-center">
                          {url ? (
                            <img
                              src={url}
                              alt="foto"
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">Cargando...</span>
                          )}
                        </div>

                        <div className="p-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => movePhoto(idx, -1)}
                              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
                              title="Subir"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => movePhoto(idx, 1)}
                              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
                              title="Bajar"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(p)}
                            className="inline-flex items-center gap-2 text-xs font-semibold text-rose-600 hover:underline"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Preview de precio */}
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4 text-sm">
              <p className="font-semibold mb-1">Vista rápida:</p>
              <p className="text-muted-foreground">
                {edit.pricing_type === "fijo" ? (
                  <>
                    Precio fijo: <b>${intToMoneyStr(moneyInputToInt(edit.valor_fijo))}</b> hasta{" "}
                    <b>{parseInt(edit.max_horas_fijo || "0", 10) || 0}h</b>
                  </>
                ) : (
                  <>
                    Precio por hora: <b>${intToMoneyStr(moneyInputToInt(edit.valor_hora))}</b> / hora
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
