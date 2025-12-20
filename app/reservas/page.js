"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  MessageSquare,
  Users,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
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
  ChevronLeft,
  ChevronRight,
  X,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

/* =========================================================
   Helpers de fecha/hora
========================================================= */

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Convierte "6:00 AM" -> {h:6,m:0} en 24h
function parse12hTo24(time12h) {
  // soporta "6:00 AM", "06:00 AM", "6:00PM"
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

// Convierte "HH:MM" -> {h,m}
function parse24h(time24h) {
  const t = time24h.trim();
  const match = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

// Crea un ISO local (sin perder zona) usando Date(year,month,day,h,m)
function makeLocalISO(dateYYYYMMDD, hh, mm) {
  const [y, mo, d] = dateYYYYMMDD.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, mo - 1, d, hh, mm, 0, 0);
  return dt.toISOString();
}

// Parsea slot tipo:
// - "6:00 AM - 8:00 AM"
// - "16:30 - 17:30"
// Devuelve { startISO, endISO } o null
function parseSlotToISO(selectedDate, slot) {
  if (!selectedDate || !slot) return null;

  const parts = slot.split("-").map((s) => s.trim());
  if (parts.length !== 2) return null;

  const [startRaw, endRaw] = parts;

  // Caso AM/PM
  const s12 = parse12hTo24(startRaw);
  const e12 = parse12hTo24(endRaw);
  if (s12 && e12) {
    return {
      startISO: makeLocalISO(selectedDate, s12.h, s12.m),
      endISO: makeLocalISO(selectedDate, e12.h, e12.m),
    };
  }

  // Caso 24h
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

function formatDateEsCO(iso) {
  const d = new Date(iso);
  return d.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================================================
   Mapeo iconos por nombre de área (opcional)
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

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // usuario+perfil supabase
  const [usuarioDb, setUsuarioDb] = useState(null); // {id_usuario(uuid), idrol}
  const [perfilDb, setPerfilDb] = useState(null); // {id_perfil, id_unidad, nombre, apellido, ...}

  // Áreas (desde BD)
  const [spaces, setSpaces] = useState([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);

  // Reservas (desde BD)
  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(true);

  // UI states
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
     Cargar usuario + perfil + áreas + reservas
  ========================================================= */
  useEffect(() => {
    if (!user?.id) return;

    const loadAll = async () => {
      setLoadingSpaces(true);
      setLoadingReservations(true);

      // 1) Buscar usuario en tabla usuarios por clerk_id
      const { data: usuario, error: errUsuario } = await supabase
        .from("usuarios")
        .select("id_usuario, idrol")
        .eq("clerk_id", user.id)
        .single();

      if (errUsuario || !usuario) {
        console.error("No se encontró usuario en 'usuarios':", errUsuario);
        setLoadingSpaces(false);
        setLoadingReservations(false);
        return;
      }

      setUsuarioDb(usuario);

      // 2) Perfil (para id_unidad)
      const { data: perfil, error: errPerfil } = await supabase
        .from("perfilesusuarios")
        .select("id_perfil, id_unidad, nombre, apellido")
        .eq("id_usuario", usuario.id_usuario)
        .single();

      if (errPerfil || !perfil) {
        console.error("No se encontró perfil en 'perfilesusuarios':", errPerfil);
        setLoadingSpaces(false);
        setLoadingReservations(false);
        return;
      }

      setPerfilDb(perfil);

      // 3) Áreas por unidad
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
        const mapped = (areas || []).map((a) => {
          const Icon = iconForAreaName(a.nombre);
          return {
            id: a.id,
            name: a.nombre,
            icon: Icon,
            description: "Reserva por horario según disponibilidad",
            capacity: "Consultar",
            hours: "Según disponibilidad",
            price: a.valor_hora > 0 ? `$${a.valor_hora.toLocaleString("es-CO")}/hora` : "Gratuito",
            valor_hora: a.valor_hora,
            color: "from-orange-400 to-pink-500",
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
        });

        setSpaces(mapped);
      }

      setLoadingSpaces(false);

      // 4) Mis reservas (por id_usuario UUID)
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
      } else {
        const mappedRes = (resv || []).map((r) => {
          return {
            id: String(r.id),
            spaceId: r.id_area,
            spaceName: r.areas?.nombre || "Área",
            date: new Date(r.fecha_ini).toISOString().slice(0, 10),
            timeSlot: `${new Date(r.fecha_ini).toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
            })} - ${new Date(r.fecha_fin).toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
            })}`,
            status:
              (r.estado || "").toLowerCase() === "confirmada"
                ? "confirmed"
                : (r.estado || "").toLowerCase() === "cancelada"
                ? "cancelled"
                : (r.estado || "").toLowerCase() === "completada"
                ? "completed"
                : "pending",
            guests: String(r.num_personas ?? ""),
            purpose: "", // si luego lo guardas en BD, lo llenamos
            notes: "",
            reservedBy: userName,
            house: "", // si luego lo quieres desde direcciones/unidad, lo hacemos
            createdDate: r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : "",
            _raw: r,
          };
        });

        setReservations(mappedRes);
      }

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
     Reservar (insert en BD)
  ========================================================= */
  const handleReservationSubmit = async (e) => {
    e.preventDefault();

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
      alert("Horario inválido. Selecciona un horario sugerido o usa el personalizado.");
      return;
    }

    const payload = {
      id_area: selectedSpace.id,
      id_usuario: usuarioDb.id_usuario, // UUID de tu tabla usuarios
      fecha_ini: parsed.startISO,
      fecha_fin: parsed.endISO,
      num_personas: reservationForm.guests ? parseInt(reservationForm.guests, 10) : 0,
      estado: "Pendiente",
    };

    const { data, error } = await supabase.from("reservas").insert([payload]).select().single();

    if (error) {
      console.error("Error creando reserva:", error);

      // Si tienes constraint/trigger de anti doble booking, normalmente cae aquí:
      alert("No se pudo crear la reserva. Ese horario podría estar ocupado o hay un error.");
      return;
    }

    // refrescar lista
    const newReservation = {
      id: String(data.id),
      spaceId: selectedSpace.id,
      spaceName: selectedSpace.name,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      status: "pending",
      guests: reservationForm.guests,
      purpose: reservationForm.purpose,
      notes: reservationForm.notes,
      reservedBy: userName,
      house: "",
      createdDate: new Date().toISOString().split("T")[0],
      _raw: data,
    };

    setReservations((prev) => [newReservation, ...prev]);

    // Reset form
    setReservationForm({ guests: "", purpose: "", notes: "" });
    setSelectedSpace(null);
    setSelectedDate("");
    setSelectedTimeSlot("");
    setCustomStartTime("");
    setCustomEndTime("");
    setShowReservationForm(false);

    alert("¡Reserva solicitada exitosamente!");
  };

  /* =========================================================
     Cancelar (update en BD)
  ========================================================= */
  const handleCancelReservation = async (reservationId) => {
    const r = reservations.find((x) => x.id === reservationId);
    if (!r?._raw?.id) return;

    if (
      window.confirm(
        "¿Estás seguro de que deseas cancelar esta reserva?",
      )
    ) {
      const { error } = await supabase
        .from("reservas")
        .update({ estado: "Cancelada" })
        .eq("id", r._raw.id);

      if (error) {
        console.error("Error cancelando reserva:", error);
        alert("No se pudo cancelar la reserva.");
        return;
      }

      setReservations((prev) =>
        prev.map((x) =>
          x.id === reservationId ? { ...x, status: "cancelled" } : x
        )
      );
      alert("Reserva cancelada exitosamente");
    }
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
      const matchesSpace = filterSpace === "all" || String(reservation.spaceId) === String(filterSpace);

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
     Calendario (igual que el tuyo, pero usando reservas reales)
  ========================================================= */
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const isDateAvailable = (date) => {
    const today = new Date();
    const checkDate = new Date(date);

    if (checkDate < today.setHours(0, 0, 0, 0)) return false;
    if (!selectedSpace) return true;

    // Reservas existentes de esa área y fecha (pendiente/confirmada)
    const existingReservations = reservations.filter(
      (res) =>
        String(res.spaceId) === String(selectedSpace.id) &&
        res.date === date &&
        (res.status === "confirmed" || res.status === "pending")
    );

    // Si todos los slots sugeridos están tomados, no disponible
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
          className={`h-10 w-10 rounded-lg text-sm font-medium transition-all duration-200 ${
            isSelected
              ? "bg-gradient-to-r from-orange-400 to-pink-500 text-white shadow-lg"
              : isToday
              ? "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border border-blue-200"
              : available
              ? "hover:bg-gradient-to-r hover:from-orange-100 hover:to-pink-100 text-slate-700"
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
     Logout (si ya tienes otro flujo, cámbialo)
  ========================================================= */
  const handleLogout = () => {
    window.location.href = "/"; // Clerk SignOut real lo manejas desde tu Header normalmente
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
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-orange-50 via-pink-50 to-purple-100">
          {/* Decorative Background Elements (igual que tu UI) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-pink-300 to-rose-400 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-blue-300 to-cyan-400 rounded-full opacity-25 animate-bounce"></div>
            <div
              className="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-r from-purple-300 to-indigo-400 rounded-full opacity-15 animate-pulse"
              style={{ animationDelay: "1000ms" }}
            ></div>
            <div
              className="absolute bottom-20 right-1/3 w-28 h-28 bg-gradient-to-r from-emerald-300 to-teal-400 transform rotate-12 opacity-20 animate-bounce"
              style={{ animationDelay: "500ms" }}
            ></div>
          </div>

          {/* Profile Sidebar */}
          <div
            className={`fixed inset-y-0 right-0 w-80 bg-white/95 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 ease-in-out z-50 border-l ${
              isProfileOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                  Perfil de Usuario
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <User className="h-10 w-10 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900">{userName}</h3>
              </div>

              <div className="space-y-3">
                <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Editar Perfil
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleLogout}
                >
                  Cerrar Sesión
                </Button>
              </div>
            </div>
          </div>

          {/* Overlay */}
          {isProfileOpen && (
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setIsProfileOpen(false)}
            />
          )}

          {/* Main Content */}
          <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  Reservas de Espacios
                </h1>
                <p className="text-slate-600">
                  Reserva las áreas comunes del conjunto residencial
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => setIsProfileOpen(true)}
                className="border-orange-200 hover:bg-orange-50"
              >
                <User className="h-4 w-4 mr-2" />
                {userName}
              </Button>
            </div>

            {/* Available Spaces */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent mb-6">
                Espacios Disponibles
              </h2>

              {loadingSpaces ? (
                <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
                  <CardContent className="p-8 text-slate-600">
                    Cargando áreas...
                  </CardContent>
                </Card>
              ) : spaces.length === 0 ? (
                <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
                  <CardContent className="p-8 text-slate-600">
                    No hay áreas activas para reservar.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {spaces.map((space) => (
                    <Card
                      key={space.id}
                      className="shadow-lg border-0 bg-white/90 backdrop-blur-xl hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                      onClick={() => handleSpaceSelect(space)}
                    >
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div
                            className={`w-16 h-16 bg-gradient-to-br ${space.color} rounded-xl flex items-center justify-center shadow-lg`}
                          >
                            <space.icon className="h-8 w-8 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">
                              {space.name}
                            </h3>
                            <p className="text-sm text-slate-600 mb-3">
                              {space.description}
                            </p>

                            <div className="space-y-2 text-xs text-slate-500">
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
                            className={`w-full bg-gradient-to-r ${space.color} hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all duration-300`}
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

            {/* Reservation Form Modal */}
            {showReservationForm && selectedSpace && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border-0 bg-white/95 backdrop-blur-xl">
                  <CardHeader className="border-b border-orange-200/50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent flex items-center">
                        <selectedSpace.icon className="h-6 w-6 mr-3 text-orange-600" />
                        Reservar {selectedSpace.name}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShowReservationForm(false);
                          setSelectedSpace(null);
                          setSelectedDate("");
                          setSelectedTimeSlot("");
                          setCustomStartTime("");
                          setCustomEndTime("");
                        }}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    <form onSubmit={handleReservationSubmit} className="space-y-6">
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

                            <div className="grid grid-cols-7 gap-1">
                              {renderCalendar()}
                            </div>
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
                                    onClick={() => {
                                      const customSlot = `${customStartTime} - ${customEndTime}`;
                                      setSelectedTimeSlot(customSlot);
                                    }}
                                    className="w-full border-blue-200 hover:bg-blue-50 text-blue-700"
                                  >
                                    Usar Horario Personalizado: {customStartTime} -{" "}
                                    {customEndTime}
                                  </Button>
                                )}
                              </div>

                              {getAvailableTimeSlots(selectedDate).length === 0 &&
                                !customStartTime && (
                                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                                    No hay horarios sugeridos disponibles. Puedes crear un
                                    horario personalizado.
                                  </p>
                                )}
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
                                    0,
                                    Math.min(500, parseInt(e.target.value || "0", 10))
                                  );
                                  setReservationForm((prev) => ({
                                    ...prev,
                                    guests: value.toString(),
                                  }));
                                }}
                                placeholder="Ej: 10"
                                min="0"
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
                          disabled={!selectedDate || !selectedTimeSlot}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirmar Reserva
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowReservationForm(false);
                            setSelectedSpace(null);
                            setSelectedDate("");
                            setSelectedTimeSlot("");
                            setCustomStartTime("");
                            setCustomEndTime("");
                          }}
                          className="border-orange-200 hover:bg-orange-50"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Mis Reservas */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar reservas por espacio o motivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/80 backdrop-blur-sm border-orange-200"
                  />
                </div>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-48 bg-white/80 border-orange-200">
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
                  <SelectTrigger className="w-full sm:w-48 bg-white/80 border-orange-200">
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

              <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                Mis Reservas ({filteredReservations.length})
              </h2>

              {loadingReservations ? (
                <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
                  <CardContent className="p-12 text-center text-slate-600">
                    Cargando reservas...
                  </CardContent>
                </Card>
              ) : filteredReservations.length === 0 ? (
                <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
                  <CardContent className="p-12 text-center">
                    <CalendarDays className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-600 mb-2">
                      No se encontraron reservas
                    </h3>
                    <p className="text-slate-500">
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
                        className="shadow-lg border-0 bg-white/90 backdrop-blur-xl hover:shadow-xl transition-all duration-300 hover:scale-[1.01]"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4 flex-1">
                              <div
                                className={`w-12 h-12 bg-gradient-to-br ${
                                  space?.color || "from-gray-400 to-slate-600"
                                } rounded-full flex items-center justify-center flex-shrink-0 shadow-lg`}
                              >
                                <Icon className="h-6 w-6 text-white" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h3 className="text-lg font-semibold text-slate-900">
                                    {reservation.spaceName}
                                  </h3>
                                  <Badge className={getStatusColor(reservation.status)}>
                                    {getStatusText(reservation.status)}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-slate-600 mb-3">
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <span>
                                      {new Date(reservation.date + "T00:00:00").toLocaleDateString(
                                        "es-CO"
                                      )}
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

                                <div className="space-y-1">
                                  <p className="text-xs text-slate-500">
                                    Solicitada el{" "}
                                    {reservation.createdDate
                                      ? new Date(reservation.createdDate + "T00:00:00").toLocaleDateString(
                                          "es-CO"
                                        )
                                      : ""}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 ml-4">
                              {(reservation.status === "pending" ||
                                reservation.status === "confirmed") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelReservation(reservation.id)}
                                  className="border-red-200 hover:bg-red-50 text-red-600"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Cancelar
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
          </main>
        </div>
      </SignedIn>
    </>
  );
}
