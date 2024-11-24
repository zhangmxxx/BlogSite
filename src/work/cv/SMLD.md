---
cover: /assets/images/work/cv/SMLD/cover.jpg
date: 2024-11-23
category:
  - article reading
tag:
  - Computer Vision
  - score-based
star: true
sticky: true
excerpt: <p>基于分数的生成模型：NCSN</p>
---



# SMLD

$$
\def\R{\mathbf{R}}
\def\X{\mathbf{X}}
\def\x{\mathbf{x}}
\def\z{\mathbf{z}}
\def\v{\mathbf{v}}
\def\d{\mathrm{d}}
\def\s{\mathbf{s}}
\def\bx{\tilde{\x}}
\def\tx{\nabla_{\x}}
\def\LD{\mathcal{LD}}
\def\E#1{\mathbb{E}\left[#1\right]}
\def\KL#1#2{D_{\text{KL}}\left(#1\ ||\ #2\right)}
\def\argmin#1{{\arg\min}_{#1}\quad}
\def\norm#1{\left\lVert#1\right\rVert_2^2}
\def\sc#1#2{\tx\log #1(#2)}
$$

**原论文**：[link][SMLD]

**参考博客**：[link1][DM-derive]、[link2][YangSongBlog](封面来源)、[link3][ZhangZhenHuBlog]

## Score matching with Langevin dynamics

### Basic Idea

在 DDPM 中，我们通过学习逆向过程的分布 $p_\theta(\x_{t-1}|\x_{t})$ 来从 $p_T(\x_T)$ 中生成图像，而基于分数的生成模型给出了另一种思路：放弃使用 $p_\text{data}(\x)$，转而学习样本分布 $p_{\text{data}}(\x)$ 的梯度 $\tx \log p(\x)$，随后通过 Langevin dynamics 过程，在 $p_\text{data}(\x)$中进行采样，以生成新的数据。因此，基于分数的生成模型可以看作由以下两部分构成：

- 通过分数匹配，训练 $\s_\theta(\x)\approx \tx \log p(\x)$；
- 通过基于分数的采样算法，随机采样近似 $p_\text{data}(\x)$ 的样本。

### SMLD framework

#### Score matching

分数匹配方法起初是为了学习具有如下形式的分布：
$$
\tag{1}
p_\theta(\x) = \frac{1}{Z_\theta} e^{-f_\theta(\x)}
$$
其中 $Z_\theta = \int e^{-f_\theta(\x)}$ 是归一项。如果要使用最大似然法，那么就不得不计算 $Z_\theta$，而这需要遍历 $\x$，在多数情况下不适用。而该分布的分数 $\tx \log p_\theta(\x)$ 却很容易计算：
$$
\tag{2}
\begin{aligned}
\tx \log p_\theta(\x) &= \tx \log \frac{1}{Z_\theta} + \tx \log e^{-f_\theta(\x)}\\
&= -\tx f_\theta(\x)\\
&\approx \s_\theta(\x)
\end{aligned}
$$
因此，我们可以转而学习该分布的分数，而不需要首先训练一个模型，来预测 $p_\text{data}(\x)$。而这个方法显然不局限于这种形式的分布。训练该模型，需要最小化均方误差 $\frac{1}{2}\E{\norm{\s_\theta(\x)-\tx\log p_\text{data}(\x)}}$，而该损失函数还可以进一步**写作与 $p_\text{data}$ 无关的形式**：
$$
\tag{3}
\mathbb{E}_{p_\text{data}(\x)} \left[\text{tr}(\tx \s_\theta(\x) + \frac{1}{2}\norm{\s_\theta(\x)})\right]
$$

::: details expand to see details

（**直接挪用了 GPT 的回答**）

从以下目标函数形式：
$$
J(\theta) = \frac{1}{2} \int p_{\text{data}}(\x) \left\lVert \s_{\text{data}}(\x) - \s_{\theta}(\x) \right\rVert^2_2 \, \d\x
$$

推导到目标函数的另一种形式：

$$
J(\theta) = \int p_{\text{data}}(\x) \left[ \operatorname{tr}(\nabla_\x \s_{\theta}(\x)) + \frac{1}{2} \left\lVert \s_{\theta}(\x) \right\rVert^2_2 \right] \d\x
$$

