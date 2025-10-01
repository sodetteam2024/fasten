// components/AnnouncementCard.jsx
import { Calendar, Users } from "lucide-react";

export default function AnnouncementCard({
  icon = "users",
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
            icon === "calendar" ? "bg-emerald-500/15 text-emerald-600" : "bg-blue-500/15 text-blue-600"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold leading-tight">{title}</h3>
          {tag && (
            <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs ${tagColor}`}>
              {tag}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 text-slate-700">{children}</div>

      {footer && <div className="mt-3 text-sm text-slate-500">{footer}</div>}
    </article>
  );
}
