import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PicklePerps - Decentralized Perpetual Trading",
    short_name: "PicklePerps",
    description:
      "Trade crypto perpetuals with up to 100x leverage on Stellar Network. The leading perps DEX on Stellar.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d0d",
    theme_color: "#00d26a",
    icons: [
      {
        src: "/pickle-perps-logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pickle-perps-logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
