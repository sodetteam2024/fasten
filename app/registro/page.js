"use client";

import { SignUp } from "@clerk/nextjs";

export default function Registro() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Fondos */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-400 opacity-40 blur-3xl rounded-full" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-400 opacity-40 blur-3xl rounded-full" />
      <div className="absolute top-1/3 right-1/3 w-80 h-80 bg-indigo-400 opacity-40 blur-3xl rounded-full" />

      {/* Contenedor */}
      <div className="relative z-10 bg-white/80 backdrop-blur-md shadow-2xl rounded-2xl p-10">
        <h1 className="text-3xl font-bold text-purple-700 mb-6 text-center">
          Crear cuenta
        </h1>
        <SignUp
          path="/registro"
          routing="path"
          signInUrl="/inicio"
          afterSignUpUrl="/inicio"
        />
      </div>
    </div>
  );
}
