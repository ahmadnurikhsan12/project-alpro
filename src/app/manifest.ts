import type { MetadataRoute } from "next";

/** Manifest PWA: membuat MathQuest dapat dipasang seperti aplikasi. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MathQuest — Belajar SPLDV",
    short_name: "MathQuest",
    description: "Belajar Sistem Persamaan Linear Dua Variabel secara interaktif: materi, lab, latihan, evaluasi, dan game.",
    lang: "id",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f8fafc",
    theme_color: "#2546ea",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Materi", url: "/materi", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "SPLDV Lab", url: "/lab", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Games", url: "/games", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
