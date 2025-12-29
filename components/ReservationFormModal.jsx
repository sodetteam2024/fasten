"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Image as ImageIcon,
  Calendar,
  Clock,
  Users,
  FileText,
  CheckCircle,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

const BUCKET = "areas";
const SIGNED_URL_TTL = 60 * 30;
const MAX_PHOTOS = 6;

async function resolveUrl(path) {
  if (!path) return null;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (pub?.publicUrl && !pub.publicUrl.includes("undefined")) return pub.publicUrl;

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);

  return signed?.signedUrl ?? null;
}

export default function ReservationFormModal({
  open,
  selectedSpace,
  onClose,
  selectedDate,
  setSelectedDate,
  selectedTimeSlot,
  setSelectedTimeSlot,
  currentMonth,
  setCurrentMonth,
  reservationForm,
  setReservationForm,
  getAvailableTimeSlots,
  renderCalendar,
  userName,
  savingReservation,
  onSubmit,
}) {
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Cargar galería de fotos desde la base de datos
  useEffect(() => {
    if (!selectedSpace || !open) return;

    let cancelled = false;

    const loadGallery = async () => {
      try {
        const paths = [];

        // 1) heroPath primero (si existe)
        if (selectedSpace.heroPath) paths.push(selectedSpace.heroPath);

        // 2) traer fotos reales del área (columna correcta: path)
        const { data, error } = await supabase
          .from("areas_fotos")
          .select("path, created_at")
          .eq("id_area", selectedSpace.id)
          .order("created_at", { ascending: false })
          .limit(MAX_PHOTOS);

        if (error) {
          console.warn("Error cargando areas_fotos:", error);
        } else {
          for (const f of data || []) {
            if (f?.path) paths.push(f.path);
          }
        }

        // 3) quitar duplicados manteniendo orden
        const uniquePaths = Array.from(
          new Set(paths.filter(Boolean).map((p) => String(p)))
        ).slice(0, MAX_PHOTOS);

        // 4) resolver URLs
        const resolved = await Promise.all(uniquePaths.map(resolveUrl));
        const finalPhotos = resolved.filter(Boolean);

        if (!cancelled) {
          setPhotos(finalPhotos);
          setPhotoIndex(0);
          setStep(1);
        }
      } catch (e) {
        console.error("loadGallery error:", e);
        if (!cancelled) {
          setPhotos([]);
          setPhotoIndex(0);
          setStep(1);
        }
      }
    };

    loadGallery();

    return () => {
      cancelled = true;
    };
  }, [selectedSpace?.id, selectedSpace?.heroPath, open]);

  if (!open || !selectedSpace) return null;

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const calculateTotal = () => {
    if (selectedSpace.pricing_type === "fijo") return selectedSpace.valor_fijo;
    return selectedSpace.valor_hora;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-black to-zinc-900">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${selectedSpace.color}`}>
              <selectedSpace.icon className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              Reservar {selectedSpace.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          {/* SECCIÓN 1: GALERÍA Y DATOS BÁSICOS */}
          {step === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-white/5 border border-white/10 group">
                  {photos.length > 0 ? (
                    <img
                      src={photos[photoIndex]}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      alt="Espacio"
                      draggable={false}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                      <ImageIcon className="h-12 w-12 mb-2 opacity-20" />
                      <p className="text-sm">Sin fotos disponibles</p>
                    </div>
                  )}

                  {photos.length > 1 && (
                    <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() =>
                          setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)
                        }
                        className="p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70"
                      >
                        <ChevronLeft />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                        className="p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70"
                      >
                        <ChevronRight />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2">
                  {photos.map((p, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setPhotoIndex(i)}
                      className={`relative h-16 w-24 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        photoIndex === i
                          ? "border-[#f9b009]"
                          : "border-transparent opacity-50"
                      }`}
                    >
                      <img src={p} className="w-full h-full object-cover" alt={`thumb-${i}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#7b2ae6]" /> Información General
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">
                      Número de invitados
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                      <input
                        type="number"
                        value={reservationForm.guests}
                        onChange={(e) =>
                          setReservationForm({ ...reservationForm, guests: e.target.value })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:border-[#7b2ae6] outline-none transition-all"
                        placeholder="Ej: 5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">
                      Motivo de la reserva *
                    </label>
                    <input
                      type="text"
                      value={reservationForm.purpose}
                      onChange={(e) =>
                        setReservationForm({ ...reservationForm, purpose: e.target.value })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white focus:border-[#7b2ae6] outline-none transition-all"
                      placeholder="Ej: Cumpleaños, Entrenamiento..."
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">
                      Notas adicionales
                    </label>
                    <textarea
                      value={reservationForm.notes}
                      onChange={(e) =>
                        setReservationForm({ ...reservationForm, notes: e.target.value })
                      }
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white focus:border-[#7b2ae6] outline-none transition-all resize-none"
                      placeholder="Comentarios extras para la administración..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 2: CALENDARIO Y HORARIOS */}
          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#f9b009]" /> Seleccionar Fecha
                </h3>

                <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-white font-medium capitalize">
                      {currentMonth.toLocaleString("es-ES", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentMonth(
                            new Date(currentMonth.setMonth(currentMonth.getMonth() - 1))
                          )
                        }
                        className="p-1 hover:bg-white/10 rounded-lg text-white"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentMonth(
                            new Date(currentMonth.setMonth(currentMonth.getMonth() + 1))
                          )
                        }
                        className="p-1 hover:bg-white/10 rounded-lg text-white"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
                      <span
                        key={d}
                        className="text-[10px] uppercase tracking-wider text-slate-500 font-bold"
                      >
                        {d}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">{renderCalendar()}</div>
                </div>

                {selectedDate && (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-[#f9b009] flex items-center gap-3">
                    <Info className="h-5 w-5" />
                    <span>
                      Fecha seleccionada:{" "}
                      <b>
                        {new Date(selectedDate).toLocaleDateString("es-ES", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </b>
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#7b2ae6]" /> Horarios Disponibles
                </h3>

                {!selectedDate ? (
                  <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/5 rounded-3xl text-slate-500">
                    <Calendar className="h-10 w-10 mb-2 opacity-20" />
                    <p>Selecciona una fecha primero</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
                      Horarios sugeridos
                    </p>

                    <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[300px] pr-2">
                      {getAvailableTimeSlots(selectedDate).map((slot) => (
                        <button
                          type="button"
                          key={slot}
                          onClick={() => setSelectedTimeSlot(slot)}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                            selectedTimeSlot === slot
                              ? "bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] border-transparent text-white shadow-lg"
                              : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          <span className="font-medium">{slot}</span>
                          {selectedTimeSlot === slot && <CheckCircle className="h-5 w-5" />}
                        </button>
                      ))}

                      {getAvailableTimeSlots(selectedDate).length === 0 && (
                        <p className="text-center py-10 text-slate-500">
                          No hay horarios disponibles para este día.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECCIÓN 3: RESUMEN */}
          {step === 3 && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in zoom-in-95 duration-300">
              <div className="text-center space-y-2">
                <div className="inline-flex p-4 rounded-full bg-green-500/10 text-green-500 mb-2">
                  <CheckCircle className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-bold text-white">Resumen de tu reserva</h3>
                <p className="text-slate-400">Verifica los detalles antes de confirmar</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-slate-400">Solicitante</span>
                    <span className="text-white font-medium">{userName}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-slate-400">Espacio</span>
                    <span className="text-white font-medium">{selectedSpace.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-slate-400">Fecha</span>
                    <span className="text-white font-medium">{selectedDate}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-slate-400">Horario</span>
                    <span className="text-white font-medium">{selectedTimeSlot}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 pt-6">
                    <span className="text-lg font-bold text-white">Total a pagar</span>
                    <span className="text-2xl font-bold text-[#f9b009]">
                      ${calculateTotal().toLocaleString("es-CO")}
                    </span>
                  </div>
                </div>

                <div className="bg-[#1a1a1a] p-4 text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-tighter">
                    Al confirmar, aceptas el reglamento de uso de las áreas comunes del
                    conjunto.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-white/5 flex justify-between items-center bg-black">
          <Button
            variant="ghost"
            onClick={step === 1 ? onClose : prevStep}
            className="text-slate-400 hover:text-white"
          >
            {step === 1 ? "Cancelar" : "Anterior"}
          </Button>

          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
                  step === s
                    ? "bg-gradient-to-r from-[#7b2ae6] to-[#f9b009]"
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>

          {step < 3 ? (
            <Button
              onClick={nextStep}
              disabled={step === 2 && (!selectedDate || !selectedTimeSlot)}
              className="bg-white text-black hover:bg-slate-200 px-8 rounded-xl font-bold"
            >
              Siguiente <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={onSubmit}
              disabled={savingReservation}
              className="bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] text-white px-10 rounded-xl font-bold shadow-lg shadow-[#7b2ae6]/20"
            >
              {savingReservation ? "Procesando..." : "Confirmar reserva"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
