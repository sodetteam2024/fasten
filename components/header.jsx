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
import ThemeSwitch from "@/components/ThemeSwitch";


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

  const esAdmin = rolId === 1 || rolId === 2;
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


  const navItemClass = (href) =>
    `flex items-center gap-2 transition ${
      pathname === href
        ? "text-purple-700 dark:text-purple-300"
        : "text-slate-700 hover:text-purple-700 dark:text-white/80 dark:hover:text-white"
    }`;
	
  return (
    <header className="w-full sticky top-0 z-50 border-b border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/70 backdrop-blur-md shadow-sm">
      <nav className="container mx-auto flex items-center justify-between py-3 px-4">
        {/* LOGO */}
        <div className="flex items-center gap-2">
          <Link href="/inicio" className="flex items-center">
            <div className="rounded-lg bg-white/90 dark:bg-white/10 p-2 ring-1 ring-black/5 dark:ring-white/10">
              <img
                src="/fasten-logo.png"
                alt="Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
				  
          </Link>
        </div>
{/* MENÚ */}
        <ul className="hidden md:flex items-center gap-7 font-medium">
          {canPagos && (
            <li className={navItemClass("/pagos")}>
              <CreditCard className="h-4 w-4" />
              <Link href="/pagos">Pagos</Link>
            </li>
          )}

          {canPqr && (
            <li className={navItemClass("/solicitudes")}>
              <ClipboardList className="h-4 w-4" />
              <Link href="/solicitudes">Solicitudes/Quejas</Link>
            </li>
          )}

          {canReservas && (
            <li className={navItemClass("/reservas")}>
              <CalendarDays className="h-4 w-4" />
              <Link href="/reservas">Reservas</Link>
            </li>
          )}

          {canVisitas && (
            <li className={navItemClass("/visitas")}>
              <Users className="h-4 w-4" />
              <Link href="/visitas">Visitas</Link>
            </li>
          )}

          {canAdminModule && (
            <li className={navItemClass("/administrativo")}>
              <UserCog className="h-4 w-4" />
              <Link href="/administrativo">Administrativo</Link>
            </li>
          )}
        </ul>

        {/* DERECHA: Switch + Perfil */}
        <div className="flex items-center gap-4">
          <ThemeSwitch />

          {/* Si quieres mantener el panel lateral, deja esto como ícono simple */}
          <button
            onClick={() => setMenuOpen(true)}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-black/5 dark:text-white/90 dark:hover:bg-white/10 transition"
            aria-label="Abrir perfil"
          >
										
            {nombreParaHeader}
          </button>

        </div>
      </nav>

      {/* PANEL DERECHO (tu mismo panel, sin cambios de lógica) */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />

          <div className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-zinc-950 shadow-2xl p-6 overflow-y-auto z-[9999] border-l border-black/10 dark:border-white/10">
            <h2 className="text-xl font-bold text-purple-700 dark:text-purple-300 mb-4">
              Perfil de Usuario
            </h2>

									   
            <div className="flex flex-col items-center mb-6">
              <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white">
                <span className="text-xl font-bold">{(nombreParaHeader || "U").slice(0, 1)}</span>
              </div>

              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                {nombreParaHeader}
              </p>

              {etiquetaRol && (
                <p className="text-xs text-gray-500 dark:text-white/60 -mt-1">
                  {etiquetaRol}
                </p>
              )}
            </div>
					
            <div className="space-y-3 text-sm text-slate-700 dark:text-white/80">
				 
              <p><span className="font-semibold">Email: </span>{perfil?.correo || "No disponible"}</p>
												   
				  

				 
              <p><span className="font-semibold">Teléfono: </span>{perfil?.telefono || "No disponible"}</p>
													 
				  

				 
              <p><span className="font-semibold">Tipo documento: </span>{tipoDocumento?.nombre || "No disponible"}</p>
														  
				  

				 
              <p><span className="font-semibold">Documento: </span>{perfil?.nro_documento || "No disponible"}</p>
														  
				  

              {!esAdmin && (
				   
                <p><span className="font-semibold">Dirección: </span>{direccionTexto}</p>
								  
					
              )}

				 
              <p><span className="font-semibold">Unidad: </span>{unidad?.nombre_unidad || "No disponible"}</p>
														  
				  
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
