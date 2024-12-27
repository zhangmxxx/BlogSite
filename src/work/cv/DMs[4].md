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

# DMs[4] DDIM
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

> 1. 从最基本的联合分布等式，给定条件，可以略去部分条件项，写成不同的形式，而这些形式代表了前向/后向过程：从数学表达式上讲（回归到原始的联合分布来理解），表明了如何一步一步得到联合分布密度；从生成 $\x_T, \x_0$ 讲（使用化简后的形式），可以将联合分布的求积项拆分成若干次采样（因此，在跳步采样中，可以看到有若干项与前向/后向过程是无关的，所以可以去除）。
>
> 2. 为什么要写 $q(\x_{1:T}\mid \x_0)$ 和 $p(\x_{0:T})$ ？？考虑整个过程，我们想要得到的其实是
>    $$
>    p_\theta(\x_0) = \int p_\theta(\x_{0:T})\ \d\x_{1:T}
>    $$
>    而对于 $p_\theta(\x_0)$ 的极大似然的 ELBO，正是这两个联合分布的 KL 散度。逆向过程是我们来建模的，所以我们的  $p(\x_{0:T})$ 形式可以与 $q(\x_{1:T}\mid \x_0)$ 尽可能相似。（corresponding）

存在的问题：逆向过程和正向过程是绑定的，而正向过程需要很多步，所以逆向过程也需要很多步。

DDPM的损失函数：
$$
\begin{aligned}
L_\gamma(\epsilon_\theta) &:= \sum_{t=1}^T \gamma_t \mathbb{E}_{\x_0\sim q(\x_0), \epsilon_t \sim \mathcal{N}(0, I)} \mbr{\norm{\epsilon_\theta^{(t)} (\sqrt{\alpha_t}\x_0 + \sqrt{1-\alpha_t}\epsilon_t) - \epsilon_t}}\\
&= \sum_{t=1}^T \gamma_t \mathbb{E}_{\x_t\sim q(\x_t\mid \x_0), \epsilon_t \sim \mathcal{N}(0, I)} \mbr{\norm{\epsilon_\theta^{(t) } (\x_t) - \epsilon_t}}
\end{aligned}
$$

可以发现，这个损失函数只依赖于 $q(\x_t\mid \x_0)$。这说明什么？如果有另一个分布，他的边缘分布 $q(\x_t\mid \x_0)$ 和 DDPM 的一样，**而且损失函数也能够写成这个形式** （可以跟着 【DPM】推导一遍 ），那么无论其联合分布 $q(\x_{1:T}\mid \x_0)$ 如何，期望中的 $\x_t, \epsilon_t$ 都保持不变，那么原模型的参数对于这个分布也是最优。

> 定义，证明边缘分布，证明损失函数

基础等式，恒成立：
$$
q(\x_{1:T}\mid \x_0) = \prod_{t=1}^{T-1} q(\x_t\mid \x_{t+1:T}, \x_0) q(\x_T\mid \x_0) = ...
$$
在 DDPM 中，前向过程是一个马尔可夫过程，$q(\x_T \mid \x_{0:T-1}) = q(\x_T\mid \x_{T-1})$，所以联合分布可以表示如下：
$$
q(\x_{1:T}\mid \x_0) = \prod_{t=1}^T q(\x_t \mid \x_{t-1})
$$
而在 DDIM 中，作者考虑了具有如下形式的一族分布：
$$
q_\sigma(\x_{1:T}\mid \x_0) := q_\sigma(\x_T \mid \x_0) \prod_{t=2}^Tq_\sigma(\x_{t-1}\mid \x_t, \x_0)
$$
其中 $q_\sigma(\x_T\mid \x_0) = \mathcal{N}(\sqrt{\alpha_T}\x_0, (1-\alpha_T)I)$，并且对于 $t > 1$，有
$$
q_\sigma(\x_{t-1}\mid \x_t, \x_0) = \mathcal{N}(\sqrt{\alpha_{t-1}}\x_0 + \sqrt{1-\alpha_{t-1}-\sigma_t^2} \cdot \frac{\x_T - \sqrt{\alpha_t} \x_0}{\sqrt{1-\alpha_t}}, \sigma_t^2 I)
$$
> 到这里，我们知道了这个分布的逆向转移核，当然正向转移核（不再是马尔可夫过程，不过也不再需要知道）也可以直接由贝叶斯定理得出：

$$
q_\sigma(\x_t\mid \x_{t-1}, \x_0) =
$$

