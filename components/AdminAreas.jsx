"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Save, Image as ImageIcon, Trash2, Loader2, RefreshCw } from "lucide-react";
import CreateAreaModal from "@/components/CreateAreaModal";

const AREAS_BUCKET = "areas";
const MAX_PHOTOS = 6;

// Si tu bucket es privado, esto expira -> por eso hacemos auto-refresh.
const SIGNED_URL_TTL = 60 * 60; // 1 hora

// Refrescamos URLs antes de que expire (ej: cada 45 min)
const AUTO_REFRESH_MS = 45 * 60 * 1000;

function money(v) {
  return `$${Number(v || 0).toLocaleString("es-CO")}`;
}

function safeInt(v) {
  const n = parseInt(String(v ?? "0"), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Resuelve una URL para mostrar una imagen del bucket.
 * - Si es http(s) la devuelve
 * - Intenta signedUrl
 * - Fallback a publicUrl
 */
async function resolveStorageUrl(path) {
  if (!path) return "";

  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const { data: signed, error: errSigned } = await supabase.storage
    .from(AREAS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);

  if (!errSigned && signed?.signedUrl) return signed.signedUrl;

  const { data: pub } = supabase.storage.from(AREAS_BUCKET).getPublicUrl(path);
  return pub?.publicUrl || "";
}

// Insert DB por API (bypass RLS)
async function insertAreaPhotoViaApi({ id_area, path, orden }) {
  const res = await fetch("/api/areas-photos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_area, path, orden }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Error insertando en DB");
  return json.row; // { id, id_area, path, orden }
}

export default function AdminAreas() {
  const { user } = useUser();

  const [roleId, setRoleId] = useState(null);
  const [perfil, setPerfil] = useState(null);

  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);

  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const canAdmin = roleId === 1 || roleId === 2;

  // Mapa en memoria para evitar re-firmar lo mismo mil veces (en AdminAreas)
  const urlCacheRef = useRef(new Map());

  const cachedResolve = useCallback(async (path) => {
    if (!path) return "";
    const key = String(path);

    const cache = urlCacheRef.current;
    if (cache.has(key)) return cache.get(key);

    const url = await resolveStorageUrl(key);
    if (url) cache.set(key, url);
    return url || "";
  }, []);

  const hydrateForm = useCallback((area) => {
    setSelected(area);
    setForm({
      id: area.id,
      nombre: area.nombre ?? "",
      estado: area.estado ?? "activa",
      pricing_type: area.pricing_type ?? "por_hora",
      valor_hora: safeInt(area.valor_hora),
      valor_fijo: safeInt(area.valor_fijo),
      max_horas_fijo: safeInt(area.max_horas_fijo),
      imagen_principal: area.imagen_principal ?? null,
    });
  }, []);

  // ======== Cargar fotos del área + firmar urls (si aplica) =========
  const loadAreaPhotos = useCallback(
    async (areaId) => {
      if (!areaId) {
        setPhotos([]);
        return;
      }

      const { data, error } = await supabase
        .from("areas_fotos")
        .select("id, id_area, path, orden, created_at")
        .eq("id_area", areaId)
        .order("orden", { ascending: true });

      if (error) {
        console.error("Error cargando fotos:", error);
        setPhotos([]);
        return;
      }

      const mapped = await Promise.all(
        (data || []).slice(0, MAX_PHOTOS).map(async (p) => {
          const url = await cachedResolve(p.path);
          return { ...p, url, pending: false };
        })
      );

      setPhotos(mapped);
    },
    [cachedResolve]
  );

  // ======== SELECT AREA =========
  const selectArea = useCallback(
    async (area) => {
      if (!area?.id) return;
      hydrateForm(area);
      // IMPORTANTE: limpia cache SOLO si quieres forzar refresh total al cambiar de área.
      // Yo no lo limpio para que sea más rápido; igual hay auto-refresh.
      await loadAreaPhotos(area.id);
    },
    [hydrateForm, loadAreaPhotos]
  );

  // ========= LOAD =========
  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      setLoading(true);

      const { data: usuario, error: errUsuario } = await supabase
        .from("usuarios")
        .select("id_usuario, idrol")
        .eq("clerk_id", user.id)
        .single();

      if (errUsuario) console.error(errUsuario);
      setRoleId(usuario?.idrol ?? null);

      const { data: perfilDb, error: errPerfil } = await supabase
        .from("perfilesusuarios")
        .select("id_unidad")
        .eq("id_usuario", usuario?.id_usuario)
        .single();

      if (errPerfil) console.error(errPerfil);
      setPerfil(perfilDb ?? null);

      if (!perfilDb?.id_unidad) {
        setAreas([]);
        setSelected(null);
        setForm(null);
        setPhotos([]);
        setLoading(false);
        return;
      }

      const { data: a, error: errAreas } = await supabase
        .from("areas")
        .select("id, idunidad, nombre, estado, pricing_type, valor_hora, valor_fijo, max_horas_fijo, imagen_principal")
        .eq("idunidad", perfilDb.id_unidad)
        .order("id", { ascending: true });

      if (errAreas) console.error(errAreas);

      setAreas(a || []);
      setLoading(false);

      // Mantener el seleccionado si sigue existiendo, si no, el primero.
      const currentId = selected?.id;
      const keep = (a || []).find((x) => String(x.id) === String(currentId));
      if (keep) {
        await selectArea(keep);
      } else if ((a || []).length > 0) {
        await selectArea(a[0]);
      } else {
        setSelected(null);
        setForm(null);
        setPhotos([]);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ======== Auto-refresh de URLs firmadas mientras estás en un área (evita “se borran”) ========
  useEffect(() => {
    if (!selected?.id) return;

    const t = setInterval(async () => {
      // refresca urls de las fotos actuales
      setPhotos((prev) => prev.map((p) => ({ ...p }))); // no-op para mantener UI consistente
      const fresh = await Promise.all(
        (photos || []).map(async (p) => {
          if (!p?.path) return p;
          const url = await resolveStorageUrl(p.path);
          if (url) urlCacheRef.current.set(String(p.path), url);
          return { ...p, url: url || p.url };
        })
      );
      setPhotos(fresh);
    }, AUTO_REFRESH_MS);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // ========= CREATE AREA (desde modal) =========
  const createArea = useCallback(
    async (name) => {
      if (!canAdmin) throw new Error("Sin permisos.");
      if (!perfil?.id_unidad) throw new Error("Perfil sin unidad.");

      setCreating(true);
      try {
        const payload = {
          idunidad: perfil.id_unidad,
          nombre: name.trim(),
          estado: "activa",
          pricing_type: "por_hora",
          valor_hora: 0,
          valor_fijo: 0,
          max_horas_fijo: 0,
          imagen_principal: null,
        };

        const { data, error } = await supabase
          .from("areas")
          .insert([payload])
          .select("id, idunidad, nombre, estado, pricing_type, valor_hora, valor_fijo, max_horas_fijo, imagen_principal")
          .single();

        if (error) {
          console.error(error);
          throw new Error("No se pudo crear el área. Revisa RLS/Policies.");
        }

        setAreas((prev) => [...prev, data]);
        await selectArea(data);
      } finally {
        setCreating(false);
      }
    },
    [canAdmin, perfil?.id_unidad, selectArea]
  );

  // ========= SAVE AREA =========
  const saveArea = async () => {
    if (!canAdmin || !form?.id) return;

    setSaving(true);

    const payload = {
      nombre: form.nombre.trim(),
      estado: form.estado,
      pricing_type: form.pricing_type,
      valor_hora: safeInt(form.valor_hora),
      valor_fijo: safeInt(form.valor_fijo),
      max_horas_fijo: safeInt(form.max_horas_fijo),
    };

    const { error } = await supabase.from("areas").update(payload).eq("id", form.id);

    setSaving(false);

    if (error) {
      console.error(error);
      alert("No se pudo guardar. Revisa policies.");
      return;
    }

    setAreas((prev) => prev.map((a) => (a.id === form.id ? { ...a, ...payload } : a)));

    // también actualiza selected en memoria (para que no se “pierda” el estado)
    setSelected((prev) => (prev?.id === form.id ? { ...prev, ...payload } : prev));

    alert("Guardado ✅");
  };

  // ========= UPLOAD PHOTOS =========
  const onPickPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";

    if (!canAdmin) return alert("Sin permisos.");
    if (!selected?.id) return alert("Selecciona un área.");
    if (!files.length) return;

    const remaining = Math.max(0, MAX_PHOTOS - photos.length);
    const toUpload = files.slice(0, remaining);

    if (!toUpload.length) return alert("Ya tienes 6 fotos en esta galería.");

    const baseOrden = photos.filter((p) => !p.pending).length;

    toUpload.forEach((file, index) => {
      if (!file.type.startsWith("image/")) return;

      const tempId = `temp-${Date.now()}-${index}`;
      const previewUrl = URL.createObjectURL(file);

      // 1) preview inmediato
      setPhotos((prev) => [
        ...prev,
        {
          id: tempId,
          id_area: selected.id,
          path: null,
          orden: baseOrden + index,
          url: previewUrl,
          pending: true,
        },
      ]);

      // 2) subir + insertar DB por API
      (async () => {
        setUploading(true);
        try {
          const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
          const filename = `${crypto.randomUUID()}.${ext}`;
          const path = `area_${selected.id}/${filename}`;

          const { error: upErr } = await supabase.storage
            .from(AREAS_BUCKET)
            .upload(path, file, { upsert: false, contentType: file.type });

          if (upErr) {
            console.error("Upload error:", upErr);
            alert(`No se pudo subir una imagen: ${upErr.message}`);
            URL.revokeObjectURL(previewUrl);
            setPhotos((prev) => prev.filter((p) => p.id !== tempId));
            return;
          }

          const orden = baseOrden + index;

          let row;
          try {
            row = await insertAreaPhotoViaApi({ id_area: selected.id, path, orden });
          } catch (err) {
            console.error("API insert error:", err);
            alert(`Subió al bucket pero no guardó en DB: ${err?.message || "error"}`);

            await supabase.storage.from(AREAS_BUCKET).remove([path]);

            URL.revokeObjectURL(previewUrl);
            setPhotos((prev) => prev.filter((p) => p.id !== tempId));
            return;
          }

          const signedUrl = await resolveStorageUrl(path);
          if (signedUrl) urlCacheRef.current.set(String(path), signedUrl);

          URL.revokeObjectURL(previewUrl);

          // reemplazar temp por real
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === tempId
                ? {
                    ...p,
                    id: row.id,
                    id_area: row.id_area,
                    path: row.path,
                    orden: row.orden,
                    url: signedUrl || p.url,
                    pending: false,
                  }
                : p
            )
          );

          // si no hay imagen_principal, asigna la primera que subes
          const hasPrincipal = !!(form?.imagen_principal || selected?.imagen_principal);
          if (!hasPrincipal && index === 0) {
            const { error: upAreaErr } = await supabase
              .from("areas")
              .update({ imagen_principal: path })
              .eq("id", selected.id);

            if (!upAreaErr) {
              setForm((p) => ({ ...p, imagen_principal: path }));
              setAreas((prev) =>
                prev.map((a) => (a.id === selected.id ? { ...a, imagen_principal: path } : a))
              );
              setSelected((prev) => (prev?.id === selected.id ? { ...prev, imagen_principal: path } : prev));
            }
          }
        } catch (err) {
          console.error("Error general subiendo imagen:", err);
          alert("Error inesperado al subir una imagen.");
          URL.revokeObjectURL(previewUrl);
          setPhotos((prev) => prev.filter((p) => p.id !== tempId));
        } finally {
          setUploading(false);
        }
      })();
    });
  };

  const removePhoto = async (p) => {
    if (!canAdmin) return;
    if (!confirm("¿Eliminar esta foto?")) return;

    // preview pending
    if (!p.path && p.url?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(p.url);
      } catch {}
      setPhotos((prev) => prev.filter((x) => x.id !== p.id));
      return;
    }

    const { error: delErr } = await supabase.from("areas_fotos").delete().eq("id", p.id);
    if (delErr) {
      console.error(delErr);
      alert("No se pudo borrar en DB.");
      return;
    }

    const { error: rmErr } = await supabase.storage.from(AREAS_BUCKET).remove([p.path]);
    if (rmErr) console.warn("No se pudo borrar del bucket:", rmErr);

    // limpia cache
    if (p.path) urlCacheRef.current.delete(String(p.path));

    setPhotos((prev) => prev.filter((x) => x.id !== p.id));

    // si era principal, borrar
    if (form?.imagen_principal === p.path) {
      const { error } = await supabase.from("areas").update({ imagen_principal: null }).eq("id", selected.id);
      if (!error) {
        setForm((x) => ({ ...x, imagen_principal: null }));
        setAreas((prev) =>
          prev.map((a) => (a.id === selected.id ? { ...a, imagen_principal: null } : a))
        );
        setSelected((prev) => (prev?.id === selected.id ? { ...prev, imagen_principal: null } : prev));
      }
    }
  };

  const refreshImagesNow = async () => {
    if (!selected?.id) return;
    await loadAreaPhotos(selected.id);
  };

  if (!canAdmin) {
    return (
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-5">
        <p className="font-semibold mb-2">Áreas</p>
        <p className="text-muted-foreground text-sm">No tienes permisos para administrar áreas.</p>
      </div>
    );
  }

  return (
    <>
      <CreateAreaModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createArea}
      />

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LISTA */}
        <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-white/70 dark:bg-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-black/5 dark:bg-white/5">
            <div>
              <p className="font-semibold">Áreas</p>
              <p className="text-xs text-muted-foreground">Configura precio y fotos.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 text-white px-3 py-2 text-xs font-semibold hover:bg-purple-700 transition disabled:opacity-70"
                disabled={creating}
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Nueva área
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Cargando...</div>
          ) : areas.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No hay áreas.</div>
          ) : (
            <div className="divide-y divide-white/10">
              {areas.map((a) => (
                <button
                  key={a.id}
                  onClick={() => selectArea(a)}
                  className={`w-full text-left px-4 py-4 hover:bg-white/5 transition ${
                    selected?.id === a.id ? "bg-purple-500/10" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{a.nombre}</p>
                      <p className="text-xs text-muted-foreground">#{a.id} · {a.estado}</p>
                    </div>

                    <span className="text-[11px] px-2 py-1 rounded-full bg-white/10">
                      {a.pricing_type || "por_hora"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* EDITOR */}
        <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-white/70 dark:bg-white/5 p-5">
          {!form ? (
            <div className="text-sm text-muted-foreground">Selecciona un área.</div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-lg font-semibold">Editar área</p>
                  <p className="text-sm text-muted-foreground">Configura precio y fotos.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={refreshImagesNow}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 transition"
                    title="Refrescar imágenes"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refrescar
                  </button>

                  <button
                    type="button"
                    onClick={saveArea}
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-600 text-white px-4 py-2 text-sm font-semibold hover:bg-purple-700 transition disabled:opacity-70"
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Nombre</label>
                  <input
                    value={form.nombre}
                    onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                  >
                    <option value="activa">activa</option>
                    <option value="inactiva">inactiva</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Tipo de precio</label>
                  <select
                    value={form.pricing_type}
                    onChange={(e) => setForm((p) => ({ ...p, pricing_type: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                  >
                    <option value="por_hora">por hora</option>
                    <option value="fijo">fijo</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">
                    Valor {form.pricing_type === "fijo" ? "fijo" : "por hora"}
                  </label>
                  <input
                    type="number"
                    value={form.pricing_type === "fijo" ? form.valor_fijo : form.valor_hora}
                    onChange={(e) =>
                      setForm((p) =>
                        p.pricing_type === "fijo"
                          ? { ...p, valor_fijo: e.target.value }
                          : { ...p, valor_hora: e.target.value }
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">Máx horas para fijo (solo si es fijo)</label>
                  <input
                    type="number"
                    value={form.max_horas_fijo}
                    onChange={(e) => setForm((p) => ({ ...p, max_horas_fijo: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              {/* GALERÍA */}
              <div className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    <p className="font-semibold">Galería (máx {MAX_PHOTOS})</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={onPickPhotos}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15 transition disabled:opacity-70"
                      disabled={uploading || photos.length >= MAX_PHOTOS}
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Añadir fotos
                    </button>
                  </div>
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  Fotos actuales: {photos.length} / {MAX_PHOTOS}
                </p>

                {photos.length === 0 ? (
                  <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground">
                    No hay fotos todavía. Sube hasta 6.
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map((p) => (
                      <div key={p.id} className="relative rounded-xl overflow-hidden border border-white/10 bg-black/20">
                        <div className="aspect-[4/3] bg-black/40">
                          <img
                            src={p.url}
                            alt="foto área"
                            className="h-full w-full object-cover"
                            draggable={false}
                            onError={async (e) => {
                              // ✅ si expira signed url, la refrescamos y reemplazamos
                              if (!p?.path) return;
                              const fresh = await resolveStorageUrl(p.path);
                              if (fresh) {
                                urlCacheRef.current.set(String(p.path), fresh);
                                e.currentTarget.src = fresh;
                                setPhotos((prev) =>
                                  prev.map((x) => (x.id === p.id ? { ...x, url: fresh } : x))
                                );
                              } else {
                                console.warn("No pudo refrescar URL para:", p.path);
                              }
                            }}
                          />
                        </div>

                        {p.pending && (
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-[10px] text-white text-center">
                            Subiendo...
                          </div>
                        )}

                        <div className="flex items-center justify-between p-2">
                          <span className="text-[11px] text-muted-foreground truncate">
                            {p.path || "pendiente..."}
                          </span>
                          <button
                            type="button"
                            onClick={() => removePhoto(p)}
                            className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-60"
                            title="Eliminar"
                            disabled={p.pending}
                          >
                            <Trash2 className="h-4 w-4 text-rose-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 text-xs text-muted-foreground">
                  {form.pricing_type === "fijo" ? (
                    <>
                      Precio fijo: <b className="text-foreground">{money(form.valor_fijo)}</b> · Máx horas:{" "}
                      <b className="text-foreground">{safeInt(form.max_horas_fijo)}</b>
                    </>
                  ) : (
                    <>
                      Precio por hora: <b className="text-foreground">{money(form.valor_hora)}</b>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
