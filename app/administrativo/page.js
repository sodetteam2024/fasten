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
    // ✅ Usa tokens del tema (claro/oscuro)
    <div className="min-h-[calc(100vh-64px)] bg-background text-foreground px-6 py-8">
      <div className="mx-auto max-w-7xl flex gap-10">
        {/* SIDEBAR */}
        <aside className="w-64 pr-6 border-r border-border">
          {/* Buscador */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar"
                className="w-full rounded-xl border border-border bg-card px-10 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-purple-300/40 outline-none"
              />
            </div>
          </div>

          {/* Menú */}
          <nav className="space-y-6 text-sm">
            {/* Grupo Usuarios */}
            <div>
              <div className="mb-1 flex items-center gap-2 font-semibold text-foreground">
                <UsersIcon className="h-4 w-4" />
                <span>Usuarios</span>
              </div>

              <div className="ml-5 border-l border-border pl-3 space-y-1 text-xs">
                {/* Activos */}
                <button
                  onClick={() => setActiveUserSub("activos")}
                  className={`flex items-center gap-2 transition ${
                    activeUserSub === "activos"
                      ? "text-purple-600 font-semibold"
                      : "text-muted-foreground hover:text-purple-500"
                  }`}
                >
                  <UserCheck className="h-3 w-3" />
                  Activos
                </button>

                {/* Registrar */}
                <button
                  onClick={() => setActiveUserSub("registrar")}
                  className={`flex items-center gap-2 transition ${
                    activeUserSub === "registrar"
                      ? "text-purple-600 font-semibold"
                      : "text-muted-foreground hover:text-purple-500"
                  }`}
                >
                  <UserPlus className="h-3 w-3" />
                  Registrar
                </button>

                {/* Baneados */}
                <button
                  onClick={() => setActiveUserSub("baneados")}
                  className={`flex items-center gap-2 transition ${
                    activeUserSub === "baneados"
                      ? "text-purple-600 font-semibold"
                      : "text-muted-foreground hover:text-purple-500"
                  }`}
                >
                  <UserX className="h-3 w-3" />
                  Baneados
                </button>
              </div>
            </div>

            {/* Secciones adicionales */}
            <button className="flex items-center gap-2 text-muted-foreground hover:text-purple-500 transition">
              <CalendarDays className="h-4 w-4" />
              Reservas
            </button>

            <button className="flex items-center gap-2 text-muted-foreground hover:text-purple-500 transition">
              <CreditCard className="h-4 w-4" />
              Pagos
            </button>

            <button className="flex items-center gap-2 text-muted-foreground hover:text-purple-500 transition">
              <Users className="h-4 w-4" />
              Visitas
            </button>
          </nav>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-foreground mb-6">
            Panel Administrativo
          </h1>

          {/* ✅ Wrapper con scroll horizontal interno */}
          <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
            <div className="p-5">
              <div className="w-full overflow-x-auto">
                {/* ✅ min-width para que tablas/grids no rompan el layout */}
                <div className="min-w-[1100px]">
                  {activeUserSub === "activos" && <UsuariosActivos />}
                  {activeUserSub === "registrar" && <RegistrarUsuarioForm />}

                  {activeUserSub === "baneados" && (
                    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                      <p className="font-semibold mb-2 text-foreground">
                        Usuarios baneados
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Aquí aparecerán los usuarios marcados como
                        inactivos/restringidos.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
