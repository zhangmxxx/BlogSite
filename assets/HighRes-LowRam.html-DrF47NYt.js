import{_ as m}from"./plugin-vue_export-helper-DlAUqK2U.js";import{c as o,a,b as e,d as i,e as n,g as d,r as s,o as l}from"./app-C_dOQEek.js";const u={},f={class:"MathJax",jax:"SVG",style:{position:"relative"}},g={style:{"vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"9.553ex",height:"1.557ex",role:"img",focusable:"false",viewBox:"0 -666 4222.4 688","aria-hidden":"true"};function h(Q,t){const r=s("RouteLink"),p=s("HopeIcon");return l(),o("div",null,[t[11]||(t[11]=a('<h1 id="highres-lowram" tabindex="-1"><a class="header-anchor" href="#highres-lowram"><span>HighRes-LowRAM</span></a></h1><h2 id="task-description" tabindex="-1"><a class="header-anchor" href="#task-description"><span>Task Description</span></a></h2><p>任务目标非常直接：在800MB的内存限制下运行 txt2img 模型，生成 2K 分辨率的图片。</p><p>结合当前工作，大致可以将思路总结为两类：优化 Stable Diffusion 模型本身；优化使用 Stable Diffusion 模型的方式。</p><blockquote><p>如何监视内存？</p><p>对于 CPU RAM，采用 htop + filter 的方式，观察 RES；对于 GPU RAM，采用 <code>watch -n 1 nvidia-smi</code> 进行观察。</p></blockquote><div class="hint-container note"><p class="hint-container-title">Note</p><p>TODO: 学习 stable-diffusion-webui 的内存监视方法，以及如何监视各模块的内存？</p></div><h2 id="stable-diffusion-optimization" tabindex="-1"><a class="header-anchor" href="#stable-diffusion-optimization"><span>Stable Diffusion Optimization</span></a></h2>',7)),e("p",null,[t[3]||(t[3]=i("在着手压缩内存之前，不妨先看看单一 Stable Diffusion 模型的内存占用情况。以生成单张 ")),e("mjx-container",f,[(l(),o("svg",g,t[0]||(t[0]=[a('<g stroke="currentColor" fill="currentColor" stroke-width="0" transform="scale(1,-1)"><g data-mml-node="math"><g data-mml-node="mn"><path data-c="35" d="M164 157Q164 133 148 117T109 101H102Q148 22 224 22Q294 22 326 82Q345 115 345 210Q345 313 318 349Q292 382 260 382H254Q176 382 136 314Q132 307 129 306T114 304Q97 304 95 310Q93 314 93 485V614Q93 664 98 664Q100 666 102 666Q103 666 123 658T178 642T253 634Q324 634 389 662Q397 666 402 666Q410 666 410 648V635Q328 538 205 538Q174 538 149 544L139 546V374Q158 388 169 396T205 412T256 420Q337 420 393 355T449 201Q449 109 385 44T229 -22Q148 -22 99 32T50 154Q50 178 61 192T84 210T107 214Q132 214 148 197T164 157Z"></path><path data-c="31" d="M213 578L200 573Q186 568 160 563T102 556H83V602H102Q149 604 189 617T245 641T273 663Q275 666 285 666Q294 666 302 660V361L303 61Q310 54 315 52T339 48T401 46H427V0H416Q395 3 257 3Q121 3 100 0H88V46H114Q136 46 152 46T177 47T193 50T201 52T207 57T213 61V578Z" transform="translate(500,0)"></path><path data-c="32" d="M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z" transform="translate(1000,0)"></path></g><g data-mml-node="mo" transform="translate(1722.2,0)"><path data-c="D7" d="M630 29Q630 9 609 9Q604 9 587 25T493 118L389 222L284 117Q178 13 175 11Q171 9 168 9Q160 9 154 15T147 29Q147 36 161 51T255 146L359 250L255 354Q174 435 161 449T147 471Q147 480 153 485T168 490Q173 490 175 489Q178 487 284 383L389 278L493 382Q570 459 587 475T609 491Q630 491 630 471Q630 464 620 453T522 355L418 250L522 145Q606 61 618 48T630 29Z"></path></g><g data-mml-node="mn" transform="translate(2722.4,0)"><path data-c="35" d="M164 157Q164 133 148 117T109 101H102Q148 22 224 22Q294 22 326 82Q345 115 345 210Q345 313 318 349Q292 382 260 382H254Q176 382 136 314Q132 307 129 306T114 304Q97 304 95 310Q93 314 93 485V614Q93 664 98 664Q100 666 102 666Q103 666 123 658T178 642T253 634Q324 634 389 662Q397 666 402 666Q410 666 410 648V635Q328 538 205 538Q174 538 149 544L139 546V374Q158 388 169 396T205 412T256 420Q337 420 393 355T449 201Q449 109 385 44T229 -22Q148 -22 99 32T50 154Q50 178 61 192T84 210T107 214Q132 214 148 197T164 157Z"></path><path data-c="31" d="M213 578L200 573Q186 568 160 563T102 556H83V602H102Q149 604 189 617T245 641T273 663Q275 666 285 666Q294 666 302 660V361L303 61Q310 54 315 52T339 48T401 46H427V0H416Q395 3 257 3Q121 3 100 0H88V46H114Q136 46 152 46T177 47T193 50T201 52T207 57T213 61V578Z" transform="translate(500,0)"></path><path data-c="32" d="M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z" transform="translate(1000,0)"></path></g></g></g>',1)]))),t[1]||(t[1]=e("mjx-assistive-mml",{unselectable:"on",display:"inline"},[e("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[e("mn",null,"512"),e("mo",null,"×"),e("mn",null,"512")])],-1))]),t[4]||(t[4]=i(" 的照片为例，使用 CompVis/stable-diffusion-v1-4 模型的 float32 版本，发现显存占用在 6GB 左右。那么，这些内存究竟用在哪里了呢？（更详细的内存分析参见 ")),t[5]||(t[5]=e("a",{href:"https://liuliu.me/eyes/stretch-iphone-to-its-limit-a-2gib-model-that-can-draw-everything-in-your-pocket/",target:"_blank",rel:"noopener noreferrer"},"Stretch iPhone to its Limit, a 2GiB Model that can Draw Everything in Your Pocket",-1)),t[6]||(t[6]=i("）首先来看看 Stable Diffusion 的各组件（详细结构可见 ")),n(r,{to:"/todo.html"},{default:d(()=>t[2]||(t[2]=[i("Stable Diffusion 组件拆分")])),_:1}),t[7]||(t[7]=i("）："))]),t[12]||(t[12]=a('<ul><li><strong>text encoder</strong> ： 用来生成文本特征向量，随后用于 cross-attention 模块中指导 denoise 过程；</li><li><strong>image encoder</strong> ： 用于将图片映射到 latent space，以减小 denoise 过程的开销；</li><li><strong>unet</strong> ：用于预测 noise；</li><li><strong>image decoder</strong> ： encoder的反过程。</li></ul><p>在整个图片生成过程中，第1、2、4个组件只需要运行一次，且他们最多只会占用 1GB 的显存。而剩下的内存都被 unet 所占用。因此，任务的关键就在于如何减小 unet 的内存开销。</p><h2 id="module-level-optimization" tabindex="-1"><a class="header-anchor" href="#module-level-optimization"><span>Module-level Optimization</span></a></h2><p>顾名思义，将 Stable Diffusion 作为一个模块使用，优化使用方式。</p><h3 id="_1-mixture-of-diffusers" tabindex="-1"><a class="header-anchor" href="#_1-mixture-of-diffusers"><span>1. Mixture of Diffusers</span></a></h3>',5)),e("ul",null,[e("li",null,[n(p,{icon:"archive"}),t[8]||(t[8]=i()),t[9]||(t[9]=e("a",{href:"https://arxiv.org/abs/2302.02412",target:"_blank",rel:"noopener noreferrer"},"Paper",-1))]),t[10]||(t[10]=e("li",null,[e("i",{class:"fa-brands fa-github"}),i(),e("a",{href:"https://github.com/albarji/mixture-of-diffusers",target:"_blank",rel:"noopener noreferrer"},"Github Repo")],-1))]),t[13]||(t[13]=a('<p>Mixture of Diffusers 将高分辨率图片的生成过程分解成若干独立的子区域图片生成过程，这些子区域可以用同一个 Stable Diffusion Module，基于不同的 prompt 生成。因此，该方法将空间复杂度降低到了单一 Stable Diffusion 模型的空间复杂度。以下是基于 Mixture of Diffusers 的 txt2img pipeline（记使用到的单一 Stable Diffusion 模型为 <strong>SD-unit</strong>）：</p><ol><li>使用 <strong>SD-unit</strong> 模型生成 low-res 版本；</li><li>以 low-res image 作为 guide image，传入 StableDiffusionCanvasPipeline，生成最终的 high-res 版本。</li></ol><p>基于该 pipeline，原问题被简化为：</p><ul><li>优化 <strong>SD-unit</strong>；</li><li>优化 image decoder，尝试将 decode 的过程也划分为若干独立的子过程；</li></ul><div class="hint-container note"><p class="hint-container-title">Note</p><ul class="task-list-container"><li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" id="task-item-0" disabled="disabled"><label class="task-list-item-label" for="task-item-0"> 以 low-res image 作为 guide image 作用于整个 canvas 时，会出现占用 22 GB VRAM的异常；</label></li><li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" id="task-item-1" disabled="disabled"><label class="task-list-item-label" for="task-item-1"> SDv1.4在python3.10环境下, dtype=torch.float16, 没法实现内存开销的减小.</label></li></ul></div><h3 id="_2-linfusion" tabindex="-1"><a class="header-anchor" href="#_2-linfusion"><span>2. LinFusion</span></a></h3>',6))])}const b=m(u,[["render",h],["__file","HighRes-LowRam.html.vue"]]),x=JSON.parse('{"path":"/work/cv/HighRes-LowRam.html","title":"HighRes-LowRAM","lang":"en-US","frontmatter":{"cover":"/assets/images/SD_Opt/cover.png","icon":"pen-to-square","date":"2024-10-09T00:00:00.000Z","category":["work"],"tag":["Computer Vision","Diffusion"],"star":true,"sticky":true,"excerpt":"<p>在800MB的内存限制下运行 txt2img 模型，生成 2K 分辨率的图片</p>","description":"HighRes-LowRAM Task Description 任务目标非常直接：在800MB的内存限制下运行 txt2img 模型，生成 2K 分辨率的图片。 结合当前工作，大致可以将思路总结为两类：优化 Stable Diffusion 模型本身；优化使用 Stable Diffusion 模型的方式。 如何监视内存？ 对于 CPU RAM，采用 ...","gitInclude":[],"head":[["meta",{"property":"og:url","content":"https://zhangmxxx.github.io/BlogSite/work/cv/HighRes-LowRam.html"}],["meta",{"property":"og:site_name","content":"Site MallocSimenons"}],["meta",{"property":"og:title","content":"HighRes-LowRAM"}],["meta",{"property":"og:description","content":"HighRes-LowRAM Task Description 任务目标非常直接：在800MB的内存限制下运行 txt2img 模型，生成 2K 分辨率的图片。 结合当前工作，大致可以将思路总结为两类：优化 Stable Diffusion 模型本身；优化使用 Stable Diffusion 模型的方式。 如何监视内存？ 对于 CPU RAM，采用 ..."}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:image","content":"https://zhangmxxx.github.io/BlogSite/assets/images/SD_Opt/cover.png"}],["meta",{"property":"og:locale","content":"en-US"}],["meta",{"name":"twitter:card","content":"summary_large_image"}],["meta",{"name":"twitter:image:src","content":"https://zhangmxxx.github.io/BlogSite/assets/images/SD_Opt/cover.png"}],["meta",{"name":"twitter:image:alt","content":"HighRes-LowRAM"}],["meta",{"property":"article:tag","content":"Computer Vision"}],["meta",{"property":"article:tag","content":"Diffusion"}],["meta",{"property":"article:published_time","content":"2024-10-09T00:00:00.000Z"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"HighRes-LowRAM\\",\\"image\\":[\\"https://zhangmxxx.github.io/BlogSite/assets/images/SD_Opt/cover.png\\"],\\"datePublished\\":\\"2024-10-09T00:00:00.000Z\\",\\"dateModified\\":null,\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"MallocSimenons\\",\\"url\\":\\"https://zhangmxxx.github.io/BlogSite/intro.html\\"}]}"]]},"headers":[{"level":2,"title":"Task Description","slug":"task-description","link":"#task-description","children":[]},{"level":2,"title":"Stable Diffusion Optimization","slug":"stable-diffusion-optimization","link":"#stable-diffusion-optimization","children":[]},{"level":2,"title":"Module-level Optimization","slug":"module-level-optimization","link":"#module-level-optimization","children":[{"level":3,"title":"1. Mixture of Diffusers","slug":"_1-mixture-of-diffusers","link":"#_1-mixture-of-diffusers","children":[]},{"level":3,"title":"2. LinFusion","slug":"_2-linfusion","link":"#_2-linfusion","children":[]}]}],"readingTime":{"minutes":2.42,"words":725},"filePathRelative":"work/cv/HighRes-LowRam.md","localizedDate":"October 9, 2024","autoDesc":true}');export{b as comp,x as data};
