import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    "",
    {
      text: "Demo",
      icon: "laptop-code",
      prefix: "demo/",
      collapsible: true,
      children: "structure",
    },
    {
      text: "Articles",
      icon: "book",
      prefix: "posts/",
      children: "structure",
    },
    "intro"
  ]
});
