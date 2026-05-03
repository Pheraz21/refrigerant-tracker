import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "21 Degrees F-Gas Tracker",
    short_name: "F-Gas Tracker",
    description: "Refrigerant cylinder tracking and compliance for 21 Degrees Ltd",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0e14",
    theme_color: "#00e5ff",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
