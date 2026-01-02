// app/api/upload-comprobante/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const BUCKET = "comprobante_path";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const file = form.get("file");
    const idUnidad = String(form.get("idUnidad") || "").trim();
    const idUsuario = String(form.get("idUsuario") || "").trim();

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Archivo inválido." }, { status: 400 });
    }
    if (!idUnidad || !idUsuario) {
      return NextResponse.json(
        { error: "Faltan idUnidad o idUsuario." },
        { status: 400 }
      );
    }

    // Validaciones
    const name = file.name || "comprobante";
    const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
    const mime = file.type || "";

    const isImg = mime.startsWith("image/");
    const isPdf = mime === "application/pdf" || ext === "pdf";
    if (!isImg && !isPdf) {
      return NextResponse.json(
        { error: "Solo se permite imagen (JPG/PNG) o PDF." },
        { status: 400 }
      );
    }

    const maxMb = 8;
    if (file.size > maxMb * 1024 * 1024) {
      return NextResponse.json(
        { error: `Máximo permitido: ${maxMb}MB.` },
        { status: 400 }
      );
    }

    // Path estándar
    const safeExt = ext || (isPdf ? "pdf" : "jpg");
    const filename = `${crypto.randomUUID()}.${safeExt}`;
    const path = `unidad_${idUnidad}/user_${idUsuario}/${filename}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: mime || (isPdf ? "application/pdf" : "image/jpeg"),
        upsert: false,
      });

    if (error) {
      return NextResponse.json(
        { error: error.message || "No se pudo subir el comprobante." },
        { status: 400 }
      );
    }

    return NextResponse.json({ path }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Error inesperado subiendo comprobante." },
      { status: 500 }
    );
  }
}
