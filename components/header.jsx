"use client";

import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Users,
  User,
} from "lucide-react";
import { useState, useEffect } from "react";
import { SignOutButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [menuOpen]);

  return (
    <header className="w-full bg-white shadow-md relative z-50">
      <nav className="container flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center">
            <img
      src="/fastenlogo.png"
      alt="Logo"
      className="h-5 w-5 object-contain"
    />
          </div>
          <span className="text-2xl font-bold text-purple-700 tracking-tight">
            <Link href="/inicio">FASTEN</Link> 
          </span>
        </div>
        <ul className="hidden md:flex items-center gap-6 text-slate-800 font-medium">
          <li className="flex items-center gap-2 hover:text-purple-700 transition">
            <CreditCard className="h-4 w-4" /> <Link href="/pagos">Pagos</Link>
          </li>
          <li className="flex items-center gap-2 hover:text-purple-700 transition">
            <ClipboardList className="h-4 w-4" /> <Link href="/solicitudes">Solicitudes/Quejas</Link>
          </li>
          <li className="flex items-center gap-2 hover:text-purple-700 transition">
            <CalendarDays className="h-4 w-4" /> <Link href="/reservas">Reservas</Link>
          </li>
          <li className="flex items-center gap-2 hover:text-purple-700 transition">
            <Users className="h-4 w-4" /> <Link href="/visitas">Visitas</Link>
          </li>
        </ul>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(true)}
            className="flex items-center gap-2 text-slate-700 hover:text-purple-700 transition"
          >
            <User className="h-5 w-5" />
            <span className="text-sm font-semibold">Usuario</span>
          </button>
        </div>
      </nav>

      {/* Overlay + Menú */}
      {menuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
            onClick={() => setMenuOpen(false)}
          />

          {/* Panel lateral */}
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-[9999] p-6 overflow-y-auto">
            <h2 className="text-xl font-bold text-purple-700 mb-4">
              Perfil de Usuario
            </h2>

            {/* Avatar */}
            <div className="flex flex-col items-center mb-6">
              <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white">
                <User className="h-8 w-8" />
              </div>
              <p className="mt-2 text-lg font-semibold">Usuario</p>
            </div>

            {/* Datos */}
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-semibold">Dirección: </span>
                Manzana A Casa 3A
              </div>
              <div>
                <span className="font-semibold">Documento: </span>
                1044612035
              </div>
              <div>
                <span className="font-semibold">Teléfono: </span>
                3128072610
              </div>
              <div>
                <span className="font-semibold">Email: </span>
                samu@gmail.com
              </div>
            </div>

            {/* Botones */}
            <div className="mt-6 flex flex-col gap-3">
              <button className="w-full py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition">
                Editar Perfil
              </button>

              {/* 🔑 Botón Cerrar Sesión con Clerk */}
              <SignOutButton redirectUrl="/">
                <button className="w-full py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition">
                  Cerrar Sesión
                </button>
              </SignOutButton>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
