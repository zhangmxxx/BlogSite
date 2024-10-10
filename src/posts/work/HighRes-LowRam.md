---
cover: /assets/images/SD_Opt/cover.png
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

任务目标非常直接：在800MB的内存限制下运行 txt2img 模型，生成 2K 分辨率的图片。

结合当前工作，大致可以将思路总结为两类：优化 Stable Diffusion 模型本身；优化使用 Stable Diffusion 模型的方式。

> 如何监视内存？
>
> 对于 CPU RAM，采用 htop + filter 的方式，观察 RES；对于 GPU RAM，采用 `watch -n 1 nvidia-smi` 进行观察。

> [!note]
>
> TODO: 学习 stable-diffusion-webui 的内存监视方法，以及如何监视各模块的内存？

## Stable Diffusion Optimization

在着手压缩内存之前，不妨先看看单一 Stable Diffusion 模型的内存占用情况。以生成单张 $512 \times 512$ 的照片为例，使用 CompVis/stable-diffusion-v1-4 模型的 float32 版本，发现显存占用在 6GB 左右。那么，这些内存究竟用在哪里了呢？（更详细的分析参见 [Stretch iPhone to its Limit, a 2GiB Model that can Draw Everything in Your Pocket](https://liuliu.me/eyes/stretch-iphone-to-its-limit-a-2gib-model-that-can-draw-everything-in-your-pocket/)）首先来看看 Stable Diffusion 的各组件：

- **text encoder** ： 用来生成文本特征向量，随后用于 cross-attention 模块中指导 denoise 过程；
- **image encoder** ： 用于将图片映射到 latent space，以减小 denoise 过程的开销；
- **unet** ：用于预测 noise；
- **image decoder** ： encoder的反过程。

在整个图片生成过程中，第1、2、4个组件只需要运行一次，且他们最多只会占用 1GB 的显存。而剩下的内存都被 unet 所占用。因此，任务的关键就在于如何减小 unet 的内存开销。[todo](../server/服务器生存指南.md)

## Module-level Optimization

顾名思义，将 Stable Diffusion 作为一个模块使用，优化使用方式。

### 1. Mixture of Diffusers

- <HopeIcon icon="archive"/> [Paper](https://arxiv.org/abs/2302.02412)
- <i class="fa-brands fa-github"></i> [Github Repo](https://github.com/albarji/mixture-of-diffusers)

Mixture of Diffusers 将高分辨率图片的生成过程分解成若干独立的子区域图片生成过程，这些子区域可以用同一个 Stable Diffusion Module，基于不同的 prompt 生成。因此，该方法将空间复杂度降低到了单一 Stable Diffusion 模型的空间复杂度。以下是基于 Mixture of Diffusers 的 txt2img pipeline（记使用到的单一 Stable Diffusion 模型为 **SD-unit**）：

1. 使用 **SD-unit** 模型生成 low-res 版本；
2. 以 low-res image 作为 guide image，传入 StableDiffusionCanvasPipeline，生成最终的 high-res 版本。

基于该 pipeline，原问题被简化为：

- 优化 **SD-unit**；
- 优化 image decoder，尝试将 decode 的过程也划分为若干独立的子过程；

> [!note]
>
> - [ ] 以 low-res image 作为 guide image 作用于整个 canvas 时，会出现占用 22 GB VRAM的异常；
> - [ ] SDv1.4在python3.10环境下, dtype=torch.float16, 没法实现内存开销的减小.



### 2. LinFusion

