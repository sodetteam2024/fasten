"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Trash2, Power, Image as ImageIcon, Pencil } from "lucide-react";

const MAX_FOTOS = 6;

function formatMoneyCOP(v) {
  const n = Number(v || 0);
  return `$${n.toLocaleString("es-CO")}`;
}

export default function AdminAreas() {
  const { user } = useUser();

  const [roleId, setRoleId] = useState(null);
  const [perfil, setPerfil] = useState(null);

  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");

  // modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // area object or null

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    capacidad: "",
    pricing_type: "por_hora", // por_hora | fijo
    valor_hora: 0,
    valor_fijo: 0,
    max_horas_fijo: 4,
    estado: "activa",
  });

  const [primaryImage, setPrimaryImage] = useState(null); // File
  const [galleryFiles, setGalleryFiles] = useState([]); // File[]
  const [saving, setSaving] = useState(false);

  const canAdmin = roleId === 1 || roleId === 2;

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      setLoading(true);

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("id_usuario, idrol")
        .eq("clerk_id", user.id)
        .single();

      setRoleId(usuario?.idrol ?? null);

      const { data: perfilDb } = await supabase
        .from("perfilesusuarios")
        .select("id_unidad")
        .eq("id_usuario", usuario?.id_usuario)
        .single();

      setPerfil(perfilDb ?? null);

      if (!perfilDb?.id_unidad) {
        setAreas([]);
        setLoading(false);
        return;
      }

      const { data: list, error } = await supabase
        .from("areas")
        .select(
          `
          id,
          idunidad,
          nombre,
          descripcion,
          capacidad,
          pricing_type,
          valor_hora,
          valor_fijo,
          max_horas_fijo,
          imagen_principal,
          estado,
          created_at
        `
        )
        .eq("idunidad", perfilDb.id_unidad)
        .order("id", { ascending: true });

      if (error) console.error(error);
      setAreas(list || []);
      setLoading(false);
    };

    load();
  }, [user?.id]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return areas;
    return areas.filter((a) => (a.nombre || "").toLowerCase().includes(s));
  }, [areas, q]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      nombre: "",
      descripcion: "",
      capacidad: "",
      pricing_type: "por_hora",
      valor_hora: 0,
      valor_fijo: 0,
      max_horas_fijo: 4,
      estado: "activa",
    });
    setPrimaryImage(null);
    setGalleryFiles([]);
    setOpen(true);
  };

  const openEdit = (area) => {
    setEditing(area);
    setForm({
      nombre: area.nombre || "",
      descripcion: area.descripcion || "",
      capacidad: area.capacidad ? String(area.capacidad) : "",
      pricing_type: area.pricing_type || "por_hora",
      valor_hora: Number(area.valor_hora || 0),
      valor_fijo: Number(area.valor_fijo || 0),
      max_horas_fijo: Number(area.max_horas_fijo || 4),
      estado: area.estado || "activa",
    });
    setPrimaryImage(null);
    setGalleryFiles([]);
    setOpen(true);
  };

  const close = () => {
    if (saving) return;
    setOpen(false);
    setEditing(null);
  };

  const toggleEstado = async (area) => {
    if (!canAdmin) return;
    const newEstado = area.estado === "activa" ? "inactiva" : "activa";
    const { error } = await supabase
      .from("areas")
      .update({ estado: newEstado })
      .eq("id", area.id);

    if (error) {
      alert("No se pudo cambiar el estado.");
      return;
    }

    setAreas((prev) =>
      prev.map((x) => (x.id === area.id ? { ...x, estado: newEstado } : x))
    );
  };

  const removeArea = async (area) => {
    if (!canAdmin) return;
    if (!confirm(`¿Eliminar el área "${area.nombre}"?`)) return;

    // Si tienes areas_fotos con ON DELETE CASCADE, se borra solo.
    const { error } = await supabase.from("areas").delete().eq("id", area.id);
    if (error) {
      alert("No se pudo eliminar el área.");
      return;
    }

    setAreas((prev) => prev.filter((x) => x.id !== area.id));
  };

  const onPickPrimary = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPrimaryImage(f);
    e.target.value = "";
  };

  const onPickGallery = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const combined = [...galleryFiles, ...files].slice(0, MAX_FOTOS);
    setGalleryFiles(combined);
    e.target.value = "";
  };

  const removeGalleryFile = (idx) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  async function uploadToAreasBucket(file, path) {
    const { error } = await supabase.storage.from("areas").upload(path, file, {
      upsert: true,
    });
    if (error) throw error;
    return path;
  }

  async function save() {
    if (!canAdmin) return;

    if (!perfil?.id_unidad) {
      alert("No se pudo identificar la unidad.");
      return;
    }

    if (!form.nombre.trim()) {
      alert("El nombre es obligatorio.");
      return;
    }

    const pricing = form.pricing_type;

    if (pricing === "por_hora") {
      if (Number(form.valor_hora) < 0) return alert("valor_hora inválido.");
    } else {
      if (Number(form.valor_fijo) < 0) return alert("valor_fijo inválido.");
      if (Number(form.max_horas_fijo) <= 0) return alert("max_horas_fijo inválido.");
    }

    setSaving(true);
    try {
      const payload = {
        idunidad: perfil.id_unidad,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion?.trim() || null,
        capacidad: form.capacidad ? Math.max(1, parseInt(form.capacidad, 10)) : null,
        pricing_type: pricing,
        valor_hora: Math.max(0, parseInt(form.valor_hora || 0, 10)),
        valor_fijo: pricing === "fijo" ? Math.max(0, parseInt(form.valor_fijo || 0, 10)) : null,
        max_horas_fijo: pricing === "fijo" ? Math.max(1, parseInt(form.max_horas_fijo || 1, 10)) : null,
        estado: form.estado || "activa",
      };

      let areaId = editing?.id;

      // 1) insert/update área
      if (!editing) {
        const { data: created, error } = await supabase
          .from("areas")
          .insert([payload])
          .select("id")
          .single();

        if (error || !created?.id) throw error || new Error("No se pudo crear el área.");
        areaId = created.id;
      } else {
        const { error } = await supabase.from("areas").update(payload).eq("id", editing.id);
        if (error) throw error;
      }

      // 2) subir imagen principal (si hay)
      let imagen_principal_path = null;
      if (primaryImage) {
        const ext = primaryImage.name.includes(".")
          ? primaryImage.name.slice(primaryImage.name.lastIndexOf(".") + 1)
          : "jpg";
        const path = `${perfil.id_unidad}/${areaId}/principal.${ext}`;
        imagen_principal_path = await uploadToAreasBucket(primaryImage, path);

        const { error } = await supabase
          .from("areas")
          .update({ imagen_principal: imagen_principal_path })
          .eq("id", areaId);
        if (error) throw error;
      }

      // 3) galería: subir y registrar (máx 6)
      // Si quieres “reemplazar galería” en edición:
      // primero borrar rows en areas_fotos de esa área.
      if (galleryFiles.length > 0) {
        // Si estás editando y quieres reemplazo total:
        if (editing?.id) {
          await supabase.from("areas_fotos").delete().eq("id_area", areaId);
        }

        const rows = [];
        for (let i = 0; i < galleryFiles.length; i++) {
          const f = galleryFiles[i];
          const ext = f.name.includes(".") ? f.name.slice(f.name.lastIndexOf(".") + 1) : "jpg";
          const path = `${perfil.id_unidad}/${areaId}/${Date.now()}_${i}.${ext}`;
          const savedPath = await uploadToAreasBucket(f, path);
          rows.push({ id_area: areaId, path: savedPath, orden: i });
        }

        const { error } = await supabase.from("areas_fotos").insert(rows);
        if (error) throw error;
      }

      // 4) refresh list
      const { data: list } = await supabase
        .from("areas")
        .select(
          `id,idunidad,nombre,descripcion,capacidad,pricing_type,valor_hora,valor_fijo,max_horas_fijo,imagen_principal,estado,created_at`
        )
        .eq("idunidad", perfil.id_unidad)
        .order("id", { ascending: true });

      setAreas(list || []);
      setOpen(false);
      setEditing(null);
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar el área. Revisa consola.");
    } finally {
      setSaving(false);
    }
  }

  if (!canAdmin) {
    return (
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-5">
        <p className="font-semibold mb-2">Áreas / Espacios</p>
        <p className="text-muted-foreground text-sm">
          No tienes permisos para administrar áreas.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-semibold">Áreas / Espacios</h2>
          <p className="text-sm text-muted-foreground">
            Crea, edita, activa/desactiva, configura precios y fotos (máx {MAX_FOTOS}).
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 text-white px-4 py-2 text-sm font-semibold hover:bg-purple-700 transition"
        >
          <Plus className="h-4 w-4" />
          Nueva área
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar área..."
          className="w-full max-w-sm rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400/40"
        />
      </div>

      <div className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
        <div className="grid grid-cols-12 bg-black/5 dark:bg-white/5 px-4 py-3 text-xs font-semibold text-muted-foreground">
          <div className="col-span-5">Área</div>
          <div className="col-span-3">Precio</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-muted-foreground">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">No hay áreas.</div>
        ) : (
          <div className="divide-y divide-black/10 dark:divide-white/10">
            {filtered.map((a) => {
              const price =
                a.pricing_type === "fijo"
                  ? `${formatMoneyCOP(a.valor_fijo)} (fijo · máx ${a.max_horas_fijo}h)`
                  : `${formatMoneyCOP(a.valor_hora)}/hora`;

              return (
                <div key={a.id} className="grid grid-cols-12 px-4 py-4 items-center">
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                      {a.imagen_principal ? (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{a.nombre}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {a.descripcion || "Sin descripción"}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-3 text-sm">{price}</div>

                  <div className="col-span-2">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        a.estado === "activa"
                          ? "bg-emerald-500/15 text-emerald-600"
                          : "bg-slate-500/15 text-slate-500"
                      }`}
                    >
                      {a.estado}
                    </span>
                  </div>

                  <div className="col-span-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(a)}
                      className="rounded-lg border border-black/10 dark:border-white/10 px-2 py-2 hover:bg-black/5 dark:hover:bg-white/10 transition"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleEstado(a)}
                      className="rounded-lg border border-black/10 dark:border-white/10 px-2 py-2 hover:bg-black/5 dark:hover:bg-white/10 transition"
                      title="Activar/Desactivar"
                    >
                      <Power className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeArea(a)}
                      className="rounded-lg border border-black/10 dark:border-white/10 px-2 py-2 hover:bg-rose-500/10 transition"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000]" onClick={close} />
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 shadow-2xl p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    {editing ? "Editar área" : "Nueva área"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Configura precio por hora o fijo y sube fotos (principal + galería).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                >
                  Cerrar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Nombre</label>
                  <input
                    value={form.nombre}
                    onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                    className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Capacidad</label>
                  <input
                    value={form.capacidad}
                    onChange={(e) => setForm((p) => ({ ...p, capacidad: e.target.value }))}
                    placeholder="Ej: 20"
                    className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400/40"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Descripción</label>
                  <textarea
                    rows={3}
                    value={form.descripcion}
                    onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                    className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Tipo de precio</label>
                  <select
                    value={form.pricing_type}
                    onChange={(e) => setForm((p) => ({ ...p, pricing_type: e.target.value }))}
                    className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                  >
                    <option value="por_hora">Por hora</option>
                    <option value="fijo">Fijo</option>
                  </select>
                </div>

                {form.pricing_type === "por_hora" ? (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Valor por hora</label>
                    <input
                      type="number"
                      value={form.valor_hora}
                      onChange={(e) => setForm((p) => ({ ...p, valor_hora: e.target.value }))}
                      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Valor fijo</label>
                      <input
                        type="number"
                        value={form.valor_fijo}
                        onChange={(e) => setForm((p) => ({ ...p, valor_fijo: e.target.value }))}
                        className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Máximo de horas (para ese fijo)
                      </label>
                      <input
                        type="number"
                        value={form.max_horas_fijo}
                        onChange={(e) => setForm((p) => ({ ...p, max_horas_fijo: e.target.value }))}
                        className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))}
                    className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                  >
                    <option value="activa">activa</option>
                    <option value="inactiva">inactiva</option>
                  </select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Imagen principal (opcional)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={onPickPrimary}
                        className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-slate-700"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Galería (máx {MAX_FOTOS})
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={onPickGallery}
                        className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-slate-700"
                      />
                    </div>
                  </div>

                  {galleryFiles.length > 0 && (
                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        Archivos: {galleryFiles.length}/{MAX_FOTOS}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {galleryFiles.map((f, idx) => (
                          <div
                            key={idx}
                            className="text-[11px] rounded-lg border border-black/10 dark:border-white/10 px-2 py-1 flex items-center gap-2"
                          >
                            <span className="max-w-[180px] truncate">{f.name}</span>
                            <button
                              type="button"
                              onClick={() => removeGalleryFile(idx)}
                              className="text-rose-500 font-semibold"
                            >
                              X
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={save}
                  className="rounded-xl bg-purple-600 text-white px-4 py-2 text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
