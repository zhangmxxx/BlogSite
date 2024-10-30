---
cover: /assets/images/work/cv/highres-lowram/cover.png
date: 2024-10-27
category:
  - article reading
tag:
  - Computer Vision
  - attention
  - transformer
star: true
sticky: true
excerpt: <p>论文阅读笔记</p>
---
# AutoEncoder
## Basic Idea

基于 deep learning 的降维算法。

模型由 encoder、decoder 构成，其中 encoder 用于将输入的高维向量编码到低维的 embedding，而 decoder 用于将 embedding 还原到原本的向量空间。

直观上讲，AutoEncoder 之所以能够实现，是因为输入样本的复杂度小于其向量空间维度。一个极端的例子是，对于 $512 \times 512$ 的图片，样本空间总共只有两张不同的图片，那么只需要 1 bit 就足以编码该样本空间。

有了这个 embedding，就可以用来做一系列 downstream 的任务。

> encoder、decoder的详细结构？

## Usage

- Feature Disentanglement：尝试将 embedding 拆分成不同部分，每个部分代表了输入的某一方面特征。例如，对于语音输入，尝试将 embedding 拆分为音色、内容两部分。可以应用到风格迁移中。
- Discrete Representation：尝试用离散值（例如 01 编码、one-hot 编码）来表示 embedding。
- ...... （text as representation、tree as representation）