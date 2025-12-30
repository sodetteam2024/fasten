"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";

import RequestsToolbar from "@/components/RequestsToolbar";
import RequestForm from "@/components/RequestForm";
import RequestsList from "@/components/RequestsList";

const BUCKET = "solicitudes-evidencia";
const MAX_FILES = 5;
const ANON_KEY_STORAGE = "fasten_anon_key";
const ACCENT = "#7B2AE6";

export default function SolicitudesPage() {
  const { user, isLoaded } = useUser();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [dbUserId, setDbUserId] = useState(null);
  const [idUnidad, setIdUnidad] = useState(null);
  const [idRol, setIdRol] = useState(null);

  const isAdmin = idRol === 1 || idRol === 2;
  const canViewUnit = isAdmin && !!idUnidad;

  const [anonKey, setAnonKey] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [scope, setScope] = useState("mine");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    try {
      const existing = localStorage.getItem(ANON_KEY_STORAGE);
      if (existing) {
        setAnonKey(existing);
        return;
      }
      const created = crypto.randomUUID();
      localStorage.setItem(ANON_KEY_STORAGE, created);
      setAnonKey(created);
    } catch (e) {
      console.warn("No se pudo inicializar anonKey:", e);
      setAnonKey(null);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        if (!isLoaded) return;

        if (!user?.id) {
          setLoading(false);
          return;
        }

        setLoading(true);

        const { data: u, error: uErr } = await supabase
          .from("usuarios")
          .select("id_usuario, idrol")
          .eq("clerk_id", user.id)
          .maybeSingle();

        if (uErr) throw uErr;

        if (!u?.id_usuario) {
          setDbUserId(null);
          setIdRol(null);
          setIdUnidad(null);
          setRequests([]);
          setLoading(false);
          return;
        }

        setDbUserId(u.id_usuario);
        setIdRol(u.idrol);

        const { data: p, error: pErr } = await supabase
          .from("perfilesusuarios")
          .select("id_unidad")
          .eq("id_usuario", u.id_usuario)
          .order("fecha_registro", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pErr) throw pErr;

        setIdUnidad(p?.id_unidad ?? null);
      } catch (e) {
        console.error("Error cargando contexto:", e);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [isLoaded, user?.id]);

  const fetchRequests = async () => {
    if (!idUnidad) {
      setRequests([]);
      return;
    }

    setLoading(true);
    try {
      let q = supabase
        .from("solicitudes")
        .select("*")
        .eq("idunidad", idUnidad)
        .order("fecha", { ascending: false });

      if (!canViewUnit || scope === "mine") {
        if (!dbUserId) {
          setRequests([]);
          setLoading(false);
          return;
        }

        if (anonKey) {
          q = q.or(`idusuario.eq.${dbUserId},and(es_anonima.eq.true,anon_key.eq.${anonKey})`);
        } else {
          q = q.eq("idusuario", dbUserId);
        }
      }

      if (filterStatus !== "all") q = q.eq("estado", filterStatus);

      const { data, error } = await q;
      if (error) throw error;

      setRequests(
        (data ?? []).map((r) => ({
          id: r.id,
          asunto: r.asunto ?? "",
          descripcion: r.descripcion ?? "",
          estado: r.estado ?? "enviada",
          fecha: r.fecha ?? r.created_at,
          idunidad: r.idunidad,
          idusuario: r.idusuario,
          es_anonima: !!r.es_anonima,
          anon_key: r.anon_key ?? null,
          imagen: r.imagen ?? null,
          respuesta_admin: r.respuesta_admin ?? null,
          responded_at: r.responded_at ?? null,
        }))
      );
    } catch (e) {
      console.error("Error cargando solicitudes:", e);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!idUnidad) return;
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idUnidad, dbUserId, anonKey, scope, filterStatus]);

  const filteredRequests = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    if (!s) return requests;
    return requests.filter(
      (r) => (r.asunto || "").toLowerCase().includes(s) || (r.descripcion || "").toLowerCase().includes(s)
    );
  }, [requests, searchTerm]);

  const uploadFiles = async ({ solicitudId, files }) => {
    const limited = files.slice(0, MAX_FILES);
    const uploaded = [];

    for (const file of limited) {
      const safeName = `${crypto.randomUUID()}_${file.name}`.replace(/\s+/g, "_");
      const objectPath = `solicitudes/${solicitudId}/${safeName}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

      if (upErr) throw upErr;
      uploaded.push({ object_path: objectPath });
    }

    return uploaded;
  };

  const tryInsertAdjuntos = async ({ solicitudId, uploaded }) => {
    const rows = uploaded.map((u) => ({
      solicitud_id: solicitudId,
      object_path: u.object_path,
    }));
    const { error } = await supabase.from("solicitudes_adjuntos").insert(rows);
    return !error;
  };

  const getSignedUrl = async (objectPath) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(objectPath, 60);
    if (error) throw error;
    return data.signedUrl;
  };

  const handleCreate = async ({ asunto, descripcion, esAnonima, files }) => {
    if (!idUnidad || !dbUserId) return;

    if (esAnonima && !anonKey) {
      alert("No se pudo crear la llave anónima. Recarga la página.");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        idunidad: idUnidad,
        asunto: asunto.trim(),
        descripcion: (descripcion || "").trim(),
        estado: "enviada",
        es_anonima: !!esAnonima,
        idusuario: esAnonima ? null : dbUserId,
        anon_key: esAnonima ? anonKey : null,
      };

      const { data: created, error: insErr } = await supabase
        .from("solicitudes")
        .insert(payload)
        .select("*")
        .single();

      if (insErr) throw insErr;

      const solicitudId = created.id;
      const safeFiles = Array.isArray(files) ? files : [];

      if (safeFiles.length > 0) {
        const uploaded = await uploadFiles({ solicitudId, files: safeFiles });
        const inserted = await tryInsertAdjuntos({ solicitudId, uploaded });

        if (!inserted) {
          const first = uploaded[0]?.object_path ?? null;
          if (first) {
            await supabase.from("solicitudes").update({ imagen: first }).eq("id", solicitudId);
          }
        }
      }

      setShowForm(false);
      await fetchRequests();
    } catch (e) {
      console.error("Error creando solicitud:", e);
      alert("No se pudo crear la solicitud.");
      await fetchRequests();
    } finally {
      setCreating(false);
    }
  };

  const handleAdminReply = async ({ solicitudId, replyText }) => {
    if (!(idRol === 1 || idRol === 2)) return;

    const clean = (replyText || "").trim();
    if (!clean) return;

    setRequests((prev) =>
      prev.map((r) => (r.id === solicitudId ? { ...r, respuesta_admin: clean, responded_at: new Date().toISOString(), estado: "resuelta" } : r))
    );

    try {
      const { error } = await supabase
        .from("solicitudes")
        .update({
          respuesta_admin: clean,
          responded_at: new Date().toISOString(),
          estado: "resuelta",
        })
        .eq("id", solicitudId);

      if (error) throw error;
    } catch (e) {
      console.error("Error guardando respuesta admin:", e);
      alert("No se pudo guardar la respuesta.");
      await fetchRequests();
    }
  };

  return (
    <div className="p-4 md:p-8">
      {/* ✅ tokens: se adapta al dark mode correctamente */}
      <div className="max-w-6xl mx-auto rounded-3xl border bg-background text-foreground shadow-lg p-6 md:p-10 dark:shadow-none">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: ACCENT }}>
              Solicitudes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Crea solicitudes/quejas, adjunta evidencias y revisa el estado.
            </p>
          </div>

          <RequestsToolbar
            loading={loading}
            canViewUnit={canViewUnit}
            scope={canViewUnit ? scope : "mine"}
            onScopeChange={setScope}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterStatus={filterStatus}
            onFilterChange={setFilterStatus}
            onNew={() => setShowForm(true)}
          />
        </div>

        <div className="mt-6">
          <RequestForm
            open={showForm}
            onOpenChange={setShowForm}
            onSubmit={handleCreate}
            submitting={creating}
            maxFiles={MAX_FILES}
          />

          <RequestsList
            loading={loading}
            requests={filteredRequests}
            isAdmin={isAdmin}
            canReply={idRol === 1 || idRol === 2}
            onReply={handleAdminReply}
            onOpenEvidence={async (objectPathOrUrl) => {
              if (!objectPathOrUrl) return;
              if (objectPathOrUrl.startsWith("http")) {
                window.open(objectPathOrUrl, "_blank", "noopener,noreferrer");
                return;
              }
              try {
                const url = await getSignedUrl(objectPathOrUrl);
                window.open(url, "_blank", "noopener,noreferrer");
              } catch (e) {
                console.error(e);
                alert("No se pudo abrir la evidencia.");
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
