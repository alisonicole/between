import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "between",
    short_name: "between",
    description: "Capture what comes up between sessions and bring it into the room",
    start_url: "/",
    display: "standalone",
    background_color: "#faf5ff",
    theme_color: "#f3e8ff",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
