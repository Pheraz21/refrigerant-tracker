import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "21 Degrees F-Gas Tracker",
    short_name: "F-Gas Tracker",
    description: "Refrigerant cylinder tracking and compliance for 21 Degrees Ltd",
    start_url: "/engineer",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0e14",
    theme_color: "#00e5ff",
    icons: [
      {
        src: "/21-degrees-official-transparent.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
