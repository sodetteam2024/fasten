"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Sun, Moon } from "lucide-react";

export default function ThemeSwitch() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = (theme === "dark") || (theme === "system" && resolvedTheme === "dark");

  return (
    <div className="flex items-center gap-2">
      <Sun className={`h-4 w-4 ${isDark ? "text-white/50" : "text-amber-500"}`} />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Cambiar tema"
      />
      <Moon className={`h-4 w-4 ${isDark ? "text-sky-300" : "text-slate-400"}`} />
    </div>
  );
}
