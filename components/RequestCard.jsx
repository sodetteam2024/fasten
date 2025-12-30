"use client";

import { useMemo, useState, useEffect } from "react";
import { Calendar, Eye, CheckCircle, MessageSquare, Shield, Send, Reply, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const ACCENT = "#7B2AE6";

function statusBadge(status) {
    switch (status) {
        case "enviada":
            return { label: "Enviada", variant: "secondary" };
        case "en_proceso":
            return { label: "En proceso", variant: "default" };
        case "resuelta":
            return { label: "Resuelta", variant: "outline" };
        case "cerrada":
            return { label: "Cerrada", variant: "outline" };
        default:
            return { label: status || "—", variant: "secondary" };
    }
}

export default function RequestCard({ request, onOpenEvidence, isAdmin, canReply, onReply }) {
    const badge = useMemo(() => statusBadge(request.estado), [request.estado]);
    const hasAdminReply = !!(request.respuesta_admin && String(request.respuesta_admin).trim().length > 0);

    const [openEditor, setOpenEditor] = useState(false);
    const [text, setText] = useState(request.respuesta_admin ?? "");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setText(request.respuesta_admin ?? "");
        if (hasAdminReply) setOpenEditor(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request.respuesta_admin]);

    const dateText = useMemo(() => {
        try {
            const d = request.fecha ? new Date(request.fecha) : null;
            if (!d || Number.isNaN(d.getTime())) return "—";
            return d.toLocaleString();
        } catch {
            return "—";
        }
    }, [request.fecha]);

    const save = async () => {
        const clean = (text || "").trim();
        if (!clean) return;

        setSaving(true);
        try {
            await onReply?.({ solicitudId: request.id, replyText: clean });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="border rounded-2xl bg-card text-foreground shadow-md dark:shadow-none">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="min-w-0">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" style={{ color: ACCENT }} />
                        <span className="truncate">{request.asunto}</span>
                    </CardTitle>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant={badge.variant}>{badge.label}</Badge>

                        {request.es_anonima && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border"
                                style={{ borderColor: `${ACCENT}66`, color: ACCENT }}
                            >
                                <Shield className="h-3.5 w-3.5" />
                                Anónima
                            </span>
                        )}

                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {dateText}
                        </span>
                    </div>
                </div>

                {request.imagen && (
                    <Button variant="outline" onClick={() => onOpenEvidence?.(request.imagen)} className="shrink-0">
                        <Eye className="h-4 w-4 mr-2" />
                        Evidencia
                    </Button>
                )}
            </CardHeader>

            <CardContent className="space-y-4">
                {request.descripcion && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.descripcion}</p>
                )}

                {/* ✅ La respuesta se ve para todos como antes */}
                {hasAdminReply && (
                    <div className="rounded-xl border p-3 bg-muted" style={{ borderColor: `${ACCENT}33` }}>
                        <div className="flex items-center gap-2 font-medium text-sm" style={{ color: ACCENT }}>
                            <CheckCircle className="h-4 w-4" />
                            Respuesta administración
                        </div>
                        <p className="text-sm mt-2 whitespace-pre-wrap">{request.respuesta_admin}</p>
                    </div>
                )}

                {/* Responder/Editar solo roles 1 y 2 (esto ya lo tenías) */}
                {isAdmin && canReply && (
                    <div className="pt-1">
                        <Button
                            variant="outline"
                            onClick={() => setOpenEditor((v) => !v)}
                            className="w-full justify-between"
                            style={{ borderColor: `${ACCENT}55` }}
                        >
                            <span className="inline-flex items-center gap-2">
                                {hasAdminReply ? (
                                    <>
                                        <Pencil className="h-4 w-4" style={{ color: ACCENT }} />
                                        Editar respuesta
                                    </>
                                ) : (
                                    <>
                                        <Reply className="h-4 w-4" style={{ color: ACCENT }} />
                                        Responder
                                    </>
                                )}
                            </span>
                            {openEditor ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>

                        {openEditor && (
                            <div className="mt-3 rounded-xl border p-3 bg-muted" style={{ borderColor: `${ACCENT}22` }}>
                                <Textarea
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Escribe la respuesta del administrador..."
                                    className="min-h-[90px]"
                                />

                                <div className="flex justify-end mt-3">
                                    <Button onClick={save} disabled={saving || !text.trim()} className="text-white" style={{ backgroundColor: ACCENT }}>
                                        <Send className="h-4 w-4 mr-2" />
                                        {saving ? "Guardando..." : hasAdminReply ? "Actualizar" : "Guardar respuesta"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
