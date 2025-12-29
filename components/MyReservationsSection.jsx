"use client";

import {
  CalendarDays,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
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

export default function MyReservationsSection({
  reservations,
  loadingReservations,
  filteredReservations,

  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  filterSpace,
  setFilterSpace,

  spaces,

  handleCancelReservation,
  handlePayReservation,
  shouldShowPayButton,

  getStatusColor,
  getStatusText,
}) {
  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Buscar reservas por espacio o motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-black border-black/10 dark:border-white/10"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="confirmed">Confirmadas</SelectItem>
            <SelectItem value="completed">Completadas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterSpace} onValueChange={setFilterSpace}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Espacio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {spaces.map((space) => (
              <SelectItem key={space.id} value={String(space.id)}>
                {space.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Título */}
      <h2 className="text-2xl font-bold">
        Mis Reservas ({filteredReservations.length})
      </h2>

      {/* Estado */}
      {loadingReservations ? (
        <Card>
          <CardContent className="p-12 text-center">
            Cargando reservas...
          </CardContent>
        </Card>
      ) : filteredReservations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarDays className="h-14 w-14 mx-auto mb-4 opacity-30" />
            No se encontraron reservas
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
              <Card key={reservation.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-yellow-400 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-white" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">
                            {reservation.spaceName}
                          </h3>
                          <Badge className={getStatusColor(reservation.status)}>
                            {getStatusText(reservation.status)}
                          </Badge>
                        </div>

                        <div className="text-sm opacity-80">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {reservation.date}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {reservation.timeSlot}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {reservation.guests} personas
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {(reservation.status === "pending" ||
                        reservation.status === "confirmed") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleCancelReservation(reservation.id)
                          }
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      )}

                      {shouldShowPayButton(reservation) && (
                        <Button
                          size="sm"
                          onClick={() => handlePayReservation(reservation)}
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
  );
}
