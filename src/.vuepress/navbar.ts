import { navbar } from "vuepress-theme-hope";

export default navbar([
  "/",
  {
    text: "Posts",
    icon: "pen-to-square",
    prefix: "/posts/",
    children: [
      "tomato",
      "strawberry",
    ],
  },
  "intro"
]);
