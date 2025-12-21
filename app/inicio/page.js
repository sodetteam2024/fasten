// app/inicio/page.js
"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Carousel from "@/components/Carousel";
import { supabase } from "@/lib/supabaseClient";
import AnnouncementsSection from "../../components/AnnouncementsSection";

function RedirectTo({ path }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(path);
  }, [path, router]);
  return null;
}

export default function HomePage() {
  const [novedades, setNovedades] = useState([]);

  useEffect(() => {
    const fetchNovedades = async () => {
      const { data, error } = await supabase.rpc("get_novedades");
      if (error) console.error("❌ Error al traer novedades:", error);
      else setNovedades(data);
    };
    fetchNovedades();
  }, []);

  return (
    <>
      <SignedOut>
        <RedirectTo path="/" />
      </SignedOut>

      <SignedIn>
        <div className="mt-10 flex justify-center">
          <div className="w-full max-w-5xl rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/80 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.55)]">
            <Carousel />
          </div>
        </div>

        <section className="mt-12 flex justify-center">
          <div className="w-full max-w-4xl rounded-2xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/80 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.55)] p-6">
            <h2 className="text-2xl font-bold mb-6 text-foreground text-center">
              Publicaciones
            </h2>

            <div className="flex flex-col gap-6">
              <AnnouncementsSection />
            </div>
          </div>
        </section>
      </SignedIn>
    </>
  );
}
