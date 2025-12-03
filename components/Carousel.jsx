"use client";

import { useState } from "react";

const MAX_SLIDES = 8;

export default function Carousel() {
  const [slides, setSlides] = useState([]); 
  const [current, setCurrent] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  const prev = () => {
    if (slides.length === 0) return;
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  };

  const next = () => {
    if (slides.length === 0) return;
    setCurrent((c) => (c + 1) % slides.length);
  };

  const handleAddImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const availableSlots = MAX_SLIDES - slides.length;
    if (availableSlots <= 0) {
      alert(`Solo puedes agregar hasta ${MAX_SLIDES} imágenes.`);
      return;
    }

    const filesToAdd = files.slice(0, availableSlots);

    const newSlides = filesToAdd.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
    }));

    setSlides((prev) => [...prev, ...newSlides]);

    e.target.value = "";
  };

  const handleRemoveImage = (id) => {
    setSlides((prev) => {
      const indexToRemove = prev.findIndex((s) => s.id === id);
      if (indexToRemove === -1) return prev;

      const newSlides = prev.filter((s) => s.id !== id);

      // ajustar el índice actual para que no quede fuera de rango
      if (newSlides.length === 0) {
        setCurrent(0);
      } else if (indexToRemove <= current) {
        setCurrent((prevCurrent) =>
          prevCurrent === 0 ? 0 : prevCurrent - 1
        );
      }

      return newSlides;
    });
  };

  return (
    <div className="w-full">
      {/* Panel de edición encima del carrusel */}
      {isEditing && (
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

          <div className="space-y-4">
            {/* Input de archivos */}
            <div className="space-y-2">
              <p className="text-xs text-slate-600">
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
            </div>

            {/* Lista de imágenes con opción de eliminar */}
            {slides.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className="relative overflow-hidden rounded-xl border border-slate-200"
                  >
                    <img
                      src={slide.url}
                      alt={`miniatura-${index + 1}`}
                      className="h-24 w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/40 px-2 py-1 text-[10px] text-white">
                      <span>Img {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(slide.id)}
                        className="rounded bg-red-500 px-2 py-[2px] text-[10px] font-semibold hover:bg-red-600"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Aún no has agregado imágenes. Sube algunas desde tu dispositivo.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Carrusel */}
      <div className="group relative w-full overflow-hidden rounded-2xl bg-white shadow">
        {slides.length > 0 ? (
          <>
            <img
              src={slides[current].url}
              alt={`slide-${current}`}
              className="h-[360px] w-full object-cover transition duration-300 group-hover:blur-sm group-hover:brightness-75"
              draggable={false}
            />

            {/* Overlay de editar que aparece con hover */}
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="pointer-events-auto absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100"
            >
              <div className="flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-xs font-medium text-slate-800 shadow-lg backdrop-blur">
                <span className="text-sm"></span>
                <span>Modificar imágenes</span>
              </div>
            </button>

            {/* Botones de navegación */}
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

            {/* Puntos indicadores */}
            {slides.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                {slides.map((_, i) => (
                  <button
                    key={_.id}
                    onClick={() => setCurrent(i)}
                    aria-label={`Ir al slide ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      i === current
                        ? "w-5 bg-slate-900"
                        : "w-2 bg-slate-300"
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          // Estado sin imágenes aún
          <div className="flex h-[360px] w-full flex-col items-center justify-center gap-2 bg-slate-50 text-center text-sm text-slate-500">
            <p>No hay imágenes en el carrusel.</p>
            <p className="text-xs">
              Pasa el mouse y haz clic en <span className="font-semibold">“Modificar imágenes”</span> para agregar.
            </p>

            {/* Overlay de editar también cuando no hay imágenes */}
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="mt-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700"
            >
             Agregar imágenes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
