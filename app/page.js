// app/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { Eye, EyeClosed } from "lucide-react";

export default function Inicio() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();

  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isSignedIn) router.replace("/inicio");
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
        setError("Se requiere un paso extra de verificación.");
      }
    } catch (err) {
      const message =
        err?.errors?.[0]?.message ||
        "Error al iniciar sesión. Revisa tus datos.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="
        min-h-screen w-full
        flex items-center justify-center
        px-4 py-10
        bg-[url('/bg-light.jpg.png')]
        dark:bg-[url('/bg-dark.jpg.png')]
        bg-cover bg-center bg-no-repeat
      "
    >
      {/* Overlay para legibilidad (light/dark) */}
      <div className="fixed inset-0 bg-white/70 dark:bg-black/55" />

      {/* Card */}
      <div className="relative w-full max-w-xl">
        <div
          className="
            rounded-3xl
            bg-white/90 dark:bg-zinc-950/75
            backdrop-blur-xl
            shadow-2xl
            border border-black/5 dark:border-white/10
            px-6 sm:px-10
            py-10
          "
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img
              src="/fasten-logo.png"
              alt="FASTEN"
              className="h-20 sm:h-24 w-auto mb-4 drop-shadow-sm"
            />
            <p className="text-sm text-slate-700 dark:text-zinc-200 text-center">
              ¡Bienvenido al portal de gestión de tu hogar!
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Usuario */}
            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-slate-900 dark:text-zinc-100"
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
                autoComplete="username"
                className="
                  w-full h-11
                  rounded-xl
                  border border-slate-200 dark:border-white/10
                  bg-white/80 dark:bg-white/5
                  px-4
                  text-sm text-slate-900 dark:text-zinc-100
                  placeholder:text-slate-400 dark:placeholder:text-zinc-400
                  outline-none
                  focus:ring-2 focus:ring-purple-500/70
                  focus:border-purple-500/60
                  transition
                "
                required
              />
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-slate-900 dark:text-zinc-100"
                htmlFor="password"
              >
                Contraseña
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  className="
                    w-full h-11
                    rounded-xl
                    border border-slate-200 dark:border-white/10
                    bg-white/80 dark:bg-white/5
                    px-4 pr-12
                    text-sm text-slate-900 dark:text-zinc-100
                    placeholder:text-slate-400 dark:placeholder:text-zinc-400
                    outline-none
                    focus:ring-2 focus:ring-purple-500/70
                    focus:border-purple-500/60
                    transition
                  "
                  required
                />

                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="
                    absolute inset-y-0 right-0
                    flex items-center justify-center
                    w-12
                    text-slate-500 dark:text-zinc-300
                    hover:text-slate-700 dark:hover:text-white
                    transition
                  "
                >
                  {showPassword ? <EyeClosed className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!isLoaded || isSubmitting}
              className="
                w-full h-11
                rounded-xl
                bg-purple-600 hover:bg-purple-700
                disabled:bg-purple-400 disabled:cursor-not-allowed
                text-white text-base font-semibold
                shadow-lg shadow-purple-600/20
                transition
              "
            >
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </button>

            <button
              type="button"
              className="w-full text-center text-sm text-slate-600 dark:text-zinc-300 hover:underline"
              onClick={() => alert("Aquí luego conectamos recuperación de contraseña.")}
            >
              ¿Olvidaste la contraseña?
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
