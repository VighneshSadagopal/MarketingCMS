import type { MetadataRoute } from "next";

/** Lets the CMS be added to a phone's Home Screen (needed for notifications on iPhone). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DrupalAsia Marketing CMS",
    short_name: "DA Marketing",
    start_url: "/",
    display: "standalone",
    background_color: "#e4effe",
    theme_color: "#03163b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
