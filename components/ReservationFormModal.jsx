"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const BUCKET = "areas";
const SIGNED_URL_TTL = 60 * 30;

async function resolveUrl(path) {
  if (!path) return null;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (data?.publicUrl) return data.publicUrl;

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);

  return signed?.signedUrl ?? null;
}

export default function ReservationFormModal({ open, selectedSpace, onClose }) {
  const [photos, setPhotos] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!selectedSpace) return;

    const loadPhotos = async () => {
      const list = [];

      if (selectedSpace.heroPath) list.push(selectedSpace.heroPath);

      for (const p of selectedSpace.photos || []) {
        if (p?.path) list.push(p.path);
      }

      const resolved = await Promise.all(list.map(resolveUrl));
      setPhotos(resolved.filter(Boolean));
      setIndex(0);
    };

    loadPhotos();
  }, [selectedSpace?.id]);

  if (!open || !selectedSpace) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl p-4 relative">
        <button onClick={onClose} className="absolute top-3 right-3">
          <X />
        </button>

        <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-black/10">
          {photos.length ? (
            <img src={photos[index]} className="w-full h-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageIcon className="h-12 w-12 opacity-40" />
            </div>
          )}

          {photos.length > 1 && (
            <>
              <button onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
                className="absolute left-2 top-1/2">◀</button>
              <button onClick={() => setIndex((i) => (i + 1) % photos.length)}
                className="absolute right-2 top-1/2">▶</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
