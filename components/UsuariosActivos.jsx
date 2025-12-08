"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Pencil, Ban, Download } from "lucide-react";

export default function UsuariosActivos() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // FORM STATE DEL MODAL
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    telefono: "",
    usuario: "",
    rol: "",
    unidad: "",
    nro_documento: "",
  });

  // Cargar usuarios
  useEffect(() => {
    const fetchUsuarios = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("perfilesusuarios")
        .select(`
          id_perfil,
          nombre,
          apellido,
          correo,
          telefono,
          nro_documento,
          unidades (nombre_unidad),
          usuarios (
            id_usuario,
            nombre_usuario,
            email,
            roles (nombre_rol)
          )
        `);

      if (!error) {
        setUsuarios(
          data.map((u) => ({
            id_perfil: u.id_perfil,
            nombre: u.nombre,
            apellido: u.apellido,
            telefono: u.telefono,
            correo: u.correo || u.usuarios?.email,
            usuario: u.usuarios?.nombre_usuario,
            rol: u.usuarios?.roles?.nombre_rol,
            unidad: u.unidades?.nombre_unidad,
            nro_documento: u.nro_documento,
          }))
        );
      }

      setLoading(false);
    };

    fetchUsuarios();
  }, []);

  // Abrir modal
  const openModal = (u) => {
    setEditingUser(u);
    setFormData(u);
    setModalOpen(true);
  };

  // Cerrar modal
  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  // Cambiar valores del formulario
  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Exportar CSV
  const exportCsv = () => {
    const headers = [
      "Nombre",
      "Apellido",
      "Usuario",
      "Correo",
      "Rol",
      "Unidad",
      "Telefono",
      "Documento",
    ];

    const rows = usuarios.map((u) => [
      u.nombre,
      u.apellido,
      u.usuario,
      u.correo,
      u.rol,
      u.unidad,
      u.telefono,
      u.nro_documento,
    ]);

    const csv = 
      headers.join(",") +
      "\n" +
      rows.map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "usuarios_activos.csv";
    link.click();
  };

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-300 p-6">

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Usuarios activos</h2>

        <button
          className="flex items-center gap-2 px-3 py-2 text-xs border rounded-lg hover:bg-gray-100"
          onClick={exportCsv}
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      {/* Tabla con scroll */}
      <div className="rounded-lg border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[450px]">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Usuario</th>
                <th className="px-4 py-2 text-left">Correo</th>
                <th className="px-4 py-2 text-left">Rol</th>
                <th className="px-4 py-2 text-left">Unidad</th>
                <th className="px-4 py-2 text-left">Teléfono</th>
                <th className="px-4 py-2 text-left">Documento</th>
                <th className="px-4 py-2 text-left">Opciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan="8" className="px-4 py-6 text-center">
                    Cargando usuarios...
                  </td>
                </tr>
              )}

              {!loading &&
                usuarios.map((u) => (
                  <tr key={u.id_perfil}>
                    <td className="px-4 py-2">{u.nombre} {u.apellido}</td>
                    <td className="px-4 py-2">{u.usuario}</td>
                    <td className="px-4 py-2">{u.correo}</td>
                    <td className="px-4 py-2">{u.rol}</td>
                    <td className="px-4 py-2">{u.unidad}</td>
                    <td className="px-4 py-2">{u.telefono}</td>
                    <td className="px-4 py-2">{u.nro_documento}</td>

                    <td className="px-4 py-2">
                      <div className="flex gap-2">

                        <button
                          onClick={() => openModal(u)}
                          className="flex items-center gap-1 text-xs px-2 py-1 border rounded-lg hover:bg-gray-100"
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
                        </button>

                        <button
                          className="flex items-center gap-1 text-xs px-2 py-1 border border-red-300 text-red-600 rounded-lg hover:bg-red-100"
                        >
                          <Ban className="h-3 w-3" />
                          Banear
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">

            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">Editar usuario</h3>
              <button onClick={closeModal} className="text-gray-500">✕</button>
            </div>

            <form className="space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600">Nombre</label>
                  <input className="w-full border rounded-lg px-2 py-1"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600">Apellido</label>
                  <input className="w-full border rounded-lg px-2 py-1"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600">Correo</label>
                  <input className="w-full border rounded-lg px-2 py-1"
                    name="correo"
                    value={formData.correo}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600">Teléfono</label>
                  <input className="w-full border rounded-lg px-2 py-1"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600">Usuario</label>
                  <input className="w-full border rounded-lg px-2 py-1"
                    name="usuario"
                    value={formData.usuario}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600">Documento</label>
                  <input className="w-full border rounded-lg px-2 py-1"
                    name="nro_documento"
                    value={formData.nro_documento}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600">Rol</label>
                  <input className="w-full border rounded-lg px-2 py-1"
                    name="rol"
                    value={formData.rol}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600">Unidad</label>
                  <input className="w-full border rounded-lg px-2 py-1"
                    name="unidad"
                    value={formData.unidad}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={closeModal}
                  type="button"
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-sm bg-purple-600 text-white"
                >
                  Guardar (pendiente BD)
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";
import { Pencil, Ban, Download, Trash2 } from "lucide-react";

export default function UsuariosActivos() {
  const { user, isLoaded } = useUser();

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const [roles, setRoles] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [direcciones, setDirecciones] = useState([]);
  const [tiposDocumento, setTiposDocumento] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    telefono: "",
    usuario: "",
    idrol: "",
    id_unidad: "",
    id_direccion: "",
    id_tipo_documento: "",
    nro_documento: "",
  });

  // 1) Detectar si el usuario actual es SUPERADMIN
  useEffect(() => {
    if (!isLoaded || !user) return;

    const checkRole = async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("idrol, roles ( nombre_rol )")
        .eq("clerk_id", user.id)
        .single()
        .catch(() => ({ data: null, error: true }));

      if (!error && data?.roles?.nombre_rol) {
        const nombreRol = data.roles.nombre_rol.toLowerCase();
        // Ajusta aquí el nombre exacto si en tu BD es distinto
        if (nombreRol.includes("super")) {
          setIsSuperAdmin(true);
        }
      }
    };

    checkRole();
  }, [isLoaded, user]);

  // 2) Cargar usuarios + catálogos (roles, unidades, direcciones, tipos documento)
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      try {
        const [
          usuariosRes,
          rolesRes,
          unidadesRes,
          direccionesRes,
          tiposDocRes,
        ] = await Promise.all([
          supabase
            .from("perfilesusuarios")
            .select(`
              id_perfil,
              nombre,
              apellido,
              correo,
              telefono,
              nro_documento,
              tipo_documento,
              id_unidad,
              id_direccion,
              tiposdocumentos (
                id_tipodocumento,
                nombre
              ),
              unidades (
                id_unidad,
                nombre_unidad
              ),
              direcciones (
                id_direccion,
                grupo,
                complemento,
                tipodirecciones (
                  descripcion,
                  nombre_grupo
                )
              ),
              usuarios (
                id_usuario,
                nombre_usuario,
                email,
                idrol,
                roles (
                  idrol,
                  nombre_rol
                )
              )
            `)
            .order("id_perfil", { ascending: true }),

          supabase.from("roles").select("idrol, nombre_rol").order("nombre_rol"),
          supabase
            .from("unidades")
            .select("id_unidad, nombre_unidad")
            .order("nombre_unidad"),
          supabase
            .from("direcciones")
            .select(`
              id_direccion,
              grupo,
              complemento,
              tipodirecciones (
                descripcion,
                nombre_grupo
              )
            `),
          supabase
            .from("tiposdocumentos")
            .select("id_tipodocumento, nombre")
            .order("id_tipodocumento"),
        ]);

        if (usuariosRes.error) {
          console.error("❌ Error cargando usuarios:", usuariosRes.error);
        } else {
          const mapped = (usuariosRes.data || []).map((row) => {
            const tipoDocNombre = row.tiposdocumentos?.nombre ?? "";
            const direccionLabel = row.direcciones
              ? `${row.direcciones.tipodirecciones.descripcion} ${row.direcciones.grupo} ${row.direcciones.tipodirecciones.nombre_grupo} ${row.direcciones.complemento}`
              : "";

            return {
              id_perfil: row.id_perfil,
              id_usuario: row.usuarios?.id_usuario,
              nombre: row.nombre ?? "",
              apellido: row.apellido ?? "",
              telefono: row.telefono ?? "",
              correo: row.correo ?? row.usuarios?.email ?? "",
              usuario: row.usuarios?.nombre_usuario ?? "",
              idrol: row.usuarios?.idrol ?? null,
              rol: row.usuarios?.roles?.nombre_rol ?? "",
              id_unidad: row.id_unidad ?? null,
              unidad: row.unidades?.nombre_unidad ?? "",
              id_direccion: row.id_direccion ?? null,
              direccion: direccionLabel,
              id_tipo_documento: row.tipo_documento ?? row.tiposdocumentos?.id_tipodocumento ?? null,
              tipo_documento_nombre: tipoDocNombre,
              nro_documento: row.nro_documento ?? "",
            };
          });

          setUsuarios(mapped);
        }

        if (!rolesRes.error) setRoles(rolesRes.data || []);
        if (!unidadesRes.error) setUnidades(unidadesRes.data || []);

        if (!direccionesRes.error) {
          const dList =
            direccionesRes.data?.map((d) => ({
              id_direccion: d.id_direccion,
              label: `${d.tipodirecciones.descripcion} ${d.grupo} ${d.tipodirecciones.nombre_grupo} ${d.complemento}`,
            })) || [];
          setDirecciones(dList);
        }

        if (!tiposDocRes.error) setTiposDocumento(tiposDocRes.data || []);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  // 3) Abrir modal de edición
  const openModal = (u) => {
    setEditingUser(u);
    setFormData({
      nombre: u.nombre,
      apellido: u.apellido,
      correo: u.correo,
      telefono: u.telefono,
      usuario: u.usuario,
      idrol: u.idrol ?? "",
      id_unidad: u.id_unidad ?? "",
      id_direccion: u.id_direccion ?? "",
      id_tipo_documento: u.id_tipo_documento ?? "",
      nro_documento: u.nro_documento,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 4) Guardar cambios (UPDATE en Supabase)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);

    try {
      // Update en perfilesusuarios
      const { error: perfilError } = await supabase
        .from("perfilesusuarios")
        .update({
          nombre: formData.nombre,
          apellido: formData.apellido,
          telefono: formData.telefono,
          correo: formData.correo,
          nro_documento: formData.nro_documento,
          tipo_documento: formData.id_tipo_documento,
          id_unidad: formData.id_unidad,
          id_direccion: formData.id_direccion,
        })
        .eq("id_perfil", editingUser.id_perfil);

      if (perfilError) {
        console.error("❌ Error actualizando perfil:", perfilError);
        alert("Error actualizando datos del perfil.");
        return;
      }

      // Update en usuarios
      if (editingUser.id_usuario) {
        const { error: usuarioError } = await supabase
          .from("usuarios")
          .update({
            nombre_usuario: formData.usuario,
            email: formData.correo,
            idrol: formData.idrol,
          })
          .eq("id_usuario", editingUser.id_usuario);

        if (usuarioError) {
          console.error("❌ Error actualizando usuario:", usuarioError);
          alert("Error actualizando datos del usuario.");
          return;
        }
      }

      // Actualizar estado local
      setUsuarios((prev) =>
        prev.map((u) => {
          if (u.id_perfil !== editingUser.id_perfil) return u;

          const rolObj = roles.find((r) => r.idrol === Number(formData.idrol));
          const unidadObj = unidades.find(
            (un) => un.id_unidad === Number(formData.id_unidad)
          );
          const tipoDocObj = tiposDocumento.find(
            (t) => t.id_tipodocumento === Number(formData.id_tipo_documento)
          );
          const direccionObj = direcciones.find(
            (d) => d.id_direccion === Number(formData.id_direccion)
          );

          return {
            ...u,
            nombre: formData.nombre,
            apellido: formData.apellido,
            telefono: formData.telefono,
            correo: formData.correo,
            usuario: formData.usuario,
            idrol: formData.idrol,
            rol: rolObj?.nombre_rol ?? u.rol,
            id_unidad: formData.id_unidad,
            unidad: unidadObj?.nombre_unidad ?? u.unidad,
            id_tipo_documento: formData.id_tipo_documento,
            tipo_documento_nombre: tipoDocObj?.nombre ?? u.tipo_documento_nombre,
            nro_documento: formData.nro_documento,
            id_direccion: formData.id_direccion,
            direccion: direccionObj?.label ?? u.direccion,
          };
        })
      );

      closeModal();
    } finally {
      setSaving(false);
    }
  };

  // 5) Eliminar usuario (solo superadmin)
  const handleDelete = async (u) => {
    if (
      !window.confirm(
        "¿Seguro que deseas eliminar este usuario? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    // Borrar perfil
    const { error: perfilError } = await supabase
      .from("perfilesusuarios")
      .delete()
      .eq("id_perfil", u.id_perfil);

    if (perfilError) {
      console.error("❌ Error eliminando perfil:", perfilError);
      alert("Error eliminando el perfil del usuario.");
      return;
    }

    // Borrar usuario base (si existe id_usuario)
    if (u.id_usuario) {
      const { error: usuarioError } = await supabase
        .from("usuarios")
        .delete()
        .eq("id_usuario", u.id_usuario);

      if (usuarioError) {
        console.error("⚠ Error eliminando usuario base:", usuarioError);
        // No rompemos, porque el perfil ya se borró
      }
    }

    setUsuarios((prev) => prev.filter((x) => x.id_perfil !== u.id_perfil));
  };

  // 6) Exportar CSV
  const exportCsv = () => {
    if (!usuarios.length) return;

    const headers = [
      "Nombre",
      "Apellido",
      "Usuario",
      "Correo",
      "Rol",
      "Unidad",
      "Direccion",
      "Telefono",
      "Documento",
    ];

    const rows = usuarios.map((u) => [
      u.nombre,
      u.apellido,
      u.usuario,
      u.correo,
      u.rol,
      u.unidad,
      u.direccion,
      u.telefono,
      `${u.tipo_documento_nombre}: ${u.nro_documento}`,
    ]);

    const csv =
      headers.join(",") +
      "\n" +
      rows
        .map((r) =>
          r
            .map((value) =>
              `"${(value ?? "").toString().replace(/"/g, '""')}"`
            )
            .join(",")
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "usuarios_activos.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-300 p-6">
      {/* Header sección */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Usuarios activos</h2>

        <button
          className="flex items-center gap-2 px-3 py-2 text-xs border rounded-lg hover:bg-gray-100"
          onClick={exportCsv}
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[450px]">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Usuario</th>
                <th className="px-4 py-2 text-left">Correo</th>
                <th className="px-4 py-2 text-left">Rol</th>
                <th className="px-4 py-2 text-left">Unidad</th>
                <th className="px-4 py-2 text-left">Dirección</th>
                <th className="px-4 py-2 text-left">Teléfono</th>
                <th className="px-4 py-2 text-left">Documento</th>
                <th className="px-4 py-2 text-left w-px"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center">
                    Cargando usuarios...
                  </td>
                </tr>
              )}

              {!loading &&
                usuarios.map((u) => (
                  <tr key={u.id_perfil}>
                    <td className="px-4 py-2">
                      {u.nombre} {u.apellido}
                    </td>
                    <td className="px-4 py-2">{u.usuario}</td>
                    <td className="px-4 py-2">{u.correo}</td>
                    <td className="px-4 py-2">{u.rol}</td>
                    <td className="px-4 py-2">{u.unidad}</td>
                    <td className="px-4 py-2">{u.direccion}</td>
                    <td className="px-4 py-2">{u.telefono}</td>
                    <td className="px-4 py-2">
                      {u.tipo_documento_nombre && u.nro_documento
                        ? `${u.tipo_documento_nombre}: ${u.nro_documento}`
                        : u.nro_documento}
                    </td>
                    <td className="px-4 py-2">
                      {isSuperAdmin && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal(u)}
                            className="flex items-center gap-1 text-xs px-2 py-1 border rounded-lg hover:bg-gray-100"
                          >
                            <Pencil className="h-3 w-3" />
                            Editar
                          </button>

                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs px-2 py-1 border border-red-300 text-red-600 rounded-lg hover:bg-red-100"
                          >
                            <Ban className="h-3 w-3" />
                            Banear
                          </button>

                          <button
                            onClick={() => handleDelete(u)}
                            className="flex items-center gap-1 text-xs px-2 py-1 border border-red-400 text-red-700 rounded-lg hover:bg-red-100"
                          >
                            <Trash2 className="h-3 w-3" />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

              {!loading && usuarios.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-gray-500">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDICIÓN */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">Editar usuario</h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSave}>
              {/* Nombre y Apellido */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600">Nombre</label>
                  <input
                    className="w-full border rounded-lg px-2 py-1 text-sm"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleFormChange}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Apellido</label>
                  <input
                    className="w-full border rounded-lg px-2 py-1 text-sm"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              {/* Correo y Teléfono */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600">Correo</label>
                  <input
                    className="w-full border rounded-lg px-2 py-1 text-sm"
                    name="correo"
                    type="email"
                    value={formData.correo}
                    onChange={handleFormChange}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Teléfono</label>
                  <input
                    className="w-full border rounded-lg px-2 py-1 text-sm"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              {/* Usuario y Unidad */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600">Usuario</label>
                  <input
                    className="w-full border rounded-lg px-2 py-1 text-sm"
                    name="usuario"
                    value={formData.usuario}
                    onChange={handleFormChange}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Unidad</label>
                  <select
                    name="id_unidad"
                    value={formData.id_unidad || ""}
                    onChange={handleFormChange}
                    className="w-full border rounded-lg px-2 py-1 text-sm bg-white"
                  >
                    <option value="">Seleccione unidad</option>
                    {unidades.map((u) => (
                      <option key={u.id_unidad} value={u.id_unidad}>
                        {u.nombre_unidad}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rol y Dirección */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600">Rol</label>
                  <select
                    name="idrol"
                    value={formData.idrol || ""}
                    onChange={handleFormChange}
                    className="w-full border rounded-lg px-2 py-1 text-sm bg-white"
                  >
                    <option value="">Seleccione rol</option>
                    {roles.map((r) => (
                      <option key={r.idrol} value={r.idrol}>
                        {r.nombre_rol}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Dirección</label>
                  <select
                    name="id_direccion"
                    value={formData.id_direccion || ""}
                    onChange={handleFormChange}
                    className="w-full border rounded-lg px-2 py-1 text-sm bg-white"
                  >
                    <option value="">Seleccione dirección</option>
                    {direcciones.map((d) => (
                      <option key={d.id_direccion} value={d.id_direccion}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tipo doc y número */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600">
                    Tipo de documento
                  </label>
                  <select
                    name="id_tipo_documento"
                    value={formData.id_tipo_documento || ""}
                    onChange={handleFormChange}
                    className="w-full border rounded-lg px-2 py-1 text-sm bg-white"
                  >
                    <option value="">Seleccione tipo</option>
                    {tiposDocumento.map((t) => (
                      <option
                        key={t.id_tipodocumento}
                        value={t.id_tipodocumento}
                      >
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">
                    Número de documento
                  </label>
                  <input
                    className="w-full border rounded-lg px-2 py-1 text-sm"
                    name="nro_documento"
                    value={formData.nro_documento}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm bg-purple-600 text-white disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
