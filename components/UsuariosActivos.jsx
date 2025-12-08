"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Pencil, Ban, Download } from "lucide-react";

export default function UsuariosActivos() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingForm, setEditingForm] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    telefono: "",
    usuario: "",
    rol: "",
    unidad: "",
    nro_documento: "",
  });

  // 1) Cargar usuarios desde Supabase
  useEffect(() => {
    const fetchUsuarios = async () => {
      setLoading(true);
      setErrorMsg("");

      /*
        OJO: Esta consulta asume que Supabase tiene relaciones configuradas
        entre:
        - perfilesusuarios.id_usuario -> usuarios.id_usuario
        - perfilesusuarios.id_unidad  -> unidades.id_unidad
        - usuarios.idrol              -> roles.idrol

        Si algún nombre de relación no coincide, ajusta el select().
      */

      const { data, error } = await supabase
        .from("perfilesusuarios")
        .select(
          `
          id_perfil,
          nombre,
          apellido,
          correo,
          telefono,
          nro_documento,
          id_unidad,
          usuarios (
            id_usuario,
            nombre_usuario,
            email,
            idrol,
            roles (
              nombre_rol
            )
          ),
          unidades (
            nombre_unidad
          )
        `
        )
        .order("id_perfil", { ascending: true });

      if (error) {
        console.error("❌ Error cargando usuarios:", error);
        setErrorMsg("Error al cargar usuarios. Intenta más tarde.");
      } else {
        const mapped = (data || []).map((row) => ({
          id_perfil: row.id_perfil,
          nombre: row.nombre ?? "",
          apellido: row.apellido ?? "",
          correo: row.correo ?? row.usuarios?.email ?? "",
          telefono: row.telefono ?? "",
          nro_documento: row.nro_documento ?? "",
          unidad: row.unidades?.nombre_unidad ?? "",
          usuario: row.usuarios?.nombre_usuario ?? "",
          rol: row.usuarios?.roles?.nombre_rol ?? "",
          id_usuario: row.usuarios?.id_usuario,
        }));
        setUsuarios(mapped);
      }

      setLoading(false);
    };

    fetchUsuarios();
  }, []);

  // 2) Abrir modal de edición
  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditingForm({
      nombre: user.nombre,
      apellido: user.apellido,
      correo: user.correo,
      telefono: user.telefono,
      usuario: user.usuario,
      rol: user.rol,
      unidad: user.unidad,
      nro_documento: user.nro_documento,
    });
    setIsModalOpen(true);
  };

  const handleEditingChange = (e) => {
    const { name, value } = e.target;
    setEditingForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Por ahora solo cerramos el modal; luego aquí puedes hacer el update en Supabase
  const handleEditingSubmit = (e) => {
    e.preventDefault();
    console.log("Datos editados (por ahora solo en frontend):", editingForm);
    // TODO: aquí puedes llamar a Supabase para actualizar perfilesusuarios/usuarios
    setIsModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  // 3) Exportar CSV
  const handleExportCsv = () => {
    if (!usuarios.length) return;

    const headers = [
      "Nombre",
      "Apellido",
      "Usuario",
      "Correo",
      "Rol",
      "Unidad",
      "Teléfono",
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

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) =>
            `"${(value ?? "").toString().replace(/"/g, '""')}"`
          )
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "usuarios_activos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Header de la sección + botón CSV */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-800">
          Usuarios activos
        </h2>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={!usuarios.length}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-3 w-3" />
          Exportar CSV
        </button>
      </div>

      {/* Mensajes de estado */}
      {loading && (
        <p className="text-sm text-slate-500">Cargando usuarios...</p>
      )}

      {errorMsg && !loading && (
        <p className="text-sm text-red-500">{errorMsg}</p>
      )}

      {!loading && !errorMsg && !usuarios.length && (
        <p className="text-sm text-slate-500">
          No hay usuarios activos registrados.
        </p>
      )}

      {/* Tabla de usuarios */}
      {!loading && !errorMsg && usuarios.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                <th className="px-3 py-2 text-left font-semibold">
                  Usuario
                </th>
                <th className="px-3 py-2 text-left font-semibold">Correo</th>
                <th className="px-3 py-2 text-left font-semibold">Rol</th>
                <th className="px-3 py-2 text-left font-semibold">Unidad</th>
                <th className="px-3 py-2 text-left font-semibold">
                  Teléfono
                </th>
                <th className="px-3 py-2 text-left font-semibold">
                  Documento
                </th>
                <th className="px-3 py-2 text-left font-semibold">
                  Opciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map((u) => (
                <tr key={u.id_perfil}>
                  <td className="px-3 py-2">
                    {u.nombre} {u.apellido}
                  </td>
                  <td className="px-3 py-2">{u.usuario}</td>
                  <td className="px-3 py-2">{u.correo}</td>
                  <td className="px-3 py-2">{u.rol}</td>
                  <td className="px-3 py-2">{u.unidad}</td>
                  <td className="px-3 py-2">{u.telefono}</td>
                  <td className="px-3 py-2">{u.nro_documento}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {/* EDITAR */}
                      <button
                        type="button"
                        onClick={() => handleEditClick(u)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3 w-3" />
                        Editar
                      </button>

                      {/* BANEAR (no funcional aún) */}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
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
      )}

      {/* MODAL DE EDICIÓN */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Editar usuario
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditingSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={editingForm.nombre}
                    onChange={handleEditingChange}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Apellido
                  </label>
                  <input
                    type="text"
                    name="apellido"
                    value={editingForm.apellido}
                    onChange={handleEditingChange}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Correo
                  </label>
                  <input
                    type="email"
                    name="correo"
                    value={editingForm.correo}
                    onChange={handleEditingChange}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    name="telefono"
                    value={editingForm.telefono}
                    onChange={handleEditingChange}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Usuario
                  </label>
                  <input
                    type="text"
                    name="usuario"
                    value={editingForm.usuario}
                    onChange={handleEditingChange}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Documento
                  </label>
                  <input
                    type="text"
                    name="nro_documento"
                    value={editingForm.nro_documento}
                    onChange={handleEditingChange}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Rol (texto por ahora)
                  </label>
                  <input
                    type="text"
                    name="rol"
                    value={editingForm.rol}
                    onChange={handleEditingChange}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Unidad (texto por ahora)
                  </label>
                  <input
                    type="text"
                    name="unidad"
                    value={editingForm.unidad}
                    onChange={handleEditingChange}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  Guardar cambios (solo UI)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
