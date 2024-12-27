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

> **DDPM对应了diffusion SDE的maximum likelihood SDE solver，并且最优方差由Analytic-DPM来解析地给出。**
>
> maximum likelihood SDE solver: 某种一阶近似，而一阶近似其实存在无数种

### 回顾 DDIM

$$
q(\x_{1:N}\mid \x_0) = q(\x_N \mid \x_0) \prod_{n=2}^Nq(\x_{n-1}\mid \x_n, \x_0)
$$

<img src="/Users/simenons/Library/Application Support/typora-user-images/Screenshot 2024-12-16 at 7.38.44 PM.png" alt="Screenshot 2024-12-16 at 7.38.44 PM" style="zoom:33%;" />

特殊情况：DDIM 和 DDPM

这个过程的逆向过程为一个马尔可夫过程，<img src="/Users/simenons/Library/Application Support/typora-user-images/Screenshot 2024-12-16 at 7.42.42 PM.png" alt="Screenshot 2024-12-16 at 7.42.42 PM" style="zoom:50%;" />

其中 $\mu_n(\x_n)$ 具有和 $\tilde{\mu}_n(\x_n, \x_0)$ 相同的形式，只需要通过 score function 首先预测出 $\x_0$。

对于逆向过程的 $\sigma_n$，DDIM 取 $\lambda_n$，而 DDPM 取 $\beta_n, \tilde{\beta}_n$。都是人为设计的。

### 均值方差的解析解

<img src="/Users/simenons/Library/Application Support/typora-user-images/Screenshot 2024-12-16 at 7.59.02 PM.png" alt="Screenshot 2024-12-16 at 7.59.02 PM" style="zoom:50%;" />

作者证明了这个优化目标的解析解：

<img src="/Users/simenons/Library/Application Support/typora-user-images/Screenshot 2024-12-16 at 7.59.41 PM.png" alt="Screenshot 2024-12-16 at 7.59.41 PM" style="zoom:50%;" />

均值和原来的一样（也就是沿用 $q(\x_{n-1}\mid \x_{n}, \x_0)$ 是对的），但方差却有着不同的形式。

#### 怎么求

$\lambda_n , \beta_n, \alpha_n$ 这些其实都是定死的，$\nabla_{\x_n} \log q_n(\x_n)$ 可以通过模型训练结果 $s_n(x_n)$ 来估计，所以需要解决的只有 $\mathbb{E}_{q_n(x_n)}$。用一个 Monte Carlo 采样近似一下即可：
$$
\Gamma_n = \frac{1}{M} \sum_{m=1}^M \frac{\norm{s_n(\x_{n, m})}}{d}, \quad \x_{n, m} \overset{iid}{\sim} q_n(\x_n)
$$
写出来就长这样：

<img src="/Users/simenons/Library/Application Support/typora-user-images/Screenshot 2024-12-16 at 8.52.11 PM.png" alt="Screenshot 2024-12-16 at 8.52.11 PM" style="zoom:50%;" />

实验证明，M 取 10、100 也能获得不错的效果。

#### 上下界

<img src="/Users/simenons/Library/Application Support/typora-user-images/Screenshot 2024-12-16 at 8.33.17 PM.png" alt="Screenshot 2024-12-16 at 8.33.17 PM" style="zoom:50%;" />

方差的估计值和最优值的 bias （？）如上。注意到 approximation error 其实是固定的，而较短的去躁路径会导致系数项很大。为此，作者推导出了最优方差理论解的上下界，来对估计值进行裁切。

<img src="/Users/simenons/Library/Application Support/typora-user-images/Screenshot 2024-12-16 at 8.37.08 PM.png" alt="Screenshot 2024-12-16 at 8.37.08 PM" style="zoom:50%;" />

#### 路径最优化

对于 DDIM 中 $1 = \tau_1 < \dots < \tau_K = N$ ，共 $K$ 个时间步的跳步，其均值、方差的最优解解析式如下：

![Screenshot 2024-12-16 at 8.46.40 PM](/Users/simenons/Library/Application Support/typora-user-images/Screenshot 2024-12-16 at 8.46.40 PM.png)

既然固定 $\{\tau_i\}$ 可以写出解析解，那么我们就可以进一步求解最优的 $\{\tau_i\}$：

<img src="/Users/simenons/Library/Application Support/typora-user-images/Screenshot 2024-12-16 at 8.57.40 PM.png" alt="Screenshot 2024-12-16 at 8.57.40 PM" style="zoom:50%;" />

其中，$J(\tau_{k-1}, \tau_k) = \log(\sigma^{*2}_{\tau_{k-1}\mid \tau_k} / \lambda^2_{\tau_{k-1}\mid \tau_k})$ ，注意以下几点：

- c 是一个和路径选择无关的常量
- 可以通过MC来估计$\sigma^*$，从而使得 $J(\tau_{k-1}\mid \tau_k)$ 可计算

因此，这个问题就是一个计算 $1\to N$ 的最短路径的 DP 问题。

#### score function 和协方差矩阵

