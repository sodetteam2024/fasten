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

export default function PanelAdministrativo() {
  // manejo de la sub-sección de Usuarios
  const [activeUserSub, setActiveUserSub] = useState("activos"); 
  // "activos" | "registrar" | "baneados"

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-100 px-4 py-6">
      {/* Contenedor grande redondeado */}
      <div className="mx-auto max-w-6xl rounded-3xl bg-white shadow-sm border border-slate-200 px-6 py-5 flex gap-6">
        {/* SIDEBAR IZQUIERDA */}
        <aside className="w-56 pr-4 border-r border-slate-200">
          {/* Buscador */}
          <div className="mb-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-9 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
              />
            </div>
          </div>

          {/* MENÚ PRINCIPAL */}
          <nav className="space-y-6 text-sm text-slate-800">
            {/* Grupo Usuarios */}
            <div>
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <UsersIcon className="h-4 w-4" />
                <span>Usuarios</span>
              </div>

              <div className="ml-5 border-l border-slate-200 pl-3 space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveUserSub("activos")}
                  className={`flex items-center gap-2 ${
                    activeUserSub === "activos"
                      ? "text-purple-600 font-semibold"
                      : "text-slate-700 hover:text-purple-600"
                  }`}
                >
                  <UserCheck className="h-3 w-3" />
                  <span>Activos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveUserSub("registrar")}
                  className={`flex items-center gap-2 ${
                    activeUserSub === "registrar"
                      ? "text-purple-600 font-semibold"
                      : "text-slate-700 hover:text-purple-600"
                  }`}
                >
                  <UserPlus className="h-3 w-3" />
                  <span>Registrar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveUserSub("baneados")}
                  className={`flex items-center gap-2 ${
                    activeUserSub === "baneados"
                      ? "text-purple-600 font-semibold"
                      : "text-slate-700 hover:text-purple-600"
                  }`}
                >
                  <UserX className="h-3 w-3" />
                  <span>Baneados</span>
                </button>
              </div>
            </div>

            {/* Reservas */}
            <button
              type="button"
              className="flex items-center gap-2 text-slate-800 hover:text-purple-600 text-sm"
            >
              <CalendarDays className="h-4 w-4" />
              <span>Reservas</span>
            </button>

            {/* Pagos */}
            <button
              type="button"
              className="flex items-center gap-2 text-slate-800 hover:text-purple-600 text-sm"
            >
              <CreditCard className="h-4 w-4" />
              <span>Pagos</span>
            </button>

            {/* Visitas */}
            <button
              type="button"
              className="flex items-center gap-2 text-slate-800 hover:text-purple-600 text-sm"
            >
              <Users className="h-4 w-4" />
              <span>Visitas</span>
            </button>
          </nav>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1">
          <h1 className="text-xl font-semibold text-slate-900 mb-5">
            Panel Administrativo
          </h1>

          {/* CONTENIDO DINÁMICO SEGÚN SUBSECCIÓN */}
          <div className="space-y-4">
            {activeUserSub === "activos" && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                {/* Aquí luego montas tu tabla/listado de usuarios activos */}
                <p className="font-semibold mb-2">Usuarios activos</p>
                <p>
                  Aquí puedes listar, filtrar y gestionar los usuarios activos
                  de la copropiedad.
                </p>
              </div>
            )}

            {activeUserSub === "registrar" && (
              <RegistrarUsuarioForm
                onSuccess={(data) => {
                  // aquí podrías, por ejemplo, cambiar a "activos" o refrescar algo
                  console.log("Usuario creado:", data);
                  // setActiveUserSub("activos");
                }}
              />
            )}

            {activeUserSub === "baneados" && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                {/* Aquí luego montas tu listado de usuarios baneados */}
                <p className="font-semibold mb-2">Usuarios baneados</p>
                <p>
                  Aquí puedes consultar y administrar los usuarios que han sido
                  restringidos del sistema.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
