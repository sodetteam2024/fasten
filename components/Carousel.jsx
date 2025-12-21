// components/Carousel.jsx
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

  useEffect(() => {
    if (!user) return;

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("idrol")
        .eq("clerk_id", user.id)
        .single();

      if (!error && data) setRoleId(data.idrol);
    };

    fetchRole();
  }, [user]);

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

          if (errSigned) console.error("Error creando signed URL:", errSigned);

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

  useEffect(() => {
    if (!slides.length) return setCurrent(0);
    if (current > slides.length - 1) setCurrent(0);
  }, [slides, current]);

  const prev = () => slides.length && setCurrent((c) => (c - 1 + slides.length) % slides.length);
  const next = () => slides.length && setCurrent((c) => (c + 1) % slides.length);

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
        { id: tempId, path: null, url: previewUrl, pending: true },
      ]);

      (async () => {
        try {
          const ext = file.name.includes(".")
            ? file.name.substring(file.name.lastIndexOf(".") + 1)
            : "";
          const path = `slides/${Date.now()}_${index}${ext ? "." + ext : ""}`;

          const { error: errUpload } = await supabase.storage.from("carousel").upload(path, file);
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

          const { data: signed } = await supabase.storage.from("carousel").createSignedUrl(path, 3600);

          URL.revokeObjectURL(previewUrl);
          setSlides((prevState) =>
            prevState.map((s) =>
              s.id === tempId
                ? { ...s, id: row.id_slide, path, url: signed?.signedUrl || "", pending: false }
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
      if (slide.path) await supabase.storage.from("carousel").remove([slide.path]);
    } catch (err) {
      console.error("Error borrando slide:", err);
      alert("No se pudo borrar la imagen del servidor.");
      return;
    }

    setSlides((prevState) => {
      const indexToRemove = prevState.findIndex((s) => s.id === id);
      const newSlides = prevState.filter((s) => s.id !== id);

      if (!newSlides.length) setCurrent(0);
      else if (indexToRemove <= current) setCurrent((c) => (c === 0 ? 0 : c - 1));

      return newSlides;
    });
  };

  return (
    <div className="w-full">
      {isEditing && canEditCarousel && (
        <div className="mb-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/75 backdrop-blur-xl p-4 shadow-[0_18px_55px_rgba(0,0,0,0.45)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Gestionar imágenes del carrusel</h2>
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cerrar
            </button>
          </div>

          <p className="text-xs text-muted-foreground mb-2">
            Puedes subir hasta {MAX_SLIDES} imágenes. Actualmente tienes{" "}
            <span className="font-semibold text-foreground">{slides.length}</span>.
          </p>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleAddImages}
            className="block w-full text-xs text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-slate-700 dark:file:bg-white dark:file:text-black dark:hover:file:bg-slate-200"
          />

          {slides.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="relative overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5"
                >
                  {slide.url ? (
                    <img
                      src={slide.url}
                      alt={`miniatura-${index + 1}`}
                      className="h-24 w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center text-[11px] text-muted-foreground">
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
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-[10px] text-white text-center">
                      Subiendo...
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Aún no has agregado imágenes. Sube algunas desde tu dispositivo.
            </p>
          )}
        </div>
      )}

      <div
        className={`relative w-full overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/80 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.55)] ${
          canEditCarousel ? "group" : ""
        }`}
      >
        {loading ? (
          <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
            Cargando carrusel...
          </div>
        ) : slides.length > 0 ? (
          <>
            {slides[current]?.url ? (
              <div className="relative h-[360px] w-full">
                <img
                  src={slides[current].url}
                  alt={`slide-${current}`}
                  className={
                    "h-[360px] w-full object-cover transition-opacity duration-500 " +
                    (canEditCarousel ? "group-hover:brightness-75" : "")
                  }
                  draggable={false}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/10" />
              </div>
            ) : (
              <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
                Imagen sin vista previa
              </div>
            )}

            {canEditCarousel && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="pointer-events-auto absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100"
              >
                <div className="flex items-center gap-2 rounded-full bg-white/90 dark:bg-black/70 px-4 py-2 text-xs font-medium text-slate-900 dark:text-white shadow-lg backdrop-blur">
                  <span>Modificar imágenes</span>
                </div>
              </button>
            )}

            {slides.length > 1 && (
              <>
                <button
                  onClick={prev}
                  aria-label="Anterior"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 dark:bg-black/60 p-2 shadow hover:bg-white dark:hover:bg-black/75 text-black dark:text-white"
                >
                  ‹
                </button>
                <button
                  onClick={next}
                  aria-label="Siguiente"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 dark:bg-black/60 p-2 shadow hover:bg-white dark:hover:bg-black/75 text-black dark:text-white"
                >
                  ›
                </button>
              </>
            )}

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
          <div className="flex h-[360px] w-full flex-col items-center justify-center gap-2 bg-white/70 dark:bg-white/5 text-center text-sm text-muted-foreground">
            <p>No hay imágenes en el carrusel.</p>
            {canEditCarousel && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="mt-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-slate-200"
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
