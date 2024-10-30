---
cover: /assets/images/work/cv/highres-lowram/cover.png
date: 2024-10-30
category:
  - work
tag:
  - Computer Vision
  - attention
  - transformer
star: true
sticky: true
excerpt: <p>论文阅读笔记</p>
---
# Attention is All You Need
- <i class="fa-solid fa-newspaper"></i> [Paper](https://arxiv.org/abs/1706.03762)
- <i class="fa-solid fa-file-powerpoint"></i> [Slides : Attention](https://speech.ee.ntu.edu.tw/~hylee/ml/ml2021-course-data/self_v7.pdf) 
- <i class="fa-solid fa-file-powerpoint"></i> [Slides : Transformer](https://speech.ee.ntu.edu.tw/~hylee/ml/ml2021-course-data/seq2seq_v9.pdf)
## Features

- 完全抛弃了 RNN、LSTM、GRU 中的 recurrent layer，摆脱了序列化计算的限制（难以并行）；
- 完全基于注意力机制；
- 训练速度很快，效果好；

## Model Architecture
![Transformer Architecture](/assets/images/work/cv/transformer/arch.png#mdimg =400x)

### Attention

#### Scaled Dot-Product Attention

![Scaled Dot-Product Attention](/assets/images/work/cv/transformer/scaled-attention.png#mdimg =250x)

> In practice, we compute the attention function on a set of queries simultaneously, packed together into a matrix $Q$. The keys and values are also packed together into matrices $K$ and $V$ . We compute the matrix of outputs as:
> $$ \text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

::: details Expand to see computation details

##### computation：single input

首先从单个 input 的计算过程看起，这里假设 $a^i \in \mathbb{R}^{d \times 1}$ , $W^q, W^k\in \mathbb{R}^{d_k\times d}$， $W^v \in \mathbb{R}^{d_v\times d}$。

![Computation process for single input (scale, mask and softmax are omitted)](/assets/images/work/cv/transformer/single-input.png#mdimg =500x)

$q, k \in \mathbb{R}^{d_k\times 1}$，$v \in \mathbb{R}^{d_v\times 1}$ 都是由 input 经过矩阵运算得到：
$$
\begin{eqnarray}
q^1 = W^qa^1\\
k^i = W^ka^i\\
v^i = W^va^i\\
\end{eqnarray}
$$
随后，$q^1$ 分别与 $k^i$ 做点积得到 $\alpha_{1, i}$（attention score），再经过 $1/\sqrt{d_k}$ 的 scale、 Mask（Opt）、Softmax 得到 $\alpha^\prime_{1, i}$ ，表示 $a_1$ 与其他输入序列的**相关程度**。最终通过：
$$
b_1 = \sum_i \alpha^{\prime}_{1, i} v^i
$$
得出 $a_1$ 对应的输出。

> [!note]
>
> query 的来源并不一定与 key-value pair 相同，其数目也不一定相同。如果是上述情况，则称为 self-attention。

##### computation：batch

接下来就是用矩阵运算来一次性处理整个 batch。
假设批次大小为 $n$，输入矩阵 $I \in \mathbb{R}^{d\times n}= \begin{bmatrix} a^1, a^2\dots a^n\end{bmatrix}$，输出矩阵 $O \in \mathbb{R}^{d_v\times n}= \begin{bmatrix} b^1, b^2\dots b^n \end{bmatrix}$
首先，所有 input 的 $q, k, v$ 可以用矩阵运算一次性得到：
$$
\begin{eqnarray}
&Q \in \mathbb{R}^{d_k\times n} = \begin{bmatrix} q^1, q^2\dots q^n\end{bmatrix} = W^q \times I\\
&K \in \mathbb{R}^{d_k\times n} = \begin{bmatrix} k^1, k^2\dots k^n\end{bmatrix} = W^k \times I\\
&V \in \mathbb{R}^{d_v\times n} = \begin{bmatrix} v^1, v^2\dots v^n\end{bmatrix} = W^v \times I
\end{eqnarray}
$$
然后，使用 $Q, K, V$ 计算 $O$。

![Element view of matrix computation](/assets/images/work/cv/transformer/matrix.png#mdimg =500x)

形式化表示如下：
$$
\begin{align}
A &= K^TQ\\
A' &=\text{softmax}(A)\\
O &= V A^\prime
\end{align}
$$

:::

#### Multi-Head Attention

![Multi-head Attention](/assets/images/work/cv/transformer/multihead.png#mdimg =300x)

> Instead of performing a single attention function with $d_{model}$-dimensional keys, values and queries, we found it beneficial to linearly project the queries, keys and values h times with different, learned linear projections to $d_k$, $d_k$ and $d_v$ dimensions, respectively.

直观上理解，就是将 $Q, K, V$ 拆成了若干副本，计算后再进行拼接。这样可以用多个 attention 模块去**捕获到 input 之间不同的相关性。具体计算过程如下：

$$
\begin{align}
\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, \dots, \text{head}_h) W^O \\
\text{where} \quad \text{head}_i = \text{Attention}(Q W_i^Q, K W_i^K, V W_i^V)
\end{align}
$$

其中，投影矩阵 $W_i^Q \in \mathbb{R}^{d_{model} \times d_k}, W_i^K \in  \mathbb{R}^{d_{model} \times d_k}, W_i^V  \in \mathbb{R}^{d_{model} \times d_v}$ 用于将 $Q, K, V$ 投影成不同的副本；而投影矩阵 $W^O \in \mathbb{R}^{hd_v \times d_{model}}$ 用于将拼接后的输出维度 由 $hd_v$ 映射回 $d_{model}$，其中 $h$ 为 head 数目。实际运用中，多取 $d_k = d_v = d_{model}/h$（因为输入输出之间需要进行残差连接）。

整个模型的可学参数为 $W^q, W^k, W^v$，$h$ 组投影矩阵，以及最终的 $W^O$，均为全连接层。

::: note

要注意这里的 $d_k, d_v$ 与上一节的含义并不一致，这里是指投影后的 query、key、value 维度，而投影前的维度均为 $d_{model}$。两节中，矩阵的形状统一为 $\text{nums} \times \text{dimensions}$。

:::

#### Applications in the Model

三个输入依次为 $V, K, Q$。如果是由同一路径分叉而来，则表示是 self-attention。

1. Encoder 中的 self-attention：用于将抽取输入序列的信息，输出 n 个 $d_{model}$ 的向量。
2. Decoder 中的 masked attention：在训练过程中，对于单个 sentence，例如“Bob is a boy”，我们希望将每个子句都当作一个训练用例，即“Bob [is]”、“Bob is [a]”、“Bob is a [boy]”。在预测当前位置时，是无法获取后续 token 的信息的。但从原理上讲，attention 会使用到所有的 key、query 值以计算权重矩阵。所以，需要通过 mask，将权重矩阵中对应的项置为0。又因为 mask 在 softmax 之前，所以实际上是将对应的项置为 $-\infty$。而在推理过程中，并不需要 mask，因为此时待预测的 token 一定位于句末。
3. cross-attention：key-value 来自 encoder，而 query 来自 decoder。

### Position-wise Feed-Forward Networks

对于 attention 模块的每个输出，进行一个全连接层（共享权重）计算：
$$
\text{FFN}(x) = \text{ReLU}(xW_1 + b_1)W_2 + b_2
$$
其中，$W_1$ 将 $x$ 从 $d_{model} = 512$ 映射到中间层 $d_{ff} = 2048$，$W_2$ 再映射回 $d_{model} = 512$。

Position-wise 指的是输入仅为单个向量，不需要考虑前后的向量，这是由于 attention 模块**已经抽取了各输入序列之间的关联信息**，这里的任务仅仅是将 attention 的输出映射到目标语义空间。

### Embedding and Softmax

用于将输入 token 映射为 $d_{model}$ 的 embedding。Input embedding、output embedding 以及 Softmax 之前的 Linear 层共享权重。（Linear 的形状应为倒置？）

权重需要乘上 $\sqrt{d_k}$  缩放到 [-1, 1] ，与 postional encoding 加值的大小进行平衡。

### Positional Encoding

Attention 的计算过程不考虑时序信息，例如将一句话的单词顺序打乱，其 attention 计算结果一致。本文通过为 token 的位置 pos 计算一个 $PE_{(pos)} \in \mathbb{R}^{d_{model}}$，并且加入到 embedding 中，实现时序信息的注入：
$$
\begin{align}
PE_{(pos, 2i)} &= sin(pos/10000^{2i/d_{model}})\\
PE_{(pos, 2i+1)} &= cos(pos/10000^{2i/d_{model}})
\end{align}
$$

## Train and Inference

以语音转文字为例，解释 transformer 的训练与推理过程。

### Inference

![Inference(AutoRegressive)](/assets/images/work/cv/transformer/inference.png#mdimg =500x)

encoder 部分只执行一次：将输入的“机器学习“语音 token 编码为 4 个 $d_{model}$ 的 embedding。

decoder 部分执行若干次：

1. 首先以 BOS 为输入，输出 1 个 $d_{model}$ 的 embedding，经过 Linear 与 Softmax 之后，得到**词汇表**上的概率，根据概率，选择输出“机”；
2. 随后，以 BOS 与“机” 为输入，输出 2 个 $d_{model}$ 的 embedding，其中第 1 个 embedding 与第 1 轮一致，第二个 embedding 输出 “器”；
3. 重复上述过程，直到在某一轮中，最后一个 token 的预测输出为 EOS。

###  Train

![Train(Teacher forcing)](/assets/images/work/cv/transformer/train.png#mdimg =500x)

与 inference 的区别在于，输入 embedding 不是上一轮的输出，而是 ground truth（相当于避免上一轮的结果影响这一轮的预测）。可以一次性计算 loss，只需要在 masked attention 中对每个位置加上不同的 mask 即可。

## Comprehension

以下内容来自对文章以及 [<i class="fa-brands fa-youtube"></i>：Attention in transformers, visually explained](https://www.youtube.com/watch?v=eMlx5fFNoYc&t=907s) 的个人理解，如有错误，敬请指正。

1. 在 encoder 中，输入 token 之间在做 self-attention，其本质是修改 token 的初始 embedding（n token 输入，n value 输出，刚好一一对应），使其具有上下文信息。例如，“Miniature Eiffel” 与 “Great Eiffel” 中的 “Eiffel”，其初始 embedding 完全一样，而每经过一轮 self-attention，这两个 “Eiffel” 的 embedding 会被更新到不同的方向上。那么，对于同一序列中的 token 呢？例如，对于“Happy is a Happy dog” 中的两个 “Happy”，他们进行 attention 操作的结果应该完全相同，更新的结果也应该相同。别忘了 Positinal Encoding，这两个 Happy 的初始 embedding 已经包含了位置信息，所以并不一致。
2. multi-head attention 中投影矩阵的实际含义：例如 “Eiffel” 的 embedding，作为一个名词，其投影得到的 query 将会与形容词、量词投影得到的 key 产生更大的内积，从而在**对 value 加权求和时，形容词、量词对应 value 的权重更高，对 “Eiffel” 的影响越大**。而形容词、量词投影得到的 value 则表示了其对于改变其他 embedding 语义的能力。
3. transformer decoder 的两个 attention 模块分别用于抽取在结果序列中的信息，以及融合输入序列的信息来指导 next token 的生成。

