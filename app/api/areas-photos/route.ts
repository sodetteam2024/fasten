import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    /* ============================
       Auth Clerk (✅ await)
    ============================ */
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    /* ============================
       Body
    ============================ */
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    // ✅ ya no recibimos ni usamos "orden"
    const { id_area, path } = body ?? {};
    if (!id_area || !path) {
      return NextResponse.json(
        { error: "Faltan datos: id_area o path" },
        { status: 400 }
      );
    }

    /* ============================
       Supabase Service Role
    ============================ */
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    /* ============================
       Validar usuario y rol
    ============================ */
    const { data: usuario, error: userErr } = await supabaseAdmin
      .from("usuarios")
      .select("id_usuario, idrol")
      .eq("clerk_id", userId)
      .single();

    if (userErr || !usuario) {
      return NextResponse.json(
        { error: "Usuario no existe en DB" },
        { status: 403 }
      );
    }

    if (![1, 2].includes(usuario.idrol)) {
      return NextResponse.json(
        { error: "Sin permisos (no admin)" },
        { status: 403 }
      );
    }

    /* ============================
       Validar unidad
    ============================ */
    const { data: perfil, error: perfilErr } = await supabaseAdmin
      .from("perfilesusuarios")
      .select("id_unidad")
      .eq("id_usuario", usuario.id_usuario)
      .single();

    if (perfilErr || !perfil?.id_unidad) {
      return NextResponse.json({ error: "Perfil sin unidad" }, { status: 403 });
    }

    const { data: area, error: areaErr } = await supabaseAdmin
      .from("areas")
      .select("id, idunidad")
      .eq("id", id_area)
      .single();

    if (areaErr || !area) {
      return NextResponse.json({ error: "Área no existe" }, { status: 404 });
    }

    if (Number(area.idunidad) !== Number(perfil.id_unidad)) {
      return NextResponse.json(
        { error: "Área no pertenece a tu unidad" },
        { status: 403 }
      );
    }

    /* ============================
       Insertar foto (bypass RLS)
       ✅ sin columna 'orden'
    ============================ */
    const { data: row, error: insertErr } = await supabaseAdmin
      .from("areas_fotos")
      .insert([{ id_area, path }])
      .select("id, id_area, path, created_at")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 409 });
    }

    return NextResponse.json({ row }, { status: 200 });
  } catch (err: any) {
    console.error("API areas-photos error:", err);
    return NextResponse.json(
      { error: err?.message || "Error interno" },
      { status: 500 }
    );
  }
}
