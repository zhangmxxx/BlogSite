---
icon: edit
excerpt: <p> 记录了该 BlogSite 的设计逻辑。同时，也会记录一些较为 tricky 的问题。 </p>
sticky: true
---
# Blog Design
Sidebar、Navbar等组件的交互逻辑借鉴了 Mister-Hope 的[设计思路](https://github.com/Mister-Hope/Mister-Hope.github.io)。同时，也会记录一些较为 tricky 的问题。
> 其实这里已经用到了一些 tricks。
## Sidebar
对于一个目录 /path，有两种逻辑来显示它：
- 对于 /path 下的每个子目录，生成一个表项。该表项只包含链接，不可展开。路由至该子目录后，重新绘制 Sidebar，显示子目录内容。
- 对于 /path 下的每个子目录，生成一个表项。该表项可折叠。路由至子目录后，不再重新绘制 Sidebar。

对于级别较高的目录，采取第一种；对于级别较低的、接近 terminal 的目录，采取第二种，以避免展开后，Sidebar 内的内容过少。

**这种设计存在的问题**：
- 进入子目录后，只能在文章顶部路由回到上一级目录，在 Sidebar 中没有上一级目录的选项。
- 对于 /home 下的各级目录，想要切换到 sibling 目录，必须回一次 /home，这种巨大的页面风格差距会带来不良的阅读体验。

## Navbar
Navbar 是全局不变的。因此，相较于 Sidebar，其核心功能应该是提供快速回到高级别目录的 shortcut。（这似乎刚好解决了 Sidebar 存在的问题）。一个简单的设计思路是，将 /home 目录下的直接子目录作为 Navbar 的表项。

**这种设计存在的问题**：
- 对于目前的网站体量，在逻辑上似乎不足以划分为独立的模块。以 Mister-Hope 的 Navbar 为例，其表项分别为：代码笔记、随笔、软件教程。相比之下，Work、DevInit 的交叉程度较大。但在路由逻辑上，必须这样设计。

## Articles on MainPage
在文章的 frontmatter 中设置 `article: false` 可以将文章从主页隐去。[Details](https://theme-hope.vuejs.press/zh/config/frontmatter/info.html)

可以在 MainPage 上只显示每个目录的 `Readme.md`，将 ArticleList 作为一个平铺化的索引列表。但是个人认为这样与结构化的索引工具 Navbar 和 Sidebar 功能重复了，毕竟人类还是习惯于基于文件系统的树状结构进行检索。因此，在 MainPage 上只按照时间顺序放置文章，如果有额外的优先级，考虑使用 star 属性。
## Tricks or Bugs
因为目前对于前端的知识了解甚少，对于遇到的问题很难判断到底是 bug 还是使用不规范引发的错误。
- 在段落的前一行，某些格式无法正常渲染。已知 buggy 的有：站内文章的链接。
- 在 `pallette.scss` 中修改字体并不能起效，目前通过在 `index.scss` 手动覆盖对应的字体样式（如body、h1等），来实现字体修改。另外，如果不能自由调整 `font-weight`，要注意 stylesheet 的 url 是否包含了所有的字体粗细。例如如下的 url：
  ```scss
  https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&display=swap
  ```
  则可用的 font-weight 为 100、200...700