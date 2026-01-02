// app/api/upload-qr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// 🔐 Cliente ADMIN (service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const QR_BUCKET = "qr_path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const idUnidad = formData.get("idUnidad") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Archivo no enviado." },
        { status: 400 }
      );
    }

    if (!idUnidad) {
      return NextResponse.json(
        { error: "idUnidad es requerido." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "png";
    const path = `unidad_${idUnidad}/${crypto.randomUUID()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabaseAdmin.storage
      .from(QR_BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ path });
  } catch (err: any) {
    console.error("UPLOAD QR ERROR:", err);
    return NextResponse.json(
      { error: "Error interno subiendo el QR." },
      { status: 500 }
    );
  }
}
