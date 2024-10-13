import { defineUserConfig } from "vuepress";

import theme from "./theme.js";

export default defineUserConfig({
  base: "/BlogSite/",

  lang: "en-US",
  title: "Site MallocSimenons",
  description: "Pantanal of MallocSimenons",

  head: [
    // common header
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
    // font api for each font
    [
      "link",
      {
        href: "https://fonts.googleapis.com/css2?family=Afacad+Flux:wght@100..1000&family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap",
        rel: "stylesheet",
      }
    ],
    [
      "link",
      {
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&display=swap",
        rel: "stylesheet",
      }
    ],
    [
      "link",
      {
        href: "https://fonts.googleapis.com/css2?family=Source+Sans+Pro:ital,wght@0,200;0,300;0,400;0,600;0,700;0,900;1,200;1,300;1,400;1,600;1,700;1,900&display=swap",
        rel: "stylesheet",
      }
    ],
  ],

  theme,

  // Enable it with pwa
  // shouldPrefetch: false,
});
