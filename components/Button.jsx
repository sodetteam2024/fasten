import Link from "next/link"
export default function ButtonA({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition"
    >
      Añadir
    </button>
  )
}