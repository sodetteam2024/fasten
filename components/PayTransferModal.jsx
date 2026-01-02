"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    X,
    Upload,
    Loader2,
    Copy,
    CheckCircle2,
    QrCode,
    Building2,
    FileText,
    ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const BUCKET_QR = "qr_path";
const BUCKET_COMPROBANTE = "comprobante_path";
const SIGNED_URL_TTL = 60 * 30; // 30 min

function money(v) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
    }).format(Number(v || 0));
}

function normalize(x) {
    return String(x || "").toLowerCase().trim();
}

// ✅ intenta firmada y si falla usa public
async function resolveStorageUrl(bucket, path) {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;

    const { data: signed, error: errSigned } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, SIGNED_URL_TTL);

    if (!errSigned && signed?.signedUrl) return signed.signedUrl;

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    return pub?.publicUrl || "";
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

/**
 * Props:
 * open: boolean
 * onClose: () => void
 * usuarioDb: { id_usuario }  // uuid
 * perfilDb: { id_unidad }    // int
 * payingIds: string[]        // ids cargos
 * cargos: array cargos (para total + detalle)
 * onDone: () => void         // refrescar page (loadAll)
 */
export default function PayTransferModal({
    open,
    onClose,
    usuarioDb,
    perfilDb,
    payingIds,
    cargos,
    onDone,
}) {
    const fileRef = useRef(null);

    const [loadingConfig, setLoadingConfig] = useState(false);
    const [cuentas, setCuentas] = useState([]); // JSON desde pagos_config
    const [selectedAccountIdx, setSelectedAccountIdx] = useState(0);

    const [nota, setNota] = useState("");
    const [file, setFile] = useState(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState("");
    const [fileUploading, setFileUploading] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [copiedKey, setCopiedKey] = useState("");

    const payingSet = useMemo(() => new Set((payingIds || []).map(String)), [payingIds]);

    const selectedCargos = useMemo(() => {
        return (cargos || []).filter((c) => payingSet.has(String(c.id)));
    }, [cargos, payingSet]);

    const total = useMemo(() => {
        return selectedCargos.reduce((s, c) => s + Number(c.valor || 0), 0);
    }, [selectedCargos]);

    const canSubmit = Boolean(
        usuarioDb?.id_usuario &&
        perfilDb?.id_unidad &&
        selectedCargos.length > 0 &&
        total > 0 &&
        file
    );

    // reset modal
    useEffect(() => {
        if (!open) {
            setCuentas([]);
            setSelectedAccountIdx(0);
            setNota("");
            setFile(null);
            if (filePreviewUrl) {
                try {
                    URL.revokeObjectURL(filePreviewUrl);
                } catch { }
            }
            setFilePreviewUrl("");
            setSubmitting(false);
            setFileUploading(false);
            setCopiedKey("");
            return;
        }
    }, [open, filePreviewUrl]);

    // cargar config (pagos_config)
    useEffect(() => {
        if (!open) return;
        if (!perfilDb?.id_unidad) return;

        const loadConfig = async () => {
            setLoadingConfig(true);
            try {
                const { data, error } = await supabase
                    .from("pagos_config")
                    .select("idunidad, cuentas, updated_at")
                    .eq("idunidad", perfilDb.id_unidad)
                    .single();

                if (error) {
                    console.warn("No se pudo cargar pagos_config:", error);
                    setCuentas([]);
                    return;
                }

                const raw = data?.cuentas;
                const parsed = Array.isArray(raw) ? raw : [];
                setCuentas(parsed);
            } finally {
                setLoadingConfig(false);
            }
        };

        loadConfig();
    }, [open, perfilDb?.id_unidad]);

    // selector seguro
    useEffect(() => {
        if (!open) return;
        if (!cuentas?.length) {
            setSelectedAccountIdx(0);
            return;
        }
        if (selectedAccountIdx >= cuentas.length) setSelectedAccountIdx(0);
    }, [open, cuentas, selectedAccountIdx]);

    if (!open) return null;

    const selectedAccount = cuentas?.[selectedAccountIdx] || null;

    const pickFile = () => fileRef.current?.click?.();

    const onFileChange = (e) => {
        const f = e.target.files?.[0] || null;
        e.target.value = "";
        if (!f) return;

        const ok =
            f.type.startsWith("image/") ||
            f.type === "application/pdf" ||
            f.name.toLowerCase().endsWith(".pdf");

        if (!ok) return alert("Sube una imagen (JPG/PNG) o PDF.");

        const maxMb = 8;
        if (f.size > maxMb * 1024 * 1024) return alert(`Máximo ${maxMb}MB.`);

        if (filePreviewUrl) {
            try {
                URL.revokeObjectURL(filePreviewUrl);
            } catch { }
        }

        setFile(f);
        if (f.type.startsWith("image/")) {
            setFilePreviewUrl(URL.createObjectURL(f));
        } else {
            setFilePreviewUrl("");
        }
    };

    const removeFile = () => {
        if (filePreviewUrl) {
            try {
                URL.revokeObjectURL(filePreviewUrl);
            } catch { }
        }
        setFile(null);
        setFilePreviewUrl("");
    };

    const doCopy = async (label, text) => {
        if (!text) return;
        const ok = await copyToClipboard(text);
        if (!ok) return alert("No se pudo copiar. Copia manualmente.");
        setCopiedKey(label);
        setTimeout(() => setCopiedKey(""), 1200);
    };

    const uploadComprobante = async ({ unidadId, userId }) => {
        if (!file) throw new Error("No hay archivo.");

        setFileUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("idUnidad", String(unidadId));
            fd.append("idUsuario", String(userId));

            const res = await fetch("/api/upload-comprobante", {
                method: "POST",
                body: fd,
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.error || "No se pudo subir el comprobante.");
            }

            // ✅ devuelve path en bucket
            return json.path;
        } finally {
            setFileUploading(false);
        }
    };

    const submit = async () => {
        if (!canSubmit) {
            if (!file) return alert("Sube el comprobante.");
            return alert("Faltan datos para enviar el pago.");
        }

        if (!selectedAccount) {
            return alert("La administración aún no configuró cuentas de pago.");
        }

        setSubmitting(true);
        try {
            const idunidad = perfilDb.id_unidad;
            const id_usuario = usuarioDb.id_usuario;

            // 1) subir comprobante
            const comprobante_path = await uploadComprobante({
                unidadId: idunidad,
                userId: id_usuario,
            });

            // 2) crear pago (pendiente_verificacion)
            const payloadPago = {
                id_usuario,
                total,
                estado: "pendiente_verificacion",
                metodo: "transferencia",
                proveedor: "manual",
                ref_externa: null,
                comprobante_path, // ✅ path en bucket comprobante_path
                nota: nota?.trim() || null,
            };

            const { data: pago, error: errPago } = await supabase
                .from("pagos")
                .insert([payloadPago])
                .select("id, total, estado, created_at")
                .single();

            if (errPago || !pago?.id) {
                await supabase.storage.from(BUCKET_COMPROBANTE).remove([comprobante_path]);
                throw new Error(errPago?.message || "No se pudo crear el pago.");
            }

            // 3) detalle (uno por cargo)
            const detalleRows = selectedCargos.map((c) => ({
                id_pago: pago.id,
                id_cargo: c.id,
                valor: Number(c.valor || 0),
            }));

            const { error: errDet } = await supabase.from("pagos_detalle").insert(detalleRows);

            if (errDet) {
                await supabase.from("pagos").delete().eq("id", pago.id);
                await supabase.storage.from(BUCKET_COMPROBANTE).remove([comprobante_path]);
                throw new Error(errDet?.message || "No se pudo crear el detalle del pago.");
            }

            alert("✅ Listo. Tu pago quedó en verificación. Administración lo aprobará.");
            onClose?.();
            onDone?.();
        } catch (err) {
            console.error(err);
            alert(err?.message || "No se pudo enviar el pago.");
        } finally {
            setSubmitting(false);
        }
    };

    const disabledClose = submitting || fileUploading;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-black/85 shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10">
                    <div className="min-w-0">
                        <p className="text-base font-semibold">Pagar por transferencia</p>
                        <p className="text-xs text-muted-foreground">
                            Total: <span className="font-semibold">{money(total)}</span>{" "}
                            <span className="mx-2">•</span>
                            Cargos: <span className="font-semibold">{selectedCargos.length}</span>
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => !disabledClose && onClose?.()}
                        disabled={disabledClose}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60"
                        aria-label="Cerrar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Info */}
                    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
                        <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center">
                                <ShieldCheck className="h-5 w-5 text-purple-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold">Verificación por administración</p>
                                <p className="text-sm text-muted-foreground">
                                    Realiza la transferencia, sube el comprobante y tu pago quedará en{" "}
                                    <b>pendiente de verificación</b>.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Cuentas */}
                    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold">Cuenta de administración</p>
                                <p className="text-xs text-muted-foreground">
                                    {loadingConfig
                                        ? "Cargando configuración..."
                                        : cuentas?.length
                                            ? "Selecciona una cuenta para transferir."
                                            : "Aún no hay cuentas configuradas."}
                                </p>
                            </div>

                            {cuentas?.length ? (
                                <Badge className="bg-white/60 dark:bg-white/10 border border-black/10 dark:border-white/10 text-slate-700 dark:text-white">
                                    Transferencia
                                </Badge>
                            ) : null}
                        </div>

                        {cuentas?.length ? (
                            <div className="mt-3 space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {cuentas.map((acc, idx) => {
                                        const active = idx === selectedAccountIdx;
                                        const title = acc?.alias || acc?.banco || `Cuenta ${idx + 1}`;
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setSelectedAccountIdx(idx)}
                                                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${active
                                                        ? "border-transparent bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] text-white"
                                                        : "border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10"
                                                    }`}
                                            >
                                                {title}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Building2 className="h-4 w-4 text-slate-500" />
                                            <p className="text-sm font-semibold truncate">
                                                {selectedAccount?.alias || selectedAccount?.banco || "Cuenta"}
                                            </p>
                                        </div>

                                        <div className="text-xs text-muted-foreground space-y-1">
                                            {selectedAccount?.banco ? (
                                                <div className="flex items-center justify-between gap-2">
                                                    <span>Banco</span>
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        {selectedAccount.banco}
                                                    </span>
                                                </div>
                                            ) : null}

                                            {selectedAccount?.tipo ? (
                                                <div className="flex items-center justify-between gap-2">
                                                    <span>Tipo</span>
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        {selectedAccount.tipo}
                                                    </span>
                                                </div>
                                            ) : null}

                                            {selectedAccount?.numero ? (
                                                <div className="flex items-center justify-between gap-2">
                                                    <span>Número</span>
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        {selectedAccount.numero}
                                                    </span>
                                                </div>
                                            ) : null}

                                            {selectedAccount?.titular ? (
                                                <div className="flex items-center justify-between gap-2">
                                                    <span>Titular</span>
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        {selectedAccount.titular}
                                                    </span>
                                                </div>
                                            ) : null}

                                            {selectedAccount?.documento ? (
                                                <div className="flex items-center justify-between gap-2">
                                                    <span>Documento</span>
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        {selectedAccount.documento}
                                                    </span>
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {selectedAccount?.numero ? (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => doCopy("numero", String(selectedAccount.numero))}
                                                >
                                                    {copiedKey === "numero" ? (
                                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                                    ) : (
                                                        <Copy className="h-4 w-4 mr-2" />
                                                    )}
                                                    Copiar número
                                                </Button>
                                            ) : null}

                                            {selectedAccount?.titular ? (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => doCopy("titular", String(selectedAccount.titular))}
                                                >
                                                    {copiedKey === "titular" ? (
                                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                                    ) : (
                                                        <Copy className="h-4 w-4 mr-2" />
                                                    )}
                                                    Copiar titular
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <QrCode className="h-4 w-4 text-slate-500" />
                                            <p className="text-sm font-semibold">QR (opcional)</p>
                                        </div>

                                        {selectedAccount?.qr_path ? (
                                            <QrPreview qrPath={selectedAccount.qr_path} />
                                        ) : (
                                            <p className="text-xs text-muted-foreground">
                                                Esta cuenta no tiene QR configurado.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-3 rounded-xl border border-dashed border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4 text-sm text-muted-foreground">
                                La administración debe configurar al menos una cuenta en el panel administrativo.
                            </div>
                        )}
                    </div>

                    {/* Cargos */}
                    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
                        <p className="text-sm font-semibold mb-2">Cargos incluidos</p>
                        <div className="space-y-2">
                            {selectedCargos.map((c) => (
                                <div key={c.id} className="flex items-center justify-between text-sm">
                                    <span className="truncate pr-3">{c.concepto}</span>
                                    <span className="font-semibold">{money(c.valor)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Nota */}
                    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-slate-500" />
                            <p className="text-sm font-semibold">Nota (opcional)</p>
                        </div>
                        <textarea
                            value={nota}
                            onChange={(e) => setNota(e.target.value)}
                            className="w-full min-h-[80px] rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none"
                            placeholder="Ej: Transferí desde Bancolombia a las 3:25pm..."
                            disabled={submitting || fileUploading}
                        />
                    </div>

                    {/* Upload */}
                    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div>
                                <p className="text-sm font-semibold">Comprobante *</p>
                                <p className="text-xs text-muted-foreground">Sube una imagen o PDF del comprobante.</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                    onChange={onFileChange}
                                />

                                {!file ? (
                                    <Button type="button" variant="secondary" onClick={pickFile} disabled={submitting || fileUploading}>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Subir
                                    </Button>
                                ) : (
                                    <>
                                        <Button type="button" variant="secondary" onClick={pickFile} disabled={submitting || fileUploading}>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Cambiar
                                        </Button>
                                        <Button type="button" variant="secondary" onClick={removeFile} disabled={submitting || fileUploading}>
                                            Quitar
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {file ? (
                            <div className="mt-3">
                                <div className="text-xs text-muted-foreground">
                                    Archivo: <span className="font-semibold">{file.name}</span>{" "}
                                    <span className="mx-2">•</span>
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </div>

                                {filePreviewUrl ? (
                                    <div className="mt-3 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                                        <img
                                            src={filePreviewUrl}
                                            alt="preview"
                                            className="w-full max-h-[260px] object-contain"
                                            draggable={false}
                                        />
                                    </div>
                                ) : (
                                    <div className="mt-3 rounded-xl border border-dashed border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4 text-sm text-muted-foreground">
                                        PDF cargado ✅ (sin vista previa).
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="mt-3 rounded-xl border border-dashed border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4 text-sm text-muted-foreground">
                                Aún no has subido el comprobante.
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button type="button" variant="secondary" onClick={() => !disabledClose && onClose?.()} disabled={disabledClose}>
                            Cancelar
                        </Button>

                        <Button
                            type="button"
                            onClick={submit}
                            disabled={!canSubmit || submitting || fileUploading || loadingConfig || !cuentas?.length}
                            className="bg-gradient-to-r from-[#7b2ae6] to-[#f9b009] text-white"
                        >
                            {submitting || fileUploading ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Enviando...
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4" />
                                    Enviar a verificación
                                </span>
                            )}
                        </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                        Se creará un registro en <b>pagos</b> como <b>pendiente_verificacion</b>. Administración lo aprobará o rechazará.
                    </p>
                </div>
            </div>
        </div>
    );
}

function QrPreview({ qrPath }) {
    const [url, setUrl] = useState("");

    useEffect(() => {
        let mounted = true;

        (async () => {
            const u = await resolveStorageUrl(BUCKET_QR, qrPath);
            if (mounted) setUrl(u || "");
        })();

        return () => {
            mounted = false;
        };
    }, [qrPath]);

    if (!url) {
        return (
            <p className="text-xs text-muted-foreground">
                No se pudo cargar el QR (revisa el path en pagos_config y permisos del bucket).
            </p>
        );
    }

    return (
        <div className="rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-2 flex items-center justify-center">
            <img src={url} alt="QR" className="max-h-[200px] w-auto object-contain" draggable={false} />
        </div>
    );
}
