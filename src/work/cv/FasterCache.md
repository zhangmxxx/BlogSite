---
cover: /assets/images/work/cv/FasterCache/cover.png
date: 2024-11-04
category:
  - article reading
tag:
  - Computer Vision
  - diffusion
star: true
sticky: true
excerpt: <p> 论文 FasterCache：Training-Free Video Diffusion Model Acceleration with High Quality 的阅读笔记</p>
---
# FasterCache
发布于 24.10

- <i class="fa-solid fa-newspaper"></i> [ Paper](https://arxiv.org/abs/2410.19355)

- <i class="fa-brands fa-github"></i> [ Github Repo](https://github.com/Vchitect/FasterCache)

## Features

- 对 diffusion 模型的 feature reuse 技术进行了改进，实现了推理速度与生成质量的协调。
- 无需训练，只需要基于已有的模型调整推理过程。
- 核心技术：Dynamic feature reuse、CFG-Cache。

## Prerequisites

> 本文讨论的是 Video Diffusion Model 的优化方法，但是优化点在单帧的生成上，所以可以借鉴到 Image Diffusion Model。

**什么是diffusion 模型的 cache 机制？**

相邻时间步之间的 feature（attenion score matrix） 较为相似，而 feature 的计算过程较为耗时。因此，考虑在相邻时间步之间复用 feature。

![***Figure 1***: Vanilla cache-based acceleration method.](/assets/images/work/cv/FasterCache/direct.png#mdimg =600x)

**Cache acceleration 领域的相关文章**

- For U-Net based diffusion models
- Residual caching in $\Delta$ - DiT，for transformer based diffusion models
- Hierarchical attention caching of PAB

**什么是CFG(classifier-free guidance)**

是一种用于提高生成图片质量的方法，具体而言，对于某个时间步的输入，CFG 会分别输出 conditional output $\epsilon_\theta(x_t, c)$ 和 unconditional output $\epsilon_\theta(x_t, \emptyset)$，最终的输出如下：
$$
\tilde{\epsilon}_{\theta}(x_t, c) = (1 + g) \epsilon_{\theta}(x_t, c) - g \epsilon_{\theta}(z_t, \emptyset)
$$
其中 $g$ 是 guidance scale。

## Methods

### Problem for Current Cache

**Vanilla Feature reuse 导致的生成质量下降**：虽然各 attention feature 在不同时间步之间具有很高的相似度，但忽略这些差异会导致生成质量的下降。通过观察不同时间步之间 feature 的差值，可以发现差值所对应的区域正是最终图片质量下降的区域。

![***Figure 2***: Visual quality degradation caused by Vanilla Feature Reuse (left) and feature differences between adjacent timesteps (right).](/assets/images/work/cv/FasterCache/feature-diff.png#mdimg =600x)

**CFG 中 feature 的冗余**： 通过图表可以发现，$\text{cond}(t)$ 与 $\text{uncond}(t)$ 的差异，要小于 $\text{cond}(t)$ 与 $\text{cond}(t-1)$ 、$\text{uncond}(t)$ 与 $\text{uncond}(t-1)$   的差异。如果简单的复用 $\text{uncond}(t-1)$，则：
$$
\begin{aligned}
\text{output}(t) &= (1 + g)\text{cond}(t) - g\cdot \text{uncond}(t-1)\\
&= (1 + g)\text{cond}(t) - g\cdot \text{uncond}(t) + g\cdot(\text{uncond}(t - 1) - \text{uncond}(t))
\end{aligned}
$$
在这种情况下，复用带来的误差超过了 guidance 项，导致 guidance 失效。而 $\text{cond}(t)$ 与 $\text{uncond}(t)$ 之间的高相似度，即为冗余。

![***Figure 3***: The Feature MSE Curve between CFG Outputs.](/assets/images/work/cv/FasterCache/CFG.png#mdimg =300x)

### Dynamic Feature Reuse Strategy

在 reuse feature 时，加上一项用于预测其变化趋势：
$$
F_{t-1} = F_{cache} + (F_{cache}^t - F_{cache}^{t+1}) * w(t)
$$
随着时间步的递进，$w(t)$ 会增大，使得模型关注 feature 之间的差异。

### CFG-Cache

![***Figure 4***: MSE of different frequency features bias.](/assets/images/work/cv/FasterCache/fft.png#mdimg =400x)

考虑到 $\text{cond}(t)$ 与 $\text{uncond}(t)$ 的相似性，原文首先尝试了直接使用 cond 来代替 uncond，相当于不使用 CFG，自然结果不是很好。随后，原文尝试对 $\text{cond}(t)$ 与 $\text{uncond}(t)$ 在频率上进行拆分，发现在生成过程的前期，二者的区别主要在低频段；而在生成过程的后期，二者的区别移动到了高频段。基于该观察，考虑将高低频段分开进行复用：

> 原文使用了 $\mathcal{FFT}(\text{output})_{high}$ 来表示高频段，下文简记为 $\text{output}_{high}$

在时间步 $t$，首先计算出 $\text{cond}(t)$ 与 $\text{uncond}(t)$ ，并且得出在高、低频段的差值：
$$
\begin{align}
\Delta_{LF} &= \text{uncond(t)}_{low} - \text{cond(t)}_{low}\\
\Delta_{HF} &= \text{uncond(t)}_{high} - \text{cond(t)}_{high}
\end{align}
$$
在接下来的 n 个时间步中，只计算 cond，而 uncond 由以下过程计算得到：
$$
\begin{align}
\text{uncond}(t-i) = \mathcal{IFFT}(\mathcal{F}_{low}, \mathcal{F}_{high})\\
\mathcal{F}_{low} = \Delta_{LF}*w_1 + \text{cond}(t-i)_{low}\\
\mathcal{F}_{high} = \Delta_{HF}*w_2 + \text{cond}(t-i)_{high}\\
\end{align}
$$
其中 $w_1 = 1 + \alpha_1 \cdot \mathbb{I} (t > t_0), w_2 = 1 + \alpha_2 \cdot \mathbb{I} (t \leq t_0)$ 确保了在生成过程前期（t 较大）时，低频差异被重点关注，而在后期，高频差异被重点关注。
