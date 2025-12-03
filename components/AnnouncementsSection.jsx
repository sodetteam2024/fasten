"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";
import ButtonA from "./ButtonA";
import AnnouncementCard from "./AnnouncementCard";

export default function AnnouncementsSection() {
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]); // 👈 hasta 4 adjuntos
  const [isActive, setIsActive] = useState(true);

  const [announcements, setAnnouncements] = useState([]);

  const [perfil, setPerfil] = useState(null);
  const [roleId, setRoleId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { user } = useUser();

  const currentUserName =
    user?.fullName || user?.username || "Usuario desconocido";

  const canManageAnnouncements = roleId === 1 || roleId === 2; // super admin / admin

  // 1️⃣ Cargar usuario, rol, perfil y novedades + adjuntos
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        // usuarios: obtener id_usuario + rol
        const { data: usuario, error: errUsuario } = await supabase
          .from("usuarios")
          .select("id_usuario, idrol")
          .eq("clerk_id", user.id)
          .single();

        if (errUsuario || !usuario) {
          console.error("No se encontró usuario en 'usuarios':", errUsuario);
          setLoading(false);
          return;
        }

        setRoleId(usuario.idrol);

        // perfilesusuarios
        const { data: perfilData, error: errPerfil } = await supabase
          .from("perfilesusuarios")
          .select("id_perfil, id_unidad, nombre, apellido")
          .eq("id_usuario", usuario.id_usuario)
          .single();

        if (errPerfil || !perfilData) {
          console.error("No se encontró perfil en 'perfilesusuarios':", errPerfil);
          setLoading(false);
          return;
        }

        setPerfil(perfilData);

        // novedades de la unidad + perfil + adjuntos
        let novedadesQuery = supabase
          .from("novedades")
          .select(
            `
            id_novedad,
            fecha,
            cuerpo,
            asunto,
            estado,
            perfilesusuarios (
              nombre,
              apellido
            ),
            novedades_adjuntos (
              id_adjunto,
              attachment_path,
              attachment_name
            )
          `
          )
          .eq("id_unidad", perfilData.id_unidad)
          .order("fecha", { ascending: false });

        // si NO es admin/superadmin → solo activas
        if (usuario.idrol !== 1 && usuario.idrol !== 2) {
          novedadesQuery = novedadesQuery.eq("estado", true);
        }

        const { data: novedades, error: errNovedades } = await novedadesQuery;

        if (errNovedades) {
          console.error("Error cargando novedades:", errNovedades);
          setLoading(false);
          return;
        }

        const mapped = (novedades || []).map((n) => ({
          id: n.id_novedad,
          title: n.asunto,
          description: n.cuerpo,
          createdAt: n.fecha,
          estado: n.estado,
          userName: n.perfilesusuarios
            ? `${n.perfilesusuarios.nombre ?? ""} ${
                n.perfilesusuarios.apellido ?? ""
              }`.trim() || "Usuario"
            : "Usuario",
          attachments: (n.novedades_adjuntos || []).map((adj) => ({
            id: adj.id_adjunto,
            name: adj.attachment_name,
            path: adj.attachment_path,
          })),
        }));

        setAnnouncements(mapped);
      } catch (e) {
        console.error("Error general cargando anuncios:", e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // 2️⃣ Adjuntos (máximo 4, frontend only)
  const handleAttachmentChange = (e) => {
    const selected = Array.from(e.target.files || []);

    if (selected.length === 0) {
      setFiles([]);
      return;
    }

    const limited = selected.slice(0, 4); // 👈 máx 4
    if (selected.length > 4) {
      alert("Solo puedes adjuntar máximo 4 archivos.");
    }

    setFiles(limited);
  };

  // 3️⃣ Guardar anuncio + adjuntos en Supabase
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) return;
    if (!perfil) {
      alert("No se pudo identificar el perfil del usuario.");
      return;
    }
    if (!canManageAnnouncements) {
      alert("No tienes permisos para publicar anuncios.");
      return;
    }

    setSaving(true);

    try {
      // 1) Insertar la novedad
      const { data: inserted, error: errNovedad } = await supabase
        .from("novedades")
        .insert([
          {
            id_unidad: perfil.id_unidad,
            id_perfil: perfil.id_perfil,
            asunto: title.trim(),
            cuerpo: description.trim(),
            estado: isActive,
          },
        ])
        .select("id_novedad, fecha, asunto, cuerpo, estado")
        .single();

      if (errNovedad) {
        console.error("Error insertando novedad:", errNovedad);
        alert("Ocurrió un error al publicar el anuncio.");
        return;
      }

      const idNovedad = inserted.id_novedad;

      // 2) Subir archivos al bucket "novedades" y preparar filas de adjuntos
      const adjuntosParaInsertar = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.includes(".")
          ? file.name.substring(file.name.lastIndexOf(".") + 1)
          : "";
        const path = `${perfil.id_unidad}/${idNovedad}/${Date.now()}_${i}${
          ext ? "." + ext : ""
        }`;

        const { error: errUpload } = await supabase.storage
          .from("novedades") // 👈 nombre del bucket en Storage
          .upload(path, file);

        if (errUpload) {
          console.error("Error subiendo archivo:", errUpload);
          continue; // intentamos subir los demás
        }

        adjuntosParaInsertar.push({
          id_novedad: idNovedad,
          attachment_path: path,
          attachment_name: file.name,
          attachment_type: file.type,
          attachment_size: file.size,
        });
      }

      if (adjuntosParaInsertar.length > 0) {
        const { error: errAdjuntos } = await supabase
          .from("novedades_adjuntos")
          .insert(adjuntosParaInsertar);

        if (errAdjuntos) {
          console.error("Error insertando adjuntos:", errAdjuntos);
        }
      }

      // 3) Reflejar anuncio en el estado local
      const nuevoAnuncio = {
        id: idNovedad,
        title: inserted.asunto,
        description: inserted.cuerpo,
        createdAt: inserted.fecha,
        estado: inserted.estado,
        userName: currentUserName,
        attachments: adjuntosParaInsertar.map((a) => ({
          id: a.id_adjunto, // aún no tenemos id real, pero no es crítico en front
          name: a.attachment_name,
          path: a.attachment_path,
        })),
      };

      setAnnouncements((prev) => [nuevoAnuncio, ...prev]);

      // 4) Limpiar
      setTitle("");
      setDescription("");
      setIsActive(true);
      setFiles([]);
      setShowForm(false);
    } catch (err) {
      console.error("Error general al publicar anuncio:", err);
      alert("Ocurrió un error al publicar el anuncio.");
    } finally {
      setSaving(false);
    }
  };

  // 4️⃣ Cambiar estado de un anuncio existente
  const handleToggleEstado = async (id, currentEstado) => {
    if (!canManageAnnouncements) return;

    try {
      const { data, error } = await supabase
        .from("novedades")
        .update({ estado: !currentEstado })
        .eq("id_novedad", id)
        .select("id_novedad, estado")
        .single();

      if (error) {
        console.error("Error cambiando estado de novedad:", error);
        alert("No se pudo cambiar el estado del anuncio.");
        return;
      }

      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                estado: data.estado,
              }
            : a
        )
      );
    } catch (err) {
      console.error("Error general en toggle estado:", err);
      alert("No se pudo cambiar el estado del anuncio.");
    }
  };

  // 5️⃣ Eliminar (solo front, sin tocar BD)
  const handleDelete = (id) => {
    if (!canManageAnnouncements) return;

    setAnnouncements((prev) => prev.filter((a) => a.id !== id));

    // Si quieres borrado lógico, podrías hacer:
    // supabase.from("novedades").update({ estado: false }).eq("id_novedad", id);
  };

  // 6️⃣ Obtener URL firmada para ver adjunto
  const handleViewAttachment = async (path) => {
    try {
      const { data, error } = await supabase.storage
        .from("novedades")
        .createSignedUrl(path, 60 * 60); // 1 hora

      if (error) {
        console.error("Error creando signed URL:", error);
        alert("No se pudo abrir el adjunto.");
        return;
      }

      window.open(data.signedUrl, "_blank");
    } catch (err) {
      console.error("Error al abrir adjunto:", err);
      alert("No se pudo abrir el adjunto.");
    }
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-slate-500">Cargando anuncios...</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* Botón Añadir (solo admin / superadmin) */}
      {canManageAnnouncements && (
        <div>
          <ButtonA onClick={() => setShowForm((v) => !v)} />
        </div>
      )}

      {/* Formulario */}
      {showForm && canManageAnnouncements && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm space-y-4"
        >
          <h3 className="text-sm font-semibold text-slate-800">
            Nuevo anuncio
          </h3>

          {/* Título */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del anuncio"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Descripción
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del anuncio..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {/* Adjuntos (máx 4) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Adjuntos (máx. 4)
            </label>
            <input
              type="file"
              multiple
              onChange={handleAttachmentChange}
              className="block w-full text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-slate-700"
            />

            {files.length > 0 && (
              <ul className="mt-1 space-y-1 rounded-lg bg-white px-3 py-2 text-[11px] text-slate-700 border border-slate-200">
                {files.map((f, idx) => (
                  <li key={idx} className="flex justify-between items-center">
                    <span className="truncate">{f.name}</span>
                  </li>
                ))}
                <p className="text-[10px] text-slate-500 mt-1">
                  Archivos seleccionados: {files.length} / 4
                </p>
              </ul>
            )}
          </div>

          {/* Estado (switch) */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-500">
              Se publicará como{" "}
              <span className="font-semibold">{currentUserName}</span>.
            </p>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Estado:</span>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition ${
                  isActive ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                    isActive ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-xs text-slate-600">
                {isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? "Publicando..." : "Publicar"}
            </button>
          </div>
        </form>
      )}

      {/* Lista de anuncios */}
      <div className="space-y-3">
        {announcements.map((a) => (
          <AnnouncementCard
            key={a.id}
            icon="calendar"
            title={a.title}
            tag={a.estado ? "Activo" : "Inactivo"}
            tagColor={
              a.estado
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600"
            }
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Publicado por{" "}
                  <span className="font-semibold">{a.userName}</span> ·{" "}
                  {formatDate(a.createdAt)}
                </span>

                <div className="flex items-center gap-3">
                  {/* Switch estado solo para admin/superadmin */}
                  {canManageAnnouncements && (
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-slate-600">
                        {a.estado ? "Activo" : "Inactivo"}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleEstado(a.id, a.estado)
                        }
                        className={`relative inline-flex h-4 w-8 items-center rounded-full transition ${
                          a.estado ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition ${
                            a.estado ? "translate-x-4" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  )}

                  {/* Eliminar solo para admin/superadmin */}
                  {canManageAnnouncements && (
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            }
          >
            <div className="space-y-2">
              <p className="text-sm">{a.description}</p>

              {/* Adjuntos */}
              {a.attachments && a.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {a.attachments.map((att) => (
                    <button
                      key={att.path}
                      type="button"
                      onClick={() => handleViewAttachment(att.path)}
                      className="inline-flex text-xs font-medium text-purple-700 underline"
                    >
                      Ver adjunto ({att.name})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </AnnouncementCard>
        ))}

        {announcements.length === 0 && (
          <p className="text-sm text-slate-500">
            Aún no hay anuncios.
            {canManageAnnouncements && (
              <>
                {" "}
                Haz clic en <span className="font-semibold">Añadir</span> para
                crear el primero.
              </>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
