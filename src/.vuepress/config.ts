import { defineUserConfig } from "vuepress";

import theme from "./theme.js";

export default defineUserConfig({
  base: "/BlogSite/",

  lang: "en-US",
  title: "Site MallocSimenons",
  description: "Pantanal of MallocSimenons",

  theme,

  // Enable it with pwa
  // shouldPrefetch: false,
});
