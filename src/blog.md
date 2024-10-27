---
icon: edit
excerpt: <p> 当前博客网站的设计思路。 </p>
sticky: true
---
# Blog Design
Vuepress 以及为博客网站的配置提供了很多选项，基于此，可以设计出各式各样的博客样式。本篇记录了当前博客网站的设计思路，包括Sidebar、Navbar、MainPage、font、文本格式等方面。同时，还记录了一些bugs/tricks。
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
在文章的 frontmatter 中设置 article: false 可以将文章从主页隐去[tutorial](https://theme-hope.vuejs.press/zh/config/frontmatter/info.html)。

可以在 MainPage 上只显示每个目录的 intro page，将 ArticleList 作为一个平铺化的索引列表。但是个人认为这样与结构化的索引工具 Navbar 和 Sidebar 功能重复了，毕竟人类还是习惯于基于文件系统的树状结构进行检索。因此，在 MainPage 上只按照时间顺序放置文章，如果有额外的优先级，考虑使用 star 属性。

## Static URL
对于 src/path/to/markdown.md，用到的所有图片均存放在 .vuepress/public/assets/path/to/markdown/ 目录下。

## Format Usage
- 在涉及到换行时，行内代码会保持为一个整体，并不支持拆分。这会导致在排版时，可能会出现过于稀疏的行。因此，blog内容会尽量减少行内代码格式的使用：对于文件名、目录名、函数名等（即使会需要添加转义符），使用纯文本格式；只有对命令行语句，以及会被 vuepress 自动生成链接的文件名，采用行内代码。
- 正文中的所有标点符号，均适用中文标点。
- 英文内容前后均添加空格。

## Image Style
对于 markdown 内的插图，额外添加阴影和圆角样式。由于在主题文档中未找到相关内容，所以通过在 index.scss 中覆盖相关样式实现。注意到这里并不能直接对 img 进行样式覆盖，因为这会影响到主页的图标。虽然主页图标支持样式自定义，但无法从已有的样式中删除一部分。因此，需要在插入图片时，附带额外的类别信息，以在 css 文件中区分。可以通过在 URL fragment 中插入类别信息（[Explanation](https://dzone.com/articles/how-to-style-images-with-markdown)）：
```markdown
![Alt](image.jpg#class-name) 
```
并且在 index.scss 对属于 class-name 类别的 image 进行单独样式设置：
```scss
img[src*="#class-name"]{
  border-radius: 5px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.5); 
}
```
## Tricks or Bugs

因为目前对于前端的知识了解甚少，对于遇到的问题很难判断到底是 bug 还是使用不规范引发的错误。
- 在段落的前一行，某些格式无法正常渲染，文本无法选中。首先在 windows 上发现，最后一行文本之所以无法选中，是因为鼠标悬停在其上时，仍然属于下一行标题的范围，会选中下一行标题。通过拉取一个初始 site，并进行 difftest 发现，是标题属性的 position: relative; 引发的。

- 在 pallette.scss 中修改字体并不能起效，目前通过在 index.scss 手动覆盖对应的字体样式（如body、h1等），来实现字体修改。另外，如果不能自由调整 font-weight，要注意 stylesheet 的 url 是否包含了所有的字体粗细。例如如下的 url：
  ```scss
  https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&display=swap
  ```
  则可用的 font-weight 为 100、200...700