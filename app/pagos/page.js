"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CreditCard,
  MessageSquare,
  CalendarDays,
  Users,
  Bell,
  Search,
  Filter,
  DollarSign,
  Receipt,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Banknote,
  Smartphone,
  Lock,
  Calendar,
  FileText,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function PagosPage() {
  const [userName, setUserName] = useState("Usuario");
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedDebts, setSelectedDebts] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [debtForm, setDebtForm] = useState({
    concept: "",
    amount: "",
    dueDate: "",
    description: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    // Tarjeta
    cardNumber: "",
    cardName: "",
    expiryDate: "",
    cvv: "",
    // PSE
    bank: "",
    documentType: "CC",
    documentNumber: "",
    email: "",
  });

  const [debts, setDebts] = useState([
    {
      id: "1",
      concept: "Administración Enero 2024",
      amount: 250000,
      dueDate: "2024-01-31",
      status: "overdue",
      type: "administration",
      description: "Cuota de administración mensual",
      createdDate: "2024-01-01",
    },
    {
      id: "2",
      concept: "Servicios Públicos Enero",
      amount: 180000,
      dueDate: "2024-02-15",
      status: "pending",
      type: "utilities",
      description: "Agua, luz y gas",
      createdDate: "2024-01-15",
    },
    {
      id: "3",
      concept: "Multa por ruido",
      amount: 50000,
      dueDate: "2024-02-10",
      status: "pending",
      type: "fine",
      description: "Multa por ruido excesivo después de las 10 PM",
      createdDate: "2024-01-25",
    },
    {
      id: "4",
      concept: "Administración Diciembre 2023",
      amount: 250000,
      dueDate: "2023-12-31",
      status: "paid",
      type: "administration",
      description: "Cuota de administración mensual",
      createdDate: "2023-12-01",
    },
  ]);

  const navigationItems = [
    { href: "/pagos", label: "PAGOS", icon: CreditCard, active: true },
    { href: "/solicitudes", label: "SOLICITUDES/QUEJAS", icon: MessageSquare },
    { href: "/reservas", label: "RESERVAS", icon: CalendarDays },
    { href: "/visitas", label: "VISITAS", icon: Users },
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nombre = params.get("nombre");
    if (nombre) setUserName(nombre);
  }, []);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(amount);

  const handleAddDebt = (e) => {
    e.preventDefault();
    const newDebt = {
      id: Date.now().toString(),
      concept: debtForm.concept.trim(),
      amount: Number(debtForm.amount || 0),
      dueDate: debtForm.dueDate,
      status: "pending",
      type: "custom",
      description: debtForm.description.trim(),
      createdDate: new Date().toISOString().split("T")[0],
    };
    setDebts((prev) => [...prev, newDebt]);
    setDebtForm({ concept: "", amount: "", dueDate: "", description: "" });
    setShowAddDebt(false);
  };

  const toggleSelectDebt = (debtId) => {
    setSelectedDebts((prev) => (prev.includes(debtId) ? prev.filter((id) => id !== debtId) : [...prev, debtId]));
  };

  const handlePayment = (e) => {
    e.preventDefault();
    setDebts((prev) => prev.map((d) => (selectedDebts.includes(d.id) ? { ...d, status: "paid" } : d)));
    setSelectedDebts([]);
    setPaymentForm({
      cardNumber: "",
      cardName: "",
      expiryDate: "",
      cvv: "",
      bank: "",
      documentType: "CC",
      documentNumber: "",
      email: "",
    });
    setShowPayment(false);
    setSelectedPaymentMethod("");
    alert("¡Pago procesado exitosamente!");
  };

  const filteredDebts = debts.filter((debt) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = debt.concept.toLowerCase().includes(s) || debt.description.toLowerCase().includes(s);
    const matchesFilter = filterStatus === "all" || debt.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const selectedDebtsData = debts.filter((d) => selectedDebts.includes(d.id));
  const totalAmount = selectedDebtsData.reduce((sum, d) => sum + d.amount, 0);

  const statusBadge = (status) => {
    if (status === "paid")
      return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200";
    if (status === "overdue")
      return "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border-red-200";
    return "bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border-orange-200";
  };

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
      

      {/* MAIN */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Gestión de Pagos
          </h1>
          <p className="text-slate-600">Administra tus deudas y realiza pagos de forma segura</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-rose-600 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Deudas Vencidas</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatCurrency(debts.filter((d) => d.status === "overdue").reduce((s, d) => s + d.amount, 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full flex items-center justify-center">
                 <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Deudas Pendientes</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatCurrency(debts.filter((d) => d.status === "pending").reduce((s, d) => s + d.amount, 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Pagado</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatCurrency(debts.filter((d) => d.status === "paid").reduce((s, d) => s + d.amount, 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Buscar deudas por concepto o descripción..."
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
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="overdue">Vencidas</SelectItem>
              <SelectItem value="paid">Pagadas</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => setShowAddDebt(true)}
            className="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Agregar Deuda
          </Button>

          {selectedDebts.length > 0 && (
            <Button
              onClick={() => setShowPayment(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pagar Seleccionadas ({selectedDebts.length})
            </Button>
          )}
        </div>

        {/* Add Debt Form */}
        {showAddDebt && (
          <Card className="mb-8 shadow-2xl shadow-orange-200/50 border-0 bg-white/90 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                Agregar Deuda Personalizada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddDebt} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="concept">Concepto *</Label>
                    <Input
                      id="concept"
                      value={debtForm.concept}
                      onChange={(e) => setDebtForm((p) => ({ ...p, concept: e.target.value }))}
                      required
                      placeholder="Ej: Reparación de tubería"
                      className="bg-white/80 border-orange-200 focus:border-pink-400 focus:ring-pink-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Monto *</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={debtForm.amount}
                      onChange={(e) => setDebtForm((p) => ({ ...p, amount: e.target.value }))}
                      required
                      placeholder="0"
                      className="bg-white/80 border-orange-200 focus:border-pink-400 focus:ring-pink-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Fecha de Vencimiento *</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={debtForm.dueDate}
                      onChange={(e) => setDebtForm((p) => ({ ...p, dueDate: e.target.value }))}
                      required
                      className="bg-white/80 border-orange-200 focus:border-pink-400 focus:ring-pink-400"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={debtForm.description}
                    onChange={(e) => setDebtForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Descripción detallada de la deuda..."
                    className="bg-white/80 border-orange-200 focus:border-pink-400 focus:ring-pink-400"
                  />
                </div>
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Agregar Deuda
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddDebt(false)}
                    className="border-orange-200 hover:bg-orange-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Payment Form */}
        {showPayment && (
          <Card className="mb-8 shadow-2xl shadow-orange-200/50 border-0 bg-white/90 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                Procesar Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Resumen */}
                <div className="bg-gradient-to-r from-orange-50 to-pink-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-3">Resumen de Pago</h3>
                  <div className="space-y-2">
                    {selectedDebtsData.map((debt) => (
                      <div key={debt.id} className="flex justify-between text-sm">
                        <span>{debt.concept}</span>
                        <span className="font-medium">{formatCurrency(debt.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total a Pagar:</span>
                    <span className="text-green-600">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>

                {/* Métodos de pago */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card
                    className={`cursor-pointer transition-all duration-300 ${
                      selectedPaymentMethod === "card" ? "ring-2 ring-orange-400 bg-orange-50" : "hover:shadow-md"
                    }`}
                    onClick={() => setSelectedPaymentMethod("card")}
                  >
                    <CardContent className="p-4 flex items-center space-x-3">
                      <div className="text-orange-600">
                        <CreditCard className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">Tarjeta de Crédito/Débito</h4>
                        <p className="text-sm text-slate-600">Visa, Mastercard, American Express</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={`cursor-pointer transition-all duration-300 ${
                      selectedPaymentMethod === "pse" ? "ring-2 ring-orange-400 bg-orange-50" : "hover:shadow-md"
                    }`}
                    onClick={() => setSelectedPaymentMethod("pse")}
                  >
                    <CardContent className="p-4 flex items-center space-x-3">
                      <div className="text-orange-600">
                        <Banknote className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">PSE - Pagos Seguros en Línea</h4>
                        <p className="text-sm text-slate-600">Pago directo desde tu banco</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Campos del método */}
                {selectedPaymentMethod && (
                  <form onSubmit={handlePayment} className="space-y-6">
                    {selectedPaymentMethod === "card" && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-slate-900 flex items-center">
                          <Lock className="h-4 w-4 mr-2 text-green-600" />
                          Información de la Tarjeta
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2 space-y-2">
                            <Label htmlFor="cardNumber">Número de Tarjeta *</Label>
                            <Input
                              id="cardNumber"
                              value={paymentForm.cardNumber}
                              onChange={(e) => setPaymentForm((p) => ({ ...p, cardNumber: e.target.value }))}
                              placeholder="1234 5678 9012 3456"
                              required
                              className="bg-white/80 border-orange-200 focus:border-pink-400 focus:ring-pink-400"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <Label htmlFor="cardName">Nombre en la Tarjeta *</Label>
                            <Input
                              id="cardName"
                              value={paymentForm.cardName}
                              onChange={(e) => setPaymentForm((p) => ({ ...p, cardName: e.target.value }))}
                              placeholder="JUAN PEREZ"
                              required
                              className="bg-white/80 border-orange-200 focus:border-pink-400 focus:ring-pink-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="expiryDate">Vence *</Label>
                            <Input
                              id="expiryDate"
                              value={paymentForm.expiryDate}
                              onChange={(e) => setPaymentForm((p) => ({ ...p, expiryDate: e.target.value }))}
                              placeholder="MM/AA"
                              required
                              className="bg-white/80 border-orange-200 focus:border-pink-400 focus:ring-pink-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cvv">CVV *</Label>
                            <Input
                              id="cvv"
                              value={paymentForm.cvv}
                              onChange={(e) => setPaymentForm((p) => ({ ...p, cvv: e.target.value }))}
                              placeholder="123"
                              required
                              className="bg-white/80 border-orange-200 focus:border-pink-400 focus:ring-pink-400"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedPaymentMethod === "pse" && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-slate-900 flex items-center">
                          <Smartphone className="h-4 w-4 mr-2 text-blue-600" />
                          Información PSE
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="bank">Banco *</Label>
                            <Select
                              value={paymentForm.bank}
                              onValueChange={(v) => setPaymentForm((p) => ({ ...p, bank: v }))}
                            >
                              <SelectTrigger className="bg-white/80 border-orange-200">
                                <SelectValue placeholder="Selecciona tu banco" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bancolombia">Bancolombia</SelectItem>
                                <SelectItem value="davivienda">Davivienda</SelectItem>
                                <SelectItem value="bbva">BBVA</SelectItem>
                                <SelectItem value="banco-bogota">Banco de Bogotá</SelectItem>
                                <SelectItem value="banco-popular">Banco Popular</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="documentType">Tipo de Documento *</Label>
                            <Select
                              value={paymentForm.documentType}
                              onValueChange={(v) => setPaymentForm((p) => ({ ...p, documentType: v }))}
                            >
                              <SelectTrigger className="bg-white/80 border-orange-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                                <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                                <SelectItem value="NIT">NIT</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="documentNumber">Número de Documento *</Label>
                            <Input
                              id="documentNumber"
                              value={paymentForm.documentNumber}
                              onChange={(e) => setPaymentForm((p) => ({ ...p, documentNumber: e.target.value }))}
                              placeholder="12345678"
                              required
                              className="bg-white/80 border-orange-200 focus:border-pink-400 focus:ring-pink-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={paymentForm.email}
                              onChange={(e) => setPaymentForm((p) => ({ ...p, email: e.target.value }))}
                              placeholder="correo@ejemplo.com"
                              required
                              className="bg-white/80 border-orange-200 focus:border-pink-400 focus:ring-pink-400"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <Button
                        type="submit"
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Procesar Pago - {formatCurrency(totalAmount)}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowPayment(false);
                          setSelectedPaymentMethod("");
                        }}
                        className="border-orange-200 hover:bg-orange-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debts List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
            Mis Deudas ({filteredDebts.length})
          </h2>

          {filteredDebts.length === 0 ? (
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
              <CardContent className="p-12 text-center">
                <Receipt className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">No se encontraron deudas</h3>
                <p className="text-slate-500">
                  {searchTerm || filterStatus !== "all"
                    ? "Intenta ajustar los filtros de búsqueda"
                    : "¡Excelente! No tienes deudas pendientes"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredDebts.map((debt) => {
                const isSelected = selectedDebts.includes(debt.id);
                return (
                  <Card
                    key={debt.id}
                    className="shadow-lg border-0 bg-white/90 backdrop-blur-xl hover:shadow-xl transition-all duration-300 hover:scale-[1.01]"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start space-x-4 flex-1">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
                              debt.status === "paid"
                                ? "bg-gradient-to-br from-green-400 to-emerald-600"
                                : debt.status === "overdue"
                                ? "bg-gradient-to-br from-red-400 to-rose-600"
                                : "bg-gradient-to-br from-yellow-400 to-orange-600"
                            }`}
                          >
                            {debt.status === "paid" ? (
                              <CheckCircle className="h-6 w-6 text-white" />
                            ) : debt.status === "overdue" ? (
                              <AlertTriangle className="h-6 w-6 text-white" />
                            ) : (
                              <Clock className="h-6 w-6 text-white" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="text-lg font-semibold text-slate-900">{debt.concept}</h3>
                              <Badge className={statusBadge(debt.status)}>
                                {debt.status === "paid" ? "Pagado" : debt.status === "overdue" ? "Vencido" : "Pendiente"}
                              </Badge>
                              <Badge className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200">
                                {debt.type === "administration"
                                  ? "Administración"
                                  : debt.type === "utilities"
                                  ? "Servicios"
                                  : debt.type === "fine"
                                  ? "Multa"
                                  : "Personalizada"}
                              </Badge>
                              {isSelected && debt.status !== "paid" && (
                                <Badge className="bg-gradient-to-r from-emerald-100 to-green-100 text-green-700 border-green-200">
                                  Seleccionada
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-600 mb-3">
                              <div className="flex items-center space-x-2">
                                <DollarSign className="h-4 w-4 text-slate-400" />
                                <span className="font-semibold text-lg text-slate-900">
                                  {formatCurrency(debt.amount)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <span>
                                  Vence: {new Date(debt.dueDate).toLocaleDateString("es-CO")}
                                  {debt.status === "overdue" && (
                                    <span className="text-red-600 font-medium ml-1">(Vencida)</span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-slate-400" />
                                <span>Creada: {new Date(debt.createdDate).toLocaleDateString("es-CO")}</span>
                              </div>
                            </div>

                            <p className="text-sm text-slate-600">{debt.description}</p>
                          </div>
                        </div>

                        {debt.status !== "paid" && (
                          <div className="flex flex-col gap-2">
                            <Button
                              variant={isSelected ? "default" : "outline"}
                              onClick={() => toggleSelectDebt(debt.id)}
                              className={
                                isSelected
                                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                                  : "border-orange-200 hover:bg-orange-50"
                              }
                            >
                              {isSelected ? "Quitar" : "Seleccionar"}
                            </Button>
                          </div>
                        )}
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
