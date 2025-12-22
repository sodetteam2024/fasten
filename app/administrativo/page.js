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
  Building2,
} from "lucide-react";

import RegistrarUsuarioForm from "@/components/RegistrarUsuarioForm";
import UsuariosActivos from "@/components/UsuariosActivos";
import AdminAreas from "@/components/admin/AdminAreas";
import AdminReservations from "@/components/admin/AdminReservations";

export default function PanelAdministrativo() {
  const [activeModule, setActiveModule] = useState("usuarios"); // usuarios | reservas | pagos | visitas | areas
  const [activeUserSub, setActiveUserSub] = useState("activos"); // activos | registrar | baneados

  return (
    <div className="min-h-[calc(100vh-64px)] px-6 py-8 text-foreground">
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
            {/* Buscador (por ahora solo UI) */}
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

            <nav className="space-y-6 text-sm">
              {/* USUARIOS */}
              <div>
                <button
                  onClick={() => setActiveModule("usuarios")}
                  className={`w-full flex items-center justify-between transition ${
                    activeModule === "usuarios"
                      ? "text-purple-500 font-semibold"
                      : "text-foreground/80 hover:text-purple-400"
                  }`}
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <UsersIcon className="h-4 w-4" />
                    Usuarios
                  </span>
                </button>

                {activeModule === "usuarios" && (
                  <div className="ml-5 mt-3 border-l border-black/10 dark:border-white/10 pl-3 space-y-2 text-xs">
                    <button
                      onClick={() => setActiveUserSub("activos")}
                      className={`flex items-center gap-2 transition ${
                        activeUserSub === "activos"
                          ? "text-purple-500 font-semibold"
                          : "text-muted-foreground hover:text-purple-400"
                      }`}
                      type="button"
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
                      type="button"
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
                      type="button"
                    >
                      <UserX className="h-3 w-3" />
                      Baneados
                    </button>
                  </div>
                )}
              </div>

              {/* RESERVAS */}
              <button
                onClick={() => setActiveModule("reservas")}
                className={`flex items-center gap-2 transition ${
                  activeModule === "reservas"
                    ? "text-purple-500 font-semibold"
                    : "text-muted-foreground hover:text-purple-400"
                }`}
                type="button"
              >
                <CalendarDays className="h-4 w-4" />
                Reservas
              </button>

              {/* ÁREAS */}
              <button
                onClick={() => setActiveModule("areas")}
                className={`flex items-center gap-2 transition ${
                  activeModule === "areas"
                    ? "text-purple-500 font-semibold"
                    : "text-muted-foreground hover:text-purple-400"
                }`}
                type="button"
              >
                <Building2 className="h-4 w-4" />
                Áreas / Espacios
              </button>

              {/* PAGOS / VISITAS (placeholder) */}
              <button
                onClick={() => setActiveModule("pagos")}
                className={`flex items-center gap-2 transition ${
                  activeModule === "pagos"
                    ? "text-purple-500 font-semibold"
                    : "text-muted-foreground hover:text-purple-400"
                }`}
                type="button"
              >
                <CreditCard className="h-4 w-4" />
                Pagos
              </button>

              <button
                onClick={() => setActiveModule("visitas")}
                className={`flex items-center gap-2 transition ${
                  activeModule === "visitas"
                    ? "text-purple-500 font-semibold"
                    : "text-muted-foreground hover:text-purple-400"
                }`}
                type="button"
              >
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

            {activeModule === "usuarios" && (
              <>
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
              </>
            )}

            {activeModule === "areas" && <AdminAreas />}
            {activeModule === "reservas" && <AdminReservations />}

            {activeModule === "pagos" && (
              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-5">
                <p className="font-semibold mb-2">Pagos</p>
                <p className="text-muted-foreground text-sm">
                  Próximo: panel de cargos/pagos con filtros y conciliación.
                </p>
              </div>
            )}

            {activeModule === "visitas" && (
              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-5">
                <p className="font-semibold mb-2">Visitas</p>
                <p className="text-muted-foreground text-sm">
                  Próximo: listado, permisos, aprobaciones, historial.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
