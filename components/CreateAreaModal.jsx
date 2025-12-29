"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, X, Image as ImageIcon, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const AREAS_BUCKET = "areas";
const MAX_PHOTOS = 6;
const SIGNED_URL_TTL = 60 * 60; // 1h

function safeInt(v) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : 0;
}

async function resolveUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const { data: signed, error: signedErr } = await supabase.storage
    .from(AREAS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);

  if (!signedErr && signed?.signedUrl) return signed.signedUrl;

  const { data: pub } = supabase.storage.from(AREAS_BUCKET).getPublicUrl(path);
  return pub?.publicUrl || "";
}

async function insertAreaPhotoViaApi({ id_area, path }) {
  const res = await fetch("/api/areas-photos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_area, path }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Error insertando foto en DB");
  return json.row; // {id, id_area, path, created_at}
}

export default function CreateAreaModal({
  open,
  onClose,
  onCreate, // debe devolver el área creada con {id, ...}
  creating: creatingProp,
}) {
  const [creatingLocal, setCreatingLocal] = useState(false);
  const creating = Boolean(creatingProp ?? creatingLocal);

  // form
  const [nombre, setNombre] = useState("");
  const [estado, setEstado] = useState("activa");
  const [pricingType, setPricingType] = useState("por_hora");
  const [valorHora, setValorHora] = useState("0");
  const [valorFijo, setValorFijo] = useState("0");
  const [maxHorasFijo, setMaxHorasFijo] = useState("0");
  const [capacidad, setCapacidad] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // gallery (pre-create)
  const [photos, setPhotos] = useState([]); // {id, url, file, pending, uploadedPath}
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const canAddMore = useMemo(() => photos.length < MAX_PHOTOS, [photos.length]);

  useEffect(() => {
    if (!open) {
      // reset
      setCreatingLocal(false);
      setNombre("");
      setEstado("activa");
      setPricingType("por_hora");
      setValorHora("0");
      setValorFijo("0");
      setMaxHorasFijo("0");
      setCapacidad("");
      setDescripcion("");
      // revoke previews
      setPhotos((prev) => {
        prev.forEach((p) => {
          if (p?.url?.startsWith("blob:")) {
            try {
              URL.revokeObjectURL(p.url);
            } catch {}
          }
        });
        return [];
      });
      setUploading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape" && !creating && !uploading) onClose?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, creating, uploading, onClose]);

  if (!open) return null;

  const pickPhotos = () => {
    if (!canAddMore) return alert(`Máximo ${MAX_PHOTOS} fotos.`);
    fileRef.current?.click?.();
  };

  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const remaining = MAX_PHOTOS - photos.length;
    const toAdd = files
      .filter((f) => f.type?.startsWith("image/"))
      .slice(0, Math.max(0, remaining));

    if (!toAdd.length) return;

    const items = toAdd.map((file, i) => ({
      id: `temp-${Date.now()}-${i}`,
      file,
      url: URL.createObjectURL(file),
      pending: false,
      uploadedPath: null,
    }));

    setPhotos((prev) => [...prev, ...items]);
  };

  const removeLocalPhoto = (photoId) => {
    const p = photos.find((x) => x.id === photoId);
    if (p?.pending) return;
    if (p?.url?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(p.url);
      } catch {}
    }
    setPhotos((prev) => prev.filter((x) => x.id !== photoId));
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (creating || uploading) return;

    const trimmed = nombre.trim();
    if (!trimmed) return alert("Ingresa un nombre para el área.");

    const payload = {
      nombre: trimmed.toLowerCase(),
      estado,
      pricing_type: pricingType,
      valor_hora: pricingType === "por_hora" ? safeInt(valorHora) : 0,
      valor_fijo: pricingType === "fijo" ? safeInt(valorFijo) : 0,
      max_horas_fijo: pricingType === "fijo" ? safeInt(maxHorasFijo) : 0,
      capacidad: capacidad ? Math.max(1, safeInt(capacidad)) : null,
      descripcion: descripcion?.trim() || null,
      imagen_principal: null,
    };

    setCreatingLocal(true);
    try {
      // 1) Crear área
      const area = await onCreate?.(payload);
      if (!area?.id) throw new Error("No se pudo obtener el ID del área creada.");

      // 2) Si no hay fotos seleccionadas: cerrar y listo
      const filesToUpload = photos.map((p) => p.file).filter(Boolean);
      if (!filesToUpload.length) {
        onClose?.();
        return;
      }

      // 3) Subir fotos + insertar DB
      setUploading(true);

      let principalSet = false;

      for (let i = 0; i < photos.length; i++) {
        const item = photos[i];
        if (!item?.file) continue;

        // marca pending en UI
        setPhotos((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, pending: true } : p))
        );

        const file = item.file;
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const filename = `${crypto.randomUUID()}.${ext}`;
        const path = `area_${area.id}/${filename}`;

        // upload storage
        const { error: upErr } = await supabase.storage
          .from(AREAS_BUCKET)
          .upload(path, file, { upsert: false, contentType: file.type });

        if (upErr) {
          console.error("Upload error:", upErr);
          alert(`No se pudo subir una imagen: ${upErr.message}`);
          setPhotos((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, pending: false } : p))
          );
          continue;
        }

        // insert DB
        try {
          await insertAreaPhotoViaApi({ id_area: area.id, path });
        } catch (err) {
          console.error("API insert error:", err);
          // rollback storage
          await supabase.storage.from(AREAS_BUCKET).remove([path]);
          alert(`Subió al bucket pero no guardó en DB: ${err?.message || "error"}`);
          setPhotos((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, pending: false } : p))
          );
          continue;
        }

        // set imagen_principal con la primera que logre subir bien
        if (!principalSet) {
          const { error: upAreaErr } = await supabase
            .from("areas")
            .update({ imagen_principal: path })
            .eq("id", area.id);

          if (!upAreaErr) principalSet = true;
        }

        // update preview url a final
        const finalUrl = await resolveUrl(path);

        setPhotos((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? { ...p, pending: false, uploadedPath: path, url: finalUrl || p.url }
              : p
          )
        );
      }

      // 4) cerrar modal
      onClose?.();
    } catch (err) {
      console.error(err);
      alert(err?.message || "No se pudo crear el área.");
    } finally {
      setCreatingLocal(false);
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm"
      onMouseDown={() => !creating && !uploading && onClose?.()}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-black/85 shadow-[0_25px_80px_rgba(0,0,0,0.65)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10">
          <h3 className="text-base font-semibold">Nueva área</h3>

          <button
            type="button"
            onClick={() => !creating && !uploading && onClose?.()}
            disabled={creating || uploading}
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Nombre *</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400/40"
                placeholder="Ej: piscina"
                autoFocus
                disabled={creating || uploading}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                disabled={creating || uploading}
              >
                <option value="activa">activa</option>
                <option value="inactiva">inactiva</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Tipo de precio</label>
              <select
                value={pricingType}
                onChange={(e) => setPricingType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                disabled={creating || uploading}
              >
                <option value="por_hora">por hora</option>
                <option value="fijo">fijo</option>
              </select>
            </div>

            {pricingType === "por_hora" ? (
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Valor por hora</label>
                <input
                  type="number"
                  value={valorHora}
                  onChange={(e) => setValorHora(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                  disabled={creating || uploading}
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">Valor fijo</label>
                  <input
                    type="number"
                    value={valorFijo}
                    onChange={(e) => setValorFijo(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                    disabled={creating || uploading}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Máx horas fijo</label>
                  <input
                    type="number"
                    value={maxHorasFijo}
                    onChange={(e) => setMaxHorasFijo(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                    disabled={creating || uploading}
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-xs text-muted-foreground">Capacidad</label>
              <input
                type="number"
                value={capacidad}
                onChange={(e) => setCapacidad(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                placeholder="Ej: 20"
                disabled={creating || uploading}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Descripción</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="mt-1 w-full min-h-[90px] rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                placeholder="Detalles del área..."
                disabled={creating || uploading}
              />
            </div>
          </div>

          {/* GALERÍA EN EL MISMO MODAL */}
          <div className="pt-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Imágenes (máx {MAX_PHOTOS})</p>
                <p className="text-xs text-muted-foreground">
                  Se subirán al crear el área. La primera será imagen principal.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onFiles}
                  disabled={creating || uploading}
                />
                <button
                  type="button"
                  onClick={pickPhotos}
                  disabled={!canAddMore || creating || uploading}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 transition disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  Adjuntar
                </button>
              </div>
            </div>

            {photos.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4 text-sm text-muted-foreground flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Aún no has adjuntado imágenes.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                {photos.slice(0, MAX_PHOTOS).map((p, idx) => (
                  <div
                    key={p.id}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/10"
                  >
                    {p.url ? (
                      <img
                        src={p.url}
                        alt="Foto área"
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-10 w-10 opacity-40" />
                      </div>
                    )}

                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                    {/* Badge Principal (la primera) */}
                    {idx === 0 && (
                      <div className="absolute left-2 bottom-2 text-[11px] px-2 py-1 rounded-full bg-white/90 text-black font-semibold">
                        Principal
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => removeLocalPhoto(p.id)}
                      disabled={p.pending || creating || uploading}
                      className="absolute top-2 right-2 inline-flex items-center justify-center h-9 w-9 rounded-xl bg-black/55 text-white hover:bg-black/70 disabled:opacity-60"
                      title="Quitar"
                    >
                      {p.pending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={creating || uploading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 text-white px-4 py-2 text-sm font-semibold hover:bg-purple-700 transition disabled:opacity-70"
          >
            {creating || uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {creating ? "Creando..." : "Subiendo fotos..."}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Crear área
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
