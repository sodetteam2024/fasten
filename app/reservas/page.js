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
   Helpers
========================================================= */

const pad2 = (n) => String(n).padStart(2, "0");

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
  const [reservations, setReservations] = useState([]);

  const [loadingSpaces, setLoadingSpaces] = useState(true);
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

  /* =========================================================
     Redirect
  ========================================================= */
  function RedirectTo({ path }) {
    useEffect(() => {
      router.replace(path);
    }, [path]);
    return null;
  }

  /* =========================================================
     Carga inicial
  ========================================================= */
  useEffect(() => {
    if (!user?.id) return;

    const loadAll = async () => {
      setLoadingSpaces(true);
      setLoadingReservations(true);

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("id_usuario")
        .eq("clerk_id", user.id)
        .single();

      if (!usuario) return;

      setUsuarioDb(usuario);

      const { data: perfil } = await supabase
        .from("perfilesusuarios")
        .select("id_unidad, nombre, apellido")
        .eq("id_usuario", usuario.id_usuario)
        .single();

      setPerfilDb(perfil);

      const { data: areas } = await supabase
        .from("areas")
        .select("id, nombre, valor_hora")
        .eq("idunidad", perfil.id_unidad)
        .eq("estado", "activa");

      setSpaces(
        (areas || []).map((a) => ({
          id: a.id,
          name: a.nombre,
          icon: iconForAreaName(a.nombre),
          description: "Reserva por horario según disponibilidad",
          capacity: "Consultar",
          hours: "Según disponibilidad",
          price:
            a.valor_hora > 0
              ? `$${a.valor_hora.toLocaleString("es-CO")}/hora`
              : "Gratuito",
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
        }))
      );

      setLoadingSpaces(false);
      setLoadingReservations(false);
    };

    loadAll();
  }, [user?.id]);

  /* =========================================================
     UI
  ========================================================= */
  return (
    <>
      <SignedOut>
        <RedirectTo path="/" />
      </SignedOut>

      <SignedIn>
        <div className="min-h-screen">
          <main className="max-w-7xl mx-auto px-4 py-8">
            {/* CONTENEDOR ÚNICO */}
            <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/55 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.55)] p-6 sm:p-8">

              {/* HEADER */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] bg-clip-text text-transparent mb-2">
                  Reservas de Espacios
                </h1>
                <p className="text-slate-600 dark:text-slate-300">
                  Reserva las áreas comunes del conjunto residencial
                </p>
              </div>

              {/* ESPACIOS */}
              <h2 className="text-2xl font-bold bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] bg-clip-text text-transparent mb-6">
                Espacios Disponibles
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {spaces.map((space) => (
                  <Card
                    key={space.id}
                    onClick={() => {
                      setSelectedSpace(space);
                      setShowReservationForm(true);
                    }}
                    className="cursor-pointer bg-white dark:bg-black hover:scale-[1.02] transition shadow-lg"
                  >
                    <CardContent className="p-6 space-y-4">
                      <div className={`w-16 h-16 bg-gradient-to-br ${space.color} rounded-xl flex items-center justify-center shadow-lg`}>
                        <space.icon className="h-8 w-8 text-white" />
                      </div>

                      <h3 className="text-lg font-semibold">{space.name}</h3>

                      <Button className={`w-full bg-gradient-to-r ${space.color} text-white`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Reservar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* MODAL */}
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
                getAvailableTimeSlots={() => []}
                renderCalendar={() => null}
                userName={userName}
                savingReservation={savingReservation}
                onSubmit={() => {}}
                onClose={() => setShowReservationForm(false)}
              />
            </div>
          </main>
        </div>
      </SignedIn>
    </>
  );
}
