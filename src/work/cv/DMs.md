---
cover: /assets/images/work/cv/AEs/cover.png
date: 2024-11-16
category:
  - article reading
tag:
  - Computer Vision
  - diffusion
star: true
sticky: true
excerpt: <p>常见扩散模型的原理</p>
---
# DMs
## VDM

### Overview

![***Figure 1***: Architecture of VDM.](/assets/images/work/cv/DMs/VDM.png#mdimg =600x)

VDM 的原理与 MHVAE 非常类似，可以看作是在 MHVAE 的基础上添加了如下 3 个限制条件得到：

- 隐变量 $z_i$ 的维度与输入输出 $x$ 的维度一致。因此，不再使用 $z_i$ ，而统一使用 $x_i(0 \leqslant i \leqslant T)$ 来表示所有的变量。
- 编码器 $q(x_t|x_{t-1})$ 不再是通过神经网络学习的过程，而是一个固定的高斯线性变换。
- 通过为编码器的一系列高斯线性变换设置系数，使得最终的 $x_T$ 收敛到 $ \mathcal{N}(0, I)$。

**前向过程**

给定一个真实输入 $x_0$，通过逐步添加噪声，最终得到 $x_T \sim  \mathcal{N}(0, I)$ ，因此也叫作扩散过程。整个模型的后验分布可以写作：
$$
\tag{1}
q(x_{1:T}|x_0) = \prod_{t=1}^T q(x_t|x_{t-1})
$$
而由于编码器不再是一个参数化的过程，所以 $q(x_t|x_{t-1})$ 可以用公式明确给出：
$$
\tag{2}
q(x_t|x_{t-1}) = \mathcal{N} (\sqrt{\alpha_t} \ x_{t-1}, (1- \alpha_t ) \textit{I} )
$$
**逆向过程**

从随机高斯噪声 $x_T$ 开始，逐步还原出有意义的数据。整个模型的联合概率可以写作：
$$
\tag{3}
p(x_{0:T})=p(x_T)\prod_{t=T-1}^0 p(x_t |x_{t+1})
$$
其中，根据模型假设，我们知道 $p(x_T) \sim \mathcal{N}(0, I)$。那么，我们能否直接给出 $p(x_t|x_{t+1})$ 的表达式呢？
$$
\tag{4}
\begin{equation}
\begin{aligned}
p(x_t|x_{t+1}) &= \frac{q(x_{t+1}|x_t)\cdot p(x_t)}{p(x_{t+1})} \quad 贝叶斯定理\\
&= \frac{q(x_{t+1}|x_t)\cdot p(x_t)}{\int q(x_{t+1}|x_t)p(x_t) \ \mathrm{d}x_t} \quad 利用 x_{t+1}对 x_{t}的条件概率求出 p(x_{t+1})
\end{aligned}
\end{equation}
$$
观察其中的各项：

1. $q(x_{t+1}|x_t)$：该项是前向过程的加噪过程，可以写出表达式；
2. $p(x_t)$：该项表示了 $t$ 时样本服从的概率密度函数，可以从 $p(x_0)$ 迭代计算得到，而代表真实图像 $x_0$ 的真实概率分布 $p(x_0)$ 的概率密度函数是不知道的；
3. $\int q(x_{t+1}|x_t)p(x_t) \ \mathrm{d}x_t$：该项表示了 $t+1$ 时样本服从的概率密度函数，需要对 $x_t$ 的各种取值进行遍历积分，对于图像来说，这显然不可行。

因此，我们没法直接给出 $p(x_t|x_{t+1})$ 的表达式。因此，扩散模型借助参数化近似（如神经网络）来学习逆过程分布。

> 事实上，正向过程如果知道了qx0，也可以表达出整个模型的联合概率
>
> 所以也称为（图像）生成过程 ，而这个过程在统计概率学上，本质是从一个联合概率分布进行采样的过程，所以也可以称为采样（sample）过程。

### ELBO

#### Vanilla ELBO

VDM 可以通过最大化 ELBO 来进行优化：
$$
\tag{5}
\begin{split}\begin{align}
{\ln p(x_0)}
&= {\ln \int p(x_{0:T}) \ \mathrm{d}x_{1:T}} \quad 边际化\\
&= {\ln \int \frac{p(x_{0:T})q(x_{1:T}|x_0)}{q(x_{1:T}|x_0)} \ \mathrm{d}x_{1:T}}\\
&= {\ln \mathbb{E}_{q(x_{1:T}|x_0)}\left[\frac{p(x_{0:T})}{q(x_{1:T}|x_0)}\right]}\\
&\geq {\mathbb{E}_{q(x_{1:T}|x_0)}\left[\ln \frac{p(x_{0:T})}{q(x_{1:T}|x_0)}\right]}\quad \text{原始的ELBO}\\
&\cdots\cdots\\
&此处省略若干推导过程\\
&\cdots\cdots\\
&=  \begin{aligned}[t]
      {\underbrace{\mathbb{E}_{q(x_{1}|x_0)}\left[\ln p_{\theta}(x_0|x_1)\right]}_\text{reconstruction term}}
      &- {\underbrace{\mathbb{E}_{q(x_{T-1}|x_0)}\left[ D_{\text{KL}}({q(x_T|x_{T-1})}||{p(x_T))}\right]}_\text{prior matching term}} \\
      &- {\sum_{t=1}^{T-1}\underbrace{\mathbb{E}_{q(x_{t-1}, x_{t+1}|x_0)}\left[ D_{\text{KL}}( {q(x_{t}|x_{t-1})}||{p_{\theta}(x_{t}|x_{t+1}))}\right]}_\text{consistency term}}
    \end{aligned}
\end{align}\end{split}
$$
最终得到的 ELBO 由如下 3 项构成：

- $\mathbb{E}_{q(x_{1}|x_0)}\left[\ln p_{\theta}(x_0|x_1)\right]$ ：重建项，其含义同 AEs 中的重建项，表示了给定一步扩散过程的情况下，模型重建出原始输入 $x_0$ 的能力。

- $\mathbb{E}_{q(x_{T-1}|x_0)}\left[ D_{\text{KL}}({q(x_T|x_{T-1})}||{p(x_T))}\right]$ ：先验匹配项，其含义同 AEs 中的先验匹配项，表示了前向过程 $q$ 得出的 $x_T$ 分布与其先验分布 $p(x_T)$ 的匹配程度。但是，由于这一项不含可学习的参数，再加上当 $T$ 足够大时，$p(x_T) = \mathcal{N}(x_T; 0, I)$，这一项自然为0，所以并不需要对其进行优化。

  > 因为当 $T$ 足够大时，$\alpha_T \to 0$，所以无论 $x_{T-1}$ 取值为何，$q(x_T|x_{T-1}) = \mathcal{N}(x_T; \sqrt{\alpha_T}x_{T-1}, (1-\alpha_T)I)$ 都趋向于 $q(x_T|x_{T-1}) = \mathcal{N}(x_T; 0, I)$

- $\mathbb{E}_{q(x_{t-1}, x_{t+1}|x_0)}\left[ D_{\text{KL}}( {q(x_{t}|x_{t-1})}||{p_{\theta}(x_{t}|x_{t+1}))}\right]$：一致项，使得前向过程由 $x_{t-1}$ 生成的 $x_t$ 和逆向过程由 $x_{t+1}$ 生成的 $x_t$ 的尽可能相似。

  ![***Figure 2***: Depiction of consistency term.](/assets/images/work/cv/DMs/consistency.png#mdimg =500x)

> 如果对 $\mathbb{E}_{q(x_{1}|x_0)}$ 这种形式的期望的实际含义感到困惑，那么就先看看 AEs 中的相关解释吧。

因为最终 ELBO 中待优化的项都是期望的形式，所以可以通过 MCMC 近似求解。但是，如果直接对 (5) 中的式子进行优化，可能会导致困难。因为其中的一致项需要同时对两个随机变量 $x_{t-1}, x_{t+1}$ 进行采样，这会产生更大的方差，导致优化过程不稳定，不容易收敛。

#### Improved ELBO

由于 VDM 的马尔可夫特性，有 $q(x_t|x_{t-1}) = q(x_t | x_{t-1}, x_0)$，再通过贝叶斯定理，有：
$$
\tag{6}
\begin{equation}
\begin{aligned}
q(x_t\mid x_{t-1}, x_0) &= \frac{q(x_t, x_{t-1}, x_0)}{q(x_{t-1}, x_0)}\\
&= \frac{q(x_{t-1}\mid x_t, x_0)\cdot q(x_t, x_0)}{q(x_{t-1}, x_0)}\\
&= \frac{q(x_{t-1} \mid x_t, x_0)\cdot q(x_t \mid x_0)}{q(x_{t-1} \mid x_0)}
\end{aligned}
\end{equation}
$$
将（6）式代入 ELBO 的推导，可得：
$$
\tag{7}
\begin{split}\begin{align}
{\ln p(x)}
&\geq {\mathbb{E}_{q(x_{1:T}|x_0)}\left[\ln \frac{p(x_{0:T})}{q(x_{1:T}|x_0)}\right]}\\
&= \begin{aligned}[t]
    \underbrace{\mathbb{E}_{q(x_{1}|x_0)}\left[\ln p_{{\theta}}(x_0|x_1)\right]}_\text{reconstruction term}
    &- \underbrace{D_{\text{KL}}({q(x_T|x_0)}\mid {p(x_T)})}_\text{prior matching term}\\
    &- \sum_{t=2}^{T} \underbrace{\mathbb{E}_{q(x_{t}|x_0)}\left[D_{\text{KL}}({q(x_{t-1}|x_t, x_0)}\mid{p_{{\theta}}(x_{t-1}|x_t))}\right]}_\text{denoising matching term}\\
    \end{aligned}
\end{align}\end{split}
$$
::: details expand to see detailed derivation

可以不会推导，但至少要能看懂吧
$$
\begin{split}\begin{align}
{\ln p(x)}
&\geq {\mathbb{E}_{q(x_{1:T}|x_0)}\left[\ln \frac{p(x_{0:T})}{q(x_{1:T}|x_0)}\right]}\\
&= {\mathbb{E}_{q(x_{1:T}|x_0)}\left[\ln \frac{p(x_T)\prod_{t=1}^{T}p_{{\theta}}(x_{t-1}|x_t)}{\prod_{t = 1}^{T}q(x_{t}|x_{t-1})}\right]}\\
&= {\mathbb{E}_{q(x_{1:T}|x_0)}\left[\ln \frac{p(x_T)p_{{\theta}}(x_0|x_1)\prod_{t=2}^{T}p_{{\theta}}(x_{t-1}|x_t)}{q(x_1|x_0)\prod_{t = 2}^{T}q(x_{t}|x_{t-1})}\right]}\\
&= {\mathbb{E}_{q(x_{1:T}|x_0)}\left[\ln \frac{p(x_T)p_{{\theta}}(x_0|x_1)\prod_{t=2}^{T}p_{{\theta}}(x_{t-1}|x_t)}{q(x_1|x_0)\prod_{t = 2}^{T}q(x_{t}|x_{t-1}, x_0)}\right]}\\
&= {\mathbb{E}_{q(x_{1:T}|x_0)}\left[\ln \frac{p_{{\theta}}(x_T)p_{{\theta}}(x_0|x_1)}{q(x_1|x_0)} + \ln \prod_{t=2}^{T}\frac{p_{{\theta}}(x_{t-1}|x_t)}{q(x_{t}|x_{t-1}, x_0)}\right]}\\
&= {\mathbb{E}_{q(x_{1:T}|x_0)}\left[\ln \frac{p(x_T)p_{{\theta}}(x_0|x_1)}{q(x_1|x_0)} + \ln \prod_{t=2}^{T}\frac{p_{{\theta}}(x_{t-1}|x_t)}{\frac{p(x_{t-1}|x_{t}, x_0)q(x_t|x_0)}{q(x_{t-1}|x_0)}}\right]} \quad 使用 (6) 进行替换\\
&= {\mathbb{E}_{q(x_{1:T}|x_0)}\left[\ln \frac{p(x_T)p_{{\theta}}(x_0|x_1)}{q(x_1|x_0)} + \ln \prod_{t=2}^{T}\frac{p_{{\theta}}(x_{t-1}|x_t)}{\frac{p(x_{t-1}|x_{t}, x_0)\cancel{q(x_t|x_0)}}{\cancel{q(x_{t-1}|x_0)}}}\right]} \quad 相邻项可以消去\\
&= {\mathbb{E}_{q(x_{1:T}|x_0)}\left[\ln \frac{p(x_T)p_{{\theta}}(x_0|x_1)}{\cancel{q(x_1|x_0)}} + \ln \frac{\cancel{q(x_1|x_0)}}{q(x_T|x_0)} + \ln \prod_{t=2}^{T}\frac{p_{{\theta}}(x_{t-1}|x_t)}{q(x_{t-1}|x_{t}, x_0)}\right]}\\
&= {\mathbb{E}_{q(x_{1:T}|x_0)}\left[\ln \frac{p(x_T)p_{{\theta}}(x_0|x_1)}{q(x_T|x_0)} +  \sum_{t=2}^{T}\ln\frac{p_{{\theta}}(x_{t-1}|x_t)}{q(x_{t-1}|x_{t}, x_0)}\right]}\\
&=  \begin{aligned}[t]
     { \mathbb{E}_{ q(x_{1:T}|x_0) } \left[ \ln p_{{\theta}}(x_0|x_1) \right]\\
     \\+ \mathbb{E}_{ q(x_{1:T}|x_0)} \left[ \ln \frac{p(x_T)}{q(x_T|x_0)} \right ]\\
     \\+ \sum_{t=2}^{T} \mathbb{E}_{q(x_{1:T}|x_0)} \left[\ln\frac{p_{{\theta}}(x_{t-1}|x_t)}{q(x_{t-1}|x_{t}, x_0)}\right] }\\
    \end{aligned}\\
&= \begin{aligned}[t]{
    \mathbb{E}_{q(x_{1}|x_0)}\left[\ln p_{{\theta}}(x_0|x_1)\right]
    + \mathbb{E}_{q(x_{T}|x_0)}\left[\ln \frac{p(x_T)}{q(x_T|x_0)}\right] \\
    + \sum_{t=2}^{T}\mathbb{E}_{q(x_{t}, x_{t-1}|x_0)}\left[\ln\frac{p_{{\theta}}(x_{t-1}|x_t)}{q(x_{t-1}|x_{t}, x_0)}\right]\\
}\end{aligned} \\
&= \begin{aligned}[t]
    \underbrace{\mathbb{E}_{q(x_{1}|x_0)}\left[\ln p_{{\theta}}(x_0|x_1)\right]}_\text{reconstruction term}
    &- \underbrace{D_{\text{KL}}({q(x_T|x_0)}\mid {p(x_T)})}_\text{prior matching term}\\
    &- \sum_{t=2}^{T} \underbrace{\mathbb{E}_{q(x_{t}|x_0)}\left[D_{\text{KL}}({q(x_{t-1}|x_t, x_0)}\mid{p_{{\theta}}(x_{t-1}|x_t))}\right]}_\text{denoising matching term}\\
    \end{aligned}
\end{align}\end{split}
$$
其中值得注意的是倒数第二步，实际上用到了如下性质：
$$
\mathbb{E}_{p(x_{1:n})} f(x_i) = \int_{x_i} f(x_i) p(x_{1:n})\  \mathrm{d}x_i = \int_{x_i} f(x_i) p(x_{i})\  \mathrm{d}x_i = \mathbb{E}_{p(x_{i})} f(x_i)
$$
:::

最终得到的 ELBO 由如下 3 项构成：

- $\mathbb{E}_{q(x_{1}|x_0)}\left[\ln p_{\theta}(x_0|x_1)\right]$ ：和 (5) 相比没有变化。

- $D_{\text{KL}}({q(x_T|x_0)}\mid {p(x_T)})$：和 (5) 相比在形式上略有区别，对于前向过程 $q$ 得到的 $x_T$，此处是由 $x_0$ 直接得到，而在 $\mathbb{E}_{q(x_{T-1}|x_0)}\left[ D_{\text{KL}}({q(x_T|x_{T-1})}||{p(x_T))}\right]$ 中，是先由 $x_0$ 得到 $x_{T-1}$，再得到 $x_T$。但含义相同。

- 最后一项中，需要采样的变量只剩下 $x_t$ 一个了，其实际含义是使得模型建模的 $p_\theta(x_{t-1}|x_t)$ 与真实分布 $q(x_{t-1}|x_t, x_0)$ 尽可能接近。

> 虽然 $q$ 表示的是正向过程，而用 $q(x_{t-1}|x_t, x_0)$ 来表示逆向过程，表示的是直接由正向过程计算得到的逆向过程，即逆向过程的**真实分布**。
>
> 而条件项 $x_0$ 的加入也很符合直觉：作为 gt，其降噪步骤必然与原始输入 $x_0$ 相关。并且，在 (4) 式中尝试给出逆向过程的表达式时，也发现其依赖于 $p(x_0)$。

接下来就是代入计算，第二项不含可学习的参数，可以直接忽略。

#### Denoising matching term

首先来表达确定的 $q(x_{t-1}|x_t, x_0)$。由贝叶斯定理，我们可以将其写成如下形式：
$$
\tag{8}
q(x_{t-1}|x_t, x_0) = \frac{q(x_t | x_{t-1}, x_0) \cdot q(x_{t-1}|x_0)}{q(x_t | x_0)}
$$
由模型的马尔可夫性质，我们知道 $q(x_t | x_{t-1}, x_0) = q(x_t | x_{t-1} ) = \mathcal{N}(x_t; \sqrt{\alpha_t}x_{t-1}, (1-\alpha_t)I)$。而 $q(x_t|x_0), q(x_{t-1}|x_0)$ 呢？到目前为止，我们只知道能够通过迭代求出它们的值，但事实上，同样可以显式给出它们的表达式：
$$
\tag{9}
\begin{align}\begin{aligned}x_t &= \sqrt{\prod_{i=1}^t \alpha_i} \ x_0 + \sqrt{1- \prod_{i=1}^t \alpha_i }  \ \epsilon\\&= \sqrt{\bar{ \alpha}_t } \ x_0 + \sqrt{1- \bar{ \alpha}_t }  \ \epsilon  \ \ \ ,
\bar{\alpha} = \prod_{i=1}^t \alpha_i ,\ \ \epsilon \sim \mathcal{N}(0,\textit{I})\\&\sim \mathcal{N}(\sqrt{\bar{\alpha}_t } \ x_0,  (1- \bar{ \alpha}_t)    \textit{I})\end{aligned}\end{align}
$$
::: details expand to see detailed derivation

简单的展开
$$
\begin{align}\begin{aligned}x_t &= \sqrt{\alpha_t} \ x_{t-1} + \sqrt{1-\alpha_t} \ \epsilon_{t}\\&= \sqrt{\alpha_t} \left(   \sqrt{\alpha_{t-1}} \ x_{t-2} + \sqrt{1-\alpha_{t-1}} \ \epsilon_{t-1}  \right ) + \sqrt{1-\alpha_t} \ \epsilon_{t}\\&=  \sqrt{\alpha_t \alpha_{t-1} }  \ x_{t-2}
+ \underbrace{ \sqrt{\alpha_t - \alpha_t \alpha_{t-1} }\ \epsilon_{t-1} + \sqrt{1- \alpha_t} \ \epsilon_{t}
  }_{\text{两个相互独立的0均值的高斯分布相加}}\\
&=  \sqrt{\alpha_t \alpha_{t-1} }  \ x_{t-2}
+ \underbrace{  \sqrt{ \sqrt{\alpha_t - \alpha_t \alpha_{t-1} }^2 + \sqrt{1- \alpha_t}^2  } \ \epsilon
}_{\text{两个方差相加，用一个新的高斯分布代替}}\\&= \sqrt{\alpha_t \alpha_{t-1} }  \ x_{t-2} + \sqrt{1- \alpha_t \alpha_{t-1}} \ \epsilon\\&= ...\\&= \sqrt{\prod_{i=1}^t \alpha_i} \ x_0 + \sqrt{1- \prod_{i=1}^t \alpha_i }  \ \epsilon\\&= \sqrt{\bar{ \alpha}_t } \ x_0 + \sqrt{1- \bar{ \alpha}_t }  \ \epsilon  \ \ \ ,
\bar{\alpha} = \prod_{i=1}^t \alpha_i ,\ \ \epsilon \sim \mathcal{N}(0,\textit{I})\\&\sim \mathcal{N}(\sqrt{\bar{\alpha}_t } \ x_0,  (1- \bar{ \alpha}_t)    \textit{I})\end{aligned}\end{align}
$$
:::

然后，我们就可以将这三项代入 $q(x_t | x_{t-1}, x_0)$ 中进行化简：
$$
\tag{10}
\begin{split}\begin{align}
{q(x_{t-1}|x_t, x_0)}
&= {\frac{q(x_t | x_{t-1}, x_0)q(x_{t-1}|x_0)}{q(x_{t}|x_0)}}\\
&= {\frac{\mathcal{N}(x_{t} ; \sqrt{\alpha_t} x_{t-1}, (1 - \alpha_t)\textit{I})\mathcal{N}(x_{t-1} ; \sqrt{\bar\alpha_{t-1}}x_0, (1 - \bar\alpha_{t-1}) \textit{I})}{\mathcal{N}(x_{t} ; \sqrt{\bar\alpha_{t}}x_0, (1 - \bar\alpha_{t})\textit{I})}}\\
&\propto {\mathcal{N}(x_{t-1} ;} \underbrace{{\frac{\sqrt{\alpha_t}(1-\bar\alpha_{t-1})x_{t} + \sqrt{\bar\alpha_{t-1}}(1-\alpha_t)x_0}{1 -\bar\alpha_{t}}}}_{\mu_q(x_t, x_0)}, \underbrace{{\frac{(1 - \alpha_t)(1 - \bar\alpha_{t-1})}{1 -\bar\alpha_{t}}\textit{I}}}_{{\Sigma}_q(t)})
\end{align}\end{split}
$$
::: details expand to see detailed derivation
$$
\begin{split}\begin{align}
{q(x_{t-1}|x_t, x_0)}
&= {\frac{q(x_t | x_{t-1}, x_0)q(x_{t-1}|x_0)}{q(x_{t}|x_0)}}\\
&= {\frac{\mathcal{N}(x_{t} ; \sqrt{\alpha_t} x_{t-1}, (1 - \alpha_t)\textit{I})\mathcal{N}(x_{t-1} ; \sqrt{\bar\alpha_{t-1}}x_0, (1 - \bar\alpha_{t-1}) \textit{I})}{\mathcal{N}(x_{t} ; \sqrt{\bar\alpha_{t}}x_0, (1 - \bar\alpha_{t})\textit{I})}}\\
&\propto {\text{exp}\left\{-\left[\frac{(x_{t} - \sqrt{\alpha_t} x_{t-1})^2}{2(1 - \alpha_t)} + \frac{(x_{t-1} - \sqrt{\bar\alpha_{t-1}} x_0)^2}{2(1 - \bar\alpha_{t-1})} - \frac{(x_{t} - \sqrt{\bar\alpha_t} x_{0})^2}{2(1 - \bar\alpha_t)} \right]\right\}}\\
&= {\text{exp}\left\{-\frac{1}{2}\left[\frac{(x_{t} - \sqrt{\alpha_t} x_{t-1})^2}{1 - \alpha_t} + \frac{(x_{t-1} - \sqrt{\bar\alpha_{t-1}} x_0)^2}{1 - \bar\alpha_{t-1}} - \frac{(x_{t} - \sqrt{\bar\alpha_t} x_{0})^2}{1 - \bar\alpha_t} \right]\right\}}\\
&= {\text{exp}\left\{-\frac{1}{2}\left[\frac{(-2\sqrt{\alpha_t} x_{t}x_{t-1} + \alpha_t x_{t-1}^2)}{1 - \alpha_t} + \frac{(x_{t-1}^2 - 2\sqrt{\bar\alpha_{t-1}}x_{t-1} x_0)}{1 - \bar\alpha_{t-1}} + C(x_t, x_0)\right]\right\}} \\
&\propto {\text{exp}\left\{-\frac{1}{2}\left[- \frac{2\sqrt{\alpha_t} x_{t}x_{t-1}}{1 - \alpha_t} + \frac{\alpha_t x_{t-1}^2}{1 - \alpha_t} + \frac{x_{t-1}^2}{1 - \bar\alpha_{t-1}} - \frac{2\sqrt{\bar\alpha_{t-1}}x_{t-1} x_0}{1 - \bar\alpha_{t-1}}\right]\right\}}\\
&= {\text{exp}\left\{-\frac{1}{2}\left[(\frac{\alpha_t}{1 - \alpha_t} + \frac{1}{1 - \bar\alpha_{t-1}})x_{t-1}^2 - 2\left(\frac{\sqrt{\alpha_t}x_{t}}{1 - \alpha_t} + \frac{\sqrt{\bar\alpha_{t-1}}x_0}{1 - \bar\alpha_{t-1}}\right)x_{t-1}\right]\right\}}\\
&= {\text{exp}\left\{-\frac{1}{2}\left[\frac{\alpha_t(1-\bar\alpha_{t-1}) + 1 - \alpha_t}{(1 - \alpha_t)(1 - \bar\alpha_{t-1})}x_{t-1}^2 - 2\left(\frac{\sqrt{\alpha_t}x_{t}}{1 - \alpha_t} + \frac{\sqrt{\bar\alpha_{t-1}}x_0}{1 - \bar\alpha_{t-1}}\right)x_{t-1}\right]\right\}}\\
&= {\text{exp}\left\{-\frac{1}{2}\left[\frac{\alpha_t-\bar\alpha_{t} + 1 - \alpha_t}{(1 - \alpha_t)(1 - \bar\alpha_{t-1})}x_{t-1}^2 - 2\left(\frac{\sqrt{\alpha_t}x_{t}}{1 - \alpha_t} + \frac{\sqrt{\bar\alpha_{t-1}}x_0}{1 - \bar\alpha_{t-1}}\right)x_{t-1}\right]\right\}}\\
&= {\text{exp}\left\{-\frac{1}{2}\left[\frac{1 -\bar\alpha_{t}}{(1 - \alpha_t)(1 - \bar\alpha_{t-1})}x_{t-1}^2 - 2\left(\frac{\sqrt{\alpha_t}x_{t}}{1 - \alpha_t} + \frac{\sqrt{\bar\alpha_{t-1}}x_0}{1 - \bar\alpha_{t-1}}\right)x_{t-1}\right]\right\}}\\
&= {\text{exp}\left\{-\frac{1}{2}\left(\frac{1 -\bar\alpha_{t}}{(1 - \alpha_t)(1 - \bar\alpha_{t-1})}\right)\left[x_{t-1}^2 - 2\frac{\left(\frac{\sqrt{\alpha_t}x_{t}}{1 - \alpha_t} + \frac{\sqrt{\bar\alpha_{t-1}}x_0}{1 - \bar\alpha_{t-1}}\right)}{\frac{1 -\bar\alpha_{t}}{(1 - \alpha_t)(1 - \bar\alpha_{t-1})}}x_{t-1}\right]\right\}}\\
&= {\text{exp}\left\{-\frac{1}{2}\left(\frac{1 -\bar\alpha_{t}}{(1 - \alpha_t)(1 - \bar\alpha_{t-1})}\right)\left[x_{t-1}^2 - 2\frac{\left(\frac{\sqrt{\alpha_t}x_{t}}{1 - \alpha_t} + \frac{\sqrt{\bar\alpha_{t-1}}x_0}{1 - \bar\alpha_{t-1}}\right)(1 - \alpha_t)(1 - \bar\alpha_{t-1})}{1 -\bar\alpha_{t}}x_{t-1}\right]\right\}}\\
&= {\text{exp}\left\{-\frac{1}{2}\left(\frac{1}{\frac{(1 - \alpha_t)(1 - \bar\alpha_{t-1})}{1 -\bar\alpha_{t}}}\right)\left[x_{t-1}^2 - 2\frac{\sqrt{\alpha_t}(1-\bar\alpha_{t-1})x_{t} + \sqrt{\bar\alpha_{t-1}}(1-\alpha_t)x_0}{1 -\bar\alpha_{t}}x_{t-1}\right]\right\}}\\
&\propto {\mathcal{N}(x_{t-1} ;} \underbrace{{\frac{\sqrt{\alpha_t}(1-\bar\alpha_{t-1})x_{t} + \sqrt{\bar\alpha_{t-1}}(1-\alpha_t)x_0}{1 -\bar\alpha_{t}}}}_{\mu_q(x_t, x_0)}, \underbrace{{\frac{(1 - \alpha_t)(1 - \bar\alpha_{t-1})}{1 -\bar\alpha_{t}}\textit{I}}}_{{\Sigma}_q(t)})
\end{align}\end{split}
$$
:::

由此，我们发现由 $q(x_{t-1}|x_t, x_0)$ 得到的 $x_{t-1}$ 其实服从于 $\mathcal{N}(\mu_q(x_t, x_0), \Sigma_q(t))$。而 KL 散度中的另一项呢？是模型决定的 $p_\theta(x_t|x_{t-1})$。要使得 $p_\theta(x_t|x_{t-1})$ 与 $q(x_{t-1}|x_t, x_0)$ 尽可能接近，索性也让其是一个高斯分布。

- 对于方差，由于 $\Sigma_q$ 只和时间步 $t$ 相关，逆向过程的模型也可以获取到该值，所以**索性令** $p_\theta$ 的方差也是 $\Sigma_q$；
- 对于均值，就不能这么干了，因为 $\mu_q$ 与 $x_0$ 相关，逆向过程的模型无法获取到该值，因此必须通过参数化求解，不妨设当前的均值与 $t$ 和 $x_t$ 相关。

综上所述，我们约定了 $p_\theta(x_{t-1}|x_t) \sim \mathcal{N}(x_t; \mu_\theta(x_t, t), \Sigma_q(t))$，而两个高斯分布的 KL 散度又是有公式的：
$$
\tag{11}
D_{\text{KL}}(\mathcal{N}(x; \mu_x, \Sigma_x)||\mathcal{N}(y; \mu_y, \Sigma_y)) = \frac{1}{2}\left[\log \frac{|\Sigma_y|}{|\Sigma_x|} -d + \text{tr}(\Sigma_y^{-1}\Sigma_x) + (\mu_y - \mu_x)^T\Sigma_y^{-1}(\mu_y - \mu_x) \right]
$$
因此，可以得出真实分布 $q(x_{t-1}|x_t, x_0)$ 和参数化学习分布 $p_\theta(x_{t-1}|x_t)$ 的 KL 散度为：
$$
\tag{12}
\begin{split}\begin{align}
& \quad \,D_{\text{KL}}({q(x_{t-1}|x_t, x_0)}\ ||\ {p_{{\theta}}(x_{t-1}|x_t)}) \\
&= D_{\text{KL}}({\mathcal{N}(x_{t-1}; {\mu}_q,{\Sigma}_q(t))}\ \ ||\ \ {\mathcal{N}(x_{t-1}; {\mu}_{{\theta}},{\Sigma}_q(t))})\\
&=\frac{1}{2}\left[\log\frac{|{\Sigma}_q(t)|}{|{\Sigma}_q(t)|} - d + \text{tr}({\Sigma}_q(t)^{-1}{\Sigma}_q(t))
+ ({\mu}_{{\theta}}-{\mu}_q)^T {\Sigma}_q(t)^{-1} ({\mu}_{{\theta}}-{\mu}_q)\right]\\
&=\frac{1}{2}\left[\log1 - d + d + ({\mu}_{{\theta}}-{\mu}_q)^T {\Sigma}_q(t)^{-1} ({\mu}_{{\theta}}-{\mu}_q)\right]\\
&=\frac{1}{2}\left[({\mu}_{{\theta}}-{\mu}_q)^T {\Sigma}_q(t)^{-1} ({\mu}_{{\theta}}-{\mu}_q)\right]\\
&=\frac{1}{2}\left[({\mu}_{{\theta}}-{\mu}_q)^T \left(\sigma_q^2(t)\textbf{I}\right)^{-1} ({\mu}_{{\theta}}-{\mu}_q)\right]\\
&=\frac{1}{2\sigma_q^2(t)}\left[\left\lVert{\mu}_{{\theta}}-{\mu}_q\right\rVert_2^2\right]
\end{align}\end{split}
$$
极大化 ELBO 函数，等价于极小化 (12)，等价于使得每个时间步，模型的 $\mu_\theta(x_t, t)$ 与 真实分布的 $\mu_q(x_t, x_0)$ 尽可能接近。于是，我们又可以**索性令** $\mu_\theta(x_t, t)$ 与 $\mu_q$ 具有相似的形式：
$$
\tag{13}
{\mu}_{{\theta}}(x_t, t) = \frac{\sqrt{\alpha_t}(1-\bar\alpha_{t-1})x_{t} + \sqrt{\bar\alpha_{t-1}}(1-\alpha_t)\hat x_{{\theta}}(x_t, t)}{1 -\bar\alpha_{t}}
$$
换言之，模型只需要预测其中的 $\hat x_{{\theta}}(x_t, t)$。于是乎，我们可以进一步简化 (12) 中的极小化目标：
$$
\tag{14}
\begin{align}\begin{aligned}
& {\operatorname{\arg\max}}_{\theta} 
\left[ D_{\text{KL}}({q(x_{t-1}|x_t, x_0)}\ ||\ {p_{{\theta}}(x_{t-1}|x_t)})\right]\\
= \quad &{\operatorname{\arg\min}}_{\theta} 
\left[\frac{1}{2\sigma_q^2(t)}\left[\left\lVert{\mu}_{{\theta}}-{\mu}_q\right\rVert_2^2\right]\right]\\
\Leftrightarrow \quad &{\operatorname{\arg\min}}_{\theta} 
\left[\left\lVert{\mu}_{{\theta}}-{\mu}_q\right\rVert_2^2\right]\\
= \quad &{\operatorname{\arg\min}}_{\theta} 
\left[\frac{ \sqrt{\bar\alpha_{t-1}}(1-\alpha_t) }  {1 -\bar\alpha_{t}}
\left\lVert  ( \hat x_{{\theta}}(x_t, t) -  x_0 ) \right\rVert_2^2\right]\\
\Leftrightarrow \quad &{\operatorname{\arg\min}}_{\theta}
\left[\left\lVert  ( \hat x_{{\theta}}(x_t, t) -  x_0 ) \right\rVert_2^2\right]
\end{aligned}\end{align}
$$
#### Reconstruction term

> 相对 denoising matching 项来说，这一项并没有涉及很多的求和项，所以对于逆向过程模型的假设都是以 denoising matching 项分析中的“**索性令**”为准。

多元高斯分布的概率密度函数为：
$$
\tag{15}
{\displaystyle f_{\mathbf {x} }(x_{1},\ldots ,x_{k})={\frac {1}{\sqrt {(2\pi )^{k}|{\boldsymbol {\Sigma }}|}}}\mathrm {e} ^{-{\frac {1}{2}}({\mathbf {x} }-{\boldsymbol {\mu }})^{\mathrm {T} }{\boldsymbol {\Sigma }}^{-1}({\mathbf {x} }-{\boldsymbol {\mu }})}}
$$
据此化简 reconstruction term：
$$
\tag{16}
\begin{align}\begin{aligned}
& {\operatorname{\arg\max}}_{\theta} \quad
\mathbb{E}_{q(x_1|x_0)} \ln p_\theta(x_0 | x_1)\\
= \quad &{\operatorname{\arg\max}}_{\theta}\quad
\mathbb{E}_{q(x_1|x_0)}\ln\left(\frac{1}{\sqrt{(2\pi)^d|\Sigma_q(1)|}} \exp\left\{ -\frac{1}{2} (x_0 - \mu_\theta(x_1, 1))^T\Sigma_q(1)^{-1}(x_0-\mu_\theta(x_1, 1))\right\}\right)\\
\Leftrightarrow \quad &{\operatorname{\arg\min}}_{\theta}\quad
\mathbb{E}_{q(x_1|x_0)} \left\lVert x_0 - \mu_\theta(x_1, 1)\right\rVert_2^2
\end{aligned}\end{align}
$$
又因为 $\mu_\theta(x_1, 1)$ 需要用到 $\bar{\alpha}_0$，这个值并没有定义（事实上在 denoising matching 项中，$t$ 的下界也是 2），这里我们不妨另其为 $1$，则可以进一步将优化目标写作：

$$
\tag{16}
{\operatorname{\arg\min}}_{\theta} \quad
\mathbb{E}_{q(x_1|x_0)} \left\lVert x_0 - \hat{x}_\theta(x_1, 1)\right\rVert_2^2
$$

> 为什么这么写，接下来就会明白了

#### Final Loss

结合以上两项的结果，我们可以得出最终的优化目标：
$$
\tag{17}
\begin{align}\begin{aligned}    & {\operatorname{\arg\max}}_{\theta} \quad \text{ELBO}\\    & \Leftrightarrow {\operatorname{\arg\max}}_{\theta} \left [
          \mathbb{E}_{q(x_{1}|x_0)}\left[\ln p_{{\theta}}(x_0|x_1)\right]
        - \sum_{t=2}^{T} \mathbb{E}_{q(x_{t}|x_0)}\left[D_{\text{KL}}({q(x_{t-1}|x_t, x_0)}
||{p_{{\theta}}(x_{t-1}|x_t)})\right]
        \right]\\    &\Leftrightarrow  {\operatorname{\arg\min}}_{\theta}
    \left[
        \mathbb{E}_{q(x_{1}|x_0)} \left [ \left\lVert x_0 - \hat{x}_\theta(x_1, 1)\right\rVert_2^2 \right ]
    \right ]
    + \left [
    \sum_{t=2}^{T}
    \mathbb{E}_{q(x_{t}|x_0)}   \left [ \left\lVert( \hat x_{{\theta}}(x_t, t) - x_0 )  \right\rVert_2^2 \right ]
    \right ]\\    &  \Leftrightarrow  {\operatorname{\arg\min}}_{\theta}
     \sum_{t=1}^{T} \mathbb{E}_{q(x_{t}|x_0)}   \left [ \left\lVert( \hat x_{{\theta}}(x_t, t) - x_0 )  \right\rVert_2^2 \right ]\end{aligned}\end{align}
$$

> [!note]
>
> 虽然在 (17) 式中，是将模型的解码结果 $\hat{x}_\theta(x_t, t)$ 与 $x_0$ 进行比较，但实际上，模型并不是一步完成编码，这里的 $\hat{x}_\theta(x_t, t)$ 表示的是模型经过 $t$ 步解码后的结果。

todo: DDPM, DDIM, IDDPM, *Three Equivalent Interpretations*
