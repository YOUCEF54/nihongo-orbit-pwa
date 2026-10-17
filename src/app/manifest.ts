import type { MetadataRoute } from "next";

/** PWA manifest — installable standalone shell (icons served from /public). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "تعلّم اليابانية",
    short_name: "اليابانية",
    description: "مرافقك اليومي لإتقان اليابانية بالعربية",
    start_url: "/",
    display: "standalone",
    dir: "rtl",
    lang: "ar",
    background_color: "#0b0d12",
    theme_color: "#0b0d12",
    icons: [
      {
        src: "/Logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
