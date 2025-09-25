---
cover: /assets/images/work/cv/InvSR/cover.png
date: 2025-09-24
category:
  - article reading
tag:
  - Computer Vision
star: true
sticky: true
excerpt: <p> Diffusion 用于超分 </p>

---

$$
\def\ba{\bar{\alpha}}
\def\a{\alpha}
\def\R{\mathbf{R}}
\def\X{\mathbf{X}}
\def\x{\mathbf{x}}
\def\y{\mathbf{y}}
\def\z{\mathbf{z}}
\def\v{\mathbf{v}}
\def\d{\mathrm{d}}
\def\s{\mathbf{s}}
\def\f{\mathbf{f}}
\def\w{\mathbf{w}}
\def\bx{\tilde{\x}}
\def\tx{\nabla_{\x}}
\def\LD{\mathcal{LD}}
\def\mbr#1{\left[#1\right]}
\def\sbr#1{\left(#1\right)}
\def\E#1{\mathbb{E}\left[#1\right]}
\def\KL#1#2{D_{\text{KL}}\left(#1\ ||\ #2\right)}
\def\argmin#1{{\arg\min}_{#1}\quad}
\def\norm#1{\left\lVert#1\right\rVert_2^2}
\def\sc#1#2{\tx\log #1(#2)}
$$

# InvSR

