"use client";

import { Calendar, Users } from "lucide-react";

export default function AnnouncementCard({
  icon = "users",
  role,        
  title,      
  tag,
  tagColor = "bg-slate-100 text-slate-600",
  children,
  footer,
}) {
  const Icon = icon === "calendar" ? Calendar : Users;

  return (
    <article className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center gap-3">
        <div
          className={`h-11 w-11 rounded-full flex items-center justify-center ${
            icon === "calendar"
              ? "bg-emerald-500/15 text-emerald-600"
              : "bg-blue-500/15 text-blue-600"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1">
          {/* 🔹 Línea principal: rol en negrita */}
          <h3 className="font-semibold leading-tight">
            {role || title}
          </h3>

          {/* 🔹 Debajo: título, más pequeño y sin negrita */}
          {role && title && (
            <p className="text-xs text-slate-600 mt-0.5">
              {title}
            </p>
          )}

          {/* (opcional) Badge si algún día quieres usar tag */}
          {tag && (
            <span
              className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs ${tagColor}`}
            >
              {tag}
            </span>
          )}
        </div>
      </div>

      {/* Cuerpo del anuncio */}
      <div className="mt-3 text-slate-700">{children}</div>

      {/* Footer (Publicado por..., switch, eliminar, etc.) */}
      {footer && (
        <div className="mt-3 text-sm text-slate-500">
          {footer}
        </div>
      )}
    </article>
  );
}
