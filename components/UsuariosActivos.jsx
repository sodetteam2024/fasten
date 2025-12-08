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
