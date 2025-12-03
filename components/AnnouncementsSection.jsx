"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs"; 
import ButtonA from "./ButtonA";
import AnnouncementCard from "./AnnouncementCard";

export default function AnnouncementsSection() {
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState(null); // { name, url }

  const [announcements, setAnnouncements] = useState([]);

  const { user } = useUser();

  const currentUserName =
    user?.fullName || user?.username || "Usuario desconocido";

  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      if (attachment?.url) URL.revokeObjectURL(attachment.url);
      setAttachment(null);
      return;
    }

    // liberar anterior si existía
    if (attachment?.url) URL.revokeObjectURL(attachment.url);

    const url = URL.createObjectURL(file);
    setAttachment({
      name: file.name,
      url,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) return;

    const now = new Date();

    const nuevo = {
      id: Date.now(),
      title: title.trim(),
      description: description.trim(),
      createdAt: now.toISOString(),
      userName: currentUserName,
      attachmentName: attachment?.name || null,
      attachmentUrl: attachment?.url || null,
    };

    setAnnouncements((prev) => [nuevo, ...prev]);

    setTitle("");
    setDescription("");
    if (attachment?.url) URL.revokeObjectURL(attachment.url);
    setAttachment(null);
    setShowForm(false);
  };

  const handleDelete = (id) => {
    setAnnouncements((prev) => {
      const toDelete = prev.find((a) => a.id === id);
      if (toDelete?.attachmentUrl) {
        URL.revokeObjectURL(toDelete.attachmentUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
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

  return (
    <section className="space-y-4">
      {/* Botón Añadir */}
      <div>
        <ButtonA onClick={() => setShowForm((v) => !v)} />
      </div>

      {/* Formulario (título, descripción, adjunto) */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm space-y-4"
        >
          <h3 className="text-sm font-semibold text-slate-800">
            Nuevo anuncio
          </h3>

          {/* Título */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Título
            </label>
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

          {/* Adjunto */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Adjunto (opcional)
            </label>
            <input
              type="file"
              onChange={handleAttachmentChange}
              className="block w-full text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-slate-700"
            />

            {attachment && (
              <div className="mt-1 flex items-center justify-between rounded-lg bg-white px-3 py-1 text-[11px] text-slate-700 border border-slate-200">
                <span className="truncate">
                  Archivo seleccionado:{" "}
                  <span className="font-semibold">{attachment.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(attachment.url);
                    setAttachment(null);
                  }}
                  className="text-[11px] font-semibold text-red-600 hover:underline ml-2"
                >
                  Quitar
                </button>
              </div>
            )}
          </div>

          {/* Info usuario + acciones */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              Se publicará como{" "}
              <span className="font-semibold">{currentUserName}</span>{" "}
              con la fecha y hora actuales.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
              >
                Publicar
              </button>
            </div>
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
            tag={a.attachmentName ? "Con adjunto" : "Sin adjunto"}
            tagColor={
              a.attachmentName
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
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </div>
            }
          >
            <div className="space-y-2">
              <p className="text-sm">{a.description}</p>

              {a.attachmentName && (
                <a
                  href={a.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex text-xs font-medium text-purple-700 underline"
                >
                  Ver adjunto ({a.attachmentName})
                </a>
              )}
            </div>
          </AnnouncementCard>
        ))}

        {announcements.length === 0 && (
          <p className="text-sm text-slate-500">
            Aún no hay anuncios. Haz clic en <span className="font-semibold">Añadir</span> para crear el primero.
          </p>
        )}
      </div>
    </section>
  );
}
