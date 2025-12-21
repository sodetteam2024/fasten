"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RegistrarUsuarioForm({ onSuccess }) {
  const [unidades, setUnidades] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [tiposVivienda, setTiposVivienda] = useState([]);
  const [direcciones, setDirecciones] = useState([]);
  const [roles, setRoles] = useState([]);

  const [loading, setLoading] = useState(false);
  const [tipoVivienda, setTipoVivienda] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    nombre: "",
    apellido: "",
    nombre_usuario: "",
    telefono: "",
    id_unidad: "",
    id_tipo_documento: "",
    nro_documento: "",
    id_direccion: "",
    password: "",
    idrol: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_catalogos");
        if (error) {
          console.error("❌ Error cargando catálogos:", error);
        } else {
          setUnidades(data?.unidades ?? []);
          setDocumentos(data?.documentos ?? []);
          setTiposVivienda(data?.tiposVivienda ?? []);
          setDirecciones(data?.direcciones ?? []);
        }

        const { data: rolesData, error: rolesError } = await supabase
          .from("roles")
          .select("*")
          .order("nombre_rol", { ascending: true });

        if (rolesError) {
          console.error("❌ Error cargando roles:", rolesError);
        } else {
          setRoles(rolesData ?? []);
        }
      } catch (err) {
        console.error("❌ Error general cargando datos:", err);
      }
    })();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTipoVivienda = (e) => {
    const value = e.target.value;
    setTipoVivienda(value);
    setFormData((prev) => ({ ...prev, id_direccion: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.idrol) {
      alert("Por favor selecciona un rol para el usuario.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          username: formData.nombre_usuario,
          password: formData.password || "Temporal123*",
          nombre: formData.nombre,
          apellido: formData.apellido,
          telefono: formData.telefono,
          id_unidad: formData.id_unidad,
          id_direccion: tipoVivienda === "3" ? 3 : formData.id_direccion,
          tipo_documento: formData.id_tipo_documento,
          nro_documento: formData.nro_documento,
          idrol: formData.idrol,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`❌ Error creando usuario: ${data.error}`);
        console.error("Detalles:", data.details);
        return;
      }

      alert(`✅ Usuario creado correctamente. Clerk ID: ${data.clerk_id}`);

      setFormData({
        email: "",
        nombre: "",
        apellido: "",
        nombre_usuario: "",
        telefono: "",
        id_unidad: "",
        id_tipo_documento: "",
        nro_documento: "",
        id_direccion: "",
        password: "",
        idrol: "",
      });
      setTipoVivienda("");

      if (onSuccess) onSuccess(data);
    } catch (error) {
      console.error("❌ Error enviando formulario:", error);
      alert("Ocurrió un error inesperado al crear el usuario.");
    } finally {
      setLoading(false);
    }
  };

  const direccionesFiltradas = direcciones.filter(
    (d) => d.id_tipodireccion?.toString() === tipoVivienda
  );

  const labelBase =
    "block text-[11px] font-medium text-muted-foreground mb-1";
  const inputBase =
    "w-full rounded-lg px-3 py-2 text-sm bg-white/70 dark:bg-white/5 border border-white/10 outline-none " +
    "focus:ring-2 focus:ring-purple-400/40 placeholder:text-muted-foreground/70";
  const selectBase =
    "w-full rounded-lg px-3 py-2 text-sm bg-white/70 dark:bg-white/5 border border-white/10 outline-none " +
    "focus:ring-2 focus:ring-purple-400/40";

  return (
    <div
      className="
        w-full p-6 sm:p-8
        rounded-2xl
        border border-white/10
        bg-white/80 dark:bg-black/60
        backdrop-blur-xl
        text-foreground
        shadow-[0_20px_60px_rgba(0,0,0,0.35)]
      "
    >
      <h2 className="text-base sm:text-lg font-semibold mb-6">
        Crear nuevo usuario
      </h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nombre */}
        <div>
          <label className={labelBase}>Nombre</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className={inputBase}
            placeholder="Juan"
            required
          />
        </div>

        {/* Apellido */}
        <div>
          <label className={labelBase}>Apellido</label>
          <input
            type="text"
            name="apellido"
            value={formData.apellido}
            onChange={handleChange}
            className={inputBase}
            placeholder="Pérez"
            required
          />
        </div>

        {/* Correo */}
        <div className="sm:col-span-2">
          <label className={labelBase}>Correo electrónico</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={inputBase}
            placeholder="usuario@empresa.com"
            required
          />
        </div>

        {/* Nombre usuario */}
        <div>
          <label className={labelBase}>Nombre de usuario</label>
          <input
            type="text"
            name="nombre_usuario"
            value={formData.nombre_usuario}
            onChange={handleChange}
            className={inputBase}
            placeholder="Ej. juan_perez"
            required
          />
        </div>

        {/* Contraseña */}
        <div>
          <label className={labelBase}>Contraseña</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={inputBase}
            placeholder="Contraseña temporal (opcional)"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className={labelBase}>Teléfono</label>
          <input
            type="text"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            className={inputBase}
            placeholder="+57 300 000 0000"
          />
        </div>

        {/* Tipo de documento */}
        <div>
          <label className={labelBase}>Tipo de documento</label>
          <select
            name="id_tipo_documento"
            value={formData.id_tipo_documento}
            onChange={handleChange}
            className={selectBase}
            required
          >
            <option value="">Seleccione un tipo</option>
            {documentos.map((doc) => (
              <option key={doc.id_tipodocumento} value={doc.id_tipodocumento}>
                {doc.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Número de documento */}
        <div>
          <label className={labelBase}>Número de documento</label>
          <input
            type="text"
            name="nro_documento"
            value={formData.nro_documento}
            onChange={handleChange}
            className={inputBase}
            placeholder="Ej. 123456789"
            required
          />
        </div>

        {/* Unidad */}
        <div>
          <label className={labelBase}>Unidad</label>
          <select
            name="id_unidad"
            value={formData.id_unidad}
            onChange={handleChange}
            className={selectBase}
          >
            <option value="">Seleccione una unidad</option>
            {unidades.map((u) => (
              <option key={u.id_unidad} value={u.id_unidad}>
                {u.nombre_unidad}
              </option>
            ))}
          </select>
        </div>

        {/* Rol */}
        <div>
          <label className={labelBase}>Rol</label>
          <select
            name="idrol"
            value={formData.idrol}
            onChange={handleChange}
            className={selectBase}
            required
          >
            <option value="">Seleccione un rol</option>
            {roles.map((rol) => (
              <option key={rol.idrol} value={rol.idrol}>
                {rol.nombre_rol}
              </option>
            ))}
          </select>
        </div>

        {/* Dirección */}
        <div className="sm:col-span-2 border-t border-white/10 pt-5 mt-1">
          <h3 className="text-sm font-semibold mb-3">Dirección</h3>

          <label className={labelBase}>Tipo de vivienda</label>
          <select value={tipoVivienda} onChange={handleTipoVivienda} className={selectBase}>
            <option value="">Seleccione tipo de dirección</option>
            {tiposVivienda.map((tv) => (
              <option key={tv.id_tipodireccion} value={tv.id_tipodireccion}>
                {tv.descripcion}
              </option>
            ))}
          </select>

          {tipoVivienda && tipoVivienda !== "3" && (
            <div className="mt-4">
              <label className={labelBase}>Dirección</label>
              <select
                name="id_direccion"
                value={formData.id_direccion}
                onChange={handleChange}
                className={selectBase}
                required
              >
                <option value="">Seleccione una dirección</option>
                {direccionesFiltradas.map((d) => (
                  <option key={d.id_direccion} value={d.id_direccion}>
                    {`${d.tipodirecciones.descripcion} ${d.grupo} ${d.tipodirecciones.nombre_grupo} ${d.complemento}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tipoVivienda === "3" && (
            <p className="mt-3 text-xs text-muted-foreground">
              Para este tipo de vivienda, la dirección se asigna automáticamente.
            </p>
          )}
        </div>

        <div className="sm:col-span-2 mt-6 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="
              rounded-lg px-5 py-2 text-sm font-semibold
              bg-purple-600 hover:bg-purple-700
              text-white
              transition
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {loading ? "Creando..." : "Crear usuario"}
          </button>
        </div>
      </form>
    </div>
  );
}
