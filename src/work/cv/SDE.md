---
cover: /assets/images/work/cv/SDE/cover.png
date: 2024-11-24
category:
  - article reading
tag:
  - Computer Vision
  - score-based
star: true
sticky: true
excerpt: <p>Score-Based Generative Modelling Through Stochastic Differential Equations：SDE 建模下的SMLD、DDPM and beyond.</p>
---



# GMs with SDE

$$
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
\def\E#1{\mathbb{E}\left[#1\right]}
\def\KL#1#2{D_{\text{KL}}\left(#1\ ||\ #2\right)}
\def\argmin#1{{\arg\min}_{#1}\quad}
\def\norm#1{\left\lVert#1\right\rVert_2^2}
\def\sc#1#2{\tx\log #1(#2)}
$$

**原论文**：[link][SDE]

**参考博客**：[link1][YangSongBlog]，[link2][yynBlog]，[link3][ZhangZhenHuBlog]

前排提醒：这篇文章的内容可谓是丰俭由人，在正文部分，作者仅仅介绍了使用 SDE 建模生成过程的框架，而更一般的情况、推导过程中使用的结论，在附录中都有详细的推导。所以，在本笔记中，会直接使用一系列结论，一方面是因为笔者暂时没时间、没能力学习所有延伸出的知识点，另一方面，列出每个结论的出处过于繁琐。因此，仅列出相关的附录，有兴趣可以自行查阅原论文。

## SDE

### Forward & Reverse Process

扩散过程可以看作是经过如下的过程，将样本从 $\x(0) \sim p_\text{data}$ 转换到先验分布 $\x(T)\sim p_T$：
$$
\tag{1}
\d\x = \f(\x, t) \d t + g(t)\d\w
$$
 其中：$\w$ 是标准温拿过程，$\f(\cdot,t)$ 叫做 $\x(t)$ 的漂移系数，$g(\cdot)$ 是扩散系数（这里为了简化模型，假设其与实践无关，在原论文附录 A 中有对于一般情况 $g(\cdot, t)$ 的推导）。我们可以写出 $\x(t)$ 的概率密度函数，记作 $p_t(\x)$，而 $\x(s)$ 到 $\x(t)$ 的转移核记作 $p_{st}(\x(t)\mid \x(s))$。

将前向过程反过来，就可以得到生成过程。而使用 SDE 建模的一大好处是，有现成的结论可以使用，可以直接写出逆向过程的表达式：
$$
\tag{2}
\d\x = [\f(\x, t)-g(t)^2 \sc{p_t}{\x}]\d t + g(t) \d \bar{\w}
$$
$\bar{\w}$ 是时间逆向时的标准温拿过程，而 $\d t$ 是一个负的时间步。在 (2) 中，只有 $\sc{p_t}{\x}$ 是未知项，而处理这一项的方法也应该很熟悉了，我们可以训练如下模型：
$$
\tag{3}
\theta^* = \argmin{\theta} \mathbb{E}_t \left\{ \lambda(t)\mathbb{E}_{\x(0)}\mathbb{E}_{\x(t)|\x(0)}\left[\norm{\s_\theta(\x(t), t) -  \nabla_{\x(t)} \log p_{0t}(\x(t)\mid \x(0))}\right]\right\}
$$

### Interpretation of SMLD and DDPM

详细推导可见附录 B。

**SMLD**

对于噪声水平 $\sigma_i$，有 $p_{\sigma_i}(\x \mid \x_0) = \mathcal{N}(\x; \x_0, \sigma_i^2I)$，即 $\x = \x_0 + \sigma_i\mathcal{N}(0, I)$ 。因此，对于从 $\sigma_i$ 和 $\sigma_{i-1}$ 中采样的样本，有如下递推式：
$$
\tag{4}
\x_i = \x_{i-1} + \sqrt{\sigma_i^2 - \sigma_{i-1}^2}\z_{i-1} \quad i = 1,\dots,N
$$
当 $N \to \infty, \Delta t\to 0$ 时，可以将该过程写成 SDE 的形式：
$$
\tag{5}
\d \x = \sqrt{\frac{\d[\sigma^2(t)]}{\d t}} \d \w
$$
 当 $t\to \infty$ 时，有 $\Sigma(t) \to \infty$，因此叫做 Variance Exploding(VE) SDE。

