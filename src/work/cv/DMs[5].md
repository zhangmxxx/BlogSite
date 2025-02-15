---
cover: /assets/images/work/cv/DMs[5]/cover.jpg
date: 2025-02-13
category:
  - article reading
tag:
  - Computer Vision
  - diffusion
star: true
sticky: true
excerpt: <p> 扩散模型系列之五：Analytic-DPM </p>
---

# DMs[5] Analytic-DPM 
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
\def\mbr#1{\left[#1\right]}
\def\sbr#1{\left(#1\right)}
\def\E#1{\mathbb{E}\left[#1\right]}
\def\KL#1#2{D_{\text{KL}}\left(#1\ ||\ #2\right)}
\def\argmin#1{{\arg\min}_{#1}\quad}
\def\norm#1{\left\lVert#1\right\rVert_2^2}
\def\sc#1#2{\tx\log #1(#2)}
$$

> - 填年前（12.20左右）的坑（把截图里的公式给敲完，顺便熟悉一下之前的内容）
>
> - 摆了一整个寒假，唯一战果是一些拥有版权的封面图，比如上图：拍摄于东京新国立美术馆。
>
> **DDPM对应了diffusion SDE的maximum likelihood SDE solver，并且最优方差由Analytic-DPM来解析地给出。** maximum likelihood SDE solver: 某种一阶近似，而一阶近似其实存在无数种

### 回顾 DDIM

$$
\tag{1}
\begin{aligned}
q(\x_{1:N}\mid \x_0) &= q(\x_N \mid \x_0) \prod_{n=2}^Nq(\x_{n-1}\mid \x_n, \x_0)\\
q(\x_N\mid \x_0) &= \mathcal{N}(\x_N \mid \sqrt{\bar{\alpha}_N}\x_0, \bar{\beta}_NI)\\
q(\x_{n-1}\mid \x_n, \x_0) &= \mathcal{N}(\x_{n-1}\mid \tilde{\mu}_n(\x_n, \x_0), \lambda_n^2I)\\
\tilde{\mu}_n(\x_n, \x_0) &= \sqrt{\bar{\alpha}_{n-1}}\x_0 + \sqrt{\bar{\beta}_{n-1}-\lambda_n^2} \cdot \frac{\x_n - \sqrt{\bar{\alpha}_n}\x_0}{\sqrt{\bar{\beta}_n}}
\end{aligned}
$$

从（1）中可以看出，DDIM 并没有显式定义前向过程，而是在保证 $q(\x_n\mid \x_0)$ 与 DDPM 中一样的情况下，定义了逆向过程 $q(\x_{n-1}\mid \x_n, \x_0)$ （事实上，这个值在 DDPM 的推导中也要用到，作为逆向过程的 baseline）。在这个框架下，DDIM 和 DDPM 分别是 $\lambda_n$ 取 0 和 $\frac{\bar{\beta}_{n-1}}{\bar{\beta}_n} \beta_n$ 的特例。

因为其中有条件项 $\x_0$，所以上面的都还只是前向过程，该过程的逆向过程（也就是只给定 $\x_n$ 的生成过程）一般定义为马尔可夫过程：
$$
\tag{2}
\begin{aligned}
p(\mathbf{x}_{0:N}) = p(\mathbf{x}_N) \prod_{n=1}^{N} p(\mathbf{x}_{n-1} \mid \mathbf{x}_n), \quad
p(\mathbf{x}_{n-1} \mid \mathbf{x}_n) = \mathcal{N}(\mathbf{x}_{n-1} \mid \mu_n(\mathbf{x}_n), \sigma_n^2 \mathbf{I}),
\end{aligned}
$$
其中，令 $\mu_n(\x_n)$ 具有和 $\tilde{\mu}_n(\x_n, \x_0)$ 相同的形式，只需要通过 score function 首先预测出 $\x_0$。

而对于逆向过程的 $\sigma_n$，DDIM 取 $\lambda_n$，而 DDPM 取 $\beta_n, \tilde{\beta}_n$。都是人为设计的。

### 均值方差的解析解

$$
\tag{3}
\begin{aligned}
\min_{\{\mu_n, \sigma_n^2\}_{n=1}^{N}} L_{\text{vb}} \iff
\min_{\{\mu_n, \sigma_n^2\}_{n=1}^{N}} D_{\text{KL}} \big( q(\mathbf{x}_{0:N}) \parallel p(\mathbf{x}_{0:N}) \big).
\end{aligned}
$$

作者证明了这个优化目标的解析解：
$$
\tag{4}
\begin{aligned}
\mu_n^*(\mathbf{x}_n) &= \tilde{\mu}_n \left( \mathbf{x}_n, \frac{1}{\sqrt{\alpha_n}} \left( \mathbf{x}_n + \bar{\beta}_n \nabla_{\mathbf{x}_n} \log q_n(\mathbf{x}_n) \right) \right),
\end{aligned}
$$

$$
\tag{5}
\begin{aligned}
\sigma_n^{*2} &= \lambda_n^2 + \left( \sqrt{\frac{\beta_n}{\alpha_n}} - \sqrt{\beta_{n-1}} - \lambda_n^2 \right)^2 \left( 1 - \bar{\beta}_n \mathbb{E}_{q_n(\mathbf{x}_n)} \frac{\|\nabla_{\mathbf{x}_n} \log q_n(\mathbf{x}_n)\|^2}{d} \right).
\end{aligned}
$$

