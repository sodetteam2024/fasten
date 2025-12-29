"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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
  Image as ImageIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import MyReservationsSection from "@/components/MyReservationsSection";
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
   CONFIG
========================================================= */
const AREAS_BUCKET = "areas";
const SIGNED_URL_TTL = 60 * 30; // 30 min
const SIGNED_SAFETY_MS = 15_000;

// ✅ VIEW que devuelve 1 foto por área (la más reciente)
const AREAS_LAST_PHOTO_VIEW = "areas_foto_ultima";

/* =========================================================
   Helpers fecha/horario
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
   Precio UI
========================================================= */
function money(v) {
  return `$${Number(v || 0).toLocaleString("es-CO")}`;
}

function pricingLabel(areaRow) {
  const t = (areaRow?.pricing_type || "hora").toLowerCase();

  if (t === "fijo") {
    const fijo = Number(areaRow?.valor_fijo || 0);
    const maxH = Number(areaRow?.max_horas_fijo || 0);

    if (fijo <= 0)
      return { main: "Gratuito", sub: maxH > 0 ? `Fijo · hasta ${maxH}h` : "Fijo" };

    return { main: money(fijo), sub: maxH > 0 ? `Fijo · hasta ${maxH}h` : "Precio fijo" };
  }

  const vh = Number(areaRow?.valor_hora || 0);
  if (vh <= 0) return { main: "Gratuito", sub: "Por hora" };
  return { main: `${money(vh)}/hora`, sub: "Por hora" };
}

