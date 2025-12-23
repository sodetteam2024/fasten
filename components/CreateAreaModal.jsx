"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

export default function CreateAreaModal({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setCreating(false);
    }
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e?.preventDefault?.();
    const trimmed = name.trim();
    if (!trimmed) return alert("Ingresa un nombre para el área.");

    setCreating(true);
    try {
      await onCreate(trimmed);
      onClose();
    } catch (err) {
      console.error(err);
      alert(err?.message || "No se pudo crear el área.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-black/85 shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10">
          <h3 className="text-base font-semibold">Nueva área</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Nombre del área</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400/40"
              placeholder="Ej: Salón social"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 text-white px-4 py-2 text-sm font-semibold hover:bg-purple-700 transition disabled:opacity-70"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Crear área
          </button>
        </form>
      </div>
    </div>
  );
}
