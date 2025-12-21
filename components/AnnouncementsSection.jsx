"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";
import ButtonA from "./ButtonA";
import AnnouncementCard from "./AnnouncementCard";
import { Paperclip } from "lucide-react";

export default function AnnouncementsSection() {
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [isActive, setIsActive] = useState(true);

  const [announcements, setAnnouncements] = useState([]);

  const [perfil, setPerfil] = useState(null);
  const [roleId, setRoleId] = useState(null);
  const [roleName, setRoleName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { user } = useUser();

  const currentUserName =
    user?.fullName || user?.username || "Usuario desconocido";

  const canManageAnnouncements = roleId === 1 || roleId === 2;

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
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

        if (usuario.idrol) {
          const { data: rolData, error: errRol } = await supabase
            .from("roles")
            .select("nombre_rol")
            .eq("idrol", usuario.idrol)
            .single();

          if (!errRol && rolData) setRoleName(rolData.nombre_rol);
        }

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
              id_usuario,
              nombre,
              apellido
            ),
            novedades_adjuntos (
              id_adjunto,
              attachment_path,
              attachment_name,
              attachment_type
            )
          `
          )
          .eq("id_unidad", perfilData.id_unidad)
          .order("fecha", { ascending: false });

        if (usuario.idrol !== 1 && usuario.idrol !== 2) {
          novedadesQuery = novedadesQuery.eq("estado", true);
        }

        const { data: novedades, error: errNovedades } = await novedadesQuery;

        if (errNovedades) {
          console.error("Error cargando novedades:", errNovedades);
          setLoading(false);
          return;
        }

        const userIds = Array.from(
          new Set(
            (novedades || [])
              .map((n) => n.perfilesusuarios?.id_usuario)
              .filter(Boolean)
          )
        );

        let roleByUserId = {};
        if (userIds.length > 0) {
          const { data: usuariosPub, error: errUsuariosPub } = await supabase
            .from("usuarios")
            .select("id_usuario, roles ( nombre_rol )")
            .in("id_usuario", userIds);

          if (errUsuariosPub) {
            console.error("Error cargando roles de publicadores:", errUsuariosPub);
          } else if (usuariosPub) {
            usuariosPub.forEach((u) => {
              roleByUserId[u.id_usuario] = u.roles?.nombre_rol || "Usuario";
            });
          }
        }

        const mapped =
          (novedades || []).map((n) => {
            const perfilN = n.perfilesusuarios;
            const idUsuarioPub = perfilN?.id_usuario;

            const publisherRole =
              (idUsuarioPub && roleByUserId[idUsuarioPub]) || "Usuario";

            return {
              id: n.id_novedad,
              title: n.asunto,
              description: n.cuerpo,
              createdAt: n.fecha,
              estado: n.estado,
              userName: perfilN
                ? `${perfilN.nombre ?? ""} ${perfilN.apellido ?? ""}`.trim() ||
                  "Usuario"
                : "Usuario",
              publisherRole,
              attachments: (n.novedades_adjuntos || []).map((adj) => ({
                id: adj.id_adjunto,
                name: adj.attachment_name,
                path: adj.attachment_path,
                type: adj.attachment_type,
              })),
            };
          }) ?? [];

        setAnnouncements(mapped);
      } catch (e) {
        console.error("Error general cargando anuncios:", e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleAttachmentChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    let combined = [...files, ...selected];
    if (combined.length > 4) {
      alert("Solo puedes adjuntar máximo 4 archivos.");
      combined = combined.slice(0, 4);
    }

    setFiles(combined);
    e.target.value = "";
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

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

      if (errNovedad || !inserted) {
        console.error("Error insertando novedad:", errNovedad);
        alert("Ocurrió un error al publicar el anuncio.");
        return;
      }

      const idNovedad = inserted.id_novedad;

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
          .from("novedades")
          .upload(path, file);

        if (errUpload) {
          console.error("Error subiendo archivo:", errUpload);
          continue;
        }

        adjuntosParaInsertar.push({
          id_novedad: idNovedad,
          attachment_path: path,
          attachment_name: file.name,
          attachment_type: file.type,
          attachment_size: file.size,
        });
      }

      let adjuntosInsertados = [];

      if (adjuntosParaInsertar.length > 0) {
        const { data: adjData, error: errAdjuntos } = await supabase
          .from("novedades_adjuntos")
          .insert(adjuntosParaInsertar)
          .select(
            "id_adjunto, attachment_path, attachment_name, attachment_type, attachment_size"
          );

        if (errAdjuntos) {
          console.error("Error insertando adjuntos:", errAdjuntos);
        } else {
          adjuntosInsertados = adjData || [];
        }
      }

      const nuevoAnuncio = {
        id: idNovedad,
        title: inserted.asunto,
        description: inserted.cuerpo,
        createdAt: inserted.fecha,
        estado: inserted.estado,
        userName: currentUserName,
        publisherRole: roleName || "Usuario",
        attachments: adjuntosInsertados.map((a) => ({
          id: a.id_adjunto,
          name: a.attachment_name,
          path: a.attachment_path,
          type: a.attachment_type,
        })),
      };

      setAnnouncements((prev) => [nuevoAnuncio, ...prev]);
      handleCancel();
    } catch (err) {
      console.error("Error general al publicar anuncio:", err);
      alert("Ocurrió un error al publicar el anuncio.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEstado = async (id, currentEstado) => {
    if (!canManageAnnouncements) return;

    try {
      const { data, error } = await supabase
        .from("novedades")
        .update({ estado: !currentEstado })
        .eq("id_novedad", id)
        .select("id_novedad, estado")
        .single();

      if (error || !data) {
        console.error("Error cambiando estado de novedad:", error);
        alert("No se pudo cambiar el estado del anuncio.");
        return;
      }

      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, estado: data.estado } : a))
      );
    } catch (err) {
      console.error("Error general en toggle estado:", err);
      alert("No se pudo cambiar el estado del anuncio.");
    }
  };

  const handleDelete = (id) => {
    if (!canManageAnnouncements) return;
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  const handleViewAttachment = async (path) => {
    try {
      const { data, error } = await supabase.storage
        .from("novedades")
        .createSignedUrl(path, 60 * 60);

      if (error || !data) {
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

  const handleCancel = () => {
    setTitle("");
    setDescription("");
    setIsActive(true);
    setFiles([]);
    setShowForm(false);
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
        <p className="text-sm text-slate-500 dark:text-white/60">
          Cargando anuncios...
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {canManageAnnouncements && (
        <div>
          <ButtonA onClick={() => setShowForm((v) => !v)} />
        </div>
      )}

      {showForm && canManageAnnouncements && (
        <form
          onSubmit={handleSubmit}
          className="
            rounded-2xl p-4 shadow-sm space-y-4
            border border-slate-200 bg-slate-50
            dark:border-white/10 dark:bg-white/5
          "
        >
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            Nuevo anuncio
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-white/70">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del anuncio"
              className="
                w-full rounded-lg px-3 py-2 text-sm outline-none transition
                border border-slate-300 bg-white text-slate-900
                focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20
                dark:border-white/10 dark:bg-black/40 dark:text-white
                dark:placeholder:text-white/40
              "
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-white/70">
              Descripción
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del anuncio..."
              className="
                w-full rounded-lg px-3 py-2 text-sm outline-none transition
                border border-slate-300 bg-white text-slate-900
                focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20
                dark:border-white/10 dark:bg-black/40 dark:text-white
                dark:placeholder:text-white/40
              "
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-white/70">
              Adjuntos (máx. 4)
            </label>

            <input
              type="file"
              multiple
              onChange={handleAttachmentChange}
              className="
                block w-full text-xs
                text-slate-700 dark:text-white/70
                file:mr-3 file:rounded-lg file:border-0
                file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-medium file:text-white
                hover:file:bg-slate-700
                dark:file:bg-white/10 dark:hover:file:bg-white/20
              "
            />

            {files.length > 0 && (
              <ul
                className="
                  mt-2 space-y-1 rounded-lg px-3 py-2 text-[11px]
                  border border-slate-200 bg-white text-slate-700
                  dark:border-white/10 dark:bg-black/40 dark:text-white/75
                "
              >
                {files.map((f, idx) => (
                  <li key={idx} className="flex justify-between items-center gap-2">
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="text-[11px] font-semibold text-red-600 dark:text-red-300 hover:underline"
                    >
                      X
                    </button>
                  </li>
                ))}
                <p className="text-[10px] text-slate-500 dark:text-white/50 mt-1">
                  Archivos seleccionados: {files.length} / 4
                </p>
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-500 dark:text-white/60">
              Se publicará como{" "}
              <span className="font-semibold">{currentUserName}</span>.
            </p>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-white/70">
                Estado:
              </span>

              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition ${
                  isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-white/20"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                    isActive ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>

              <span className="text-xs text-slate-600 dark:text-white/70">
                {isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="
                rounded-lg px-3 py-1 text-xs font-medium transition
                border border-slate-300 text-slate-600 hover:bg-slate-100
                dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10
              "
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="
                rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white
                hover:bg-purple-700 disabled:opacity-50 transition
              "
            >
              {saving ? "Publicando..." : "Publicar"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {announcements.map((a) => (
          <AnnouncementCard
            key={a.id}
            icon="calendar"
            role={a.publisherRole}
            title={a.title}
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Publicado por{" "}
                  <span className="font-semibold">{a.userName}</span> ·{" "}
                  {formatDate(a.createdAt)}
                </span>

                <div className="flex items-center gap-3">
                  {canManageAnnouncements && (
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-slate-600 dark:text-white/60">
                        {a.estado ? "Activo" : "Inactivo"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleEstado(a.id, a.estado)}
                        className={`relative inline-flex h-4 w-8 items-center rounded-full transition ${
                          a.estado ? "bg-emerald-500" : "bg-slate-300 dark:bg-white/20"
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

                  {canManageAnnouncements && (
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      className="text-xs font-semibold text-red-600 dark:text-red-300 hover:underline"
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

              {a.attachments && a.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {a.attachments.map((att) => (
                    <AttachmentPreview
                      key={att.path}
                      attachment={att}
                      onOpen={handleViewAttachment}
                    />
                  ))}
                </div>
              )}
            </div>
          </AnnouncementCard>
        ))}

        {announcements.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-white/60">
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

/* Adjuntos (DARK MODE completo) */
function AttachmentPreview({ attachment, onOpen }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  const isImage =
    attachment.type && typeof attachment.type === "string"
      ? attachment.type.startsWith("image/")
      : false;

  useEffect(() => {
    let isMounted = true;

    const loadPreview = async () => {
      if (!isImage) return;

      try {
        const { data, error } = await supabase.storage
          .from("novedades")
          .createSignedUrl(attachment.path, 60 * 30);

        if (!error && data && isMounted) setPreviewUrl(data.signedUrl);
      } catch (err) {
        console.error("Error cargando preview de adjunto:", err);
      }
    };

    loadPreview();
    return () => {
      isMounted = false;
    };
  }, [attachment.path, isImage]);

  return (
    <div
      className="
        flex items-center justify-between rounded-md px-3 py-1.5 text-[11px] border
        bg-slate-50 text-slate-700 border-slate-200
        dark:bg-black/40 dark:text-white/75 dark:border-white/10
      "
    >
      <div className="flex items-center gap-2 min-w-0">
        {isImage && previewUrl ? (
          <img
            src={previewUrl}
            alt={attachment.name}
            className="h-10 w-10 rounded border border-slate-200 dark:border-white/10 object-cover flex-shrink-0"
          />
        ) : (
          <Paperclip className="h-3 w-3 flex-shrink-0 text-slate-500 dark:text-white/50" />
        )}

        <span className="truncate">{attachment.name}</span>
      </div>

      <button
        type="button"
        onClick={() => onOpen(attachment.path)}
        className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:underline flex-shrink-0"
      >
        Ver
      </button>
    </div>
  );
}
