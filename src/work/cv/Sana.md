---
cover: /assets/images/work/cv/Sana/cover.jpg
date: 2025-02-15
category:
  - article reading
tag:
  - Computer Vision
  - diffusion
star: true
sticky: true
excerpt: <p> SD框架下各组件优化的集大成者-SANA </p>
---

# SANA 
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

> - 填年前（12.30左右）的坑
>
> - <i class="fa-solid fa-newspaper"></i> [ Paper](https://arxiv.org/abs/2410.10629)
>
> - <i class="fa-brands fa-github"></i> [ Github Repo](https://github.com/NVlabs/Sana)

## 文本编码器

使用了 LLM Gemma 替换了原本的 T5。

事实上使用 LLM 作为文本编码器的尝试已有先例。从 Sana 的 rebuttal 中可以找到如下相关研究：

- [ELLA](https://arxiv.org/abs/2403.05135)：直接使用 LLM 的输出 embedding，加上一个 TSC 模块（根据去噪阶段，分别抽取低频、高频信息）。TSC 并不是针对 LLM 这种 decoder-only 的模型进行优化的，所以自然无法修复直接使用 LLM 带来的一些弊端。因此，相较于 T5，使用 LLM 的效果甚至有所下降。作者猜测原因可能是原本的 encoder-decoder  模型中的双向注意力机制能够更好的抽取文本特征。
- [LiDiT](https://arxiv.org/abs/2406.11831)：首先指出了为什么直接使用 LLM 会导致效果变差：LLM 的目标是预测 next token，无法总结 prompt中重要的文本信息（比如，给一段描述，LLM 的输出可能是续写）；LLM 中的单向 attention（作者做了实验，将主体放在描述的不同位置，发现生成效果不一致）。随后，提出了两点针对性解决方案：加上 instruction (Describe the image by detailing the color, shape, size, texture, quantity, text, and spatial relationships of the objects: ) , 使得 LLM 关注与图片生成相关的内容；加入 Refiner 来修正单向 attention 导致的位置偏差。
- Sana：直接使用 LLM 的输出 embedding，没有 refiner，但是 instruction 更为复杂。

> **After read**
>
> LLM 的单向注意力，以及预测 next token 的特性，导致其输出 embedding 不太能抽取描述文本的特征，所以要进行一些规范。

## AutoEncoder

[DC-AE](/work/cv/DC-AE.md) 也是这篇文章的作者做的研究，直接挪用了。

## 采样算法

基于 DPM-Solver++ 进行改进。这方面有些过于数学，就不再细究了。

## 单步降噪

使用了线性注意力。从注意力机制的原始定义出发：
$$
\tag{1}
O_i = \sum_{j=1}^N \mbr{\frac{\text{Sim}(Q_j, K_j)}{\sum_{j=1}^N \text{Sim}(Q_i, K_j)}} \cdot V_j
$$
这里的相似度 $\text{Sim}(Q_i, K_j)$ 计算方式可以任意定义。例如，我们可以对 Transformer 论文中的计算方式进行如下修改：
$$
\tag{2}
\text{Sim}(Q_i, K_j) = \frac{\exp(Q_iK_j^T)}{\sqrt{d}} \to ReLU(Q_i)ReLU(K_j)^T
$$
这一步允许了拆解，随后我们可以将（1）式化简为：
$$
\tag{3}
O_i = \sum_{j=1}^{N} \frac{\text{ReLU}(Q_i) \text{ReLU}(K_j)^T V_j}
{\sum_{j=1}^{N} \text{ReLU}(Q_i) \text{ReLU}(K_j)^T}= \frac{\text{ReLU}(Q_i) \left( \sum_{j=1}^{N} \text{ReLU}(K_j)^T V_j \right)}
{\text{ReLU}(Q_i) \left( \sum_{j=1}^{N} \text{ReLU}(K_j)^T \right)}
$$
括号里的两项只需要计算一次，所以整个注意力机制只需要 $O(N)$ 的时间进行计算。
