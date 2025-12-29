import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const {
      nombre,
      estado,
      pricing_type,
      valor_hora,
      valor_fijo,
      max_horas_fijo,
      capacidad,
      descripcion,
      imagen_principal,
    } = body ?? {};

    if (!nombre || !String(nombre).trim()) {
      return NextResponse.json({ error: "Falta nombre" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Validar usuario y rol
    const { data: usuario, error: userErr } = await supabaseAdmin
      .from("usuarios")
      .select("id_usuario, idrol")
      .eq("clerk_id", userId)
      .single();

    if (userErr || !usuario) {
      return NextResponse.json({ error: "Usuario no existe en DB" }, { status: 403 });
    }

    if (![1, 2].includes(usuario.idrol)) {
      return NextResponse.json({ error: "Sin permisos (no admin)" }, { status: 403 });
    }

    // Unidad del admin
    const { data: perfil, error: perfilErr } = await supabaseAdmin
      .from("perfilesusuarios")
      .select("id_unidad")
      .eq("id_usuario", usuario.id_usuario)
      .single();

    if (perfilErr || !perfil?.id_unidad) {
      return NextResponse.json({ error: "Perfil sin unidad" }, { status: 403 });
    }

    const payload = {
      idunidad: perfil.id_unidad,
      nombre: String(nombre).trim().toLowerCase(),
      estado: estado || "activa",
      pricing_type: pricing_type || "por_hora",
      valor_hora: Number(valor_hora ?? 0) || 0,
      valor_fijo: Number(valor_fijo ?? 0) || 0,
      max_horas_fijo: Number(max_horas_fijo ?? 0) || 0,
      capacidad: capacidad === null || capacidad === undefined || capacidad === ""
        ? null
        : Math.max(1, Number(capacidad) || 1),
      descripcion: descripcion ? String(descripcion).trim() : null,
      imagen_principal: imagen_principal || null,
    };

    const { data: area, error: insertErr } = await supabaseAdmin
      .from("areas")
      .insert([payload])
      .select(
        "id, idunidad, nombre, estado, pricing_type, valor_hora, valor_fijo, max_horas_fijo, imagen_principal, capacidad, descripcion"
      )
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 409 });
    }

    return NextResponse.json({ area }, { status: 200 });
  } catch (err: any) {
    console.error("API areas create error:", err);
    return NextResponse.json(
      { error: err?.message || "Error interno" },
      { status: 500 }
    );
  }
}
