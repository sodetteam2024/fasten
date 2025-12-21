"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  Waves,
  Dumbbell,
  Trees,
  Coffee,
  Car,
  Gamepad2,
  BookOpen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import ReservationFormModal from "@/components/ReservationFormModal";

/* =========================================================
   Helpers de fecha/hor
========================================================= */

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parse12hTo24(time12h) {
  const t = time12h.trim().toUpperCase().replace(/\s+/g, " ");
  const match = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (!match) return null;

  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const ap = match[3];

  if (ap === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return { h, m };
}

function parse24h(time24h) {
  const t = time24h.trim();
  const match = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function makeLocalISO(dateYYYYMMDD, hh, mm) {
  const [y, mo, d] = dateYYYYMMDD.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, mo - 1, d, hh, mm, 0, 0);
  return dt.toISOString();
}

function parseSlotToISO(selectedDate, slot) {
  if (!selectedDate || !slot) return null;

  const parts = slot.split("-").map((s) => s.trim());
  if (parts.length !== 2) return null;

  const [startRaw, endRaw] = parts;

  const s12 = parse12hTo24(startRaw);
  const e12 = parse12hTo24(endRaw);
  if (s12 && e12) {
    return {
      startISO: makeLocalISO(selectedDate, s12.h, s12.m),
      endISO: makeLocalISO(selectedDate, e12.h, e12.m),
    };
  }

  const s24 = parse24h(startRaw);
  const e24 = parse24h(endRaw);
  if (s24 && e24) {
    return {
      startISO: makeLocalISO(selectedDate, s24.h, s24.m),
      endISO: makeLocalISO(selectedDate, e24.h, e24.m),
    };
  }

  return null;
}

/* =========================================================
   Iconos por nombre
========================================================= */

function iconForAreaName(nombre) {
  const n = (nombre || "").toLowerCase();
  if (n.includes("pisc")) return Waves;
  if (n.includes("gym") || n.includes("gim")) return Dumbbell;
  if (n.includes("parq") || n.includes("infant")) return Trees;
  if (n.includes("sal") || n.includes("social")) return Coffee;
  if (n.includes("parquead")) return Car;
  if (n.includes("juego")) return Gamepad2;
  if (n.includes("estudio")) return BookOpen;
  return CalendarDays;
}

/* =========================================================
   Componente
========================================================= */

export default function ReservationsPage() {
  const router = useRouter();
  const { user } = useUser();

  const [usuarioDb, setUsuarioDb] = useState(null);
  const [perfilDb, setPerfilDb] = useState(null);

  const [spaces, setSpaces] = useState([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);

  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(true);

  const [showReservationForm, setShowReservationForm] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSpace, setFilterSpace] = useState("all");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [customStartTime, setCustomStartTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");
  const [savingReservation, setSavingReservation] = useState(false);

  const [reservationForm, setReservationForm] = useState({
    guests: "",
    purpose: "",
    notes: "",
  });

  const userName =
    (perfilDb?.nombre
      ? `${perfilDb.nombre} ${perfilDb.apellido || ""}`.trim()
      : user?.fullName || user?.username) || "Usuario";

  function RedirectTo({ path }) {
    useEffect(() => {
      router.replace(path);
    }, [path]);
    return null;
  }

  /* =========================================================
     Cargar usuario + perfil + áreas + reservas (+ cargos de reservas)
  ========================================================= */
  useEffect(() => {
    if (!user?.id) return;

    const loadAll = async () => {
      setLoadingSpaces(true);
      setLoadingReservations(true);

      const { data: usuario, error: errUsuario } = await supabase
        .from("usuarios")
        .select("id_usuario, idrol")
        .eq("clerk_id", user.id)
        .single();

      if (errUsuario || !usuario) {
        console.error("No se encontró usuario:", errUsuario);
        setUsuarioDb(null);
        setPerfilDb(null);
        setSpaces([]);
        setReservations([]);
        setLoadingSpaces(false);
        setLoadingReservations(false);
        return;
      }
      setUsuarioDb(usuario);

      const { data: perfil, error: errPerfil } = await supabase
        .from("perfilesusuarios")
        .select("id_perfil, id_unidad, nombre, apellido")
        .eq("id_usuario", usuario.id_usuario)
        .single();

      if (errPerfil || !perfil) {
        console.error("No se encontró perfil:", errPerfil);
        setPerfilDb(null);
        setSpaces([]);
        setReservations([]);
        setLoadingSpaces(false);
        setLoadingReservations(false);
        return;
      }
      setPerfilDb(perfil);

      const { data: areas, error: errAreas } = await supabase
        .from("areas")
        .select("id, idunidad, nombre, valor_hora, estado, created_at")
        .eq("idunidad", perfil.id_unidad)
        .eq("estado", "activa")
        .order("id", { ascending: true });

      if (errAreas) {
        console.error("Error cargando áreas:", errAreas);
        setSpaces([]);
      } else {
        setSpaces(
          (areas || []).map((a) => {
            const Icon = iconForAreaName(a.nombre);
            return {
              id: a.id,
              name: a.nombre,
              icon: Icon,
              description: "Reserva por horario según disponibilidad",
              capacity: "Consultar",
              hours: "Según disponibilidad",
              price:
                a.valor_hora > 0
                  ? `$${a.valor_hora.toLocaleString("es-CO")}/hora`
                  : "Gratuito",
              valor_hora: a.valor_hora,
              color: "from-[#7b2ae6] to-[#f9b009]",
              timeSlots: [
                "6:00 AM - 8:00 AM",
                "8:00 AM - 10:00 AM",
                "10:00 AM - 12:00 PM",
                "12:00 PM - 2:00 PM",
                "2:00 PM - 4:00 PM",
                "4:00 PM - 6:00 PM",
                "6:00 PM - 8:00 PM",
                "8:00 PM - 10:00 PM",
              ],
            };
          })
        );
      }
      setLoadingSpaces(false);

      const { data: resv, error: errResv } = await supabase
        .from("reservas")
        .select(
          `
          id,
          id_area,
          id_usuario,
          fecha_ini,
          fecha_fin,
          num_personas,
          estado,
          created_at,
          areas ( nombre )
        `
        )
        .eq("id_usuario", usuario.id_usuario)
        .order("fecha_ini", { ascending: false });

      if (errResv) {
        console.error("Error cargando reservas:", errResv);
        setReservations([]);
        setLoadingReservations(false);
        return;
      }

      const reservaIds = (resv || []).map((r) => r.id);
      let cargosMap = new Map();
      if (reservaIds.length > 0) {
        const { data: cargos, error: errCargos } = await supabase
          .from("cargos")
          .select("id, valor, estado, source_id")
          .eq("source_type", "reserva")
          .in("source_id", reservaIds);

        if (errCargos) {
          console.warn("No se pudieron cargar cargos:", errCargos);
        } else {
          for (const c of cargos || []) cargosMap.set(String(c.source_id), c);
        }
      }

      const mappedRes = (resv || []).map((r) => {
        const estado = (r.estado || "").toLowerCase();
        const status =
          estado === "confirmada"
            ? "confirmed"
            : estado === "cancelada"
              ? "cancelled"
              : estado === "completada"
                ? "completed"
                : "pending";

        const timeSlot = `${new Date(r.fecha_ini).toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
        })} - ${new Date(r.fecha_fin).toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
        })}`;

        const cargo = cargosMap.get(String(r.id));

        return {
          id: String(r.id),
          spaceId: r.id_area,
          spaceName: r.areas?.nombre || "Área",
          date: new Date(r.fecha_ini).toISOString().slice(0, 10),
          timeSlot,
          status,
          guests: String(r.num_personas ?? ""),
          purpose: "",
          notes: "",
          reservedBy: userName,
          createdDate: r.created_at
            ? new Date(r.created_at).toISOString().slice(0, 10)
            : "",
          _raw: r,
          _cargoId: cargo?.id ?? null,
          _cargoValor: cargo?.valor ?? null,
          _cargoEstado: cargo?.estado ?? null,
        };
      });

      setReservations(mappedRes);
      setLoadingReservations(false);
    };

    loadAll();
  }, [user?.id]);

  /* =========================================================
     Selección de área
  ========================================================= */
  const handleSpaceSelect = (space) => {
    setSelectedSpace(space);
    setShowReservationForm(true);
    setSelectedDate("");
    setSelectedTimeSlot("");
    setCustomStartTime("");
    setCustomEndTime("");
    setReservationForm({ guests: "", purpose: "", notes: "" });
  };

  /* =========================================================
     Reservar
  ========================================================= */
  const handleReservationSubmit = async (e) => {
    e.preventDefault();
    if (savingReservation) return;

    if (!usuarioDb?.id_usuario) {
      alert("No se pudo identificar el usuario en la base de datos.");
      return;
    }
    if (!selectedSpace?.id) {
      alert("Selecciona un área.");
      return;
    }
    if (!selectedDate || !selectedTimeSlot) {
      alert("Por favor selecciona una fecha y horario");
      return;
    }
    if (!reservationForm.purpose?.trim()) {
      alert("Por favor ingresa el motivo de la reserva.");
      return;
    }

    const parsed = parseSlotToISO(selectedDate, selectedTimeSlot);
    if (!parsed) {
      alert(
        "Horario inválido. Selecciona un horario sugerido o usa el personalizado."
      );
      return;
    }
    if (new Date(parsed.endISO) <= new Date(parsed.startISO)) {
      alert("La hora de fin debe ser mayor a la hora de inicio.");
      return;
    }

    const payload = {
      id_area: selectedSpace.id,
      id_usuario: usuarioDb.id_usuario,
      fecha_ini: parsed.startISO,
      fecha_fin: parsed.endISO,
      num_personas: reservationForm.guests
        ? Math.max(1, parseInt(reservationForm.guests, 10))
        : 1,
      estado: "pendiente",
    };

    setSavingReservation(true);

    const { data, error } = await supabase
      .from("reservas")
      .insert([payload])
      .select("id, id_area, fecha_ini, fecha_fin, num_personas, estado, created_at")
      .single();

    setSavingReservation(false);

    if (error) {
      console.error("Error creando reserva:", error);
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("reservas_no_overlap") || msg.includes("exclude")) {
        alert("Ese horario ya está reservado para esa área. Elige otro horario.");
        return;
      }
      alert("No se pudo crear la reserva. Revisa permisos/políticas y vuelve a intentar.");
      return;
    }

    let cargoValor = null;
    let cargoId = null;
    try {
      const { data: cargo } = await supabase
        .from("cargos")
        .select("id, valor, estado")
        .eq("source_type", "reserva")
        .eq("source_id", data.id)
        .single();

      if (cargo?.id) cargoId = cargo.id;
      if (cargo?.valor != null) cargoValor = cargo.valor;
    } catch { }

    setReservations((prev) => [
      {
        id: String(data.id),
        spaceId: selectedSpace.id,
        spaceName: selectedSpace.name,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        status: "pending",
        guests: String(payload.num_personas),
        purpose: reservationForm.purpose,
        notes: reservationForm.notes,
        reservedBy: userName,
        createdDate: new Date().toISOString().split("T")[0],
        _raw: data,
        _cargoId: cargoId,
        _cargoValor: cargoValor,
        _cargoEstado: "pendiente",
      },
      ...prev,
    ]);

    setReservationForm({ guests: "", purpose: "", notes: "" });
    setSelectedSpace(null);
    setSelectedDate("");
    setSelectedTimeSlot("");
    setCustomStartTime("");
    setCustomEndTime("");
    setShowReservationForm(false);

    alert("¡Reserva solicitada exitosamente!");
  };

  const closeModal = () => {
    setShowReservationForm(false);
    setSelectedSpace(null);
    setSelectedDate("");
    setSelectedTimeSlot("");
    setCustomStartTime("");
    setCustomEndTime("");
  };

  /* =========================================================
     Cancelar
  ========================================================= */
  const handleCancelReservation = async (reservationId) => {
    const r = reservations.find((x) => x.id === reservationId);
    if (!r?._raw?.id) return;

    if (!window.confirm("¿Estás seguro de que deseas cancelar esta reserva?")) return;

    const { error } = await supabase
      .from("reservas")
      .update({ estado: "cancelada" })
      .eq("id", r._raw.id);

    if (error) {
      console.error("Error cancelando reserva:", error);
      alert("No se pudo cancelar la reserva.");
      return;
    }

    setReservations((prev) =>
      prev.map((x) => (x.id === reservationId ? { ...x, status: "cancelled" } : x))
    );
    alert("Reserva cancelada exitosamente");
  };

  /* =========================================================
     Pagar
  ========================================================= */
  const handlePayReservation = (reservation) => {
    const reservaId = reservation?._raw?.id;
    if (!reservaId) return;
    router.push(`/pagos?source_type=reserva&source_id=${reservaId}`);
  };

  const shouldShowPayButton = (reservation) => {
    const active = reservation.status === "pending" || reservation.status === "confirmed";
    const hasCargo = Number(reservation._cargoValor || 0) > 0;
    const cargoPendiente = (reservation._cargoEstado || "").toLowerCase() === "pendiente";
    return active && hasCargo && cargoPendiente;
  };

  /* =========================================================
     Filtros
  ========================================================= */
  const filteredReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      const matchesSearch =
        (reservation.spaceName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (reservation.purpose || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === "all" || reservation.status === filterStatus;
      const matchesSpace =
        filterSpace === "all" || String(reservation.spaceId) === String(filterSpace);

      return matchesSearch && matchesStatus && matchesSpace;
    });
  }, [reservations, searchTerm, filterStatus, filterSpace]);

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200";
      case "pending":
        return "bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border-orange-200";
      case "cancelled":
        return "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border-red-200";
      case "completed":
        return "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200";
      default:
        return "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "confirmed":
        return "Confirmada";
      case "pending":
        return "Pendiente";
      case "cancelled":
        return "Cancelada";
      case "completed":
        return "Completada";
      default:
        return status;
    }
  };

  /* =========================================================
     Calendario
  ========================================================= */
  const getDaysInMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const isDateAvailable = (date) => {
    const today = new Date();
    const checkDate = new Date(date);

    if (checkDate < today.setHours(0, 0, 0, 0)) return false;
    if (!selectedSpace) return true;

    const existingReservations = reservations.filter(
      (res) =>
        String(res.spaceId) === String(selectedSpace.id) &&
        res.date === date &&
        (res.status === "confirmed" || res.status === "pending")
    );

    const totalSlots = selectedSpace.timeSlots?.length || 0;
    if (totalSlots === 0) return true;

    return existingReservations.length < totalSlots;
  };

  const getAvailableTimeSlots = (date) => {
    if (!selectedSpace || !date) return [];

    const existingReservations = reservations.filter(
      (res) =>
        String(res.spaceId) === String(selectedSpace.id) &&
        res.date === date &&
        (res.status === "confirmed" || res.status === "pending")
    );

    const bookedSlots = existingReservations.map((res) => res.timeSlot);
    return (selectedSpace.timeSlots || []).filter((slot) => !bookedSlots.includes(slot));
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];
    const today = new Date();

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const dateObj = new Date(year, month, day);

      const date = `${year}-${pad2(month + 1)}-${pad2(day)}`;

      const isToday = dateObj.toDateString() === today.toDateString();
      const isSelected = selectedDate === date;
      const available = isDateAvailable(date);

      days.push(
        <button
          key={day}
          onClick={() => available && setSelectedDate(date)}
          disabled={!available}
          className={`h-10 w-10 rounded-lg text-sm font-medium transition-all duration-200 ${isSelected
              ? "bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] text-white shadow-lg"
              : isToday
                ? "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border border-blue-200"
                : available
                  ? "hover:bg-gradient-to-r hover:from-[#7b2ae6]/10 hover:to-[#f9b009]/10 text-slate-700 dark:text-slate-200"
                  : "text-slate-300 cursor-not-allowed"
            }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  /* =========================================================
     UI
  ========================================================= */
  return (
    <>
      <SignedOut>
        <RedirectTo path="/" />
      </SignedOut>

      <SignedIn>
        <div className="min-h-screen bg-background text-foreground">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* ✅ ÚNICO contenedor flotante */}
            <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/92 dark:bg-black/80 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.55)] p-6 sm:p-8">
              <div className="p-6 sm:p-8">
                {/* Header */}
                <div className="mb-8">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] bg-clip-text text-transparent mb-2">
                    Reservas de Espacios
                  </h1>
                  <p className="text-slate-600 dark:text-slate-300">
                    Reserva las áreas comunes del conjunto residencial
                  </p>
                </div>

                {/* Available Spaces */}
                <div className="mb-12">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] bg-clip-text text-transparent mb-6">
                    Espacios Disponibles
                  </h2>

                  {loadingSpaces ? (
                    <Card className="shadow-lg border border-border bg-white dark:bg-black">
                      <CardContent className="p-8 text-slate-600 dark:text-slate-300">
                        Cargando áreas...
                      </CardContent>
                    </Card>
                  ) : spaces.length === 0 ? (
                    <Card className="shadow-lg border border-border bg-white dark:bg-black">
                      <CardContent className="p-8 text-slate-600 dark:text-slate-300">
                        No hay áreas activas para reservar.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {spaces.map((space) => (
                        <Card
                          key={space.id}
                          className="shadow-lg border border-border bg-white dark:bg-black hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                          onClick={() => handleSpaceSelect(space)}
                        >
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <div className={`w-16 h-16 bg-gradient-to-br ${space.color} rounded-xl flex items-center justify-center shadow-lg`}>
                                <space.icon className="h-8 w-8 text-white" />
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                  {space.name}
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                                  {space.description}
                                </p>

                                <div className="space-y-2 text-xs text-slate-500 dark:text-slate-300">
                                  <div className="flex items-center space-x-2">
                                    <Users className="h-3 w-3" />
                                    <span>{space.capacity}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Clock className="h-3 w-3" />
                                    <span>{space.hours}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-green-600">
                                      {space.price}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <Button
                                className={`w-full bg-gradient-to-r ${space.color} text-white shadow-[0_14px_40px_rgba(0,0,0,0.35)] hover:opacity-95 hover:shadow-[0_18px_55px_rgba(0,0,0,0.45)] transition-all duration-300`}
                              >

                                <Plus className="h-4 w-4 mr-2" />
                                Reservar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modal */}
                <ReservationFormModal
                  open={showReservationForm}
                  selectedSpace={selectedSpace}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  selectedTimeSlot={selectedTimeSlot}
                  setSelectedTimeSlot={setSelectedTimeSlot}
                  currentMonth={currentMonth}
                  setCurrentMonth={setCurrentMonth}
                  customStartTime={customStartTime}
                  setCustomStartTime={setCustomStartTime}
                  customEndTime={customEndTime}
                  setCustomEndTime={setCustomEndTime}
                  reservationForm={reservationForm}
                  setReservationForm={setReservationForm}
                  getAvailableTimeSlots={getAvailableTimeSlots}
                  renderCalendar={renderCalendar}
                  userName={userName}
                  savingReservation={savingReservation}
                  onSubmit={handleReservationSubmit}
                  onClose={closeModal}
                />

                {/* Mis Reservas */}
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Buscar reservas por espacio o motivo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white dark:bg-black border-border"
                      />
                    </div>

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full sm:w-48 bg-white dark:bg-black border-border">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="pending">Pendientes</SelectItem>
                        <SelectItem value="confirmed">Confirmadas</SelectItem>
                        <SelectItem value="completed">Completadas</SelectItem>
                        <SelectItem value="cancelled">Canceladas</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterSpace} onValueChange={setFilterSpace}>
                      <SelectTrigger className="w-full sm:w-48 bg-white dark:bg-black border-border">
                        <SelectValue placeholder="Espacio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los espacios</SelectItem>
                        {spaces.map((space) => (
                          <SelectItem key={space.id} value={String(space.id)}>
                            {space.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <h2 className="text-2xl font-bold bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] bg-clip-text text-transparent">
                    Mis Reservas ({filteredReservations.length})
                  </h2>

                  {loadingReservations ? (
                    <Card className="shadow-lg border border-border bg-white dark:bg-black">
                      <CardContent className="p-12 text-center text-slate-600 dark:text-slate-300">
                        Cargando reservas...
                      </CardContent>
                    </Card>
                  ) : filteredReservations.length === 0 ? (
                    <Card className="shadow-lg border border-border bg-white dark:bg-black">
                      <CardContent className="p-12 text-center">
                        <CalendarDays className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-200 mb-2">
                          No se encontraron reservas
                        </h3>
                        <p className="text-slate-500 dark:text-slate-300">
                          {searchTerm || filterStatus !== "all" || filterSpace !== "all"
                            ? "Intenta ajustar los filtros de búsqueda"
                            : "Realiza tu primera reserva de un espacio común"}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {filteredReservations.map((reservation) => {
                        const space = spaces.find(
                          (s) => String(s.id) === String(reservation.spaceId)
                        );
                        const Icon = space?.icon || CalendarDays;

                        return (
                          <Card
                            key={reservation.id}
                            className="shadow-lg border border-border bg-white dark:bg-black hover:shadow-xl transition-all duration-300 hover:scale-[1.01]"
                          >
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start space-x-4 flex-1">
                                  <div
                                    className={`w-12 h-12 bg-gradient-to-br ${space?.color || "from-[#7b2ae6] to-[#f9b009]"
                                      } rounded-full flex items-center justify-center flex-shrink-0 shadow-lg`}
                                  >
                                    <Icon className="h-6 w-6 text-white" />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                        {reservation.spaceName}
                                      </h3>
                                      <Badge className={getStatusColor(reservation.status)}>
                                        {getStatusText(reservation.status)}
                                      </Badge>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-600 dark:text-slate-300 mb-3">
                                      <div className="flex items-center space-x-2">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        <span>
                                          {new Date(
                                            reservation.date + "T00:00:00"
                                          ).toLocaleDateString("es-CO")}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Clock className="h-4 w-4 text-slate-400" />
                                        <span>{reservation.timeSlot}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Users className="h-4 w-4 text-slate-400" />
                                        <span>{reservation.guests} invitados</span>
                                      </div>
                                    </div>

                                    {reservation._cargoValor != null && (
                                      <p className="text-xs text-slate-600 dark:text-slate-300">
                                        Cargo:{" "}
                                        <span className="font-semibold">
                                          $
                                          {Number(reservation._cargoValor).toLocaleString(
                                            "es-CO"
                                          )}
                                        </span>{" "}
                                        ({reservation._cargoEstado || "pendiente"})
                                      </p>
                                    )}

                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                      Solicitada el{" "}
                                      {reservation.createdDate
                                        ? new Date(
                                          reservation.createdDate + "T00:00:00"
                                        ).toLocaleDateString("es-CO")
                                        : ""}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2 items-end">
                                  {(reservation.status === "pending" ||
                                    reservation.status === "confirmed") && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleCancelReservation(reservation.id)}
                                        className="border-red-200 hover:bg-red-50 text-red-600 dark:hover:bg-red-950/30"
                                      >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Cancelar
                                      </Button>
                                    )}

                                  {shouldShowPayButton(reservation) && (
                                    <Button
                                      size="sm"
                                      onClick={() => handlePayReservation(reservation)}
                                      className="bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] text-white hover:opacity-95 shadow-lg"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Pagar
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </SignedIn>
    </>
  );
}
