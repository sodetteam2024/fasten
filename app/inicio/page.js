"use client"

import { SignedIn, SignedOut } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Carousel from "@/components/Carousel"
import AnnouncementCard from "@/components/AnnouncementCard"
import { supabase } from "@/lib/supabaseClient"
import ButtonA from "@/components/ButtonA"
import AnnouncementsSection from "../../components/AnnouncementsSection"

function RedirectTo({ path }) {
  const router = useRouter()

  useEffect(() => {
    router.replace(path)
  }, [path, router])

  return null
}

export default function HomePage() {
  const [novedades, setNovedades] = useState([])

  useEffect(() => {
    const fetchNovedades = async () => {
      const { data, error } = await supabase.rpc("get_novedades")

      if (error) {
        console.error("❌ Error al traer novedades:", error)
      } else {
        console.log("✅ Novedades desde función:", data)
        setNovedades(data)
      }
    }

    fetchNovedades()
  }, [])

  return (
    <>
      <SignedOut>
        <RedirectTo path="/" />
      </SignedOut>

      <SignedIn>
        <div className="mt-10 flex justify-center">
          <div className="w-full max-w-5xl shadow-2xl rounded-2xl overflow-hidden bg-white">
            <Carousel />
          </div>
        </div>

        <section className="mt-12 flex justify-center">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-2xl font-bold mb-6 text-slate-900 text-center">
              Publicaciones
            </h2>

            <div className="flex flex-col gap-6">
              <AnnouncementsSection/>
              
            </div>
          </div>
        </section>
      </SignedIn>
    </>
  )
}
