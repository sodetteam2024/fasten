"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

function getSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export default function ThemeSwitch() {
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const initial = saved ?? getSystemTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("theme", theme);
    applyTheme(theme);
  }, [theme, mounted]);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm shadow-sm transition hover:bg-accent"
      aria-label="Cambiar tema"
    >
      {theme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {theme === "dark" ? "Oscuro" : "Claro"}
      </span>
    </button>
  );
}
