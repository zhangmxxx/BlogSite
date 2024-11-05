---
cover: /assets/images/work/cv/DC-AE/cover.png
date: 2024-10-31
category:
  - article reading
tag:
  - Computer Vision
  - diffusion
star: true
sticky: true
excerpt: <p>论文 Simplifying, Stabilizing and Scaling Continuous-Time Consistency Models 的阅读笔记</p>
---
# sCMs
发布于 24.10

- <i class="fa-solid fa-newspaper"></i> [ Paper](https://arxiv.org/abs/2410.11081)

- <i class="fa-brands fa-github"></i> [ OpenAI Post](https://openai.com/index/simplifying-stabilizing-and-scaling-continuous-time-consistency-models/)

## Features

- 更高的压缩率：可以将压缩率提高到 $128 \times$，同时保持 reconstruction 的质量；提高后的压缩率可以用于加速 high-resolution diffusion models 的生成过程。（latent/high-res diffusion models？）
- 核心技术：Residual Autoencoding、Decoupled High Resolution Adaptation。

## Methods

![***Figure 1***: High spatial-compression autoencoders are more difficult to optimize. Even with the same latent shape and stronger learning capacity, it still cannot match the f8 autoencoder’s rFID](/assets/images/work/cv/DC-AE/ablation.png#mdimg =400x)

