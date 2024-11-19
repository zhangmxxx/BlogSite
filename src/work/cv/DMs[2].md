---
cover: /assets/images/work/cv/DMs[2]/cover.png
date: 2024-11-19
category:
  - article reading
tag:
  - Computer Vision
  - diffusion
star: true
sticky: true
excerpt: <p> 扩散模型系列之二：DDPM </p>
---

# DMs[2] DDPM
- <i class="fa-solid fa-newspaper"></i> [Paper](https://arxiv.org/abs/2006.11239)
- <i class="fa-brands fa-github"></i> [Github Repo](https://github.com/hojonathanho/diffusion)

## Overview

在 [DMs[1] VDM](/work/cv/DMs.md) 中，模型需要在每个时间步预测 $\hat{x}_\theta(x_t, t)$ 来逼近 $x_0$，并以此来计算出 $t$ 时间步逆向过程的均值、方差，从而采样得到 $x_{t-1}$。虽然整个过程循序渐进地经过了 $T$ 步，以得到最终的输出 $x_0$，但模型预测的内容却不是随时间变化的。这会导致模型训练效果较差。那么，有没有对于目标函数的另一种推导，能够让模型预测的内容也与当前时间步相关呢？

这就要提到 ***DDPM(Denoising diffusion probabilistic model)***，它基于与 DPM 完全一致的数学模型，但对目标函数采用了不同的推导方法，对参数化模型预测的内容做了调整。

## Method

### Derivation

::: details expand to see ELBO
$$
\begin{split}\begin{align}
{\ln p(x_0)}
&\geq {\mathbb{E}_{q(x_{1:T}|x_0)}\left[\ln \frac{p(x_{0:T})}{q(x_{1:T}|x_0)}\right]}\\
&= \begin{aligned}[t]
    \underbrace{\mathbb{E}_{q(x_{1}|x_0)}\left[\ln p_{{\theta}}(x_0|x_1)\right]}_\text{reconstruction term}
    &- \underbrace{D_{\text{KL}}({q(x_T|x_0)}\mid {p(x_T)})}_\text{prior matching term}\\
    &- \sum_{t=2}^{T} \underbrace{\mathbb{E}_{q(x_{t}|x_0)}\left[D_{\text{KL}}({q(x_{t-1}|x_t, x_0)}\mid{p_{{\theta}}(x_{t-1}|x_t))}\right]}_\text{denoising matching term}\\
    \end{aligned}
\end{align}\end{split}
$$
:::

**Denoising matching term**

回顾对于 DPM ELBO 中 denoising matching 项的化简结果：
$$
\tag{1}
\begin{split}\begin{align}
& \quad \,D_{\text{KL}}({q(x_{t-1}|x_t, x_0)}\ ||\ {p_{{\theta}}(x_{t-1}|x_t)}) =\frac{1}{2\sigma_q^2(t)}\left[\left\lVert{\mu}_{{\theta}}-{\mu}_q\right\rVert_2^2\right]
\end{align}\end{split}
$$
其中，由真实分布给定的$\mu_q$ 的表达式如下：
$$
\tag{2}
{\mu}_{q}(x_t, t) = \frac{\sqrt{\alpha_t}(1-\bar\alpha_{t-1})x_{t} + \sqrt{\bar\alpha_{t-1}}(1-\alpha_t)x_0}{1 -\bar\alpha_{t}}
$$
在 DPM 中，我们直接令 $\mu_\theta$ 具有与 (2) 类似的形式：
$$
\tag{3}
{\mu}_{{\theta}}(x_t, t) = \frac{\sqrt{\alpha_t}(1-\bar\alpha_{t-1})x_{t} + \sqrt{\bar\alpha_{t-1}}(1-\alpha_t)\hat x_{{\theta}}(x_t, t)}{1 -\bar\alpha_{t}}
$$
但 DDPM 没有这么做，而是对 (2) 进行了进一步的改写。首先我们知道：
$$
\tag{4}
\begin{aligned}
x_t(x_0, \epsilon) &= \sqrt{\alpha_t}\ x_{t-1} + \sqrt{1-\alpha_t}\ \epsilon\\
&= \sqrt{\prod_{i=1}^t \alpha_i} \ x_0 + \sqrt{1- \prod_{i=1}^t \alpha_i }  \ \epsilon\\
&= \sqrt{\bar{ \alpha}_t } \ x_0 + \sqrt{1- \bar{ \alpha}_t }  \ \epsilon,  \ \ \ \bar{\alpha} = \prod_{i=1}^t \alpha_i ,\ \ \epsilon \sim \mathcal{N}(0,\textit{I})
\end{aligned}
$$
根据 (4) 式，我们知道 $x_0 = \frac{x_t - \sqrt{1-\bar{\alpha}_t}\epsilon}{\sqrt{\bar{\alpha}_t}}$，从而将 (2) 式中出现的 $x_0$ 替换成 $\epsilon$：
$$
\tag{5}
\begin{align}
{\mu}_{q}(x_t, t) &= \frac{\sqrt{\alpha_t}(1-\bar\alpha_{t-1})x_{t} + \sqrt{\bar\alpha_{t-1}}(1-\alpha_t)\cdot \frac{x_t - \sqrt{1-\bar{\alpha}_t}\epsilon}{\sqrt{\bar{\alpha}_t}}}{1 -\bar\alpha_{t}}\\
&= \frac{\sqrt{\alpha_t}(1-\bar\alpha_{t-1})x_{t} + (1-\alpha_t)\cdot \frac{x_t - \sqrt{1-\bar{\alpha}_t}\epsilon}{\sqrt{\alpha_t}}}{1 -\bar\alpha_{t}}\\
&= \frac{1}{\sqrt{\alpha_t}}\left(x_t - \frac{1-\alpha_t}{\sqrt{1-\bar{\alpha}_t}}\epsilon\right) 
\end{align}
$$
采取与 DPM 中同样的处理思路，对于确定的参数，我们直接令 $\mu_\theta$ 与之一致。因此，我们可以将 $\mu_\theta$ 建模如下，并得到对应的 denoising matching 项：
$$
\tag{6}
\mu_\theta(x_t, t) = \frac{1}{\sqrt{\alpha_t}}\left(x_t - \frac{1-\alpha_t}{\sqrt{1-\bar{\alpha}_t}}\epsilon_\theta(x_t, t)\right)
$$

$$
\tag{7}
\begin{split}\begin{align}
& \quad \,D_{\text{KL}}({q(x_{t-1}|x_t, x_0)}\ ||\ {p_{{\theta}}(x_{t-1}|x_t)}) \\
&=\frac{1}{2\sigma_q^2(t)}\left[\left\lVert{\mu}_{{\theta}}-{\mu}_q\right\rVert_2^2\right]\\
&= \frac{1}{2\sigma_q^2(t)}\frac{(1 - \alpha_t)^2}{(1 - \bar\alpha_t)\alpha_t}\left[\left\lVert\epsilon  - {\hat\epsilon}_{{\theta}}(x_t, t)\right\rVert_2^2\right]
\end{align}\end{split}
$$

这样，我们就能很清楚地看出，在 $t\to t-1$ 时，DDPM 需要模型去预测正向过程 $t-1 \to t$ 时所添加的噪声 $\epsilon$ ，从而实现了预测目标与时间步相关联。

**Reconstruction term**

最后一步 $x_1 \to x_0$ 略有不同。
$$
\tag{8}
p_\theta(\mathbf{x}_0 | \mathbf{x}_1) = \prod_{i=1}^D \int_{\delta_-(x_0^i)}^{\delta_+(x_0^i)} 
\mathcal{N}\left(x; \mu_\theta^i(\mathbf{x}_1, 1), \sigma_1^2\right) dx
$$

$$
\tag{9}
\begin{align}
\delta_-(x) =
\begin{cases}
-\infty & \text{if } x = -1 \\
x - \frac{1}{255} & \text{if } x > -1
\end{cases} \quad \quad
\delta_+(x) =
\begin{cases}
\infty & \text{if } x = 1 \\
x + \frac{1}{255} & \text{if } x < 1
\end{cases}
\end{align}
$$

todo

### Train and Sample

基于上述推导，在原理上已经可以进行训练，但文章发现，基于如下简化版本的损失函数可以维持相近的生成质量：
$$
\tag{10}
L_{\text{simple}}(\theta) := \mathbb{E}_{t, x_0, \epsilon}\left[\left\lVert\epsilon - \epsilon_\theta(\sqrt{\bar{\alpha}_t}x_0 + \sqrt{1-\bar{\alpha}_t}\epsilon, t)\right\rVert^2\right]
$$
相比原始形式，$L_{\text{simple}}$ 有如下变化：

- 不再区分 denoising matching 项 和 reconstruction 项；
- 将 denoising matching 项中的对 $t$ 求和替换为对 $t$ 求期望，最终通过随机采样实现；
- 相比原始的 denoising matching 项，去掉了系数；
- 根据期望中的函数参数，修改了期望的下标。

最终，得出训练算法以及推理（采样）算法如下：

![***Figure 1***: Training Algorithm for DDPM.](/assets/images/work/cv/DMs[2]/train.png#mdimg =400x)

![***Figure 2***: Sampling Algorithm for DDPM.](/assets/images/work/cv/DMs[2]/sample.png#mdimg =400x)

注意到在采样过程的最后一步，模型略去了 $\sigma_t \textbf{z}$ 项。模型 $p_\theta(x_{t-1} | x_t)$ 拟合了真实分布 $q(x_{t-1} | x_t, x_0)$，这是一个条件概率，并不能确定计算出 $x_{t-1}$，而是一个随机采样过程，这体现在 $\sigma_t \textbf{z}$ 项中。然而，这只对 $t \in [2, T]$ 成立（因为这样的做法是从 denoising matching 项中推导出的）。对于 $x_1 \to x_0$ 的过程，我们可以直接从前向过程入手：
$$
\tag{11}
\begin{aligned}
x_1 &= \sqrt{\alpha_1}\ x_0 + \sqrt{1-\alpha_1}\ \epsilon\\
x_0 &= \frac{1}{\sqrt{\alpha_1}}\left(x_1 - \sqrt{1-\alpha_1}\ \epsilon\right)\\
&= \frac{1}{\sqrt{\alpha_1}}\left(x_1 - \frac{1-\alpha_t}{\sqrt{1-\alpha_1}}\ \epsilon\right)
\end{aligned}
$$
我们发现 $x_0$ 的表达式刚好符合 $t\in [2, T]$ 过程的表达式，而仅仅舍去了 $\sigma_t \textbf{z}$ 项。而在[这篇博客](https://www.zhangzhenhu.com/aigc/%E6%89%A9%E6%95%A3%E6%A6%82%E7%8E%87%E6%A8%A1%E5%9E%8B.html#equation-eq-ddpm-046)中，作者指出，此时 $\hat{x}_0$ 刚好与 $\hat{\mu}(x_1, 1)$ 相同，这也就是说，最终输出是（拟合） $q(x_{t-1}|x_t, x_0,1)$ 的期望，而不是采样值，这与 reconstruction 项相吻合。



> **After reading**
>
> 基于 DPM 这个数学模型，其实可以推导出很多不同的目标函数形式，其核心是基于数学推导，在某一步选择抽出公式中某个无法通过数学表达的项，用参数化模型去拟合。然后，推导训练的目标函数和推理过程。
