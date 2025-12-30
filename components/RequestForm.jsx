"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, X, Send, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ACCENT = "#7B2AE6";

export default function RequestForm({ open, onOpenChange, onSubmit, submitting, maxFiles = 5 }) {
    const fileRef = useRef(null);
    const [asunto, setAsunto] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [esAnonima, setEsAnonima] = useState(false);
    const [files, setFiles] = useState([]);

    useEffect(() => {
        if (!open) {
            setAsunto("");
            setDescripcion("");
            setEsAnonima(false);
            setFiles([]);
        }
    }, [open]);

    const canSubmit = useMemo(() => asunto.trim().length >= 3 && !submitting, [asunto, submitting]);

    const handlePickFiles = () => fileRef.current?.click();

    const handleFiles = (evt) => {
        const picked = Array.from(evt.target.files || []);
        if (!picked.length) return;

        const remaining = Math.max(0, maxFiles - files.length);
        setFiles((prev) => [...prev, ...picked.slice(0, remaining)]);
        evt.target.value = "";
    };

    const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

    const submit = async () => {
        if (!canSubmit) return;
        await onSubmit({ asunto, descripcion, esAnonima, files });
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                <Card className="border bg-white text-foreground dark:bg-black dark:border-neutral-800">
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle className="text-xl">Nueva Solicitud</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">Adjunta evidencias si aplica.</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} disabled={submitting}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <Label>Asunto *</Label>
                            <Input value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="Ej: Ruido..." />
                        </div>

                        <div className="space-y-2">
                            <Label>Descripción</Label>
                            <Textarea
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                placeholder="Qué pasó, dónde y cuándo."
                                className="min-h-[120px]"
                            />
                        </div>

                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <button
                                type="button"
                                onClick={() => setEsAnonima((v) => !v)}
                                className={[
                                    "inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl border transition",
                                    esAnonima ? "bg-white dark:bg-neutral-900" : "bg-white dark:bg-black",
                                ].join(" ")}
                                style={{ borderColor: esAnonima ? `${ACCENT}66` : undefined, color: esAnonima ? ACCENT : undefined }}
                                disabled={submitting}
                            >
                                <Shield className="h-4 w-4" style={{ color: esAnonima ? ACCENT : undefined }} />
                                {esAnonima ? "Anónima (no guarda usuario)" : "No anónima"}
                            </button>

                            <div className="flex items-center gap-2">
                                <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple onChange={handleFiles} className="hidden" />
                                <Button variant="outline" onClick={handlePickFiles} disabled={submitting || files.length >= maxFiles}>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Adjuntar ({files.length}/{maxFiles})
                                </Button>

                                <Button onClick={submit} disabled={!canSubmit} className="text-white" style={{ backgroundColor: ACCENT }}>
                                    <Send className="h-4 w-4 mr-2" />
                                    {submitting ? "Enviando..." : "Enviar"}
                                </Button>
                            </div>
                        </div>

                        {files.length > 0 && (
                            <div className="rounded-xl border p-3 bg-white dark:bg-neutral-900 dark:border-neutral-800">
                                <p className="text-sm font-medium mb-2">Archivos</p>
                                <div className="space-y-2">
                                    {files.map((f, idx) => (
                                        <div key={`${f.name}-${idx}`} className="flex items-center justify-between gap-3 text-sm">
                                            <span className="truncate text-muted-foreground">{f.name}</span>
                                            <Button variant="ghost" size="icon" onClick={() => removeFile(idx)} disabled={submitting}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
