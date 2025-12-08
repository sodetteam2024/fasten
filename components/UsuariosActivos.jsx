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
  const [direcciones, setDirecciones] = useState([]); // {id_direccion, label}
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

  // 1) Verificar si el usuario actual es SUPERADMIN
  useEffect(() => {
    if (!isLoaded || !user) return;

    const checkRole = async () => {
      try {
        const { data: usuarioRow, error: usuarioError } = await supabase
          .from("usuarios")
          .select("idrol")
          .eq("clerk_id", user.id)
          .single();

        if (usuarioError || !usuarioRow) return;

        const { data: rolRow, error: rolError } = await supabase
          .from("roles")
          .select("nombre_rol")
          .eq("idrol", usuarioRow.idrol)
          .single();

        if (rolError || !rolRow) return;

        const nombreRol = (rolRow.nombre_rol || "").toLowerCase();
        // Ajusta este contains según el nombre real del rol
        if (nombreRol.includes("super")) {
          setIsSuperAdmin(true);
        }
      } catch (err) {
        console.error("Error comprobando rol de superadmin:", err);
      }
    };

    checkRole();
  }, [isLoaded, user]);

  // 2) Carga de datos principales (sin relaciones anidadas)
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      try {
        const [
          perfilesRes,
          usuariosRes,
          rolesRes,
          unidadesRes,
          direccionesRes,
          tipoDireccionesRes,
          tiposDocRes,
        ] = await Promise.all([
          supabase
            .from("perfilesusuarios")
            .select(
              "id_perfil, id_usuario, correo, id_unidad, telefono, tipo_documento, nro_documento, id_direccion, nombre, apellido"
            )
            .order("id_perfil", { ascending: true }),

          supabase
            .from("usuarios")
            .select("id_usuario, nombre_usuario, email, idrol"),

          supabase.from("roles").select("idrol, nombre_rol").order("nombre_rol"),

          supabase
            .from("unidades")
            .select("id_unidad, nombre_unidad")
            .order("nombre_unidad"),

          supabase
            .from("direcciones")
            .select("id_direccion, id_tipodireccion, grupo, complemento"),

          supabase
            .from("tipodirecciones")
            .select("id_tipodireccion, descripcion, nombre_grupo"),

          supabase
            .from("tiposdocumentos")
            .select("id_tipodocumento, nombre")
            .order("id_tipodocumento"),
        ]);

        if (rolesRes.data) setRoles(rolesRes.data);
        if (unidadesRes.data) setUnidades(unidadesRes.data);
        if (tiposDocRes.data) setTiposDocumento(tiposDocRes.data);

        // Mapa de tipo-dirección
        const tipodirMap = new Map(
          (tipoDireccionesRes.data || []).map((td) => [td.id_tipodireccion, td])
        );

        // Direcciones con label formateado
        if (direccionesRes.data) {
          const dirOpts =
            direccionesRes.data.map((d) => {
              const td = tipodirMap.get(d.id_tipodireccion);
              const label = td
                ? `${td.descripcion} ${d.grupo} ${td.nombre_grupo} ${d.complemento}`
                : `${d.grupo} ${d.complemento}`;
              return {
                id_direccion: d.id_direccion,
                id_tipodireccion: d.id_tipodireccion,
                label,
              };
            }) || [];
          setDirecciones(dirOpts);
        }

        // Mapas para unir datos
        const usuariosMap = new Map(
          (usuariosRes.data || []).map((u) => [u.id_usuario, u])
        );
        const rolesMap = new Map(
          (rolesRes.data || []).map((r) => [r.idrol, r])
        );
        const unidadesMap = new Map(
          (unidadesRes.data || []).map((u) => [u.id_unidad, u])
        );
        const tiposDocMap = new Map(
          (tiposDocRes.data || []).map((t) => [t.id_tipodocumento, t])
        );
        const direccionesMap = new Map(
          (direccionesRes.data || []).map((d) => [d.id_direccion, d])
        );

        // Construir lista final de usuarios
        if (perfilesRes.data) {
          const list = perfilesRes.data.map((p) => {
            const usuario = usuariosMap.get(p.id_usuario);
            const rol = usuario ? rolesMap.get(usuario.idrol) : null;
            const unidad = unidadesMap.get(p.id_unidad);
            const tipoDoc = tiposDocMap.get(p.tipo_documento);
            const dir = direccionesMap.get(p.id_direccion);
            const tipod = dir ? tipodirMap.get(dir.id_tipodireccion) : null;

            const direccionLabel =
              dir && tipod
                ? `${tipod.descripcion} ${dir.grupo} ${tipod.nombre_grupo} ${dir.complemento}`
                : "";

            return {
              id_perfil: p.id_perfil,
              id_usuario: p.id_usuario,
              nombre: p.nombre ?? "",
              apellido: p.apellido ?? "",
              telefono: p.telefono ?? "",
              correo: p.correo ?? usuario?.email ?? "",
              usuario: usuario?.nombre_usuario ?? "",
              idrol: usuario?.idrol ?? null,
              rol: rol?.nombre_rol ?? "",
              id_unidad: p.id_unidad ?? null,
              unidad: unidad?.nombre_unidad ?? "",
              id_direccion: p.id_direccion ?? null,
              direccion: direccionLabel,
              id_tipo_documento: p.tipo_documento ?? null,
              tipo_documento_nombre: tipoDoc?.nombre ?? "",
              nro_documento: p.nro_documento ?? "",
            };
          });

          setUsuarios(list);
        }
      } catch (err) {
        console.error("❌ Error cargando datos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  // ====== MODAL EDICIÓN ======

  const openModal = (u) => {
    setEditingUser(u);
    setFormData({
      nombre: u.nombre,
      apellido: u.apellido,
      correo: u.correo,
      telefono: u.telefono,
      usuario: u.usuario,
      idrol: u.idrol || "",
      id_unidad: u.id_unidad || "",
      id_direccion: u.id_direccion || "",
      id_tipo_documento: u.id_tipo_documento || "",
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

  // UPDATE en BD
  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    try {
      // actualiza perfilesusuarios
      const { error: perfilError } = await supabase
        .from("perfilesusuarios")
        .update({
          nombre: formData.nombre,
          apellido: formData.apellido,
          telefono: formData.telefono,
          correo: formData.correo,
          nro_documento: formData.nro_documento,
          tipo_documento: formData.id_tipo_documento || null,
          id_unidad: formData.id_unidad || null,
          id_direccion: formData.id_direccion || null,
        })
        .eq("id_perfil", editingUser.id_perfil);

      if (perfilError) {
        console.error("❌ Error actualizando perfil:", perfilError);
        alert("Error actualizando el perfil del usuario.");
        return;
      }

      // actualiza usuarios
      if (editingUser.id_usuario) {
        const { error: usuarioError } = await supabase
          .from("usuarios")
          .update({
            nombre_usuario: formData.usuario,
            email: formData.correo,
            idrol: formData.idrol || null,
          })
          .eq("id_usuario", editingUser.id_usuario);

        if (usuarioError) {
          console.error("❌ Error actualizando usuario:", usuarioError);
          alert("Error actualizando datos del usuario.");
          return;
        }
      }

      // actualizar estado local
      setUsuarios((prev) =>
        prev.map((u) => {
          if (u.id_perfil !== editingUser.id_perfil) return u;

          const rolObj = roles.find(
            (r) => r.idrol === Number(formData.idrol)
          );
          const unidadObj = unidades.find(
            (un) => un.id_unidad === Number(formData.id_unidad)
          );
          const tipoDocObj = tiposDocumento.find(
            (t) =>
              t.id_tipodocumento === Number(formData.id_tipo_documento)
          );
          const dirObj = direcciones.find(
            (d) => d.id_direccion === Number(formData.id_direccion)
          );

          return {
            ...u,
            nombre: formData.nombre,
            apellido: formData.apellido,
            telefono: formData.telefono,
            correo: formData.correo,
            usuario: formData.usuario,
            idrol: formData.idrol || null,
            rol: rolObj?.nombre_rol ?? u.rol,
            id_unidad: formData.id_unidad || null,
            unidad: unidadObj?.nombre_unidad ?? u.unidad,
            id_tipo_documento: formData.id_tipo_documento || null,
            tipo_documento_nombre: tipoDocObj?.nombre ?? u.tipo_documento_nombre,
            nro_documento: formData.nro_documento,
            id_direccion: formData.id_direccion || null,
            direccion: dirObj?.label ?? u.direccion,
          };
        })
      );

      closeModal();
    } finally {
      setSaving(false);
    }
  };

  // DELETE usuario (solo superadmin)
  const handleDelete = async (u) => {
    if (
      !window.confirm(
        "¿Seguro que deseas eliminar este usuario? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    // borra perfil
    const { error: perfilError } = await supabase
      .from("perfilesusuarios")
      .delete()
      .eq("id_perfil", u.id_perfil);

    if (perfilError) {
      console.error("❌ Error eliminando perfil:", perfilError);
      alert("Error eliminando el perfil del usuario.");
      return;
    }

    // borra usuario (si existe)
    if (u.id_usuario) {
      const { error: usuarioError } = await supabase
        .from("usuarios")
        .delete()
        .eq("id_usuario", u.id_usuario);

      if (usuarioError) {
        console.error("⚠ Error eliminando usuario base:", usuarioError);
      }
    }

    setUsuarios((prev) => prev.filter((x) => x.id_perfil !== u.id_perfil));
  };

  // Export CSV
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
        .map((row) =>
          row
            .map((value) =>
              `"${(value ?? "").toString().replace(/"/g, '""')}"`
            )
            .join(",")
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "usuarios_activos.csv";
    a.click();
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

      {/* Tabla con scroll interno */}
      <div className="rounded-lg border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 text-left w-64">Nombre</th>
                <th className="px-4 py-2 text-left">Usuario</th>
                <th className="px-4 py-2 text-left">Correo</th>
                <th className="px-4 py-2 text-left">Rol</th>
                <th className="px-4 py-2 text-left w-56">Unidad</th>
                <th className="px-4 py-2 text-left">Dirección</th>
                <th className="px-4 py-2 text-left w-px"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center">
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
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-gray-500"
                  >
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
          <div className="bg.white rounded-xl p-6 w-full max-w-lg shadow-xl">
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