关键步骤如下：

---

#### 原始形式展开

平方项展开：

$$
\left\lVert \s_{\text{data}}(\x) - \s_{\theta}(\x) \right\rVert^2_2 = \left\lVert \s_{\text{data}}(\x) \right\rVert^2_2 - 2 \s_{\text{data}}(\x) \cdot s_{\theta}(\x) + \left\lVert s_{\theta}(\x) \right\rVert^2_2
$$

代入 $J_\theta$：

$$
J(\theta) = \frac{1}{2} \int p_{\text{data}}(\x) \left( \left\lVert \s_{\text{data}}(\x) \right\rVert^2_2 - 2 \s_{\text{data}}(\x) \cdot s_{\theta}(\x) + \left\lVert \s_{\theta}(\x) \right\rVert^2_2 \right)\ \d\x
$$

拆分为三项：

$$
J(\theta) = \frac{1}{2} \int p_{\text{data}}(\x) \left\lVert \s_{\text{data}}(\x) \right\rVert^2_2\ \d\x 
- \int p_{\text{data}}(\x) \s_{\text{data}}(\x) \cdot \s_{\theta}(\x)\ \d\x 
+ \frac{1}{2} \int p_{\text{data}}(\x) \left\lVert \s_{\theta}(\x) \right\rVert^2_2 \ \d\x
$$

注意，得分函数 $\s_{\text{data}}(\x)$ 定义为：

$$
\s_{\text{data}}(\x) = \nabla_\x \log p_{\text{data}}(\x) = \frac{p_{\text{data}}(\x)}{\tx p_{\text{data}}(\x)}
$$

由此，积分中的第二项可以化简为：

$$
\int p_{\text{data}}(\x) \s_{\text{data}}(\x) \cdot \s_{\theta}(\x)\ \d\x = \int \nabla_\x p_{\text{data}}(\x) \cdot \s_{\theta}(\x)\ \d\x
$$

---

#### 利用分部积分化简

对第二项应用分部积分（忽略边界项），有：

$$
\int \tx p_{\text{data}}(\x) \cdot \s_{\theta}(\x)\ \d\x = -\int p_{\text{data}}(\x) \operatorname{tr}(\nabla_\x \s_{\theta}(\x))\ \d\x
$$

因此：

$$
\int p_{\text{data}}(\x) \s_{\text{data}}(\x) \cdot \s_{\theta}(\x)\ \d\x = -\int p_{\text{data}}(\x) \operatorname{tr}(\nabla_\x \s_{\theta}(\x))\ \d\x
$$

> - 为什么能省略边界项 $p_{\text{data}}(\x)\cdot \s_\theta(\x)$ ? 在分部积分中，边界项其实是 $p_{\text{data}}(\x)\cdot \s_\theta(\x) |_a^b$，而在真实分布中，$a,b$ 两点的概率密度基本为0。
> - 为什么是 $\text{tr}$ ? 由向量场 $v(x)$ 的散度定义。

---

#### 代入原表达式

将化简结果代入 $J(\theta)$：

$$
J(\theta) = \frac{1}{2} \int p_{\text{data}}(\x) \left\lVert \s_{\text{data}}(\x) \right\rVert^2_2\ \d\x 
+ \int p_{\text{data}}(\x) \operatorname{tr}(\nabla_\x \s_{\theta}(\x))\ \d\x
+ \frac{1}{2} \int p_{\text{data}}(\x) \left\lVert \s_{\theta}(\x) \right\rVert^2_2 \ \d\x
$$

注意到，第一项是与参数 $\theta$ 无关的常数，可以忽略。

因此：

$$
J(\theta) =\int p_{\text{data}}(\x) \operatorname{tr}(\nabla_\x \s_{\theta}(\x))\ \d\x
+ \frac{1}{2} \int p_{\text{data}}(\x) \left\lVert \s_{\theta}(\x) \right\rVert^2_2 \ \d\x
$$

整理后为：

$$
\begin{aligned}
J(\theta) &= \int p_{\text{data}}(\x) \left[ \operatorname{tr}(\nabla_\x \s_{\theta}(\x)) + \frac{1}{2} \left\lVert \s_{\theta}(\x) \right\rVert^2_2 \right] \ \d\x \\
&= \mathbb{E}_{p_{\text{data}}(\x)} \left[ \operatorname{tr}(\nabla_\x \s_{\theta}(\x)) + \frac{1}{2} \left\lVert \s_{\theta}(\x) \right\rVert^2_2 \right]
\end{aligned}
$$

