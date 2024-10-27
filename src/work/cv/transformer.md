# Attention is All You Need
- <HopeIcon icon="archive"/> [Paper](https://arxiv.org/abs/1706.03762)
- <i class="fa-solid fa-file-powerpoint"></i> [Referenced Slides](https://speech.ee.ntu.edu.tw/~hylee/ml/ml2021-course-data/self_v7.pdf)
## Features

- 完全抛弃了 RNN、LSTM、GRU 中的 recurrent layer，摆脱了序列化计算的限制（难以并行）；
- 完全基于注意力机制；
- 训练速度很快，效果好；

## Self-Attention
### Scaled Dot-Product Attention
![Scaled Dot-Product Attention](/assets/images/work/cv/transformer/scaled-attention.png =150x)

> In practice, we compute the attention function on a set of queries simultaneously, packed together into a matrix $Q$. The keys and values are also packed together into matrices $K$ and $V$ . We compute the matrix of outputs as:
> $$ \text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

#### single input
首先从单个 input 的计算过程看起，这里假设 $a^i \in \mathbb{R}^{d \times 1}$ , $W^q, W^k\in \mathbb{R}^{d_k\times d}$， $W^v \in \mathbb{R}^{d_v\times d}$。

![Computation process for single input (scale, mask and softmax are omitted)](/assets/images/work/cv/transformer/single-input.png =600x)

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
#### batch
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

![Element view of matrix computation](/assets/images/work/cv/transformer/matrix.png =600x)

形式化表示如下：
$$
\begin{align}
A &= K^TQ\\
A' &=\text{softmax}(A)\\
O &= V A^\prime
\end{align}
$$
> 整个模型的可学参数为 $W^q$、$W^k$、$W^v$。

### Multi-Head Attention
![Multi-head Attention](/assets/images/work/cv/transformer/multihead.png =200x)
> Instead of performing a single attention function with $d_{model}$-dimensional keys, values and queries, we found it beneficial to linearly project the queries, keys and values h times with different, learned linear projections to $d_k$, $d_k$ and $d_v$ dimensions, respectively.

直观上理解，就是将 $Q, K, V$ 拆成了若干副本，计算后再进行拼接。这样可以用多个 attention 模块去**捕获到 input 之间不同的相关性**。具体计算过程如下：

$$
\begin{align}
\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, \dots, \text{head}_h) W^O \\
\text{where} \quad \text{head}_i = \text{Attention}(Q W_i^Q, K W_i^K, V W_i^V)
\end{align}
$$

其中，投影矩阵 $W_i^Q \in \mathbb{R}^{n \times d_k}, W_i^K \in  \mathbb{R}^{n \times d_k}, W_i^V  \in \mathbb{R}^{n \times d_v}$ 用于将 $Q, K, V$ 投影成不同的副本；而投影矩阵 $W^O \in \mathbb{R}^{hd_v \times n}$ 用于将拼接后的输出 batch_size 由 $hd_v$ 映射回 $n$，其中 $h$ 为 head 数目。
实际运用中，多取 $d_k = d_v = n/h$，此时可以看作将原本大小为 $n$ 的 batch 拆分成 $h$ 个大小为 $n / h$ 的 batch。
> 整个模型的可学参数为 $W^q$、$W^k$、$W^v$，$h$ 组投影矩阵，以及最终的 $W^O$。
::: note
1. 这里的 $n$ 即为原文中的 $d_{model}$。
2. 如果按照原文所述，当 $d_k \neq d_v$ 时，并不能计算多头注意力？
3. 原文的 $Q, K, V$ 形状在两节中并不统一？以 $Q$ 为例，从第二节判断，$Q \in \mathbb{R}^{d_k \times n}$，而这与第一节中 $QK^T$ 矛盾（形状刚好转置）。
:::

## Model Architecture
TBD