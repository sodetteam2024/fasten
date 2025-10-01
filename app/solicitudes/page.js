"use client"

import { useState, useEffect, useRef } from "react"
import {
  Bell,
  User,
  Building2,
  CreditCard,
  MessageSquare,
  CalendarDays,
  Users,
  Sparkles,
  Plus,
  Search,
  Filter,
  Calendar,
  Upload,
  X,
  ImageIcon,
  CheckCircle,
  Eye,
  Camera,
  Send,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function RequestsComplaintsPage() {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [userName, setUserName] = useState("Usuario")
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterCategory, setFilterCategory] = useState("all")
  const [uploadedImages, setUploadedImages] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const fileInputRef = useRef(null)
  const [isAnonymous, setIsAnonymous] = useState(true) // Default to anonymous

  const [formData, setFormData] = useState({
    category: "",
    priority: "medium",
    title: "",
    description: "",
    location: "",
    contactName: "",
    contactInfo: "",
  })

  const [requests, setRequests] = useState([
    {
      id: "1",
      category: "maintenance",
      priority: "high",
      title: "Fuga de agua en el baño",
      description: "Hay una fuga considerable en la tubería del baño principal que está causando daños en el piso.",
      location: "Manzana A - Casa 3A - Baño principal",
      status: "in-progress",
      images: ["/fugadeagua.jpg"],
      submittedDate: "2024-01-20",
      responseDate: "2024-01-21",
      response: "Hemos recibido su reporte. Un técnico será asignado en las próximas 24 horas.",
    },
    {
      id: "2",
      category: "noise",
      priority: "medium",
      title: "Ruido excesivo en horas nocturnas",
      description:
        "Los vecinos del apartamento superior hacen ruido excesivo después de las 10 PM, afectando el descanso.",
      location: "Manzana A - Casa 3A - Área de descanso",
      status: "submitted",
      images: [],
      submittedDate: "2024-01-22",
    },
    {
      id: "3",
      category: "security",
      priority: "urgent",
      title: "Puerta de acceso principal dañada",
      description: "La cerradura de la puerta principal del conjunto está dañada, comprometiendo la seguridad.",
      location: "Entrada principal del conjunto",
      status: "resolved",
      images: ["/puertarota.jpg", "/candadoroto.jpg"],
      submittedDate: "2024-01-18",
      responseDate: "2024-01-19",
      response: "La cerradura ha sido reparada y se ha instalado un sistema de seguridad adicional.",
    },
    {
      id: "4",
      category: "parking",
      priority: "medium",
      title: "Problema con el parqueadero asignado",
      description: "Mi espacio de parqueadero está siendo ocupado frecuentemente por otros vehículos.",
      location: "Manzana A - Casa 3A - Parqueadero #15",
      status: "submitted",
      images: [],
      submittedDate: "2024-01-25",
    },
  ])

  const categories = [
    { value: "maintenance", label: "Mantenimiento", icon: "🔧" },
    { value: "noise", label: "Ruido", icon: "🔊" },
    { value: "security", label: "Seguridad", icon: "🔒" },
    { value: "cleaning", label: "Limpieza", icon: "🧹" },
    { value: "parking", label: "Parqueadero", icon: "🚗" },
    { value: "common-areas", label: "Áreas Comunes", icon: "🏢" },
    { value: "utilities", label: "Servicios Públicos", icon: "💡" },
    { value: "other", label: "Otro", icon: "📝" },
  ]

  const navigationItems = [
    { href: "/pagos", label: "PAGOS", icon: CreditCard },
    { href: "/solicitudes", label: "SOLICITUDES/QUEJAS", icon: MessageSquare, active: true },
    { href: "/reservas", label: "RESERVAS", icon: CalendarDays },
    { href: "/visitas", label: "VISITAS", icon: Users },
  ]

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const nombre = params.get("nombre")
    if (nombre) setUserName(nombre)
  }, [])

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Limit to 5 images total
    const remainingSlots = 5 - uploadedImages.length
    const filesToAdd = files.slice(0, remainingSlots)

    setUploadedImages((prev) => [...prev, ...filesToAdd])

    // Create previews
    filesToAdd.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreviews((prev) => [...prev, e.target?.result])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const newRequest = {
      id: Date.now().toString(),
      ...formData,
      status: "submitted",
      images: imagePreviews, // In a real app, you'd upload to a server
      submittedDate: new Date().toISOString().split("T")[0],
    }

    setRequests((prev) => [newRequest, ...prev])

    // Reset form
    setFormData({
      category: "",
      priority: "medium",
      title: "",
      description: "",
      location: "",
      contactName: "",
      contactInfo: "",
    })
    setUploadedImages([])
    setImagePreviews([])
    setShowForm(false)

    // Show success message
    alert("¡Solicitud enviada exitosamente! Recibirás una respuesta pronto.")
  }

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || request.status === filterStatus
    const matchesCategory = filterCategory === "all" || request.category === filterCategory
    return matchesSearch && matchesStatus && matchesCategory
  })

  const getStatusColor = (status) => {
    switch (status) {
      case "resolved":
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200"
      case "in-progress":
        return "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200"
      case "closed":
        return "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-gray-200"
      default:
        return "bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border-orange-200"
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "submitted":
        return "Enviada"
      case "in-progress":
        return "En Proceso"
      case "resolved":
        return "Resuelta"
      case "closed":
        return "Cerrada"
      default:
        return status
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border-red-200"
      case "high":
        return "bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 border-orange-200"
      case "medium":
        return "bg-gradient-to-r from-yellow-100 to-lime-100 text-yellow-700 border-yellow-200"
      default:
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200"
    }
  }

  const getPriorityText = (priority) => {
    switch (priority) {
      case "urgent":
        return "Urgente"
      case "high":
        return "Alta"
      case "medium":
        return "Media"
      default:
        return "Baja"
    }
  }

  const handleLogout = () => {
    window.location.href = "/logout"
  }

  return (
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
          className="absolute bottom-20 right-1/3 w-28 h-28 bg-gradient-to-r from-emerald-300 to-teal-400 rounded-full opacity-20 animate-bounce"
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
            Solicitudes y Quejas
          </h1>
          <p className="text-slate-600">Envía tus solicitudes y quejas de forma anónima y segura</p>
        </div>

        {/* Anonymous Notice */}
        <Card className="mb-8 shadow-lg border-0 bg-gradient-to-r from-blue-50 to-cyan-50 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">
                    {isAnonymous ? "Modo Anónimo Activado" : "Modo Identificado"}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {isAnonymous
                      ? "Todas las solicitudes se envían de forma completamente anónima. Tu identidad está protegida."
                      : "Las solicitudes incluirán tu información de contacto para seguimiento directo."}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-slate-700">{isAnonymous ? "Anónimo" : "Identificado"}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={`transition-all duration-300 ${
                    isAnonymous
                      ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                      : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                  }`}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  {isAnonymous ? "Cambiar a Identificado" : "Cambiar a Anónimo"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Buscar por título, descripción o ubicación..."
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
              <SelectItem value="submitted">Enviadas</SelectItem>
              <SelectItem value="in-progress">En Proceso</SelectItem>
              <SelectItem value="resolved">Resueltas</SelectItem>
              <SelectItem value="closed">Cerradas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-48 bg-white/80 backdrop-blur-sm border-orange-200">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.icon} {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Solicitud
          </Button>
        </div>

        {/* Request Form */}
        {showForm && (
          <Card className="mb-8 shadow-2xl shadow-orange-200/50 border-0 bg-white/90 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent flex items-center">
                <Shield className="h-5 w-5 mr-2 text-blue-600" />
                {isAnonymous ? "Nueva Solicitud/Queja Anónima" : "Nueva Solicitud/Queja"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="bg-white/80 border-orange-200">
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.icon} {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioridad *</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger className="bg-white/80 border-orange-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">🟢 Baja</SelectItem>
                        <SelectItem value="medium">🟡 Media</SelectItem>
                        <SelectItem value="high">🟠 Alta</SelectItem>
                        <SelectItem value="urgent">🔴 Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Título de la Solicitud *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    required
                    placeholder="Resumen breve del problema o solicitud"
                    className="bg-white/80 border-orange-200 focus:border-pink-400 focus:ring-pink-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    required
                    placeholder="Ej: Baño principal, Cocina, Parqueadero asignado, o Área común del conjunto"
                    className="bg-white/80 border-orange-200 focus:border-pink-400 focus:ring-pink-400"
                  />
                </div>

                {!isAnonymous && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Nombre de Contacto *</Label>
                      <Input id="contactName" value={userName} disabled className="bg-gray-100 border-gray-200" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactInfo">Información de Contacto</Label>
                      <Input
                        id="contactInfo"
                        value="Manzana A Casa 3A"
                        disabled
                        className="bg-gray-100 border-gray-200"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción Detallada *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    required
                    placeholder="Describe detalladamente el problema, solicitud o queja. Incluye toda la información relevante..."
                    rows={4}
                    className="bg-white/80 border-orange-200 focus:border-pink-400 focus:ring-pink-400"
                  />
                </div>

                {/* Image Upload Section */}
                <div className="space-y-4">
                  <Label>Evidencias Fotográficas (Opcional)</Label>
                  <div className="border-2 border-dashed border-orange-200 rounded-lg p-6 bg-gradient-to-r from-orange-50 to-pink-50">
                    <div className="text-center">
                      <Camera className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-sm text-slate-600 mb-4">
                        Arrastra y suelta imágenes aquí o haz clic para seleccionar
                      </p>
                      <p className="text-xs text-slate-500 mb-4">Máximo 5 imágenes - JPG, PNG (máx. 5MB cada una)</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="border-orange-200 hover:bg-orange-50"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Seleccionar Imágenes
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Image Previews */}
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview || "/placeholder.svg"}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg shadow-md"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Solicitud
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false)
                      setFormData({
                        category: "",
                        priority: "medium",
                        title: "",
                        description: "",
                        location: "",
                        contactName: "",
                        contactInfo: "",
                      })
                      setUploadedImages([])
                      setImagePreviews([])
                    }}
                    className="border-orange-200 hover:bg-orange-50"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Requests List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
            Mis Solicitudes ({filteredRequests.length})
          </h2>

          {filteredRequests.length === 0 ? (
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">No se encontraron solicitudes</h3>
                <p className="text-slate-500">
                  {searchTerm || filterStatus !== "all" || filterCategory !== "all"
                    ? "Intenta ajustar los filtros de búsqueda"
                    : "Envía tu primera solicitud o queja"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card
                  key={request.id}
                  className="shadow-lg border-0 bg-white/90 backdrop-blur-xl hover:shadow-xl transition-all duration-300 hover:scale-[1.01]"
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-900">{request.title}</h3>
                            <Badge className={getStatusColor(request.status)}>{getStatusText(request.status)}</Badge>
                            <Badge className={getPriorityColor(request.priority)}>
                              {getPriorityText(request.priority)}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-slate-600 mb-3">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>Enviada: {new Date(request.submittedDate).toLocaleDateString("es-CO")}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Building2 className="h-4 w-4" />
                              <span>{request.location}</span>
                            </div>
                            <Badge className="bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border-purple-200">
                              {categories.find((c) => c.value === request.category)?.icon}{" "}
                              {categories.find((c) => c.value === request.category)?.label}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-slate-700 leading-relaxed">{request.description}</p>

                      {/* Images */}
                      {request.images.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm font-medium text-slate-700">
                            <ImageIcon className="h-4 w-4" />
                            <span>Evidencias ({request.images.length})</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {request.images.map((image, index) => (
                              <div key={index} className="relative group cursor-pointer">
                                <img
                                  src={image || "/placeholder.svg?height=100&width=100&query=evidence"}
                                  alt={`Evidencia ${index + 1}`}
                                  className="w-full h-20 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                                  <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Response */}
                      {request.response && (
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">Respuesta de Administración</span>
                            {request.responseDate && (
                              <span className="text-xs text-blue-600">
                                {new Date(request.responseDate).toLocaleDateString("es-CO")}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-blue-800">{request.response}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