> 这个分布的推导过程可见[这篇文章][suBlog]，总结来说：我们需要根据 $q(\x_t\mid \x_0)$ 和 $q(\x_{t-1}\mid \x_0)$ 不变的假设，求解 $q(\x_{t-1}\mid \x_t, \x_0)$。由于没有了前向过程的限制，最终解出的是一族分布。至于为什么要写成 $q(\x_{t-1}\mid \x_t, \x_0)$ 的形式，可能因为这个表达式作为逆向过程的拟合目标？
>
> 以及，在得出对应的逆向过程时，文章"leverage the knowledge of $q(\x_{t-1}\mid \x_t, \x_0)$", 也就是直接认为 $p(\x_{t-1}\mid \x_t)$ 应该拟合 $q(\x_{t-1}\mid \x_t, \x_0)$。（[其他文章][suBlog]甚至是一开始就这样以重新表达 $q(\x_{t-1}\mid \x_t, \x_0)$ 为目标）这一项实际上是来自于 ELBO 的推导。



接下来就是定义可训练的逆向过程，使得 $p_\theta^{(t)} (\x_{t-1}\mid \x_t)$ 逼近 $q_\sigma(\x_{t-1}\mid \x_t, \x_0)$。注意到，如果给定 $\x_0$，那么 $q_\sigma(\x_{t-1}\mid \x_t, \x_0)$ 是一个确定表达式，因此，逆向过程可以沿用其表达式，只需要预测其中的 $\x_0$。如前文所述，我们想要沿用 DDPM 训练的模型，而它预测的是 $\epsilon_t$，但通过：
$$
f_\theta^{(t)}(\x_t) := (\x_t - \sqrt{1- \alpha_t} \cdot \epsilon_\theta^{(t)}(\x_t))/\sqrt{\alpha_t}
$$
我们就可以利用 $\hat{\epsilon_t}$ 得到 $\x_0$ 的预测值。总结来说，模型的逆向采样过程如下：
$$
\begin{split}p(\x_{t-1}\mid\x_t) = \left \{ \begin{array}{rcl}
&\mathcal{N}(f_\theta^{(1)}(\x_1), \sigma^2_1 \textit{I} \ ) &\mbox{if}\quad t =1\\
&q_{\sigma}(\x_{t-1}\mid\x_t,f_\theta^{(t)}(\x_t)) &\mbox{if}\quad 1 \lt t \le T
\end{array} \right .\end{split}
$$
到这里，我们还有最后一个问题没有解决：这个新定义的分布，其损失函数能否写成【】的形式？依然从极大化观测样本 $\x_0$ 的似然函数入手：

【ELBO】的前几步

作者证明了可以将这个式子写成 $J_\sigma = L_\gamma + C$ 。并且，观察 L 可以发现，如果 $\theta$ 在不同时间步之间不共享，那么损失函数可以看作在各时间步，单独优化 $\theta^{(t)}$，因此权重 $\gamma$ 实际上并没有起到作用，因此后续采用 $L_1$ 进行讨论。



**采样**

定义 $\alpha_0 := 1$，从【上面的分情况】可知，我们可以从 $\x_t$ 中采样 $\x_{t-1}$:
$$
\x_{t-1} = \sqrt{\alpha_{t-1}}\sbr{\frac{\x_t - \sqrt{1-\alpha_t}\epsilon_\theta^{(t)}(\x_t)}{\sqrt{\alpha_t}}} + \sqrt{1-\alpha_{t-1} - \sigma_t^2}\cdot \epsilon_\theta^{(t)}(\x_t) + \sigma_t\epsilon_t
$$
可以看作3项：

- 预测 $\x_0$
- 指向 $\x_t$ 的方向
- 随机噪声

当 $\sigma_t$ 取某些特定值，该模型会与其他模型产生联系：

1. DDPM
   $$
   \sigma_t = \sqrt{\frac{1-\alpha_{t-1}}{1-\alpha_t}}\sqrt{1- \frac{\alpha_t}{\alpha_{t-1}}}
   $$
   回忆在 DPM 推导中，我们直接令逆向过程的方差为高斯分布 $q(\x_{t-1}\mid \x_{t}, \x_0)$ 的确定方差，而不是去学习这个值，这里的 $\sigma_t$ 就是 DPM 推导中的 $\sigma$。把 $\sigma$ 代入 $q_\sigma(\x_{t-1}\mid \x_t, \x_0)$ 的表达式，我们可以得出：
   $$
   \mu = DDPM 的 \mu
   $$

2. $\sigma_t = 0$

   【】中的随机噪声项被置零，整个采样过程变为一个确定性的过程，作者把这种特殊情况称为 **DDIM** （*denoising diffusion implicit model*）

   - denosing diffusion：用的是 DDPM 的训练目标函数（实际上也是在往上面靠）
   - implicit model：是一个 implicit model【？】

   

   

加速采样

通过跳步，DDIM 可以实现加速。[这篇文章][suBlog] 给出了更加直观的解释。

原文的解释中，暂时无法理解如何得出 "corresponding" 的生成过程形式。

[suBlog]:https://spaces.ac.cn/archives/9181/

   

