import { arraySidebar } from "vuepress-theme-hope";

export const work = arraySidebar([
  "",
  {
    text: "CV",
    link: "cv/",
    prefix: "cv/",
    children: "structure",
  },
  {
    text: "ICS",
    link: "ics/",
    prefix: "ics/",
    children: "structure",
  },
]);