> - <i class="fa-solid fa-newspaper"></i> [ Paper](https://arxiv.org/html/2412.09013v1)
>
> - <i class="fa-brands fa-github"></i> [ Github Repo](https://github.com/zsyOAOA/InvSR)

## Overview

Diffusion 用于图像超分一般有两种思路：

- **Diffusion Prior for SR.** 即在原本的 pipeline 上进行微调，比如通过 text prompt 或者退化类型，来指导模型进行超分；
- **Diffusion Inversion.** 回顾一张图片的生成过程，从随机高斯噪声 $\z_T$ 开始，通过 $\x_{t-1} = \mu_\theta(\x_t, t) + \sigma_t \epsilon_t, \quad \epsilon_t \sim \mathcal{N}(0, I)$ 的迭代去噪过程，得到最终的图像。Inversion 的思路是，如果能够知道 $\x_T$ 以及每一步的噪声 $\epsilon_t$（noise map $\mathcal{M}$），那么就可以建模出 HR 图像的生成过程，从而实现超分。

本文属于后者，且将 noise map 缩减到了 $\z_T$，并实现了跳步采样。

> 在正式开始看 Method 之前，建议先回顾一下如下几点

**等价预测模型的推导**

最初的起点为 $p(\x_{t-1} \mid \x_t, \x_0)$
$$
\tag{1}
\x_{t-1} = \frac{\sqrt{\a_t}(1-\ba_{t-1})\x_t + \sqrt{\ba_{t-1}}(1-\a_t)\hat{\x}_0}{1-\ba_t} + \sigma_t \epsilon_t
$$

通过前向过程的定义:
$$
\tag{2}
\x_t = \sqrt{\ba_t}\x_0 + (1-\ba_t)\epsilon, \quad
\hat{\x}_0 = \frac{\x_t-(1-\ba_t)\hat{\epsilon}}{ \sqrt{\ba_t}}
$$
代入即得到噪声预测的形式

**噪声项的不同含义**

这里需要区分两个 $\epsilon$ ， $\epsilon_t$ 表示的是以 $\x_t$ 预测 $\x_{t-1}$ 时，这个高斯分布所取的噪声；而 $\hat{\epsilon}$ 则表示的是从 $\x_0 \to \x_t$ 的噪声，二者含义不同，但都服从标准高斯分布

**跳步推理的实现**

关于跳步，之前的一个疑惑是，在不同的步长设定下，为什么相同的采样公式能够得到不同的跳步结果。这里引用[苏神关于 DDIM 的解读][DDIM]，简单来说，DDPM 的训练包含了任意子序列的训练过程，所以**无需重新训练，即可在子序列上进行跳步采样**；但与原本的全长序列相比，**子序列的 $\alpha_t$ 需要通过 $\frac{\ba_t}{\ba_{t-1}}$ 重新进行定义**，正是重新定义的 $\alpha_t$ 带来了不同步长下的不同结果。

## Method

相比于最原始的 Diffusion Inversion，作者做了如下几点改进：

#### 终点提前

理论上，终点 $T$ 可以是任意时间步。而 LR 与 HR 图片仅在最后一段时间步上存在较大差异（高频细节），所以可以将 LR、HR 去噪路径开始分歧的点 $N < T$ 作为终点，从而减小了 noise map 的大小。

#### 跳步采样

由于是 Diffusion Inversion，生成 HR 的是标准的 diffusion 去噪，所以可以沿用已有的跳步方法，例如 DDIM 等。实践中，使用 $M \leq 5$ 步即可。

#### 仅预测 $\x_N$

> 这里原文似乎混淆了两种 $\epsilon$，而将所有高斯噪声都用 $f_w(\cdot, \cdot)$ 来表示。由于具有不同的含义，例如（6） 式中表示 $\x_t\to \x_{t-1}$ 的噪声，而（8）表示 $\x_0\to \x_T$ 的噪声，实际上模型应该很难训练，毕竟这两种情形只有时间步参数的差异，因此这里对 $\x_t\to \x_{t-1}$ 噪声采用 $h$ 记号以示区分。同时，基于 $\x_0$ 和 $\y_0$ 进行前向过程，预测 $\x_0$ 的中间状态，噪声也应该是不一样的，对于使用 $\x_0$ 计算前向过程时预测的噪声（10），记作 $f^\prime$.

按照 Diffusion Inversion 的基本思路，我们需要预测两项：

- 相邻时间步采样中的噪声项 $h_w$ ：
  $$
  \tag{3}
  \x_{\kappa_{i-1}} = g_\theta(\x_{\kappa_i}) + \sigma_{\kappa_i} h_w(\y_0, \kappa_{i-1})
  $$

- 终点 $\x_{\kappa_M}$ 。由于 HR $\x_0$ 无法获得，所以无法通过前向过程，预测 $\x_0\to \x_{\kappa_M}$ 的噪声来预测 $\x_{\kappa_M}$；但是，由于在 $\x_{\kappa_M}$ 处 **HR 与 LR 的 latent 才开始 derive，因此非常相近**，所以可以从 $\y_0$ 出发进行前向过程：
  $$
  \tag{4}
  \x_{\kappa_M} = \sqrt{\ba_{\kappa_M}}\y_0 + \sqrt{1-\ba_{\kappa_M}} f_w(\y_0, \kappa_M)
  $$
  至于其中的细微差别，则完全可以由网络 $f_w(\y_0, \kappa_M)$ 学到，只不过这会导致它**不再服从 $\mathcal{N}(0, I)$**

最终发现，需要**预测的都是噪声项**。有了这两项，就可以先预测 $\x_{\kappa_M}$，再迭代去噪得到 $\x_0$

进一步，在训练中需要对齐 $\hat{\x}_{0\leftarrow \kappa_i}$ 与 ground truth $\x_0$ ，$0\leftarrow \kappa_i$ 可以通过预训练的 diffusion 模型 predict $\x_0$（即（2）式）得到，但 $\x_{\kappa_i}$ 却需要在先前定义的流程中多次迭代。而实际上，在 $\x_0$ 的整个路径上，原本的做法是先预测终点，再逆向迭代，我们还可以通过等价（反正都是预测值，理论上等价即可）的前向过程得到：
$$
\tag{5}
\x_{\kappa_i} =   \sqrt{\ba_{\kappa_i}}\x_0 + \sqrt{1-\ba_{\kappa_i}} f^\prime_w(\y_0, \kappa_i)
$$
至此，需要预测的都是 $\x_0\to \x_t$ 的前向噪声，但由于各自基于 $\x_0, \y_0$ ，所以均值有所差别。

> 之所以说是混用，是因为在作者的逻辑中，对 $f^\prime_w$ 代替了基本思路中 $h_w$ 的训练，而在 inference 中，是需要用到 “相邻时间步采样中的噪声项” $h_w$来进行迭代的，经过上述简化，就没法 inference 了。（不过最终算法里也用不到）

最后，也是和其他工作差别最大（maybe）的一点改进，作者不再预测服从标准高斯分布的 $h_w(\y_0, \kappa_i)$，而是改用随机噪声 $\z \sim \mathcal{N}(0, I)$。原因就有点迷了。首先，如果要严格还原 $\x_0$，一定要精确预测出每一步迭代的 noise，但是，作者认为小时间步限定下噪声水平小、diffusion 模型预测相对稳定（robust）、迭代预测反而会导致累积误差，所以舍弃了预测中间迭代步骤的噪声 $h_w(\y_0, \kappa_i)$。

至此，noise map 被缩减到 $\mathcal{M} = \{\z_{\kappa_M}\}$ ，训练时只需要在**预定义的起点 set** $\mathcal{S} \subseteq \{\kappa_1, \dots \kappa_M\}$ 中选取一点通过（4）式计算 $\x_{\kappa_i}$，再对齐  $\hat{\x}_{0\leftarrow \kappa_i}$ 与 $\x_0$ 即可；推理过程同理，只需要使用 $f_w$ 预测噪声，通过前向过程计算出 HR 的中间表示，再无参数化地逆向去噪。

> **REVIEW**:
>
> 结合中间稍显混乱的设计心路历程，给人的感觉是先尝试了预测 HR 中间表示，然后逆向不预测（这是许多其他文章的缺陷），然后补上了这段故事；或者是我对模型训练的理解有问题，即：如果使用同一个网络预测，那么不同参数下的预测值的实际含义应该是统一的，而不能做到 $f(a)$ 预测 a 的年龄，$f(b)$ 预测 b 的身高。
>
> 实际上，即使明确了这些 noise 具有不同的含义，无法使用同一个网络进行预测，依然可以得出一个通顺的逻辑：只需要删掉 Model Trainig 使得 inference 无法进行的那一段，如果截至这一段，会没发 inference，且最终算法也没用到。
>
> To check：Model Training 中的（5）应该没有被用过？

[DDIM]: https://spaces.ac.cn/archives/9181