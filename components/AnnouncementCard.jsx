"use client";

import { Calendar, Users } from "lucide-react";

export default function AnnouncementCard({
  icon = "users",
  role,
  title,
  tag,
  tagColor = "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/70",
  children,
  footer,
}) {
  const Icon = icon === "calendar" ? Calendar : Users;

  const iconStyle =
    icon === "calendar"
      ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300"
      : "bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300";

  return (
    <article className="rounded-2xl shadow p-5 bg-white dark:bg-zinc-950/70 border border-black/5 dark:border-white/10">
      <div className="flex items-center gap-3">
        <div
          className={`h-11 w-11 rounded-full flex items-center justify-center ${iconStyle}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold leading-tight text-slate-900 dark:text-white truncate">
            {role || title}
          </h3>

          {role && title && (
            <p className="text-xs text-slate-600 dark:text-white/70 mt-0.5 truncate">
              {title}
            </p>
          )}

          {tag && (
            <span
              className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs ${tagColor}`}
            >
              {tag}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 text-slate-700 dark:text-white/80">{children}</div>

      {footer && (
        <div className="mt-3 text-sm text-slate-500 dark:text-white/60">
          {footer}
        </div>
      )}
    </article>
  );
}