均值和原来的一样（也就是沿用 $q(\x_{n-1}\mid \x_{n}, \x_0)$ 是对的），但方差却有着不同的形式。

#### 怎么求

$\lambda_n , \beta_n, \alpha_n$ 这些其实都是定死的，$\nabla_{\x_n} \log q_n(\x_n)$ 可以通过模型训练结果 $s_n(x_n)$ 来估计，所以需要解决的只有 $\mathbb{E}_{q_n(x_n)}$。用一个 Monte Carlo 采样近似一下即可：
$$
\tag{6}
\Gamma_n = \frac{1}{M} \sum_{m=1}^M \frac{\norm{s_n(\x_{n, m})}}{d}, \quad \x_{n, m} \overset{iid}{\sim} q_n(\x_n)
$$
写成表达式就长这样：
$$
\tag{7}
\hat{\sigma}_n^2 = \lambda_n^2 + \sbr{\sqrt{\frac{\bar{\beta}_n}{\alpha_n}} - \sqrt{\bar{\beta}_{n-1} - \lambda_n^2}}^2(1-\bar{\beta}_n \Gamma_n)
$$
实验证明，M 取 10、100 也能获得不错的效果。

#### 上下界

$$
\tag{8}
\begin{aligned}
\left| \sigma_n^{*2} - \hat{\sigma}_n^{2} \right| =
\underbrace{\left( \sqrt{\frac{\beta_n}{\alpha_n}} - \sqrt{\beta_{n-1}} - \lambda_n^2 \right)^2}_{\text{Coefficient}}
\underbrace{\bar{\beta}_n \left| \Gamma_n - \mathbb{E}_{q_n(\mathbf{x}_n)} \frac{\|\nabla_{\mathbf{x}_n} \log q_n(\mathbf{x}_n)\|^2}{d} \right|}_{\text{Approximation error}}.
\end{aligned}
$$

方差的估计值和最优值的 bias （？）如上。注意到 approximation error 其实是固定的，而较短的去躁路径会导致系数项很大。为此，作者推导出了最优方差理论解的上下界，来对估计值进行裁切（上下界可以较为准确地计算，这样在实际计算方差时，可以直接算上下界），详见原论文。

### 路径最优化

对于 DDIM 中 $1 = \tau_1 < \dots < \tau_K = N$ ，共 $K$ 个时间步的跳步，其均值、方差的最优解解析式如下：
$$
\tag{9}
\begin{aligned}

&\mu^*_{\tau_k-1 | \tau_k} (\mathbf{x}_{\tau_k}) =
\tilde{\mu}_{\tau_k-1 | \tau_k} \left( \mathbf{x}_{\tau_k}, 
\frac{1}{\sqrt{\alpha_{\tau_k}}} \left( \mathbf{x}_{\tau_k} + \bar{\beta}_{\tau_k} \nabla_{\mathbf{x}_{\tau_k}} \log q(\mathbf{x}_{\tau_k}) \right) \right)\\
&\sigma^{*2}_{\tau_k-1 | \tau_k} =
\lambda^2_{\tau_k-1 | \tau_k} +
\left( \sqrt{\frac{\beta_{\tau_k}}{\alpha_{\tau_k}}} - \sqrt{\beta_{\tau_k-1}} - \lambda^2_{\tau_k-1 | \tau_k} \right)^2
\left(1 - \bar{\beta}_{\tau_k} \mathbb{E}_{q(\mathbf{x}_{\tau_k})} 
\frac{\|\nabla_{\mathbf{x}_{\tau_k}} \log q(\mathbf{x}_{\tau_k})\|^2}{d} \right).
\end{aligned}
$$
相较于之前的算法，这里对于固定的 $\{\tau_i\}$ 可以写出解析解，那么我们就可以进一步求解最优的 $\{\tau_i\}$：
$$
\tag{10}
\min_{\tau_1, \dots, \tau_K} D_{\text{KL}} \big( q(x_0, x_{\tau_1}, \dots, x_{\tau_K}) \parallel 
p^*(x_0, x_{\tau_1}, \dots, x_{\tau_K}) \big) = 
\frac{d}{2} \sum_{k=2}^{K} J(\tau_{k-1}, \tau_k) + c.
$$
其中，$J(\tau_{k-1}, \tau_k) = \log(\sigma^{*2}_{\tau_{k-1}\mid \tau_k} / \lambda^2_{\tau_{k-1}\mid \tau_k})$ ，注意以下几点：

- c 是一个和路径选择无关的常量
- 可以通过MC来估计$\sigma^*$，从而使得 $J(\tau_{k-1}\mid \tau_k)$ 可计算

因此，这个问题就是一个计算 $1\to N$ 的最短路径的 DP 问题。

### DPM-Solver

基本是跟着[这篇文章](https://zhuanlan.zhihu.com/p/695718570)读论文的，这里就不复述了。Take away message：将原本的微分方程，在一系列近似的基础上写成确定解的形式，从而摆脱了步长对误差的影响。如图中蓝线所示，步长会放大 $\d \x_t/\d t$ 的误差，而改用 DPM-Solver 之后，误差可以看作是确定解基础上的偏移，与步长无关。

![***Figure 1***: 12.24 组会总结的 DPM-Solver 的重点](/assets/images/work/cv/DMs[5]/DPM.png#mdimg =600x)
