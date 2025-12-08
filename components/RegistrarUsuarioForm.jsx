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

  // Cargar catálogos y roles
  useEffect(() => {
    (async () => {
      try {
        // catálogos
        const { data, error } = await supabase.rpc("get_catalogos");
        if (error) {
          console.error("❌ Error cargando catálogos:", error);
        } else {
          setUnidades(data?.unidades ?? []);
          setDocumentos(data?.documentos ?? []);
          setTiposVivienda(data?.tiposVivienda ?? []);
          setDirecciones(data?.direcciones ?? []);
        }

        // roles
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

  // Manejadores
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTipoVivienda = (e) => {
    const value = e.target.value;
    setTipoVivienda(value);
    // resetear dirección seleccionada al cambiar tipo
    setFormData((prev) => ({
      ...prev,
      id_direccion: "",
    }));
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
          // Si tipo de dirección es 3, siempre enviamos id_direccion = 3
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

      // callback opcional para que el panel haga algo (refrescar tabla, cerrar modal, etc.)
      if (onSuccess) onSuccess(data);
    } catch (error) {
      console.error("❌ Error enviando formulario:", error);
      alert("Ocurrió un error inesperado al crear el usuario.");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar direcciones según tipo de vivienda seleccionado (para tipo 1 y 2)
  const direccionesFiltradas = direcciones.filter(
    (d) => d.id_tipodireccion?.toString() === tipoVivienda
  );

  return (
    <div className="bg-white shadow-lg rounded-2xl w-full p-6 sm:p-8">
      <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-6">
        Crear nuevo usuario
      </h1>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 sm:grid-cols-2 gap-5"
      >
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Nombre
          </label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg shadow-sm p-2.5"
            placeholder="Juan"
            required
          />
        </div>

        {/* Apellido */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Apellido
          </label>
          <input
            type="text"
            name="apellido"
            value={formData.apellido}
            onChange={handleChange}
            className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg shadow-sm p-2.5"
            placeholder="Pérez"
            required
          />
        </div>

        {/* Correo */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Correo electrónico
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg shadow-sm p-2.5"
            placeholder="usuario@empresa.com"
            required
          />
        </div>

        {/* Nombre usuario */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Nombre de usuario
          </label>
          <input
            type="text"
            name="nombre_usuario"
            value={formData.nombre_usuario}
            onChange={handleChange}
            className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg shadow-sm p-2.5"
            placeholder="Ej. juan_perez"
            required
          />
        </div>

        {/* Contraseña */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Contraseña
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg shadow-sm p-2.5"
            placeholder="Contraseña temporal"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Teléfono
          </label>
          <input
            type="text"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg shadow-sm p-2.5"
            placeholder="+57 300 000 0000"
          />
        </div>

        {/* Tipo de documento */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Tipo de documento
          </label>
          <select
            name="id_tipo_documento"
            value={formData.id_tipo_documento}
            onChange={handleChange}
            className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg shadow-sm p-2.5"
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
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Número de documento
          </label>
          <input
            type="text"
            name="nro_documento"
            value={formData.nro_documento}
            onChange={handleChange}
            className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg shadow-sm p-2.5"
            placeholder="Ej. 123456789"
            required
          />
        </div>

        {/* Unidad */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Unidad
          </label>
          <select
            name="id_unidad"
            value={formData.id_unidad}
            onChange={handleChange}
            className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg shadow-sm p-2.5"
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
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Rol
          </label>
          <select
            name="idrol"
            value={formData.idrol}
            onChange={handleChange}
            className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg shadow-sm p-2.5"
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
        <div className="col-span-2 border-t pt-5">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Dirección
          </h2>

          <label className="block text-sm font-medium text-gray-600 mb-1">
            Tipo de vivienda
          </label>
          <select
            value={tipoVivienda}
            onChange={handleTipoVivienda}
            className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg shadow-sm p-2.5 mb-4"
          >
            <option value="">Seleccione tipo de dirección</option>
            {tiposVivienda.map((tv) => (
              <option key={tv.id_tipodireccion} value={tv.id_tipodireccion}>
                {tv.descripcion}
              </option>
            ))}
          </select>

          {/* Solo mostrar select de dirección si tipoVivienda NO es 3 */}
          {tipoVivienda && tipoVivienda !== "3" && (
            <>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Dirección
              </label>
              <select
                name="id_direccion"
                value={formData.id_direccion}
                onChange={handleChange}
                className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg shadow-sm p-2.5"
                required
              >
                <option value="">Seleccione una dirección</option>
                {direccionesFiltradas.map((d) => (
                  <option key={d.id_direccion} value={d.id_direccion}>
                    {`${d.tipodirecciones.descripcion} ${d.grupo} ${d.tipodirecciones.nombre_grupo} ${d.complemento}`}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="col-span-2 mt-6 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear usuario"}
          </button>
        </div>
      </form>
    </div>
  );
}

