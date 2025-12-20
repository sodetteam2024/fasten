"use client";

import {
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  CheckCircle,
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border-0 bg-white/95 backdrop-blur-xl">
        <CardHeader className="border-b border-orange-200/50">
          <div className="flex items-center justify-between">
            <CardTitle className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent flex items-center">
              <selectedSpace.icon className="h-6 w-6 mr-3 text-orange-600" />
              Reservar {selectedSpace.name}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Calendar */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Seleccionar Fecha
                </h3>

                <div className="bg-gradient-to-r from-orange-50 to-pink-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setCurrentMonth(
                          new Date(
                            currentMonth.getFullYear(),
                            currentMonth.getMonth() - 1
                          )
                        )
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <h4 className="font-semibold text-slate-900">
                      {currentMonth.toLocaleDateString("es-CO", {
                        month: "long",
                        year: "numeric",
                      })}
                    </h4>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setCurrentMonth(
                          new Date(
                            currentMonth.getFullYear(),
                            currentMonth.getMonth() + 1
                          )
                        )
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(
                      (day) => (
                        <div
                          key={day}
                          className="h-8 flex items-center justify-center text-xs font-medium text-slate-600"
                        >
                          {day}
                        </div>
                      )
                    )}
                  </div>

                  <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
                </div>

                {selectedDate && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      Fecha seleccionada:{" "}
                      {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                        "es-CO",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Slots + Form */}
              <div className="space-y-4">
                {selectedDate && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">
                      Horarios
                    </h3>

                    {/* Slots sugeridos */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">
                        Horarios Sugeridos
                      </h4>

                      <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                        {getAvailableTimeSlots(selectedDate).map((slot) => (
                          <Button
                            key={slot}
                            type="button"
                            variant={
                              selectedTimeSlot === slot ? "default" : "outline"
                            }
                            className={`justify-start text-sm ${
                              selectedTimeSlot === slot
                                ? "bg-gradient-to-r from-orange-400 to-pink-500 text-white"
                                : "border-orange-200 hover:bg-orange-50"
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
                      <h4 className="text-sm font-medium text-slate-700">
                        Horario Personalizado
                      </h4>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="startTime" className="text-xs">
                            Hora de Inicio
                          </Label>
                          <Input
                            id="startTime"
                            type="time"
                            value={customStartTime}
                            onChange={(e) => setCustomStartTime(e.target.value)}
                            className="bg-white/80 border-orange-200"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="endTime" className="text-xs">
                            Hora de Fin
                          </Label>
                          <Input
                            id="endTime"
                            type="time"
                            value={customEndTime}
                            onChange={(e) => setCustomEndTime(e.target.value)}
                            className="bg-white/80 border-orange-200"
                          />
                        </div>
                      </div>

                      {customStartTime && customEndTime && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedTimeSlot(
                              `${customStartTime} - ${customEndTime}`
                            )
                          }
                          className="w-full border-blue-200 hover:bg-blue-50 text-blue-700"
                        >
                          Usar Horario Personalizado: {customStartTime} -{" "}
                          {customEndTime}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="guests">Número de Invitados</Label>
                    <Input
                      id="guests"
                      type="number"
                      value={reservationForm.guests}
                      onChange={(e) => {
                        const value = Math.max(
                          1,
                          Math.min(500, parseInt(e.target.value || "1", 10))
                        );
                        setReservationForm((prev) => ({
                          ...prev,
                          guests: value.toString(),
                        }));
                      }}
                      placeholder="Ej: 10"
                      min="1"
                      className="bg-white/80 border-orange-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purpose">Motivo de la Reserva *</Label>
                    <Input
                      id="purpose"
                      value={reservationForm.purpose}
                      onChange={(e) =>
                        setReservationForm((prev) => ({
                          ...prev,
                          purpose: e.target.value,
                        }))
                      }
                      required
                      placeholder="Ej: Cumpleaños, Reunión familiar"
                      className="bg-white/80 border-orange-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas Adicionales</Label>
                    <Textarea
                      id="notes"
                      value={reservationForm.notes}
                      onChange={(e) =>
                        setReservationForm((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Información adicional..."
                      rows={3}
                      className="bg-white/80 border-orange-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">
                Resumen de Reserva
              </h4>
              <div className="space-y-1 text-sm text-blue-800">
                <p>
                  <strong>Solicitante:</strong> {userName}
                </p>
                <p>
                  <strong>Espacio:</strong> {selectedSpace.name}
                </p>
                {selectedDate && (
                  <p>
                    <strong>Fecha:</strong>{" "}
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                      "es-CO"
                    )}
                  </p>
                )}
                {selectedTimeSlot && (
                  <p>
                    <strong>Horario:</strong> {selectedTimeSlot}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                disabled={!selectedDate || !selectedTimeSlot || savingReservation}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {savingReservation ? "Creando..." : "Confirmar Reserva"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-orange-200 hover:bg-orange-50"
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
