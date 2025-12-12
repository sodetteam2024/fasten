"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";

const MAX_SLIDES = 5;
const AUTOPLAY_MS = 4000;

export default function Carousel() {
  const { user } = useUser();

  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roleId, setRoleId] = useState(null);

  const canEditCarousel = roleId === 1 || roleId === 2;

  const timerRef = useRef(null);

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
      setCurrent(0);
    };

    loadSlides();
  }, []);

  // ✅ Autoplay cada 4 segundos
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (loading) return;
    if (isEditing) return;
    if (!slides || slides.length <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, AUTOPLAY_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loading, isEditing, slides]);

  // Evitar que current quede fuera si cambian slides
  useEffect(() => {
    if (!slides.length) {
      setCurrent(0);
      return;
    }
    if (current > slides.length - 1) {
      setCurrent(0);
    }
  }, [slides, current]);

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

      setSlides((prevState) => [
        ...prevState,
        {
          id: tempId,
          path: null,
          url: previewUrl,
          pending: true,
        },
      ]);

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
            setSlides((prevState) => prevState.filter((s) => s.id !== tempId));
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
            setSlides((prevState) => prevState.filter((s) => s.id !== tempId));
            return;
          }

          const { data: signed, error: errSigned } = await supabase.storage
            .from("carousel")
            .createSignedUrl(path, 3600);

          if (errSigned || !signed) {
            console.error("Error creando signed URL:", errSigned);
            alert("La imagen se guardó, pero no se pudo mostrar la vista previa.");
            URL.revokeObjectURL(previewUrl);
            setSlides((prevState) =>
              prevState.map((s) =>
                s.id === tempId
                  ? { ...s, id: row.id_slide, path, url: "", pending: false }
                  : s
              )
            );
            return;
          }

          URL.revokeObjectURL(previewUrl);
          setSlides((prevState) =>
            prevState.map((s) =>
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
          setSlides((prevState) => prevState.filter((s) => s.id !== tempId));
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

    if (!slide.path && slide.url?.startsWith("blob:")) {
      URL.revokeObjectURL(slide.url);
      setSlides((prevState) => prevState.filter((s) => s.id !== id));
      return;
    }

    try {
      await supabase.from("carousel_slides").delete().eq("id_slide", id);
      if (slide.path) {
        await supabase.storage.from("carousel").remove([slide.path]);
      }
    } catch (err) {
      console.error("Error borrando slide:", err);
      alert("No se pudo borrar la imagen del servidor.");
      return;
    }

    setSlides((prevState) => {
      const indexToRemove = prevState.findIndex((s) => s.id === id);
      if (indexToRemove === -1) return prevState;

      const newSlides = prevState.filter((s) => s.id !== id);

      if (!newSlides.length) {
        setCurrent(0);
      } else if (indexToRemove <= current) {
        setCurrent((c) => (c === 0 ? 0 : c - 1));
      }

      return newSlides;
    });
  };

  return (
    <div className="w-full">
      {/* Panel de edición (solo Admin / SuperAdmin) */}
      {isEditing && canEditCarousel && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow">
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

          {slides.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="relative overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  {slide.url ? (
                    <img
                      src={slide.url}
                      alt={`miniatura-${index + 1}`}
                      className="h-24 w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center text-[11px] text-slate-500">
                      Sin vista previa
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveImage(slide.id)}
                    className="absolute right-1 top-1 rounded-full bg-red-500 px-1.5 py-[1px] text-[10px] font-semibold text-white hover:bg-red-600"
                    aria-label="Eliminar"
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
            {/* Imagen */}
            {slides[current]?.url ? (
              <div className="relative h-[360px] w-full">
                <img
                  src={slides[current].url}
                  alt={`slide-${current}`}
                  className={
                    "h-[360px] w-full object-cover transition-opacity duration-500 " +
                    (canEditCarousel
                      ? "group-hover:brightness-75"
                      : "")
                  }
                  draggable={false}
                />

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/10" />
              </div>
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
                <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-slate-800 shadow-lg backdrop-blur">
                  <span>Modificar imágenes</span>
                </div>
              </button>
            )}

            {/* Flechas */}
            {slides.length > 1 && (
              <>
                <button
                  onClick={prev}
                  aria-label="Anterior"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2 shadow hover:bg-white"
                >
                  ‹
                </button>
                <button
                  onClick={next}
                  aria-label="Siguiente"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2 shadow hover:bg-white"
                >
                  ›
                </button>
              </>
            )}

            {/* Dots */}
            {slides.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrent(i)}
                    aria-label={`Ir al slide ${i + 1}`}
                    className={
                      "h-2 rounded-full transition-all " +
                      (i === current ? "w-6 bg-white shadow" : "w-2 bg-white/60")
                    }
                  />
                ))}
              </div>
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