**DDPM**
$$
\tag{6}
\x_i = \sqrt{1-\beta_i}\x_{i-1}+\sqrt{\beta_i}\z_{i-1} \quad i = 1,\dots,N
$$
当 $N \to \infty, \Delta t\to 0$ 时，可以将该过程写成 SDE 的形式：
$$
\tag{7}
\d \x = -\frac{1}{2}\beta(t)\d t + \sqrt{\beta(t)} \d\w
$$
 当 $t\to \infty$ 时，有 $\Sigma(t) = I + e^{\int_0^t-\beta(s)\d s}(\Sigma(0)-I) \to \text{const}$，因此叫做 Variance Preserving(VP) SDE。

::: details 一个疑点

对于推导中暂时有两步不明白：

![原文推导过程.](/assets/images/work/cv/SDE/doubt.png#mdimg =600x)

1. 对于 (24) 式，有 ：
   $$
   \beta(t + \Delta t)\Delta t = \bar{\beta}_{Nt + N\Delta t}\Delta t = \bar{\beta}_{Nt + 1}\Delta t = N \beta_{Nt+1} \cdot \frac{1}{N} = \beta_{Nt + 1}
   $$
   

   而 $\beta_{Nt + 1}$ 并没有无穷小的条件，则第一步近似无法成立。

2. $\sqrt{\Delta t} \ \z(t) \approx \d\w$ 是由温拿过程定义的吗？

:::

**sub-VP SDEs**

基于 VP SDES，作者提出了一类新的 SDE，sub-VP SDE：
$$
\tag{8}
\d\x = -\frac{1}{2}\beta(t)\x\ \d t + \sqrt{\beta(t)(1-e^{2\int_0^t-\beta(s)\d s})}\ \d\w
$$
sub-VP SDE 的方差上界总是对应的 SDE。

**conclusion**

上述三种 SDE 的漂移系数均是 affine 的，因此它们的转移核 $p_{0t}(\x(t)\mid \x(0))$ 都是高斯分布，并且可以计算如下：
$$
\tag{9}
p_{0t}(\mathbf{x}(t) \mid \mathbf{x}(0)) = 
\begin{cases}
    \mathcal{N}\left(\mathbf{x}(t); \mathbf{x}(0), [\sigma^2(t) - \sigma^2(0)]\mathbf{I} \right), & \text{(VE SDE)} \\
    \mathcal{N}\left(\mathbf{x}(t); \mathbf{x}(0)e^{-\frac{1}{2}\int_{0}^t \beta(s)ds}, 
    \mathbf{I} - \mathbf{I}e^{-\int_{0}^t \beta(s)ds} \right), & \text{(VP SDE)} \\
    \mathcal{N}\left(\mathbf{x}(t); \mathbf{x}(0)e^{-\frac{1}{2}\int_{0}^t \beta(s)ds}, 
    \left[1 - e^{-\int_{0}^t \beta(s)ds}\right]^2 \mathbf{I} \right), & \text{(sub-VP SDE)}
\end{cases}
$$
有了确定的表达式，我们就可以利用 (3) 对模型进行训练

### Solving the Reverse SDE

#### SDE solvers

训练得到 $\s_\theta$ 后，我们就可以模拟逆向 SDE，来从 $p_0$ 中生成样本。作者在文中介绍了四种方法：

**一般性的数值方法**

归根结底，这是一个微分方程，因此可以使用数值方法来求解，例如 *Euler-Maruyama* 、*stochastic Runge-Kutta methods*，这些方法等价于对 SDE 采用了相应的离散化处理。

**ancestral sampling**

这种方法来源于 score-based DDPM 推导中的逆向过程：
$$
\tag{10}
\x_{i-1} = \frac{1}{\sqrt{1-\beta_i}}(\x_i + \beta_i\s_{\theta^*}(\x_i, i)) +\sqrt{\beta_i}\ \z_i
$$
之所以叫这个名字，是因为它实际上是在 $\prod_{i=1}^N p_\theta(\x_{i-1}\mid \x_i)$ 中采样。这种方法源自 DDPM，但在应用到其他 SDE 的时候可能存在困难（但实际上作者成功应用到了 VE SDE，详见附录 F）。

**reverse diffusion**

为了解决 ancestral sampling 的问题，作者提出了 reverse diffusion（详见附录 E），可以在给定前向过程的离散化情况下，给出相应的逆向过程离散化。

**probability flow**

对于给定的 SDE，作者推导出了相应的 *probability flow* ODE（详见附录 D），他们具有相同的边缘分布 $\{p_t(\x)\}_{t=0}^T$ ，其表达式如下：
$$
\tag{11}
\d\x = \left[\tilde{\f}(\x, t) - \frac{1}{2}g(t)^2\sc{p_t}{\x}\right]\d t
$$
相比原始的反向 SDE (2)，直观上是将 $\d\bar{\w}$ 给吸收进了 $\tilde{\f}(\x, t)$。效果上讲，最直接的，*probability flow* ODE 可以加快采样速度，文章提到可以减少超过 90% 的计算。

![***Table 1***. 不同 solver，sampler 的生成结果. PC1000 指的是预测和修正分别 1000 步.](/assets/images/work/cv/SDE/result.png#mdimg =600x)

#### Predictor-Corrector Samplers

除了对于 (2) 的采用不同离散化方法，作者还提出了 PC 采样来作用于所有 solver，以改进生成效果。而实际效果也确实很好：如 表1 所示，使用 PC 采样，可以使得 *probability flow* ODE 的效果接近其他的 solver。

在 PC 采样 中，predictor 可以是任何离散化的反向 SDE，而 corrector 可以是任何基于分数的 MCMC 方法。以 reverse diffusion SDE 和退火朗之万动力采样为例，可以针对 VE SDE 和 VP SDE 分别得出如下算法：

![***Figure 1***. PC sampling for VE/VP SDE.](/assets/images/work/cv/SDE/alg-PC.png#mdimg =600x)

为什么需要 PC 采样？注意到，对于逆向 SDE 的离散化难免会有误差，在进行一步预测后，通过多步朗之万动力采样，可以一定程度上修正该误差。引入的修正步骤会增加计算开销，而 ODE 加上修正步骤，还能维持多少的计算量削减？

### Controllable Generation

可控生成是指，不从 $p_0(\x_0)$ 中采样，而是从 $p_0(\x(0)\mid \y)$ 中采样，其中 $\y$ 可以是文字描述、类别信息等等。为了求解条件化的逆向 SDE，实际上只需要表示出 (2) 中的 $\sc{p_t}{\x\mid\y}$。根据贝叶斯定理可知：
$$
\tag{12}
\sc{p_t}{\x\mid\y} = \nabla_\x \left[\log p_t(\x) + \log p_t(\y \mid \x) - \log p_t(\y)\right] = \nabla_\x \left[\log p_t(\x) + \log p_t(\y \mid \x)\right]
$$

代入 (2)，可以得到条件化逆向 SDE 的表达式：
$$
\tag{13}
\d\x = \{ \f(\x, t) - g(t)^2 \left[\nabla_\x \log p_t(\x) + \nabla_\x \log p_t(\y \mid \x)\right]\}\d t + g(t) d\bar{\w}
$$

至于 $p_t(\y \mid \x(t))$，即给定样本 $\x(t)$，能够输出其“类别”的概率，应当是事先训练好的分类器。






[SDE]:https://arxiv.org/abs/2011.13456
[YangSongBlog]: https://yang-song.net/blog/2021/score/
[ZhangZhenHuBlog]:https://www.zhangzhenhu.com/aigc/Score-Based_Generative_Models.html
[yynBlog]:https://yynnyy.cn/6b94db09



