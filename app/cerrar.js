"use client";

import { SignOutButton } from "@clerk/nextjs";

export default function Cerrar() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Fondos difuminados */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-400 opacity-40 blur-3xl rounded-full" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-400 opacity-40 blur-3xl rounded-full" />
      <div className="absolute top-1/3 right-1/3 w-80 h-80 bg-indigo-400 opacity-40 blur-3xl rounded-full" />

      {/* Contenido */}
      <div className="relative z-10 bg-white/80 backdrop-blur-md shadow-2xl rounded-2xl p-10 text-center">
        <h1 className="text-3xl font-bold text-purple-700 mb-6">
          ¿Seguro que quieres salir?
        </h1>
        <SignOutButton>
          <button className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-md">
            Cerrar Sesión
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
