import { navbar } from "vuepress-theme-hope";

export default navbar([
  "/",
  "work/",
  "devinit/",
  {
    text: "About",
    icon: "circle-info",
    children: [
      {text:"About Me", icon:"circle-info", link:"intro.md"},
      {text:"Blog Design", icon:"edit", link:"blog.md"}
    ],
  },
]);
