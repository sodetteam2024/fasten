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

  return (
    // Fondo del módulo: más sólido (menos transparente)
    <div className="min-h-[calc(100vh-64px)] px-6 py-8 text-foreground">
      {/* Tarjeta principal (glass oscuro, menos transparente + sombra flotante) */}
      <div
        className="
          mx-auto max-w-7xl
          rounded-2xl
          border border-white/10
          bg-white/92 dark:bg-black/85
          backdrop-blur-xl
          shadow-[0_25px_80px_rgba(0,0,0,0.55)]
          p-6 sm:p-8
        "
      >
        <div className="flex gap-10">
          {/* SIDEBAR */}
          <aside className="w-64 pr-6 border-r border-black/10 dark:border-white/10">
            {/* Buscador */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar"
                  className="
                    w-full rounded-xl
                    border border-black/10 dark:border-white/10
                    bg-white/70 dark:bg-white/5
                    px-10 py-2 text-sm
                    placeholder:text-muted-foreground/70
                    outline-none
                    focus:ring-2 focus:ring-purple-400/40
                  "
                />
              </div>
            </div>

            {/* Menú */}
            <nav className="space-y-6 text-sm">
              {/* Grupo Usuarios */}
              <div>
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <UsersIcon className="h-4 w-4" />
                  <span>Usuarios</span>
                </div>

                <div className="ml-5 border-l border-black/10 dark:border-white/10 pl-3 space-y-2 text-xs">
                  <button
                    onClick={() => setActiveUserSub("activos")}
                    className={`flex items-center gap-2 transition ${
                      activeUserSub === "activos"
                        ? "text-purple-500 font-semibold"
                        : "text-muted-foreground hover:text-purple-400"
                    }`}
                  >
                    <UserCheck className="h-3 w-3" />
                    Activos
                  </button>

                  <button
                    onClick={() => setActiveUserSub("registrar")}
                    className={`flex items-center gap-2 transition ${
                      activeUserSub === "registrar"
                        ? "text-purple-500 font-semibold"
                        : "text-muted-foreground hover:text-purple-400"
                    }`}
                  >
                    <UserPlus className="h-3 w-3" />
                    Registrar
                  </button>

                  <button
                    onClick={() => setActiveUserSub("baneados")}
                    className={`flex items-center gap-2 transition ${
                      activeUserSub === "baneados"
                        ? "text-purple-500 font-semibold"
                        : "text-muted-foreground hover:text-purple-400"
                    }`}
                  >
                    <UserX className="h-3 w-3" />
                    Baneados
                  </button>
                </div>
              </div>

              <button className="flex items-center gap-2 text-muted-foreground hover:text-purple-400 transition">
                <CalendarDays className="h-4 w-4" />
                Reservas
              </button>

              <button className="flex items-center gap-2 text-muted-foreground hover:text-purple-400 transition">
                <CreditCard className="h-4 w-4" />
                Pagos
              </button>

              <button className="flex items-center gap-2 text-muted-foreground hover:text-purple-400 transition">
                <Users className="h-4 w-4" />
                Visitas
              </button>
            </nav>
          </aside>

          {/* CONTENIDO */}
          <main className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold mb-6">
              Panel Administrativo
            </h1>

            {activeUserSub === "activos" && <UsuariosActivos />}
            {activeUserSub === "registrar" && <RegistrarUsuarioForm />}
            {activeUserSub === "baneados" && (
              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-5">
                <p className="font-semibold mb-2">Usuarios baneados</p>
                <p className="text-muted-foreground text-sm">
                  Aquí aparecerán los usuarios marcados como inactivos/restringidos.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
