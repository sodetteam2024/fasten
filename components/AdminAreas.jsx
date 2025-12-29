"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";
import {
  Plus,
  Save,
  Image as ImageIcon,
  Trash2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import CreateAreaModal from "@/components/CreateAreaModal";
import { Button } from "@/components/ui/button";

const AREAS_BUCKET = "areas";
const MAX_PHOTOS = 6;
const SIGNED_URL_TTL = 60 * 60; // 1 hora
const AUTO_REFRESH_MS = 45 * 60 * 1000; // 45 min

// ✅ VIEW: 1 foto por área (la más reciente)
const AREAS_LAST_PHOTO_VIEW = "areas_foto_ultima";

function money(v) {
  return `$${Number(v || 0).toLocaleString("es-CO")}`;
}

function safeInt(v) {
  const n = parseInt(String(v ?? "0"), 10);
  return Number.isFinite(n) ? n : 0;
}

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

async function insertAreaPhotoViaApi({ id_area, path }) {
  const res = await fetch("/api/areas-photos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_area, path }), // ✅ sin orden
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Error insertando en DB");
  return json.row; // {id, id_area, path, created_at}
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
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const photosRef = useRef([]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const canAdmin = roleId === 1 || roleId === 2;

  const urlCacheRef = useRef(new Map());

  const cachedResolve = useCallback(async (path) => {
    if (!path) return "";
    const key = String(path);
    const cache = urlCacheRef.current;

    if (cache.has(key)) return cache.get(key) || "";

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

  const loadAreaPhotos = useCallback(
    async (areaId, opts = {}) => {
      if (!areaId) {
        setPhotos([]);
        return;
      }

      setLoadingPhotos(true);

      const { data, error } = await supabase
        .from("areas_fotos")
        .select("id, id_area, path, created_at")
        .eq("id_area", areaId)
        .order("created_at", { ascending: false })
        .limit(MAX_PHOTOS);

      if (error) {
        console.error("Error cargando fotos:", error);
        setPhotos([]);
        setLoadingPhotos(false);
        return;
      }

      const list = (data || []).slice(0, MAX_PHOTOS);

      if (opts.bypassCache) {
        for (const p of list) {
          if (p?.path) urlCacheRef.current.delete(String(p.path));
        }
      }

      const mapped = await Promise.all(
        list.map(async (p) => {
          const url = opts.bypassCache
            ? await resolveStorageUrl(p.path)
            : await cachedResolve(p.path);

          if (url) urlCacheRef.current.set(String(p.path), url);
          return { ...p, url, pending: false };
        })
      );

      setPhotos(mapped);
      setLoadingPhotos(false);
    },
    [cachedResolve]
  );

  const selectArea = useCallback(
    async (area) => {
      if (!area?.id) return;
      hydrateForm(area);
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

      // 1) Áreas
      const { data: a, error: errAreas } = await supabase
        .from("areas")
        .select(
          "id, idunidad, nombre, estado, pricing_type, valor_hora, valor_fijo, max_horas_fijo, imagen_principal"
        )
        .eq("idunidad", perfilDb.id_unidad)
        .order("id", { ascending: true });

      if (errAreas) console.error(errAreas);

      const baseAreas = a || [];

      // 2) Última foto por área (miniatura lista)
      const areaIds = baseAreas.map((x) => x.id);
      let fotoMap = new Map();

      if (areaIds.length > 0) {
        const { data: ultimas, error: errUlt } = await supabase
          .from(AREAS_LAST_PHOTO_VIEW)
          .select("id_area, foto_path")
          .in("id_area", areaIds);

        if (errUlt) {
          console.warn("No se pudieron cargar últimas fotos (view):", errUlt);
        } else {
          fotoMap = new Map(
            (ultimas || []).map((f) => [String(f.id_area), f?.foto_path || null])
          );
        }
      }

      // 3) Hydrate miniaturas
      const hydrated = await Promise.all(
        baseAreas.map(async (area) => {
          const lastPath = fotoMap.get(String(area.id)) || null;
          const thumbPath = lastPath || area.imagen_principal || null; // ✅ preferir última foto
          const thumbUrl = thumbPath ? await cachedResolve(thumbPath) : "";
          return { ...area, _thumbPath: thumbPath, _thumbUrl: thumbUrl };
        })
      );

      setAreas(hydrated);
      setLoading(false);

      const currentId = selected?.id;
      const keep = hydrated.find((x) => String(x.id) === String(currentId));

      if (keep) await selectArea(keep);
      else if (hydrated.length > 0) await selectArea(hydrated[0]);
      else {
        setSelected(null);
        setForm(null);
        setPhotos([]);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, cachedResolve]);

  // ✅ AUTO-REFRESH URLs galería (por si se vencen)
  useEffect(() => {
    if (!selected?.id) return;

    const t = setInterval(async () => {
      const current = photosRef.current || [];
      if (!current.length) return;

      const refreshed = await Promise.all(
        current.map(async (p) => {
          if (!p?.path) return p;
          const url = await resolveStorageUrl(p.path);
          if (url) urlCacheRef.current.set(String(p.path), url);
          return { ...p, url: url || p.url };
        })
      );

      setPhotos(refreshed);
    }, AUTO_REFRESH_MS);

    return () => clearInterval(t);
  }, [selected?.id]);

  const createArea = useCallback(
    async (payload) => {
      if (!canAdmin) throw new Error("Sin permisos.");

      setCreating(true);
      try {
        const res = await fetch("/api/create-area", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudo crear el área.");

        const data = json.area;

        // agrega a lista y selecciona
        setAreas((prev) => [...prev, { ...data, _thumbPath: null, _thumbUrl: "" }]);
        await selectArea(data);

        return data; // ✅ importante para CreateAreaModal
      } finally {
        setCreating(false);
      }
    },
    [canAdmin, selectArea]
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

    const existing = photos.filter((p) => !p.pending).length;
    const remaining = Math.max(0, MAX_PHOTOS - existing);
    const toUpload = files.slice(0, remaining);

    if (!toUpload.length) return alert("Ya tienes 6 fotos en esta galería.");

    toUpload.forEach((file, index) => {
      if (!file.type.startsWith("image/")) return;

      const tempId = `temp-${Date.now()}-${index}`;
      const previewUrl = URL.createObjectURL(file);

      // ✅ ya no guardamos orden
      setPhotos((prev) => [
        ...prev,
        {
          id: tempId,
          id_area: selected.id,
          path: null,
          url: previewUrl,
          pending: true,
        },
      ]);

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

          // insertar en DB (sin orden)
          let row;
          try {
            row = await insertAreaPhotoViaApi({ id_area: selected.id, path });
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
                  url: signedUrl || p.url,
                  pending: false,
                }
                : p
            )
          );

          // ✅ refrescar miniatura de lista con la última subida
          setAreas((prev) =>
            prev.map((a) =>
              a.id === selected.id
                ? { ...a, _thumbPath: path, _thumbUrl: signedUrl || a._thumbUrl }
                : a
            )
          );

          // ✅ IMPORTANTÍSIMO: recargar desde DB para asegurar que se vean TODAS
          await loadAreaPhotos(selected.id, { bypassCache: true });
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

    if (!p.path && p.url?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(p.url);
      } catch { }
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

    if (p.path) urlCacheRef.current.delete(String(p.path));

    // refresca galería desde DB (consistente)
    if (selected?.id) {
      await loadAreaPhotos(selected.id, { bypassCache: true });

      // recalcula miniatura con la foto más reciente que quede
      const current = photosRef.current || [];
      const nextThumb = current.find((x) => x?.path)?.path || null;
      const nextThumbUrl = nextThumb ? await resolveStorageUrl(nextThumb) : "";

      setAreas((prev) =>
        prev.map((a) =>
          a.id === selected.id ? { ...a, _thumbPath: nextThumb, _thumbUrl: nextThumbUrl } : a
        )
      );
    } else {
      setPhotos((prev) => prev.filter((x) => x.id !== p.id));
    }
  };

  const refreshImagesNow = async () => {
    if (!selected?.id) return;

    await loadAreaPhotos(selected.id, { bypassCache: true });

    const refreshed = await Promise.all(
      areas.map(async (a) => {
        const thumbPath = a?._thumbPath || a?.imagen_principal || null;
        if (!thumbPath) return { ...a, _thumbUrl: "" };

        urlCacheRef.current.delete(String(thumbPath));
        const url = await resolveStorageUrl(thumbPath);
        if (url) urlCacheRef.current.set(String(thumbPath), url);

        return { ...a, _thumbPath: thumbPath, _thumbUrl: url || a._thumbUrl };
      })
    );

    setAreas(refreshed);
  };

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
    <>
      <CreateAreaModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createArea}
        creating={creating}
      />

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LISTA */}
        <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-white/70 dark:bg-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-black/5 dark:bg-white/5">
            <div>
              <p className="font-semibold">Áreas</p>
              <p className="text-xs text-muted-foreground">Configura precio y fotos.</p>
            </div>

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
                  className={`w-full text-left px-4 py-4 hover:bg-white/5 transition ${selected?.id === a.id ? "bg-purple-500/10" : ""
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center flex-shrink-0">
                      {a._thumbUrl ? (
                        <img
                          src={a._thumbUrl}
                          alt={`foto ${a.nombre}`}
                          className="h-full w-full object-cover"
                          draggable={false}
                          onError={async (e) => {
                            const p = a?._thumbPath;
                            if (!p) return;
                            urlCacheRef.current.delete(String(p));
                            const fresh = await resolveStorageUrl(p);
                            if (fresh) {
                              urlCacheRef.current.set(String(p), fresh);
                              e.currentTarget.src = fresh;
                              setAreas((prev) =>
                                prev.map((x) => (x.id === a.id ? { ...x, _thumbUrl: fresh } : x))
                              );
                            }
                          }}
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-white/40" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{a.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        #{a.id} · {a.estado}
                      </p>
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
                  <label className="text-xs text-muted-foreground">
                    Máx horas para fijo (solo si es fijo)
                  </label>
                  <input
                    type="number"
                    value={form.max_horas_fijo}
                    onChange={(e) => setForm((p) => ({ ...p, max_horas_fijo: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              {/* GALERÍA */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold">Galería (máx 6)</h4>

                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={onPickPhotos}
                    />

                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || photos.filter((p) => !p.pending).length >= MAX_PHOTOS}
                    >
                      {uploading ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Subiendo...
                        </span>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Añadir fotos
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mb-3">
                  Fotos actuales: {photos.filter((p) => !p.pending).length} / {MAX_PHOTOS}
                </p>

                {loadingPhotos ? (
                  <div className="text-sm text-muted-foreground">Cargando fotos...</div>
                ) : photos.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No hay fotos todavía. Sube hasta 6.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {photos.slice(0, MAX_PHOTOS).map((photo) => (
                      <div
                        key={photo.id}
                        className="relative aspect-[4/3] rounded-lg overflow-hidden border border-white/10 bg-black/10"
                      >
                        <img
                          src={photo.url}
                          alt="Foto área"
                          className="w-full h-full object-cover"
                          draggable={false}
                          onError={async (e) => {
                            if (!photo?.path) return;
                            const fresh = await resolveStorageUrl(photo.path);
                            if (fresh) e.currentTarget.src = fresh;
                          }}
                        />

                        <div className="absolute inset-x-0 bottom-0 p-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removePhoto(photo)}
                            className="inline-flex items-center gap-2 rounded-lg bg-black/55 text-white px-2 py-1 text-xs hover:bg-black/70 transition disabled:opacity-60"
                            disabled={photo.pending}
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {photo.pending && (
                          <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 text-xs text-muted-foreground">
                  Precio por hora:{" "}
                  <span className="font-semibold">{money(form.valor_hora)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
