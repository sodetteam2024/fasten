import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    console.log("📩 Recibiendo request en /api/create-user");
    const body = await req.json();
    console.log("🧾 Datos recibidos:", body);

    const {
      email,
      username,
      password,
      nombre,
      apellido,
      telefono,
      id_unidad,
      id_direccion,
      tipo_documento,
      nro_documento,
      idrol, // 👈 rol recibido
    } = body;

    if (!idrol) {
      return NextResponse.json(
        { error: "Falta el campo idrol (rol del usuario)" },
        { status: 400 }
      );
    }

    // 1️⃣ Crear usuario en Clerk
    console.log("🚀 Creando usuario en Clerk...");
    const clerkResponse = await fetch("https://api.clerk.com/v1/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
      body: JSON.stringify({
        email_address: [email],
        username,
        password: password || "Temporal123*",
        first_name: nombre,
        last_name: apellido,
      }),
    });

    const clerkText = await clerkResponse.text();
    if (!clerkResponse.ok) {
      console.error("❌ Error creando usuario en Clerk:", clerkText);
      return NextResponse.json(
        { error: "Error creando usuario en Clerk", details: clerkText },
        { status: 500 }
      );
    }

    const clerkUser = JSON.parse(clerkText);
    const clerkId = clerkUser.id;
    console.log("✅ Usuario Clerk creado:", clerkId);

    // 2️⃣ Insertar en tabla usuarios (incluye idrol)
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .insert([
        {
          clerk_id: clerkId,
          email,
          nombre_usuario: username || `${nombre}.${apellido}`.toLowerCase(),
          idrol: parseInt(idrol), // 👈 aquí se guarda el rol
        },
      ])
      .select("id_usuario")
      .single();

    if (userError || !userData) {
      console.error("❌ Error insertando en usuarios:", userError);

      // rollback en Clerk
      await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
      });

      return NextResponse.json(
        {
          error: "Error insertando en usuarios, rollback en Clerk realizado",
          details: userError?.message,
        },
        { status: 500 }
      );
    }

    const id_usuario = userData.id_usuario;
    console.log("🧩 Usuario insertado en Supabase con id_usuario:", id_usuario);

    // 3️⃣ Insertar en perfilesusuarios
    const { error: perfilError } = await supabase
      .from("perfilesusuarios")
      .insert([
        {
          id_usuario,
          correo: email,
          id_unidad: id_unidad ? parseInt(id_unidad) : null,
          telefono,
          tipo_documento: tipo_documento ? parseInt(tipo_documento) : null,
          nro_documento,
          id_direccion: id_direccion ? parseInt(id_direccion) : null,
          nombre,
          apellido,
        },
      ]);

    if (perfilError) {
      console.error("❌ Error insertando en perfilesusuarios:", perfilError);

      // rollback: borrar usuario en supabase y clerk
      await supabase.from("usuarios").delete().eq("id_usuario", id_usuario);
      await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
      });

      return NextResponse.json(
        {
          error: "Error insertando en perfilesusuarios, rollback realizado",
          details: perfilError.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ Usuario creado correctamente en Clerk y Supabase");

    return NextResponse.json(
      {
        message: "Usuario creado correctamente",
        clerk_id: clerkId,
        id_usuario,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("💥 Error general en create-user:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
