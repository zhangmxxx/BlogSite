---
cover: /assets/images/work/cv/highres-lowram/cover.png
icon: pen-to-square
date: 2024-10-09
category:
  - work
tag:
  - Computer Vision
  - Diffusion
star: true
sticky: true
excerpt: <p>在800MB的内存限制下运行 txt2img 模型，生成 2K 分辨率的图片</p>
---

# HighRes-LowRAM

## Task Description

任务目标非常直接：在800MB的内存限制下运行 txt2img 模型，生成 2K 分辨率的图片。结合当前工作，大致可以将思路总结为两类：优化 Stable Diffusion 模型本身；优化使用 Stable Diffusion 模型的方式。

> 如何监视内存？
>
> 对于 CPU RAM，采用 htop + filter 的方式，观察 RES；对于 GPU RAM，采用 `watch -n 1 nvidia-smi` 进行观察。

> [!note]
>
> TODO: 学习 stable-diffusion-webui 的内存监视方法，以及如何监视各模块的内存？

## Stable Diffusion Optimization

在着手压缩内存之前，不妨先看看单一 Stable Diffusion 模型的内存占用情况。以生成单张 $512 \times 512$ 的照片为例，使用 CompVis/stable-diffusion-v1-4 模型的 float32 版本，发现显存占用在 6GB 左右。那么，这些内存究竟用在哪里了呢？（更详细的内存分析参见 [Stretch iPhone to its Limit, a 2GiB Model that can Draw Everything in Your Pocket](https://liuliu.me/eyes/stretch-iphone-to-its-limit-a-2gib-model-that-can-draw-everything-in-your-pocket/)）首先来看看 Stable Diffusion 的各组件（详细结构可见 [Stable Diffusion 组件拆分](/todo.md)）：

- **text encoder** ： 用来生成文本特征向量，随后用于 cross-attention 模块中指导 denoise 过程；
- **image encoder** ： 用于将图片映射到 latent space，以减小 denoise 过程的开销；
- **unet** ：用于预测 noise；
- **image decoder** ： encoder的反过程。

在整个图片生成过程中，第1、2、4个组件只需要运行一次，且他们最多只会占用 1GB 的显存。而剩下的内存都被 unet 所占用。因此，任务的关键就在于如何减小 unet 的内存开销。

## Module-level Optimization

顾名思义，将 Stable Diffusion 作为一个模块使用，优化使用方式。

### 1. Mixture of Diffusers

#### 1.1 Method

- <HopeIcon icon="archive"/> [Paper](https://arxiv.org/abs/2302.02412)
- <i class="fa-brands fa-github"></i> [Github Repo](https://github.com/albarji/mixture-of-diffusers)

Mixture of Diffusers 将高分辨率图片的生成过程分解成若干独立的子区域图片生成过程，这些子区域可以用同一个 Stable Diffusion Module，基于不同的 prompt 生成。因此，该方法将空间复杂度降低到了单一 Stable Diffusion 模型的空间复杂度。以下是基于 Mixture of Diffusers 的 txt2img pipeline（记使用到的单一 Stable Diffusion 模型为 **SD-unit**）：

1. 使用 **SD-unit** 模型生成 low-res 版本；
2. 以 low-res image 作为 guide image，传入 StableDiffusionCanvasPipeline，生成最终的 high-res 版本。

基于该 pipeline，原问题被简化为：

- 优化 **SD-unit**；
- 优化 image decoder，尝试将 decode 的过程也划分为若干独立的子过程；

#### 1.2 Implement

原仓库在 float16 兼容性、使用 guide image 等方面存在一定问题，因此在实现过程中，[fork](https://github.com/zhangmxxx/mixture-of-diffusers) 了一份，以记录自己的修改。

##### kwargs in from_pretrained()

在使用 StableDiffusionCanvasPipeline.from_pretrained() 加载模型时，会首先调用基类对应的 DiffusionPipeline.from_pretrained()，加载好各 sub model 后，作为 init_kwargs 传入 \_\_init\_\_()。打印 init_kwargs.keys() 如下：

```
dict_keys(['unet', 'text_encoder', 'scheduler', 'feature_extractor', 'tokenizer', 'vae', 'safety_checker'])
```

此处存在一个问题：只传递了各组件作为参数，无法将 torch_dtype 等自定义参数传递给 \_\_init\_\_()。为了不对库函数进行修改，只能在 \_\_init\_\_() 中手动设置参数。

##### Guide image OOM

以low-res image作为guide image作用于整个canvas时，会出现占用22 GB VRAM的异常。原因是在ImageRegion decode过程中，原demo忽略了cpu_vae参数，导致始终使用VRAM进行decode。修改详情参见[issue](https://github.com/albarji/mixture-of-diffusers/issues/17)。

> 观察CPU RAM的占用情况可以发现，在decode过程中，CPU RAM的占用峰值为20.7GB，CRAM和VRAM的占用量并不相等。因此，为了满足任务要求，需要统一移动到CPU上进行内存占用统计。

##### Switch between 16 and 32

由于上述的种种原因，并不能通过 from_pretrained(torch_dtype=torch.float\<width\>)来实现整个pipeline位宽的切换。需要修改的内容较为分散，故记录如下：

- from_pretrained()：调整sub models的类型；
- Image2ImageRegion()：调整guide image的类型；
- \_\_init()\_\_ 的默认torch_dtype：用于在StableDiffusionCanvasPipeline中初始化latents等；
- scheduler.step() 后强制类型转换：将scheduler输出的32位latents（并不受scheduler位宽控制）强制转换为16位。

> [!note]
>
> - [ ] 即使移动到 cpu 上，guide image 的 decode 过程仍然会占用很多内存。
> - [ ] 正常会稳定占用1716M的CPU-RAM和6000M的GPU-RAM



### 2. LinFusion

