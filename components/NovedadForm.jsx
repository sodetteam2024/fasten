"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function NovedadForm() {
  const [idUnidad, setIdUnidad] = useState("")
  const [idTipo, setIdTipo] = useState("")
  const [cuerpo, setCuerpo] = useState("")
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMensaje("")

    const { error } = await supabase.rpc("insertar_novedad", {
      p_id_unidad: parseInt(idUnidad),
      p_id_tipo: parseInt(idTipo),
      p_cuerpo: cuerpo,
      p_estado: true,
    })

    if (error) {
      console.error("❌ Error:", error)
      setMensaje("Hubo un error al guardar la novedad")
    } else {
      setMensaje("✅ Novedad agregada con éxito")
      setIdUnidad("")
      setIdTipo("")
      setCuerpo("")
    }

    setLoading(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 p-4 border rounded-lg shadow-sm bg-slate-50"
    >
      <h3 className="text-lg font-semibold mb-4">Agregar Novedad</h3>

      <div className="flex flex-col gap-3">
        <input
          type="number"
          placeholder="ID Unidad"
          value={idUnidad}
          onChange={(e) => setIdUnidad(e.target.value)}
          required
          className="border p-2 rounded w-full"
        />

        <input
          type="number"
          placeholder="ID Tipo"
          value={idTipo}
          onChange={(e) => setIdTipo(e.target.value)}
          required
          className="border p-2 rounded w-full"
        />

        <textarea
          placeholder="Descripción de la novedad"
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          required
          className="border p-2 rounded w-full"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Guardando..." : "Agregar Novedad"}
        </button>
      </div>

      {mensaje && <p className="mt-3 text-green-600">{mensaje}</p>}
    </form>
  )
}