/* =========================================================
   Storage URL helpers
========================================================= */
function tryPublicUrl(path) {
  if (!path) return null;
  try {
    const { data } = supabase.storage.from(AREAS_BUCKET).getPublicUrl(path);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

async function createSignedUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(AREAS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error) return null;
  return data?.signedUrl || null;
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

  // cache: path -> { url, expMs }
  const [urlCache, setUrlCache] = useState(() => new Map());

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
    }, [path, router]);
    return null;
  }

  const ensureUrl = useCallback(
    async (path) => {
      if (!path) return null;
      const key = String(path);

      const cached = urlCache.get(key);
      if (cached?.url && cached?.expMs && Date.now() < cached.expMs) return cached.url;

      const pub = tryPublicUrl(path);
      if (pub) {
        setUrlCache((prev) => {
          const next = new Map(prev);
          next.set(key, { url: pub, expMs: Date.now() + 365 * 24 * 3600 * 1000 });
          return next;
        });
        return pub;
      }

      const signed = await createSignedUrl(path);
      if (signed) {
        setUrlCache((prev) => {
          const next = new Map(prev);
          next.set(key, {
            url: signed,
            expMs: Date.now() + SIGNED_URL_TTL * 1000 - SIGNED_SAFETY_MS,
          });
          return next;
        });
        return signed;
      }

      return null;
    },
    [urlCache]
  );

  /* =========================================================
     LOAD
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

      // 1) Áreas
      const { data: areas, error: errAreas } = await supabase
        .from("areas")
        .select(
          "id, idunidad, nombre, estado, created_at, pricing_type, valor_hora, valor_fijo, max_horas_fijo, imagen_principal, capacidad"
        )
        .eq("idunidad", perfil.id_unidad)
        .eq("estado", "activa")
        .order("id", { ascending: true });

      if (errAreas) {
        console.error("Error cargando áreas:", errAreas);
        setSpaces([]);
        setLoadingSpaces(false);
      } else {
        // 2) Última foto por área (VIEW) -> 1 fila por área
        const areaIds = (areas || []).map((a) => a.id);
        let fotoMap = new Map();

        if (areaIds.length > 0) {
          const { data: ultimasFotos, error: errUlt } = await supabase
            .from(AREAS_LAST_PHOTO_VIEW)
            .select("id_area, foto_id, foto_path, foto_created_at")
            .in("id_area", areaIds);

          if (errUlt) {
            console.warn("No se pudieron cargar últimas fotos (view):", errUlt);
          } else {
            fotoMap = new Map(
              (ultimasFotos || []).map((f) => [String(f.id_area), f])
            );
          }
        }

        const mappedSpaces = await Promise.all(
          (areas || []).map(async (a) => {
            const Icon = iconForAreaName(a.nombre);
            const price = pricingLabel(a);

            const f = fotoMap.get(String(a.id));
            // ✅ prioridad: última foto del view; si no hay, imagen_principal
            const heroPath = f?.foto_path || a.imagen_principal || null;
            const heroImage = heroPath ? await ensureUrl(heroPath) : null;

            return {
              id: a.id,
              name: a.nombre,
              icon: Icon,
              capacity: a.capacidad ? `${a.capacidad} personas` : "Consultar",
              hours: "Según disponibilidad",
              pricing_type: a.pricing_type || "por_hora",
              valor_hora: a.valor_hora ?? 0,
              valor_fijo: a.valor_fijo ?? 0,
              max_horas_fijo: a.max_horas_fijo ?? null,
              price: price.main,
              priceSub: price.sub,
              heroImage,
              heroPath,
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

        setSpaces(mappedSpaces);
        setLoadingSpaces(false);
      }


      // reservas
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

      // cargos
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
  }, [user?.id, ensureUrl]);

  /* =========================================================
     Abrir modal SOLO con botón
  ========================================================= */
  const openReserveModal = (space) => {
    const fresh = spaces.find((s) => String(s.id) === String(space.id)) || space;

    setSelectedSpace(fresh);
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

    if (!usuarioDb?.id_usuario) return alert("No se pudo identificar el usuario.");
    if (!selectedSpace?.id) return alert("Selecciona un área.");
    if (!selectedDate || !selectedTimeSlot) return alert("Selecciona fecha y horario.");
    if (!reservationForm.purpose?.trim()) return alert("Ingresa el motivo.");

    const parsed = parseSlotToISO(selectedDate, selectedTimeSlot);
    if (!parsed) return alert("Horario inválido.");
    if (new Date(parsed.endISO) <= new Date(parsed.startISO))
      return alert("La hora fin debe ser mayor.");

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
        alert("Ese horario ya está reservado. Elige otro.");
        return;
      }
      alert("No se pudo crear la reserva.");
      return;
    }

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

    if (!window.confirm("¿Cancelar esta reserva?")) return;

    const { error } = await supabase
      .from("reservas")
      .update({ estado: "cancelada" })
      .eq("id", r._raw.id);

    if (error) {
      console.error("Error cancelando reserva:", error);
      alert("No se pudo cancelar.");
      return;
    }

    setReservations((prev) =>
      prev.map((x) => (x.id === reservationId ? { ...x, status: "cancelled" } : x))
    );
    alert("Reserva cancelada");
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
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-200 dark:border-green-500/20";
      case "pending":
        return "bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border-orange-200 dark:from-yellow-900/25 dark:to-orange-900/25 dark:text-orange-200 dark:border-orange-500/20";
      case "cancelled":
        return "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border-red-200 dark:from-red-900/25 dark:to-rose-900/25 dark:text-red-200 dark:border-red-500/20";
      case "completed":
        return "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200 dark:from-blue-900/25 dark:to-cyan-900/25 dark:text-blue-200 dark:border-blue-500/20";
      default:
        return "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-gray-200 dark:from-white/10 dark:to-white/5 dark:text-white/80 dark:border-white/10";
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
     Calendario (para modal)
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
      days.push(<div key={`empty-${i}`} className="h-10" />);
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
                ? "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border border-blue-200 dark:from-blue-900/30 dark:to-cyan-900/30 dark:text-blue-100 dark:border-blue-500/20"
                : available
                  ? "hover:bg-gradient-to-r hover:from-[#7b2ae6]/10 hover:to-[#f9b009]/10 text-slate-700 dark:text-slate-200"
                  : "text-slate-300 dark:text-white/20 cursor-not-allowed"
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
        <div className="min-h-screen text-foreground">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/55 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.55)] p-6 sm:p-8">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] bg-clip-text text-transparent mb-2">
                  Reservas de Espacios
                </h1>
                <p className="text-slate-600 dark:text-slate-300">
                  Reserva las áreas comunes del conjunto residencial
                </p>
              </div>

              {/* Espacios */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] bg-clip-text text-transparent mb-6">
                  Espacios Disponibles
                </h2>

                {loadingSpaces ? (
                  <Card className="shadow-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black">
                    <CardContent className="p-8 text-slate-600 dark:text-slate-300">
                      Cargando áreas...
                    </CardContent>
                  </Card>
                ) : spaces.length === 0 ? (
                  <Card className="shadow-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black">
                    <CardContent className="p-8 text-slate-600 dark:text-slate-300">
                      No hay áreas activas para reservar.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {spaces.map((space) => (
                      <Card
                        key={space.id}
                        className="overflow-hidden shadow-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black transition-all duration-300 hover:shadow-2xl"
                      >
                        {/* FOTO ÚLTIMA (VIEW) */}
                        <div className="relative aspect-[16/10] bg-black/5 dark:bg-white/5">
                          {space.heroImage ? (
                            <img
                              src={space.heroImage}
                              alt={space.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={async (e) => {
                                if (!space.heroPath) return;
                                const fresh = await ensureUrl(space.heroPath);
                                if (fresh) e.currentTarget.src = fresh;
                              }}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <div className="h-14 w-14 rounded-2xl bg-black/10 dark:bg-white/10 flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-slate-400" />
                              </div>
                            </div>
                          )}

                          <div className="absolute left-3 top-3 z-10 rounded-full bg-black/55 text-white text-[11px] px-3 py-1 backdrop-blur">
                            {space.price}
                          </div>
                        </div>

                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-12 h-12 bg-gradient-to-br ${space.color} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}
                              >
                                <space.icon className="h-6 w-6 text-white" />
                              </div>

                              <div className="min-w-0">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                                  {space.name}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                                  {space.priceSub || " "}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2 text-xs text-slate-500 dark:text-slate-300">
                              <div className="flex items-center space-x-2">
                                <Users className="h-3 w-3" />
                                <span>{space.capacity}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-3 w-3" />
                                <span>{space.hours}</span>
                              </div>
                            </div>

                            {/* BOTÓN COMO CAPA DEL FRENTE */}
                            <div className="relative z-20 pt-2">
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation(); // Evita que el evento suba a la Card
                                  openReserveModal(space); // Pasa el objeto space completo al modal
                                }}
                                className={`w-full bg-gradient-to-r ${space.color} text-white font-bold py-6 rounded-xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 z-30`}
                              >
                                <Plus className="h-5 w-5 mr-2 stroke-[3px]" />
                                Reservar
                              </Button>
                            </div>
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

              <MyReservationsSection
                reservations={reservations}
                loadingReservations={loadingReservations}
                filteredReservations={filteredReservations}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                filterSpace={filterSpace}
                setFilterSpace={setFilterSpace}
                spaces={spaces}
                handleCancelReservation={handleCancelReservation}
                handlePayReservation={handlePayReservation}
                shouldShowPayButton={shouldShowPayButton}
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
              />
            </div>
          </main>
        </div>
      </SignedIn>
    </>
  );
}