:::

但是，$\text{tr}(\tx \s_\theta(\x))$ 的计算成本很高（因为是二阶偏导），针对这个问题，有两种解决方法：

**Denoising score matching**

这类方法可以完全绕开 $\text{tr}(\tx \s_\theta(\x))$ 的计算，通过向原始分布 $p_\text{data}(\x)$ 添加噪声 $q_\sigma(\bx \mid \x)$，我们可以得到新的分布 $q_\sigma(\bx) \triangleq \int q_\sigma(\bx\mid\x)p_\text{data}(\x)\ \d\x$，等价的。而可以证明，对于 $q_\sigma(\bx)$ 的目标函数等价于：
$$
\tag{3}
\frac{1}{2}\mathbb{E}_{q_\sigma(\bx\mid\x)p_\text{data}(\x)} \left[\norm{\s_\theta(\bx) -\nabla_{\bx}\log q_\sigma(\bx\mid\x)}\right]
$$
这个目标函数具有以下特点：

- 同样与 $p_\text{data}$ 无关，方便计算；
- 最终得到的是 $\s_{\theta^*} = \sc{q_\sigma}{\bx\mid\x} \approx \log p_\text{data}(\x)$，这要求添加的扰动程度不能太大。

**Sliced score matching**

使用随机投影来近似计算 $\text{tr}(\tx \s_\theta(\x))$，目标函数为
$$
\tag{4}
\mathbb{E}_{p_\v} \mathbb{E}_{p_{\text{data}}(x)}\left[ { \v^T \nabla_{\x} \s_{\theta}(\x)\v
+ \frac{1}{2} \left\lVert  \s_{\theta}(\x)   \right\rVert^2_2   } \right]
$$

#### Langevin dynamics

朗之万动力采样（Langevin dynamics sample，后简记为 $\LD$）算法可以从 $p(\x)$ 中生成样本，而只需要用到分布的分数。首先，从某个已知的先验分布 $\pi(\x)$ 中采样 $\bx_0\sim \pi(\x)$，然后迭代如下过程：
$$
\tag{5}
\bx_t = \bx_{t-1} + \frac{\epsilon}{2}\sc{\bx_{t-1}} + \sqrt{\epsilon}\ \z_t
$$
因此，我们可以首先通过分数匹配训练 $\s_\theta(\x)\approx\sc{p}{\bx_{t-1}}$ ， 随后通过 $\LD(T \to \infty,\epsilon \to 0)$ 来生成样本。

### Challenges of naive SMLD

#### 流形假设

在实际情况中，样本可能集中在高维样本空间的低维流形上 (某些维度不包含信息，例如全是0)，这会导致 SMLD 做法的一些问题。首先，$\tx$ 在无效维度上无法定义；其次，当数据无法填满空间时，还会导致 $\s_\theta(\x)$ 预测不一致。

#### 低密度区域

在概率密度较低的区域，我们能获取的样本相应的也会更少，这会导致训练不足；

#### 无法处理混合分布

对于一个分布 $p_{\text{data}}(\x)$，我们称 $\{\x \mid p_\text{data}(\x) > 0\}$ 为其支持集，其中每个点称为一个 mode。假设有一个混合分布 $p(\x) = \pi p_1(\x) + (1-\pi) p_2(\x)$，在 $p_1(\x)$ 的支持集中，我们有 $\sc{x} = \tx{\log \pi + \log p_1(\x)} = \tx \log p_1(\x)$ ，可以发现梯度与混合系数 $\pi$ 无关。在 $p_2(\x)$ 的支持集中，也能得出类似的结论。这就意味着，生成样本的过程并不会取决于 $\pi$。假设我们在空间内随机采样初始点，因为生成过程与 $\pi$ 无关，这会导致最终生成的样本均匀分布在各 mode 上。同时，当各 mode 之间存在低密度区域时，也会导致 $\LD$ 需要需要很小的步长、很大的迭代次数，才能正确采样。（个人理解：正确的 $\LD$ 应当能够实现跨 mode 生成，否则样本的生成将取决于其初始点的选取，这显然不是 $p_\text{data}(\x)$，而是一个取决于 $\x_0$ 的条件分布。而 SMLD 忽略混合系数 $\pi$ 的特性会导致在跨域低密度区域时困难，进而导致跨 mode 困难。较小的步长是为了稳定，否则会跳过 mode。）

