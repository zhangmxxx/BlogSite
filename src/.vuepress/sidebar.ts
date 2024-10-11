import { sidebar } from "vuepress-theme-hope";

import { work } from "./sidebar/work.js"
import { devinit } from "./sidebar/devinit.js"

export default sidebar({
  "/work/": work,
  "/devinit/": devinit,
  // fall through to default
  "/": [
    "",
    {
      text: "Demo",
      icon: "laptop-code",
      prefix: "demo/",
      collapsible: true,
      children: "structure",
    },
    "work/",
    "devinit/",
    "/blog.md",
    "/intro.md"
  ]
});
