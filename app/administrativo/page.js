"use client";

import { useState } from "react";
import {
  Search,
  Users,
  CalendarDays,
  CreditCard,
  Users as UsersIcon,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react";

import RegistrarUsuarioForm from "@/components/RegistrarUsuarioForm";
import UsuariosActivos from "@/components/UsuariosActivos";

export default function PanelAdministrativo() {
  const [activeUserSub, setActiveUserSub] = useState("activos"); 
  // opciones: "activos" | "registrar" | "baneados"

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f5f5f5] px-6 py-8">
      {/* Layout principal sin tarjeta blanca */}
      <div className="mx-auto max-w-7xl flex gap-10">
        
        {/* SIDEBAR */}
        <aside className="w-64 pr-6 border-r border-gray-300">
          
          {/* Buscador */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar"
                className="w-full rounded-xl border border-gray-300 bg-white px-10 py-2 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-purple-200 outline-none"
              />
            </div>
          </div>

          {/* Menú */}
          <nav className="space-y-6 text-sm text-gray-800">
            {/* Grupo Usuarios */}
            <div>
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <UsersIcon className="h-4 w-4" />
                <span>Usuarios</span>
              </div>

              <div className="ml-5 border-l border-gray-300 pl-3 space-y-1 text-xs">

                {/* Activos */}
                <button
                  onClick={() => setActiveUserSub("activos")}
                  className={`flex items-center gap-2 ${
                    activeUserSub === "activos"
                      ? "text-purple-700 font-semibold"
                      : "text-gray-700 hover:text-purple-600"
                  }`}
                >
                  <UserCheck className="h-3 w-3" />
                  Activos
                </button>

                {/* Registrar */}
                <button
                  onClick={() => setActiveUserSub("registrar")}
                  className={`flex items-center gap-2 ${
                    activeUserSub === "registrar"
                      ? "text-purple-700 font-semibold"
                      : "text-gray-700 hover:text-purple-600"
                  }`}
                >
                  <UserPlus className="h-3 w-3" />
                  Registrar
                </button>

                {/* Baneados */}
                <button
                  onClick={() => setActiveUserSub("baneados")}
                  className={`flex items-center gap-2 ${
                    activeUserSub === "baneados"
                      ? "text-purple-700 font-semibold"
                      : "text-gray-700 hover:text-purple-600"
                  }`}
                >
                  <UserX className="h-3 w-3" />
                  Baneados
                </button>

              </div>
            </div>

            {/* Secciones adicionales */}
            <button className="flex items-center gap-2 hover:text-purple-600">
              <CalendarDays className="h-4 w-4" />
              Reservas
            </button>

            <button className="flex items-center gap-2 hover:text-purple-600">
              <CreditCard className="h-4 w-4" />
              Pagos
            </button>

            <button className="flex items-center gap-2 hover:text-purple-600">
              <Users className="h-4 w-4" />
              Visitas
            </button>
          </nav>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1">

          <h1 className="text-2xl font-semibold text-gray-900 mb-6">
            Panel Administrativo
          </h1>

          {/* Render dinámico según selección */}
          <div>

            {activeUserSub === "activos" && (
              <UsuariosActivos />
            )}

            {activeUserSub === "registrar" && (
              <RegistrarUsuarioForm />
            )}

            {activeUserSub === "baneados" && (
              <div className="rounded-xl bg-white border border-gray-300 p-5 shadow-sm">
                <p className="font-semibold mb-2">Usuarios baneados</p>
                <p className="text-gray-600 text-sm">
                  Aquí aparecerán los usuarios marcados como inactivos/restringidos.
                </p>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
