"use client";

import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  Users,
  User,
  Settings,
  UserCog,
} from "lucide-react";
import { useState, useEffect } from "react";
import { SignOutButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useUser();
  const pathname = usePathname();

  // PERFIL + DATOS COMPLEMENTARIOS
  const [perfil, setPerfil] = useState(null);
  const [direccion, setDireccion] = useState(null);
  const [tipoDireccion, setTipoDireccion] = useState(null);
  const [unidad, setUnidad] = useState(null);
  const [tipoDocumento, setTipoDocumento] = useState(null);
  const [rol, setRol] = useState(null);

  // BLOQUEAR SCROLL CUANDO EL MENÚ ESTÁ ABIERTO
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  // CARGAR PERFIL
  useEffect(() => {
    if (!user) return;

    async function cargarPerfilCompleto() {
      try {
        // 1️⃣ Buscar usuario por clerk_id
        const { data: usuario, error: errUsuario } = await supabase
          .from("usuarios")
          .select("*")
          .eq("clerk_id", user.id)
          .single();

        if (errUsuario || !usuario) return;

        //  🔹 Cargar rol (usa idrol desde usuarios)
        if (usuario.idrol) {
          const { data: rolData } = await supabase
            .from("roles")
            .select("*")
            .eq("idrol", usuario.idrol)
            .single();

          if (rolData) setRol(rolData);
        }

        // 2️⃣ Perfil
        const { data: perfilData } = await supabase
          .from("perfilesusuarios")
          .select("*")
          .eq("id_usuario", usuario.id_usuario)
          .single();

        setPerfil(perfilData);

        // 3️⃣ Dirección
        if (perfilData?.id_direccion) {
          const { data: dirData } = await supabase
            .from("direcciones")
            .select("*")
            .eq("id_direccion", perfilData.id_direccion)
            .single();

          setDireccion(dirData);

          if (dirData?.id_tipodireccion) {
            const { data: tipoDirData } = await supabase
              .from("tipodirecciones")
              .select("*")
              .eq("id_tipodireccion", dirData.id_tipodireccion)
              .single();

            setTipoDireccion(tipoDirData);
          }
        }

        // 4️⃣ Unidad
        if (perfilData?.id_unidad) {
          const { data: unidadData } = await supabase
            .from("unidades")
            .select("*")
            .eq("id_unidad", perfilData.id_unidad)
            .single();

          setUnidad(unidadData);
        }

        // 5️⃣ Tipo documento
        if (perfilData?.tipo_documento) {
          const { data: tipoDocData } = await supabase
            .from("tiposdocumentos")
            .select("*")
            .eq("id_tipodocumento", perfilData.tipo_documento)
            .single();

          setTipoDocumento(tipoDocData);
        }
      } catch (e) {
        console.error("Error cargando perfil desde Supabase:", e);
      }
    }

    cargarPerfilCompleto();
  }, [user]);

  // OCULTAR HEADER EN LOGIN
  if (pathname === "/") return null;

  // ─────────────────────────────────────
  // 🔐 PERMISOS POR ROL
  // ─────────────────────────────────────
  const rolId = rol?.idrol;

  const canPagos =
    rolId === 1 || rolId === 2 || rolId === 3; // superadmin, admin, residente
  const canPqr =
    rolId === 1 || rolId === 2 || rolId === 3; // superadmin, admin, residente
  const canReservas =
    rolId === 1 || rolId === 2 || rolId === 3 || rolId === 4; // todos menos empleado
  const canVisitas =
    rolId === 1 || rolId === 2 || rolId === 3 || rolId === 4;
  const canAdminModule = rolId === 1 || rolId === 2; // superadmin + admin (registrar usuario)

  const esAdmin = rolId === 2;
  const etiquetaRol = rol?.nombre_rol ? `${rol.nombre_rol}` : "";

  // Construcción de dirección visible
  let direccionTexto = "No disponible";
  if (direccion && tipoDireccion && !esAdmin) {
    direccionTexto = `${tipoDireccion.descripcion} ${direccion.grupo} ${tipoDireccion.nombre_grupo} ${direccion.complemento}`;
  }

  const nombreCompleto =
    (perfil?.nombre || "") + (perfil?.apellido ? ` ${perfil.apellido}` : "");

  const nombreParaHeader =
    nombreCompleto ||
    user?.firstName ||
    user?.username ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "Usuario";

  return (
    <header className="w-full bg-white shadow-md relative z-50">
      <nav className="container flex items-center justify-between py-4">
        {/* LOGO */}
        <div className="flex items-center gap-2 flex-1 pl-6">
          <Link href="/inicio">
            <img
              src="/fasten-logo.png"
              alt="Logo"
              className="h-12 w-auto object-contain cursor-pointer"
            />
          </Link>
        </div>

        {/* MENÚ (según permisos) */}
        <ul className="hidden md:flex items-center gap-6 text-slate-800 font-medium">
          {canPagos && (
            <li className="flex items-center gap-2 hover:text-purple-700 transition">
              <CreditCard className="h-4 w-4" />
              <Link href="/pagos">Pagos</Link>
            </li>
          )}

          {canPqr && (
            <li className="flex items-center gap-2 hover:text-purple-700 transition">
              <ClipboardList className="h-4 w-4" />
              <Link href="/solicitudes">Solicitudes/Quejas</Link>
            </li>
          )}

          {canReservas && (
            <li className="flex items-center gap-2 hover:text-purple-700 transition">
              <CalendarDays className="h-4 w-4" />
              <Link href="/reservas">Reservas</Link>
            </li>
          )}

          {canVisitas && (
            <li className="flex items-center gap-2 hover:text-purple-700 transition">
              <Users className="h-4 w-4" />
              <Link href="/visitas">Visitas</Link>
            </li>
          )}
          {canAdminModule && (
            <li className="flex items-center gap-2 hover:text-purple-700 transition">
              <UserCog className="h-4 w-4" />
              <Link href="/registrarusuario">Administrativo</Link>
            </li>
          )}
        </ul>

        {/* BOTÓN PERFIL + OPCIONES ADMIN */}
        <div className="flex items-center gap-3 flex-1 justify-end pr-6">
          <button
            onClick={() => setMenuOpen(true)}
            className="flex items-center gap-2 text-slate-700 hover:text-purple-700 transition"
          >
            <User className="h-5 w-5" />
            <span className="text-sm font-semibold">{nombreParaHeader}</span>
          </button>

        </div>
      </nav>

      {/* PANEL DERECHO */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />

          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl p-6 overflow-y-auto z-[9999]">
            <h2 className="text-xl font-bold text-purple-700 mb-4">
              Perfil de Usuario
            </h2>

            {/* FOTO + NOMBRE + ROL */}
            <div className="flex flex-col items-center mb-6">
              <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white">
                <User className="h-8 w-8" />
              </div>

              <p className="mt-2 text-lg font-semibold">{nombreParaHeader}</p>

              {etiquetaRol && (
                <p className="text-xs text-gray-500 -mt-1">{etiquetaRol}</p>
              )}
            </div>

            {/* DATOS PERFIL */}
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-semibold">Email: </span>
                {perfil?.correo || "No disponible"}
              </p>

              <p>
                <span className="font-semibold">Teléfono: </span>
                {perfil?.telefono || "No disponible"}
              </p>

              <p>
                <span className="font-semibold">Tipo documento: </span>
                {tipoDocumento?.nombre || "No disponible"}
              </p>

              <p>
                <span className="font-semibold">Documento: </span>
                {perfil?.nro_documento || "No disponible"}
              </p>

              {!esAdmin && (
                <p>
                  <span className="font-semibold">Dirección: </span>
                  {direccionTexto}
                </p>
              )}

              <p>
                <span className="font-semibold">Unidad: </span>
                {unidad?.nombre_unidad || "No disponible"}
              </p>
            </div>

            {/* BOTONES */}
            <div className="mt-6 flex flex-col gap-3">
              <button className="w-full py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition">
                Editar Perfil
              </button>

              <SignOutButton redirectUrl="/">
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-full py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition"
                >
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
