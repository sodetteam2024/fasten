"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";

const MAX_SLIDES = 5;

export default function Carousel() {
  const { user } = useUser();

  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔥 Nuevo: para roles
  const [roleId, setRoleId] = useState(null);

  // 🔥 Solo los roles permitidos pueden editar
  const canEditCarousel = roleId === 1 || roleId === 2;

  // 1️⃣ Cargar rol del usuario
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

  // 2️⃣ Cargar slides
  useEffect(() => {
    const loadSlides = async () => {
      const { data, error } = await supabase
        .from("carousel_slides")
        .select("id_slide, image_path, orden")
        .order("orden", { ascending: true });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const signedSlides = await Promise.all(
        data.map(async (row) => {
          const { data: signed } = await supabase.storage
            .from("carousel")
            .createSignedUrl(row.image_path, 3600);
          return {
            id: row.id_slide,
            path: row.image_path,
            url: signed?.signedUrl,
          };
        })
      );

      setSlides(signedSlides);
      setLoading(false);
    };

    loadSlides();
  }, []);

  // 3️⃣ Resto de la lógica (prev, next, add, delete) — SIN CAMBIOS
  const prev = () => slides.length && setCurrent((c) => (c - 1 + slides.length) % slides.length);
  const next = () => slides.length && setCurrent((c) => (c + 1) % slides.length);

  const handleAddImages = async (e) => {
    if (!canEditCarousel) return; // 🔥 Bloqueo extra por seguridad

    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const available = MAX_SLIDES - slides.length;
    const toAdd = files.slice(0, available);

    const baseOrder = slides.length;
    const newSlides = [];

    for (let i = 0; i < toAdd.length; i++) {
      const file = toAdd[i];
      const ext = file.name.split(".").pop();
      const path = `slides/${Date.now()}_${i}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("carousel")
        .upload(path, file);

      if (upErr) continue;

      const { data: row } = await supabase
        .from("carousel_slides")
        .insert({ image_path: path, orden: baseOrder + i })
        .select()
        .single();

      const { data: signed } = await supabase.storage
        .from("carousel")
        .createSignedUrl(path, 3600);

      newSlides.push({
        id: row.id_slide,
        path,
        url: signed?.signedUrl,
      });
    }

    setSlides((prev) => [...prev, ...newSlides]);
    e.target.value = "";
  };

  const handleRemoveImage = async (id) => {
    if (!canEditCarousel) return;

    const img = slides.find((s) => s.id === id);
    if (!img) return;

    await supabase.from("carousel_slides").delete().eq("id_slide", id);
    await supabase.storage.from("carousel").remove([img.path]);

    setSlides((prev) => prev.filter((s) => s.id !== id));
  };

  // 4️⃣ UI
  return (
    <div className="w-full">
      {/* === PANEL DE EDICIÓN SOLO ADMIN/SUPERADMIN === */}
      {isEditing && canEditCarousel && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow">
          <div className="flex justify-between">
            <h2 className="text-sm font-semibold">Gestionar imágenes</h2>
            <button
              className="text-xs text-slate-500 hover:text-slate-800"
              onClick={() => setIsEditing(false)}
            >
              Cerrar
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-600">
            Máximo {MAX_SLIDES} imágenes. Actualmente: {slides.length}
          </p>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleAddImages}
            className="mt-2 w-full text-xs file:bg-slate-900 file:text-white file:px-4 file:py-2 file:rounded-lg"
          />

          {/* Miniaturas */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className="relative border rounded-xl overflow-hidden"
              >
                <img
                  src={slide.url}
                  alt=""
                  className="h-24 w-full object-cover"
                />

                <button
                  onClick={() => handleRemoveImage(slide.id)}
                  className="absolute bottom-0 right-0 bg-red-500 text-white text-[10px] px-2 py-[2px] rounded"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === CARRUSEL === */}
      <div className="relative group overflow-hidden rounded-2xl bg-white shadow">
        {loading ? (
          <div className="h-[360px] flex items-center justify-center text-sm">
            Cargando...
          </div>
        ) : slides.length === 0 ? (
          <div className="h-[360px] flex flex-col items-center justify-center text-sm">
            No hay imágenes
            {canEditCarousel && (
              <button
                className="mt-3 px-4 py-2 bg-slate-900 text-white text-xs rounded"
                onClick={() => setIsEditing(true)}
              >
                Agregar imágenes
              </button>
            )}
          </div>
        ) : (
          <>
            <img
              src={slides[current].url}
              className="h-[360px] w-full object-cover group-hover:brightness-75 group-hover:blur-sm transition"
            />

            {/* Botón editar: visible SOLO para admin/superadmin */}
            {canEditCarousel && (
              <button
                onClick={() => setIsEditing(true)}
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <div className="bg-white/85 px-4 py-2 rounded-full shadow text-xs">
                  Modificar imágenes
                </div>
              </button>
            )}

            {/* Navegación */}
            {slides.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full"
                >
                  ‹
                </button>
                <button
                  onClick={next}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full"
                >
                  ›
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
