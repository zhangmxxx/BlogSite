---
cover: /assets/images/work/cv/DMs[3]/cover.png
date: 2024-11-20
category:
  - article reading
tag:
  - Computer Vision
  - diffusion
star: true
sticky: true
excerpt: <p> 扩散模型系列之三：基于分数的 DDPM 解释 </p>
---

# DMs[3] Scored-based DDPM
- <i class="fa-solid fa-newspaper"></i> [Paper](https://arxiv.org/abs/2006.11239)
- <i class="fa-brands fa-github"></i> [Github Repo](https://github.com/hojonathanho/diffusion)

$$
\def\R{\mathbf{R}}
\def\X{\mathbf{X}}
\def\x{\mathbf{x}}
\def\z{\mathbf{z}}
\def\KL#1#2{D_{\text{KL}}\left(#1\ ||\ #2\right)}
\def\argmin#1{{\arg\min}_{#1}\quad}
\def\norm#1{\left\lVert#1\right\rVert_2^2}
$$

## Overview

正如 [DMs[2]](./DMs[2].md) 结尾所提到的，我们可以对 VDM 进行不同的推导，从而得出不同的解释。这里介绍第三种解释方式：score-based DDPM。

## Preliminary

这里首先要介绍 Tweedie's Formula：指数族分布的真实均值，可以通过采样样本的经验均值，加上一项修正项进行估计。以 $z \sim \mathcal{N}(\mu_z, \Sigma_z)$ 为例：
$$
\tag{1}
\mathbb{E}[\mu_z | z] = z + \Sigma_z\nabla_z\log p_{\text{sample}}(z)
$$
证明也很简单，假设 $z$ 的**采样数量足够**，$p_{\text{sample}} \approx p$ ，那么对于观测值 $z$：
$$
\tag{2}
\begin{aligned}
\nabla_z\log p_{\text{sample}}(z)
&= \nabla_z\log \left[\frac{1}{\sqrt{(2\pi)^D |\Sigma_z|}} \exp\left(-\frac{1}{2}(z - \mu_z)^T \Sigma_z^{-1} (z - \mu_z)\right)\right]\\
&= \nabla_z -\frac{1}{2}(z - \mu_z)^T \Sigma_z^{-1} (z - \mu_z) + \text{const.}\\
&= -\Sigma_z^{-1}(z - \mu_z)
\end{aligned}
$$
代入 (1) 式，容易发现，刚好为 $\mu_z$。

## Method

### Derivation

从 DMs[1] 中可知：
$$
\tag{3}
q(x_t | x_0) = \mathcal{N}(x_t; \sqrt{\bar{\alpha}_t}x_0, (1- \bar{\alpha}_t)I)
$$
结合 Tweedie's Formula，可知：
$$
\tag{4}
\mathbb{E}[\mu_{x_t} | x_t] = x_t + (1-\bar{\alpha}_t)\nabla_{x_t}\log p(x_t)
$$
而我们是知道 $p(x_t)$ 的真实分布的，它由 (3) 式定义。因此，$\mathbb{E}[\mu_{x_t} | x_t]$ 恰好是 $\mu_{x_t}$，我们可以得到如下等式：
$$
\tag{5}
\sqrt{\bar{\alpha}_t}x_0 = x_t + (1-\bar{\alpha}_t)\nabla_{x_t}\log p(x_t)
$$

$$
\tag{6}
x_0 = \frac{x_t + (1-\bar{\alpha}_t)\nabla_{x_t}\log p(x_t)}{\sqrt{\bar{\alpha}_t}}
$$

和 DMs[2] 中一样，我们又可以据此对 ELBO 中的项进行改写。

**Denoising matching term**
$$
\tag{7}
\begin{split}\begin{align}
{\mu}_q(x_t, x_0) &= \frac{\sqrt{\alpha_t}(1-\bar\alpha_{t-1})x_{t} + \sqrt{\bar\alpha_{t-1}}(1-\alpha_t)x_0}{1 -\bar\alpha_{t}}\\

&= \frac{1}{\sqrt{\alpha_t}}x_t + \frac{1 - \alpha_t}{\sqrt{\alpha_t}} \nabla\log p(x_t)
\end{align}\end{split}
$$
采取与 DPM 中同样的处理思路，对于确定的参数，我们直接令 $\mu_\theta$ 与之一致。因此，我们可以将 $\mu_\theta$ 建模如下：
$$
\tag{6}
\mu_\theta(x_t, t) = \frac{1}{\sqrt{\alpha_t}}x_t + \frac{1 - \alpha_t}{\sqrt{\alpha_t}} s_\theta(x_t, t)
$$

因此，denoising matching term 转化为：
$$
\tag{7}
\begin{aligned}
&\argmin{\theta} \KL{q(x_{t-1}|x_t, x_0)}{p_\theta)(x_{t-1}|x_t)}\\
=\quad&\argmin{\theta} \frac{1}{2\sigma_q^2(t)}\frac{(1-\alpha_t)^2}{\alpha_t}\left[\norm{s_\theta(x_t, t)-\nabla_{x_t}\log p(x_t)}\right]
\end{aligned}
$$
从 (7) 中可知，参数化模型需要学习在 $x_t$ 时的分数 $\nabla_{x_t}\log p(x_t)$。

**Reconstruction term**

todo

**Explanation of score**

我们通过 Tweedie's Formula 引入了分数 $\nabla_{x_t}\log p(x_t)$，那么该项在 DPM 中的实际含义是什么呢？回顾 DMs[2] DDPM 中对于 $x_0$ 的重写：
$$
\tag{8}
\begin{aligned}
x_0 = \frac{x_t + (1-\bar{\alpha}_t)\nabla\log p(x_t)}{\sqrt{\bar{\alpha}_t}} &= \frac{x_t - \sqrt{1-\bar{\alpha}_t}\ \epsilon}{\sqrt{\bar{\alpha}_t}}\\
\therefore \quad (1-\bar{\alpha}_t)\nabla\log p(x_t) &=- \sqrt{1-\bar{\alpha}_t}\ \epsilon\\
\nabla\log p(x_t) &= - \frac{1}{\sqrt{1-\bar{\alpha}_t}} \epsilon
\end{aligned}
$$
可以发现，对于真实分布，分数刚好指向了噪声 $\epsilon$ 的反向，向着分数的方向步进等价于消除噪声。当然，score function 的提出并不是基于 DPM 模型，相关内容可以查看 [SMLD](./SMLD.md)。

[./DMs\[2\].md]: 
[./DMs[2]: 
