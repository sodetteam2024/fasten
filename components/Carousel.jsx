"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";

const MAX_SLIDES = 5;

export default function Carousel() {
  const { user } = useUser();

  const [slides, setSlides] = useState([]); // { id, url, path, pending }
  const [current, setCurrent] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roleId, setRoleId] = useState(null); // 🔹 corregido nombre del setter

  const canEditCarousel = roleId === 1 || roleId === 2; // 1 = SuperAdmin, 2 = Admin

  // 🔹 Cargar rol desde "usuarios"
  useEffect(() => {
    if (!user) return;

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("idrol")
        .eq("clerk_id", user.id)
        .single();

      if (!error && data) {
        setRoleId(data.idrol);
      }
    };

    fetchRole();
  }, [user]);

  // 🔹 Cargar slides desde BD + Storage
  useEffect(() => {
    const loadSlides = async () => {
      const { data, error } = await supabase
        .from("carousel_slides")
        .select("id_slide, image_path, orden")
        .order("orden", { ascending: true });

      if (error) {
        console.error("Error cargando carousel_slides:", error);
        setLoading(false);
        return;
      }

      const signedSlides = await Promise.all(
        (data || []).map(async (row) => {
          const { data: signed, error: errSigned } = await supabase.storage
            .from("carousel")
            .createSignedUrl(row.image_path, 3600);

          if (errSigned) {
            console.error("Error creando signed URL:", errSigned);
          }

          return {
            id: row.id_slide,
            path: row.image_path,
            url: signed?.signedUrl || "",
            pending: false,
          };
        })
      );

      setSlides(signedSlides);
      setLoading(false);
    };

    loadSlides();
  }, []);

  const prev = () => {
    if (!slides.length) return;
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  };

  const next = () => {
    if (!slides.length) return;
    setCurrent((c) => (c + 1) % slides.length);
  };

  // 🔹 Añadir imágenes (preview inmediato + subida en background)
  const handleAddImages = (e) => {
    if (!canEditCarousel) return;

    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const availableSlots = MAX_SLIDES - slides.length;
    if (availableSlots <= 0) {
      alert(`Solo puedes agregar hasta ${MAX_SLIDES} imágenes.`);
      e.target.value = "";
      return;
    }

    const filesToAdd = files.slice(0, availableSlots);

    filesToAdd.forEach((file, index) => {
      const tempId = `temp-${Date.now()}-${index}`;
      const previewUrl = URL.createObjectURL(file);

      // 1️⃣ Mostrar preview de una vez
      setSlides((prev) => [
        ...prev,
        {
          id: tempId,
          path: null,
          url: previewUrl,
          pending: true,
        },
      ]);

      // 2️⃣ Subir en background
      (async () => {
        try {
          const ext = file.name.includes(".")
            ? file.name.substring(file.name.lastIndexOf(".") + 1)
            : "";
          const path = `slides/${Date.now()}_${index}${ext ? "." + ext : ""}`;

          const { error: errUpload } = await supabase.storage
            .from("carousel")
            .upload(path, file);

          if (errUpload) {
            console.error("Error subiendo archivo:", errUpload);
            alert("Error subiendo una imagen al servidor.");
            URL.revokeObjectURL(previewUrl);
            setSlides((prev) => prev.filter((s) => s.id !== tempId));
            return;
          }

          const { data: row, error: errInsert } = await supabase
            .from("carousel_slides")
            .insert([{ image_path: path }])
            .select("id_slide")
            .single();

          if (errInsert || !row) {
            console.error("Error insertando en carousel_slides:", errInsert);
            alert("Error guardando la imagen en la base de datos.");
            await supabase.storage.from("carousel").remove([path]);
            URL.revokeObjectURL(previewUrl);
            setSlides((prev) => prev.filter((s) => s.id !== tempId));
            return;
          }

          const { data: signed, error: errSigned } = await supabase.storage
            .from("carousel")
            .createSignedUrl(path, 3600);

          if (errSigned || !signed) {
            console.error("Error creando signed URL:", errSigned);
            alert("La imagen se guardó, pero no se pudo mostrar la vista previa.");
            URL.revokeObjectURL(previewUrl);
            setSlides((prev) =>
              prev.map((s) =>
                s.id === tempId
                  ? { ...s, id: row.id_slide, path, url: "", pending: false }
                  : s
              )
            );
            return;
          }

          // 3️⃣ Reemplazar el slide temporal por el definitivo
          URL.revokeObjectURL(previewUrl);
          setSlides((prev) =>
            prev.map((s) =>
              s.id === tempId
                ? {
                    ...s,
                    id: row.id_slide,
                    path,
                    url: signed.signedUrl,
                    pending: false,
                  }
                : s
            )
          );
        } catch (err) {
          console.error("Error general subiendo imagen:", err);
          alert("Error inesperado al subir una imagen.");
          URL.revokeObjectURL(previewUrl);
          setSlides((prev) => prev.filter((s) => s.id !== tempId));
        }
      })();
    });

    e.target.value = "";
  };

  // 🔹 Eliminar imagen (también en Supabase)
  const handleRemoveImage = async (id) => {
    if (!canEditCarousel) return;

    const slide = slides.find((s) => s.id === id);
    if (!slide) return;

    // si es un preview local temporal
    if (!slide.path && slide.url?.startsWith("blob:")) {
      URL.revokeObjectURL(slide.url);
      setSlides((prev) => prev.filter((s) => s.id !== id));
      return;
    }

    try {
      // borrar de BD
      await supabase.from("carousel_slides").delete().eq("id_slide", id);
      // borrar de storage
      if (slide.path) {
        await supabase.storage.from("carousel").remove([slide.path]);
      }
    } catch (err) {
      console.error("Error borrando slide:", err);
      alert("No se pudo borrar la imagen del servidor.");
      return;
    }

    setSlides((prev) => {
      const indexToRemove = prev.findIndex((s) => s.id === id);
      if (indexToRemove === -1) return prev;

      const newSlides = prev.filter((s) => s.id !== id);

      if (!newSlides.length) {
        setCurrent(0);
      } else if (indexToRemove <= current) {
        setCurrent((c) => (c === 0 ? 0 : c - 1));
      }

      return newSlides;
    });
  };

  // 🔹 UI
  return (
    <div className="w-full">
      {/* Panel de edición (solo Admin / SuperAdmin) */}
      {isEditing && canEditCarousel && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-800">
              Gestionar imágenes del carrusel
            </h2>
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Cerrar
            </button>
          </div>

          <p className="text-xs text-slate-600 mb-2">
            Puedes subir hasta {MAX_SLIDES} imágenes. Actualmente tienes{" "}
            <span className="font-semibold">{slides.length}</span>.
          </p>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleAddImages}
            className="block w-full text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-slate-700"
          />

          {/* Thumbnails con X */}
          {slides.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="relative overflow-hidden rounded-xl border border-slate-200"
                >
                  {slide.url ? (
                    <img
                      src={slide.url}
                      alt={`miniatura-${index + 1}`}
                      className="h-24 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center text-[11px] text-slate-500">
                      Sin vista previa
                    </div>
                  )}

                  {/* X en la esquina */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(slide.id)}
                    className="absolute right-1 top-1 rounded-full bg-red-500 px-1.5 py-[1px] text-[10px] font-semibold text-white hover:bg-red-600"
                  >
                    ×
                  </button>

                  {slide.pending && (
                    <div className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-[10px] text-white text-center">
                      Subiendo...
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Aún no has agregado imágenes. Sube algunas desde tu dispositivo.
            </p>
          )}
        </div>
      )}

      {/* Carrusel */}
      <div
        className={`relative w-full overflow-hidden rounded-2xl bg-white shadow ${
          canEditCarousel ? "group" : ""
        }`}
      >
        {loading ? (
          <div className="flex h-[360px] items-center justify-center text-sm text-slate-500">
            Cargando carrusel...
          </div>
        ) : slides.length > 0 ? (
          <>
            {slides[current]?.url ? (
              <img
                src={slides[current].url}
                alt={`slide-${current}`}
                className={
                  "h-[360px] w-full object-cover " +
                  (canEditCarousel
                    ? "transition duration-300 group-hover:blur-sm group-hover:brightness-75"
                    : "")
                }
                draggable={false}
              />
            ) : (
              <div className="flex h-[360px] items-center justify-center text-sm text-slate-500">
                Imagen sin vista previa
              </div>
            )}

            {/* Botón de editar (solo Admin / SuperAdmin) */}
            {canEditCarousel && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="pointer-events-auto absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100"
              >
                <div className="flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-xs font-medium text-slate-800 shadow-lg backdrop-blur">
                  <span>Modificar imágenes</span>
                </div>
              </button>
            )}

            {/* Navegación */}
            {slides.length > 1 && (
              <>
                <button
                  onClick={prev}
                  aria-label="Anterior"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 backdrop-blur hover:bg-white"
                >
                  ‹
                </button>
                <button
                  onClick={next}
                  aria-label="Siguiente"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 backdrop-blur hover:bg-white"
                >
                  ›
                </button>
              </>
            )}
          </>
        ) : (
          <div className="flex h-[360px] w-full flex-col items-center justify-center gap-2 bg-slate-50 text-center text-sm text-slate-500">
            <p>No hay imágenes en el carrusel.</p>
            {canEditCarousel && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="mt-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700"
              >
                Agregar imágenes
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
