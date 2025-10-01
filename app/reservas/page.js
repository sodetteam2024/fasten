"use client"

import { useState, useEffect } from "react"
import {
  Bell,
  User,
  Building2,
  CreditCard,
  MessageSquare,
  CalendarDays,
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function ReservationsPage() {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [userName, setUserName] = useState("Usuario")
  const [showReservationForm, setShowReservationForm] = useState(false)
  const [selectedSpace, setSelectedSpace] = useState(null)
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterSpace, setFilterSpace] = useState("all")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [customStartTime, setCustomStartTime] = useState("")
  const [customEndTime, setCustomEndTime] = useState("")

  const [reservationForm, setReservationForm] = useState({
    guests: "",
    purpose: "",
    notes: "",
  })

  const spaces = [
    {
      id: "pool",
      name: "Piscina",
      icon: Waves,
      description: "Área de piscina con zona de descanso",
      capacity: "20 personas",
      hours: "6:00 AM - 10:00 PM",
      price: "Gratuito",
      color: "from-blue-400 to-cyan-600",
      image: "/pool-area.jpg",
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
    },
    {
      id: "gym",
      name: "Gimnasio",
      icon: Dumbbell,
      description: "Gimnasio completamente equipado",
      capacity: "15 personas",
      hours: "5:00 AM - 11:00 PM",
      price: "Gratuito",
      color: "from-orange-400 to-red-600",
      image: "/gym-equipment.jpg",
      timeSlots: [
        "5:00 AM - 7:00 AM",
        "7:00 AM - 9:00 AM",
        "9:00 AM - 11:00 AM",
        "11:00 AM - 1:00 PM",
        "1:00 PM - 3:00 PM",
        "3:00 PM - 5:00 PM",
        "5:00 PM - 7:00 PM",
        "7:00 PM - 9:00 PM",
        "9:00 PM - 11:00 PM",
      ],
    },
    {
      id: "social-lounge",
      name: "Salón Social",
      icon: Coffee,
      description: "Salón para eventos y reuniones",
      capacity: "50 personas",
      hours: "8:00 AM - 12:00 AM",
      price: "$50,000/día",
      color: "from-purple-400 to-indigo-600",
      image: "/social-lounge.jpg",
      timeSlots: [
        "8:00 AM - 12:00 PM",
        "12:00 PM - 4:00 PM",
        "4:00 PM - 8:00 PM",
        "8:00 PM - 12:00 AM",
        "Todo el día (8:00 AM - 12:00 AM)",
      ],
    },
    {
      id: "park",
      name: "Parque Infantil",
      icon: Trees,
      description: "Área de juegos para niños",
      capacity: "30 personas",
      hours: "6:00 AM - 8:00 PM",
      price: "Gratuito",
      color: "from-green-400 to-emerald-600",
      image: "/kids-playground.jpg",
      timeSlots: [
        "6:00 AM - 9:00 AM",
        "9:00 AM - 12:00 PM",
        "12:00 PM - 3:00 PM",
        "3:00 PM - 6:00 PM",
        "6:00 PM - 8:00 PM",
      ],
    },
    {
      id: "parking",
      name: "Parqueadero de Visitantes",
      icon: Car,
      description: "Espacios adicionales para visitantes",
      capacity: "10 vehículos",
      hours: "24 horas",
      price: "$5,000/día",
      color: "from-gray-400 to-slate-600",
      image: "/visitor-parking.jpg",
      timeSlots: ["Todo el día (24 horas)"],
    },
    {
      id: "game-room",
      name: "Sala de Juegos",
      icon: Gamepad2,
      description: "Mesa de billar, ping pong y videojuegos",
      capacity: "12 personas",
      hours: "10:00 AM - 10:00 PM",
      price: "Gratuito",
      color: "from-pink-400 to-rose-600",
      image: "/game-room.jpg",
      timeSlots: ["10:00 AM - 1:00 PM", "1:00 PM - 4:00 PM", "4:00 PM - 7:00 PM", "7:00 PM - 10:00 PM"],
    },
    {
      id: "study-room",
      name: "Sala de Estudio",
      icon: BookOpen,
      description: "Espacio silencioso para estudio y trabajo",
      capacity: "8 personas",
      hours: "6:00 AM - 11:00 PM",
      price: "Gratuito",
      color: "from-teal-400 to-cyan-600",
      image: "/study-room.jpg",
      timeSlots: [
        "6:00 AM - 9:00 AM",
        "9:00 AM - 12:00 PM",
        "12:00 PM - 3:00 PM",
        "3:00 PM - 6:00 PM",
        "6:00 PM - 9:00 PM",
        "9:00 PM - 11:00 PM",
      ],
    },
    {
      id: "bbq-area",
      name: "Zona BBQ",
      icon: Coffee,
      description: "Área de parrillas y mesas al aire libre",
      capacity: "25 personas",
      hours: "10:00 AM - 10:00 PM",
      price: "$30,000/día",
      color: "from-amber-400 to-orange-600",
      image: "/bbq-area.jpg",
      timeSlots: ["10:00 AM - 2:00 PM", "2:00 PM - 6:00 PM", "6:00 PM - 10:00 PM", "Todo el día (10:00 AM - 10:00 PM)"],
    },
  ]

  const [reservations, setReservations] = useState([
    {
      id: "1",
      spaceId: "pool",
      spaceName: "Piscina",
      date: "2024-02-15",
      timeSlot: "4:00 PM - 6:00 PM",
      status: "confirmed",
      guests: "8",
      purpose: "Fiesta de cumpleaños familiar",
      notes: "Celebración para mi hijo de 10 años",
      reservedBy: "Usuario",
      house: "Manzana A Casa 3A",
      createdDate: "2024-01-28",
    },
    {
      id: "2",
      spaceId: "social-lounge",
      spaceName: "Salón Social",
      date: "2024-02-20",
      timeSlot: "6:00 PM - 10:00 PM",
      status: "pending",
      guests: "30",
      purpose: "Reunión familiar",
      notes: "Celebración de aniversario de bodas",
      reservedBy: "Usuario",
      house: "Manzana A Casa 3A",
      createdDate: "2024-01-30",
    },
    {
      id: "3",
      spaceId: "gym",
      spaceName: "Gimnasio",
      date: "2024-01-25",
      timeSlot: "7:00 AM - 9:00 AM",
      status: "completed",
      guests: "1",
      purpose: "Entrenamiento personal",
      notes: "Rutina matutina",
      reservedBy: "Usuario",
      house: "Manzana A Casa 3A",
      createdDate: "2024-01-20",
    },
  ])

  const navigationItems = [
    { href: "/pagos", label: "PAGOS", icon: CreditCard },
    { href: "/solicitudes", label: "SOLICITUDES/QUEJAS", icon: MessageSquare },
    { href: "/reservas", label: "RESERVAS", icon: CalendarDays, active: true },
    { href: "/visitas", label: "VISITAS", icon: Users },
  ]

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const nombre = params.get("nombre")
    if (nombre) setUserName(nombre)
  }, [])

  const handleSpaceSelect = (space) => {
    setSelectedSpace(space)
    setShowReservationForm(true)
    setSelectedDate("")
    setSelectedTimeSlot("")
    setCustomStartTime("")
    setCustomEndTime("")
  }

  const handleReservationSubmit = (e) => {
    e.preventDefault()

    if (!selectedDate || !selectedTimeSlot) {
      alert("Por favor selecciona una fecha y horario")
      return
    }

    const newReservation = {
      id: Date.now().toString(),
      spaceId: selectedSpace.id,
      spaceName: selectedSpace.name,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      status: "pending",
      guests: reservationForm.guests,
      purpose: reservationForm.purpose,
      notes: reservationForm.notes,
      reservedBy: userName,
      house: "Manzana A Casa 3A",
      createdDate: new Date().toISOString().split("T")[0],
    }

    setReservations((prev) => [newReservation, ...prev])

    // Reset form
    setReservationForm({ guests: "", purpose: "", notes: "" })
    setSelectedSpace(null)
    setSelectedDate("")
    setSelectedTimeSlot("")
    setCustomStartTime("")
    setCustomEndTime("")
    setShowReservationForm(false)

    alert("¡Reserva solicitada exitosamente! Recibirás confirmación pronto.")
  }

  const handleCancelReservation = (reservationId) => {
    if (
      window.confirm(
        "¿Estás seguro de que deseas cancelar esta reserva? Esta acción eliminará la reserva permanentemente.",
      )
    ) {
      setReservations((prev) => prev.filter((reservation) => reservation.id !== reservationId))
      alert("Reserva cancelada y eliminada exitosamente")
    }
  }

  const filteredReservations = reservations.filter((reservation) => {
    const matchesSearch =
      reservation.spaceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.purpose.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || reservation.status === filterStatus
    const matchesSpace = filterSpace === "all" || reservation.spaceId === filterSpace
    return matchesSearch && matchesStatus && matchesSpace
  })

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200"
      case "pending":
        return "bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border-orange-200"
      case "cancelled":
        return "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border-red-200"
      case "completed":
        return "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200"
      default:
        return "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-gray-200"
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "confirmed":
        return "Confirmada"
      case "pending":
        return "Pendiente"
      case "cancelled":
        return "Cancelada"
      case "completed":
        return "Completada"
      default:
        return status
    }
  }

  // Calendar functionality
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const isDateAvailable = (date) => {
    const today = new Date()
    const checkDate = new Date(date)

    // Can't reserve past dates
    if (checkDate < today.setHours(0, 0, 0, 0)) return false

    // Check if there are existing reservations for this date and space
    const existingReservations = reservations.filter(
      (res) =>
        res.spaceId === selectedSpace?.id &&
        res.date === date &&
        (res.status === "confirmed" || res.status === "pending"),
    )

    // If all time slots are taken, date is not available
    return existingReservations.length < selectedSpace?.timeSlots.length
  }

  const getAvailableTimeSlots = (date) => {
    if (!selectedSpace || !date) return []

    const existingReservations = reservations.filter(
      (res) =>
        res.spaceId === selectedSpace.id &&
        res.date === date &&
        (res.status === "confirmed" || res.status === "pending"),
    )

    const bookedSlots = existingReservations.map((res) => res.timeSlot)
    return selectedSpace.timeSlots.filter((slot) => !bookedSlots.includes(slot))
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days = []
    const today = new Date()

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10"></div>)
    }

    // Days of the month - FIXED DATE CALCULATION
    for (let day = 1; day <= daysInMonth; day++) {
      // Create date in local timezone to avoid timezone offset issues
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      const dateObj = new Date(year, month, day)

      // Format date as YYYY-MM-DD in local timezone
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

      const isToday = dateObj.toDateString() === today.toDateString()
      const isSelected = selectedDate === date
      const isAvailable = isDateAvailable(date)

      days.push(
        <button
          key={day}
          onClick={() => isAvailable && setSelectedDate(date)}
          disabled={!isAvailable}
          className={`h-10 w-10 rounded-lg text-sm font-medium transition-all duration-200 ${
            isSelected
              ? "bg-gradient-to-r from-orange-400 to-pink-500 text-white shadow-lg"
              : isToday
                ? "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border border-blue-200"
                : isAvailable
                  ? "hover:bg-gradient-to-r hover:from-orange-100 hover:to-pink-100 text-slate-700"
                  : "text-slate-300 cursor-not-allowed"
          }`}
        >
          {day}
        </button>,
      )
    }

    return days
  }

  const handleLogout = () => {
    window.location.href = "/logout"
  }
  function RedirectTo({ path }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(path);
  }, [path, router]);

  return null; 
}
return (
<> 
 <SignedOut>
    <RedirectTo path="/" />
 </SignedOut>
 <SignedIn>
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-orange-50 via-pink-50 to-purple-100">
      {/* Decorative Background Elements */}
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

        <div
          className="absolute top-1/3 left-1/2 w-16 h-16 bg-gradient-to-r from-yellow-300 to-orange-400 transform rotate-45 opacity-25 animate-spin"
          style={{ animationDuration: "20s" }}
        ></div>
        <div className="absolute top-2/3 right-10 w-20 h-20 bg-gradient-to-r from-green-300 to-emerald-400 transform rotate-12 opacity-20 animate-pulse"></div>

        <svg className="absolute top-0 left-0 w-full h-full opacity-10" viewBox="0 0 1200 800" fill="none">
          <path d="M0,400 Q300,200 600,400 T1200,400 V800 H0 Z" fill="url(#gradient1)" />
          <path d="M0,500 Q400,300 800,500 T1600,500 V800 H0 Z" fill="url(#gradient2)" />
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Profile Sidebar */}
      <div
        className={`fixed inset-y-0 right-0 w-80 bg-white/95 backdrop-blur-xl shadow-2xl shadow-purple-200/50 transform transition-transform duration-300 ease-in-out z-50 border-l border-orange-200/50 ${
          isProfileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-gradient-to-r from-orange-200 to-pink-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
              Perfil de Usuario
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsProfileOpen(false)}
              className="hover:bg-gradient-to-r hover:from-orange-100 hover:to-pink-100 transition-all duration-300"
            >
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
              <User className="h-10 w-10 text-white" />
            </div>
            <h3 className="font-semibold text-slate-900">{userName}</h3>
          </div>

          <div className="space-y-3">
            <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <Sparkles className="h-4 w-4 mr-2" />
              Editar Perfil
            </Button>
            <Button
              variant="destructive"
              className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg hover:shadow-xl transition-all duration-300"
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
          className="fixed inset-0 bg-gradient-to-br from-orange-900/20 via-pink-900/20 to-purple-900/20 backdrop-blur-sm z-40"
          onClick={() => setIsProfileOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Reservas de Espacios
          </h1>
          <p className="text-slate-600">Reserva las áreas comunes del conjunto residencial</p>
        </div>

        {/* Available Spaces */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent mb-6">
            Espacios Disponibles
          </h2>
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
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">{space.name}</h3>
                      <p className="text-sm text-slate-600 mb-3">{space.description}</p>
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
                          <span className="font-medium text-green-600">{space.price}</span>
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
                      setShowReservationForm(false)
                      setSelectedSpace(null)
                      setSelectedDate("")
                      setSelectedTimeSlot("")
                      setCustomStartTime("")
                      setCustomEndTime("")
                    }}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleReservationSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Calendar Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900">Seleccionar Fecha</h3>
                      <div className="bg-gradient-to-r from-orange-50 to-pink-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
                            }
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <h4 className="font-semibold text-slate-900">
                            {currentMonth.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
                            }
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
                            <div
                              key={day}
                              className="h-8 flex items-center justify-center text-xs font-medium text-slate-600"
                            >
                              {day}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
                      </div>
                      {selectedDate && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-blue-900">
                            Fecha seleccionada: {(() => {
                              const [year, month, day] = selectedDate.split("-")
                              const dateObj = new Date(
                                Number.parseInt(year),
                                Number.parseInt(month) - 1,
                                Number.parseInt(day),
                              )
                              return dateObj.toLocaleDateString("es-CO", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            })()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Time Slots and Form */}
                    <div className="space-y-4">
                      {selectedDate && (
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 mb-3">Horarios</h3>

                          {/* Predefined Time Slots */}
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-slate-700 mb-2">Horarios Sugeridos</h4>
                            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                              {getAvailableTimeSlots(selectedDate).map((slot) => (
                                <Button
                                  key={slot}
                                  type="button"
                                  variant={selectedTimeSlot === slot ? "default" : "outline"}
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

                          {/* Custom Time Selection */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-slate-700">Horario Personalizado</h4>
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
                                  className="bg-white/80 border-orange-200 focus:border-pink-400 focus:ring-pink-400 text-sm"
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
                                  className="bg-white/80 border-orange-200 focus:border-pink-400 focus:ring-pink-400 text-sm"
                                />
                              </div>
                            </div>
                            {customStartTime && customEndTime && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const customSlot = `${customStartTime} - ${customEndTime}`
                                  setSelectedTimeSlot(customSlot)
                                }}
                                className="w-full border-blue-200 hover:bg-blue-50 text-blue-700"
                              >
                                Usar Horario Personalizado: {customStartTime} - {customEndTime}
                              </Button>
                            )}
                          </div>

                          {getAvailableTimeSlots(selectedDate).length === 0 && !customStartTime && (
                            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                              No hay horarios sugeridos disponibles. Puedes crear un horario personalizado.
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
                              const value = Math.max(0, Math.min(25, Number.parseInt(e.target.value) || 0))
                              setReservationForm((prev) => ({ ...prev, guests: value.toString() }))
                            }}
                            placeholder="Ej: 10"
                            min="0"
                            max="25"
                            className="bg-white/80 border-orange-200 focus:border-pink-400 focus:ring-pink-400"
                          />
                          <p className="text-xs text-slate-500">Máximo: 25 personas</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="purpose">Motivo de la Reserva *</Label>
                          <Input
                            id="purpose"
                            value={reservationForm.purpose}
                            onChange={(e) => setReservationForm((prev) => ({ ...prev, purpose: e.target.value }))}
                            required
                            placeholder="Ej: Fiesta de cumpleaños, Reunión familiar"
                            className="bg-white/80 border-orange-200 focus:border-pink-400 focus:ring-pink-400"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="notes">Notas Adicionales</Label>
                          <Textarea
                            id="notes"
                            value={reservationForm.notes}
                            onChange={(e) => setReservationForm((prev) => ({ ...prev, notes: e.target.value }))}
                            placeholder="Información adicional sobre la reserva..."
                            rows={3}
                            className="bg-white/80 border-orange-200 focus:border-pink-400 focus:ring-pink-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Space Info */}
                  <div className="bg-gradient-to-r from-orange-50 to-pink-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-slate-900 mb-2">Información del Espacio</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>{selectedSpace.capacity}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>{selectedSpace.hours}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-green-600">{selectedSpace.price}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">{selectedSpace.description}</p>
                  </div>

                  {/* Reservation Summary */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Resumen de Reserva</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p>
                        <strong>Solicitante:</strong> {userName}
                      </p>
                      <p>
                        <strong>Vivienda:</strong> Manzana A Casa 3A
                      </p>
                      <p>
                        <strong>Espacio:</strong> {selectedSpace.name}
                      </p>
                      {selectedDate && (
                        <p>
                          <strong>Fecha:</strong> {(() => {
                            const [year, month, day] = selectedDate.split("-")
                            const dateObj = new Date(
                              Number.parseInt(year),
                              Number.parseInt(month) - 1,
                              Number.parseInt(day),
                            )
                            return dateObj.toLocaleDateString("es-CO")
                          })()}
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
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                      disabled={!selectedDate || !selectedTimeSlot}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmar Reserva
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowReservationForm(false)
                        setSelectedSpace(null)
                        setSelectedDate("")
                        setSelectedTimeSlot("")
                        setCustomStartTime("")
                        setCustomEndTime("")
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

        {/* My Reservations Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Buscar reservas por espacio o motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/80 backdrop-blur-sm border-orange-200 focus:border-pink-400 focus:ring-pink-400"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48 bg-white/80 backdrop-blur-sm border-orange-200">
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
              <SelectTrigger className="w-full sm:w-48 bg-white/80 backdrop-blur-sm border-orange-200">
                <SelectValue placeholder="Espacio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los espacios</SelectItem>
                {spaces.map((space) => (
                  <SelectItem key={space.id} value={space.id}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
            Mis Reservas ({filteredReservations.length})
          </h2>

          {filteredReservations.length === 0 ? (
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
              <CardContent className="p-12 text-center">
                <CalendarDays className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">No se encontraron reservas</h3>
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
                const space = spaces.find((s) => s.id === reservation.spaceId)
                return (
                  <Card
                    key={reservation.id}
                    className="shadow-lg border-0 bg-white/90 backdrop-blur-xl hover:shadow-xl transition-all duration-300 hover:scale-[1.01]"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div
                            className={`w-12 h-12 bg-gradient-to-br ${space?.color || "from-gray-400 to-slate-600"} rounded-full flex items-center justify-center flex-shrink-0 shadow-lg`}
                          >
                            {space?.icon && <space.icon className="h-6 w-6 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-slate-900">{reservation.spaceName}</h3>
                              <Badge className={getStatusColor(reservation.status)}>
                                {getStatusText(reservation.status)}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-slate-600 mb-3">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <span>{new Date(reservation.date).toLocaleDateString("es-CO")}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <span>{reservation.timeSlot}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4 text-slate-400" />
                                <span>{reservation.guests} invitados</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                <span>{reservation.house}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-slate-700">
                                <strong>Motivo:</strong> {reservation.purpose}
                              </p>
                              {reservation.notes && (
                                <p className="text-sm text-slate-600">
                                  <strong>Notas:</strong> {reservation.notes}
                                </p>
                              )}
                              <p className="text-xs text-slate-500">
                                Solicitada el {new Date(reservation.createdDate).toLocaleDateString("es-CO")}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {(reservation.status === "pending" || reservation.status === "confirmed") && (
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
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  </SignedIn>
</>
)
}
