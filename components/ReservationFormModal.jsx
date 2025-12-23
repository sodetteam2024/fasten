"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  CheckCircle,
  Image as ImageIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ReservationFormModal({
  open,
  selectedSpace,
  selectedDate,
  setSelectedDate,
  selectedTimeSlot,
  setSelectedTimeSlot,
  currentMonth,
  setCurrentMonth,
  customStartTime,
  setCustomStartTime,
  customEndTime,
  setCustomEndTime,
  reservationForm,
  setReservationForm,
  getAvailableTimeSlots,
  renderCalendar,
  userName,
  savingReservation,
  onSubmit,
  onClose,
}) {
  if (!open || !selectedSpace) return null;

  const GRAD = "from-[#7b2ae6] to-[#f9b009]";

  /* =========================================================
     Galería (máx 6)
  ========================================================= */
  const photos = useMemo(() => {
    const list = Array.isArray(selectedSpace?.photos) ? selectedSpace.photos : [];
    const urls = list
      .map((p) => p?.url)
      .filter(Boolean)
      .slice(0, 6);

    // si no vienen photos pero sí heroImage:
    if (urls.length === 0 && selectedSpace?.heroImage) return [selectedSpace.heroImage];

    return urls;
  }, [selectedSpace]);

  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    setImgIndex(0); // cuando cambias de espacio, reinicia la imagen
  }, [selectedSpace?.id]);

  const hasPhotos = photos.length > 0;
  const canNav = photos.length > 1;

  const prevImg = () => setImgIndex((i) => (i - 1 + photos.length) % photos.length);
  const nextImg = () => setImgIndex((i) => (i + 1) % photos.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-sm">
      <Card className="w-full max-w-4xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-black/80 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
        {/* Header */}
        <CardHeader className="py-3 sm:py-4 px-4 sm:px-6 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
              <span className={`bg-gradient-to-r ${GRAD} bg-clip-text text-transparent`}>
                Reservar {selectedSpace.name}
              </span>

              <span
                className={`ml-1 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${GRAD} shadow`}
              >
                <selectedSpace.icon className="h-4 w-4 text-white" />
              </span>
            </CardTitle>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-foreground/70 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        {/* Scroll único */}
        <CardContent className="p-4 sm:p-6 max-h-[78vh] overflow-y-auto">
          {/* ✅ GALERÍA */}
          <div className="mb-5">
            <div className="relative overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 aspect-[16/9]">
              {hasPhotos ? (
                <img
                  src={photos[imgIndex]}
                  alt={`Foto ${imgIndex + 1} - ${selectedSpace.name}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground">
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${GRAD} flex items-center justify-center shadow-lg mb-3`}>
                    <ImageIcon className="h-7 w-7 text-white" />
                  </div>
                  <p className="text-sm">Este espacio aún no tiene fotos</p>
                </div>
              )}

              {/* Flechas */}
              {canNav && (
                <>
                  <button
                    type="button"
                    onClick={prevImg}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/55 text-white backdrop-blur flex items-center justify-center hover:bg-black/70 transition"
                    aria-label="Anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={nextImg}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/55 text-white backdrop-blur flex items-center justify-center hover:bg-black/70 transition"
                    aria-label="Siguiente"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] px-3 py-1 rounded-full bg-black/55 text-white backdrop-blur">
                    {imgIndex + 1}/{photos.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {photos.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {photos.slice(0, 6).map((url, idx) => (
                  <button
                    key={`${url}-${idx}`}
                    type="button"
                    onClick={() => setImgIndex(idx)}
                    className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-xl border transition ${
                      idx === imgIndex
                        ? "border-purple-400/70 ring-2 ring-purple-400/30"
                        : "border-black/10 dark:border-white/10 hover:border-purple-400/40"
                    }`}
                    aria-label={`Ver foto ${idx + 1}`}
                  >
                    <img src={url} alt={`Miniatura ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Calendar */}
              <div className="space-y-3">
                <h3 className="text-sm sm:text-base font-semibold text-foreground">
                  Seleccionar fecha
                </h3>

                <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setCurrentMonth(
                          new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
                        )
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <h4 className="text-sm font-semibold text-foreground">
                      {currentMonth.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
                    </h4>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setCurrentMonth(
                          new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                        )
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
                      <div
                        key={day}
                        className="h-7 flex items-center justify-center text-[11px] font-medium text-muted-foreground"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
                </div>

                {selectedDate && (
                  <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3">
                    <p className="text-xs sm:text-sm font-medium text-foreground">
                      <span className="text-muted-foreground">Fecha seleccionada:</span>{" "}
                      {new Date(selectedDate + "T00:00:00").toLocaleDateString("es-CO", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Slots + Form */}
              <div className="space-y-4">
                {selectedDate && (
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-foreground mb-2">
                      Horarios
                    </h3>

                    {/* Slots sugeridos */}
                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        Horarios sugeridos
                      </h4>

                      <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto pr-1">
                        {getAvailableTimeSlots(selectedDate).map((slot) => (
                          <Button
                            key={slot}
                            type="button"
                            variant="outline"
                            className={`justify-start text-xs sm:text-sm border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:bg-white/85 dark:hover:bg-white/10 ${
                              selectedTimeSlot === slot
                                ? `bg-gradient-to-r ${GRAD} text-white border-transparent hover:opacity-95`
                                : ""
                            }`}
                            onClick={() => setSelectedTimeSlot(slot)}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            {slot}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Personalizado */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground">
                        Horario personalizado
                      </h4>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="startTime" className="text-[11px] text-muted-foreground">
                            Hora inicio
                          </Label>
                          <Input
                            id="startTime"
                            type="time"
                            value={customStartTime}
                            onChange={(e) => setCustomStartTime(e.target.value)}
                            className="h-9 bg-white/70 dark:bg-white/5 border-black/10 dark:border-white/10"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="endTime" className="text-[11px] text-muted-foreground">
                            Hora fin
                          </Label>
                          <Input
                            id="endTime"
                            type="time"
                            value={customEndTime}
                            onChange={(e) => setCustomEndTime(e.target.value)}
                            className="h-9 bg-white/70 dark:bg-white/5 border-black/10 dark:border-white/10"
                          />
                        </div>
                      </div>

                      {customStartTime && customEndTime && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTimeSlot(`${customStartTime} - ${customEndTime}`)}
                          className="w-full text-xs border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:bg-white/85 dark:hover:bg-white/10"
                        >
                          Usar: {customStartTime} - {customEndTime}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="guests" className="text-xs text-muted-foreground">
                      Número de invitados
                    </Label>
                    <Input
                      id="guests"
                      type="number"
                      value={reservationForm.guests}
                      onChange={(e) => {
                        const value = Math.max(
                          1,
                          Math.min(500, parseInt(e.target.value || "1", 10))
                        );
                        setReservationForm((prev) => ({ ...prev, guests: value.toString() }));
                      }}
                      placeholder="Ej: 10"
                      min="1"
                      className="h-9 bg-white/70 dark:bg-white/5 border-black/10 dark:border-white/10"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="purpose" className="text-xs text-muted-foreground">
                      Motivo de la reserva *
                    </Label>
                    <Input
                      id="purpose"
                      value={reservationForm.purpose}
                      onChange={(e) => setReservationForm((prev) => ({ ...prev, purpose: e.target.value }))}
                      required
                      placeholder="Ej: Cumpleaños, Reunión familiar"
                      className="h-9 bg-white/70 dark:bg-white/5 border-black/10 dark:border-white/10"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="notes" className="text-xs text-muted-foreground">
                      Notas adicionales
                    </Label>
                    <Textarea
                      id="notes"
                      value={reservationForm.notes}
                      onChange={(e) => setReservationForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Información adicional..."
                      rows={3}
                      className="bg-white/70 dark:bg-white/5 border-black/10 dark:border-white/10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen */}
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">Resumen de reserva</h4>
              <div className="space-y-1 text-xs sm:text-sm text-foreground/90">
                <p>
                  <span className="text-muted-foreground font-medium">Solicitante:</span>{" "}
                  {userName}
                </p>
                <p>
                  <span className="text-muted-foreground font-medium">Espacio:</span>{" "}
                  {selectedSpace.name}
                </p>
                {selectedDate && (
                  <p>
                    <span className="text-muted-foreground font-medium">Fecha:</span>{" "}
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("es-CO")}
                  </p>
                )}
                {selectedTimeSlot && (
                  <p>
                    <span className="text-muted-foreground font-medium">Horario:</span>{" "}
                    {selectedTimeSlot}
                  </p>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3">
              <Button
                type="submit"
                className={`flex-1 bg-gradient-to-r ${GRAD} text-white hover:opacity-95 shadow-lg`}
                disabled={!selectedDate || !selectedTimeSlot || savingReservation}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {savingReservation ? "Creando..." : "Confirmar reserva"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:bg-white/85 dark:hover:bg-white/10"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
