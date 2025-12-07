// app/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSignIn, useAuth } from "@clerk/nextjs";
import {
  Eye,
  EyeClosed,
} from "lucide-react";
export default function Inicio() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();

  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false); // 👈 NUEVO
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/inicio");
    }
  }, [isSignedIn, router]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isLoaded) return;

    setIsSubmitting(true);
    try {
      const result = await signIn.create({
        identifier: form.identifier,
        password: form.password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      } else {
        console.log(result);
        setError("Se requiere un paso extra de verificación.");
      }
    } catch (err) {
      const message =
        err.errors?.[0]?.message ||
        "Error al iniciar sesión. Revisa tus datos.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-2xl rounded-3xl px-16 py-10 w-[720px] max-w-full">
        {/* Logo + texto */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/fasten-logo.png"
            alt="FASTEN"
            className="h-32 w-auto mb-4"
          />
          <p className="text-sm text-slate-700 text-center">
            ¡Bienvenido al portal de gestión de tu hogar!
          </p>
        </div>

        {/* Formulario propio */}
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto">
          {/* Usuario */}
          <div className="space-y-1">
            <label
              className="text-sm font-semibold text-black"
              htmlFor="identifier"
            >
              Usuario
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              value={form.identifier}
              onChange={handleChange}
              placeholder="Ingresa tu usuario"
              className="w-full h-11 rounded-md border border-slate-300 shadow-[0_3px_5px_rgba(0,0,0,0.15)] px-3 text-sm text-black placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              required
            />
          </div>

          {/* Contraseña con ojito */}
          <div className="space-y-1">
            <label
              className="text-sm font-semibold text-black"
              htmlFor="password"
            >
              Contraseña
            </label>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"} // 👈 cambia según el estado
                value={form.password}
                onChange={handleChange}
                placeholder="Ingresa tu contraseña"
                className="w-full h-11 rounded-md border border-slate-300 shadow-[0_3px_5px_rgba(0,0,0,0.15)] px-3 pr-10 text-sm text-black placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                required
              />

              {/* Botón del ojo */}
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-700"
              >
                {showPassword ? <EyeClosed/> : <Eye/> }
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!isLoaded || isSubmitting}
            className="mt-2 w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white text-base font-medium h-11 rounded-md shadow-[0_4px_10px_rgba(0,0,0,0.25)] transition-all"
          >
            {isSubmitting ? "Ingresando..." : "Ingresar"}
          </button>

          <p className="mt-4 text-center text-sm text-slate-600 cursor-pointer hover:underline">
            ¿Olvidaste la contraseña?
          </p>
        </form>
      </div>
    </div>
  );
}