> [!warning]
>
> 对于流形导致的两个问题、$\LD$ 在低密度区域存在时的问题，笔者暂时还不能完全理解，所以表述可能并不准确。如果你在读这篇笔记，请务必查看原论文。

### NCSN

#### Inspiration

基于上述问题，原论文作者提出了 **NCSN(Noise Conditional Score Networks)**。该方法的提出基于以下观察：

- 加入噪声可以解决上述问题：加噪会改变原有的数据分布：$p_\sigma(\bx) = \int p_\sigma(\bx\mid \x)p_\text{data}(\x) \ \d\x$，当噪声足够大时，我们甚至可以使得 $p_\sigma(\bx) \approx \pi(\x)$，变成一个已知的先验分布。最直接的，加噪可以解决流型假设问题和低密度区域问题；而对于混合分布问题，原文并没有给出详细的解释，个人理解应当也和低密度区域的消除有关。
- 较小的噪声水平可以使得学习到的 $\s_\theta(\x)$ 与 $\tx{\log p_\text{data}(\x)}$ 足够接近，不会影响生成结果。

显然，这两个诉求是冲突的。那就设置不同强度的噪声，并且让模型同时学习不同强度下的 $\s_\theta$。

#### Definition

令 $\{\sigma_i\}_{i=1}^L$ 为满足 $\frac{\sigma_1}{\sigma_2} = \cdots = \frac{\sigma_{L-1}}{\sigma_L} > 1$ 的正几何序列。给定噪声 $\sigma$，加噪后的分布为 
$$
\tag{6}
q_\sigma(\x)\triangleq \int p_\text{data}(t) \mathcal{N}(\x; t, \sigma^2I)\ \d t
$$
其中，设置 $\sigma_1$ 足够大，使得加噪后的分布能够克服上述的问题； 设置 $\sigma_L$ 足够小，使得噪声对生成结果的影响足够小。而模型的训练目标针对所有噪声的：
$$
\tag{7}
\forall \sigma \in \{\sigma_i\}_{i=1}^L\quad \s_\theta(\x, \sigma)\approx \sc{q_\sigma}{\x}
$$
称 $\s_\theta(\x, \sigma)$ 为一个 **NCSN**。

#### Train and Inference

训练过程以 denoising score matching 为例：加噪过程 $q_\sigma(\bx\mid \x) = \mathcal{N}(\bx;\x, \sigma^2 I)$，因此 $\nabla_{\bx} \log q_{\sigma_i}(\bx \mid x) = -(\bx-\x)/\sigma_i^2$，代入 (3) 式可知：
$$
\tag{8}
\begin{aligned}
\ell(\theta; \sigma_i) \triangleq \frac{1}{2} \mathbb{E}_{p_\text{data}(\x)}\mathbb{E}_{\bx\sim\mathcal{N}(\x, \sigma^2, I)}\left[\norm{\s_\theta(\bx, \sigma) + \frac{\bx - \x}{\sigma^2}}\right]
\end{aligned}
$$
再对所有的 $\sigma_i$ 统一处理，可得：
$$
\tag{9}
\mathcal{L}(\theta; \{\sigma_i\}_{i=1}^L) \triangleq \frac{1}{L}\sum_{i=1}^L\lambda(\sigma_i)\ell(\theta; \sigma_i)
$$
推理过程可以看作 $\LD$ 的改良版，文章中称为 "annealed Langevin dynamics"，其实就是在不同的噪声水平上进行相应的 $\LD$。

![***Figure 1***: Annealed Langevin dynamics.](/assets/images/work/cv/SMLD/alg1.png#mdimg =400x)



[SMLD]:https://arxiv.org/abs/1907.05600
[DM-derive]: https://arxiv.org/abs/2208.11970
[YangSongBlog]: https://yang-song.net/blog/2021/score/
[ZhangZhenHuBlog]:https://www.zhangzhenhu.com/aigc/Score-Based_Generative_Models.html
