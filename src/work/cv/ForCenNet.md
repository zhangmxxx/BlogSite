---
cover: /assets/images/work/cv/ForCenNet/cover.png
date: 2025-09-21
category:
  - article reading
tag:
  - Computer Vision
star: false
sticky: true
excerpt: <p> 复现文档恢复工作 ForCenNet 的失败尝试</p>
---

# ForCenNet

## Overview

文章大概的思路是，专注于 foreground 进行还原。Foreground 指的是**文档中具有明确结构的文本行、表格线等**，这些是文档还原过程中的重要根据，所以可以引导模型专注于这些信息。

具体而言，文章提出了两点用于提升模型恢复文档的能力：

1. 使用一个 Segmentation 网络来对 Encoder 输出进行划分。不同于 pixel-level 的划分模型，这里的输入是 Transformer blocks 编码的结果，所以只需要轻量级的网络。Transformer 的输出是序列化的？直接对序列进行划分，$M \cdot M^T$ 就可以还原得到 pixel-level 的掩码。将该掩码**作用于 Attention Map**，即可引导模型关注 foreground；
2. 曲率损失函数。直觉上讲，$L_1$ 损失并不能保证还原后的文本行、表格线中不会存在 “上下波动的情况”，所以需要一个更全局的约束。文章对 distorted 空间中，每个 text-line 上采样点的曲率进行对齐，从而改善了这一问题。（这应该也是文章相较于其他 foreground-oriented 方法的改进点）

总体网络架构上，和[最原始的 Transformer 架构][attn]有些许不同的是，Decoder 并不是从 `<bos>` 开始自回归生成，而是以一个可学习的 embedding $Q_{learn}$ 作为输入，还原图像。同时，不同于最原始的 Transformer，不仅仅是 Encoder 的输出会进行交叉注意力计算，中间层的输出以及一个 Segmentation Map 也会参与交叉注意力、自注意力计算。



## 复现

> 中道崩殂

### 数据集

![***Figure 1***: 数据集概览 =400x](/assets/images/work/cv/ForCenNet/dataset-overview.png#mdimg)

包含了扭曲图像、扭曲图像的扫描件 alb、深度图等若干变种以及 $\mathcal{BM}$​ 矩阵。首先需要明确 $\mathcal{BM}$ 矩阵的含义，$\mathcal{BM}[i][j]$ 代表 original image 中的 $(i, j)$ **整点像素**对应于 distorted image 中的**连续像素**坐标。然而，由于图像像素并不连续，小数部分实际上没有任何含义，因此，需要使用双线性插值，利用其 distorted image 中相邻 4 个整像素点的值，进行加权平均，权重和映射点到相邻点的距离有关，例子可见[这篇 blog][Bi-inter]。



### 数据集的预处理

> 数据集本身就已经不再维护，还是找 DocGeoNet 作者要到了一份

- 计算 $\mathcal{FM}$ 和 gt， 相对直接，应用 $\mathcal{BM}$ 于 alb 即可，见 `/data1/zhangmx/workspace/doc3D-dataset-master/convert/do_it.py` 速度也很快，5000 samples / 7 min

- 对 $I_u$ 进行 `Hi-SAM` Segmentation，质量堪忧；目前在尝试用 `fft_sharpness > 0.35` 来筛选样本，保留了 3291/4999 的样本，图例如下：

  ![***Figure 2***: 不同 fft_sharpness 得分的样本 =600x](/assets/images/work/cv/ForCenNet/sharpness.png#mdimg)

  可以发现牺牲了 1/4 的样本，留下的仍然不是很清楚（到 0.45 以上就比较清楚，人眼基本能识别出字符），并且，这种量化方式偏好小字体的样本。但这里似乎**不需要保证文本可读性**，文章的训练目标是恢复扭曲文档，提高 OCR 的识别率，至于文档的清晰度，不是文章需要考虑的问题；

  这一步的速度就慢一些了：5000 samples / 50 min

- OCR 提取 text-lines。这里顺带测试一下文章的前提是否成立：“OCR 在扭曲文档上的识别率会下降”，事实证明是成立的

  ![***Figure 3(a)***: 变形文档 OCR 结果 =400x](/assets/images/work/cv/ForCenNet/ocr_dis.jpg#mdimg)     

  ![***Figure 3(b)***: 恢复文档 OCR 结果 =400x](/assets/images/work/cv/ForCenNet/ocr_ori.jpg#mdimg)

  

  在考虑如何存储 text-lines 时，需要根据后续 text-lines 的用法来判断，但在这一步遇到了较大的问题。文章的思路大致如下：

  1. 在 original image $I_u$ 上选取一个 text-lines $L_u$，在其上每隔 4 个像素采样一点，得到 $P = \{p_i \mid p_i \in L_u, i = 1,2\dots N\}$；

  2. 利用 $\mathcal{BM}, \hat{\mathcal{BM}}$ 将 $P$ 映射到 distorted image 空间，这里也需要用到双线性插值。双线性插值的应用场景不局限于前文所提到的图像映射，事实上，假定有一个定义于离散空间 $\mathcal{D}$ 的映射 $\mathcal{F}$ 和一个连续值 $\x$，我们都可以通过双线性插值，将 $\mathcal{F}(\x)$ 这个无法直接求解的式子，转换成 $\sum_x w_x \mathcal{F}(x), x\in \mathcal{D}$ 。比如图像映射，得到了要采样的连续像素点 $p$ 之后，需要近似 $Pixel(p)$ 像素值；再比如这里的 $\mathcal{BM}$ 映射，假定 $p_i \in P$ 有连续值，那么我们就需要计算其**相邻 4 个整像素点的映射坐标**，再加权平均。至于为什么 $p_i$ 会有非整数值，可能是由于文章对于 $L_u$ 取两端点，其上的所有连续点都可能被取到。同时，即使 $p_i$ 是整数点，双线性插值也能很好地避免取整带来的不可微性。

  3. 在 distorted image 空间上，计算每个点的曲率
     $$
     \tag{1}
     \kappa_i = \frac{\left| x_i' \times y_i'' - y_i' \times x_i'' \right|}
     {\left( (x_i')^2 + (y_i')^2 \right)^{3/2} + \varepsilon}
     $$
     一阶、二阶导数用 central difference 近似，最终得到损失函数为：
     $$
     \tag{2}
     \mathcal{L}_\kappa = \frac{1}{N-1}\sum_i^{N-1}(\hat{\kappa_i} - \kappa_i)
     $$

  这里，对于多 text-lines 的取舍、为什么会有非整数点都有待确定，暂时不太想花时间去尝试了。

  

  

[Bi-inter]: https://blog.csdn.net/fenglepeng/article/details/121107271
[attn]: ./transformer.md
