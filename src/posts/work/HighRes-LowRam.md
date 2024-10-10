---
cover: /assets/images/SD_Opt/cover.png
icon: pen-to-square
date: 2024-10-09
category:
  - work
tag:
  - Computer Vision, Diffusion
star: true
sticky: true
---

# HighRes-LowRAM

> $O(N^2)$

### SD-unit Optimization

#### 1. xformer





### Module-level Optimization

#### 1. mixture of diffusion

> 理论pipeline(每一步在示例中都有用到): 1. low_res sketch 2. up_sample using mixture of diffusion

##### todo

1. 完整地跑完一遍pipeline, 记录除了SD-unit之外的开销, 判断是否可以将问题完全reduce到SD-unit的优化
2. 更换SD-unit, 观察与一些 mem_saving method 的兼容性. (已知的: SDv1.4在python3.10环境下, dtype=torch.float16, 没法实现内存开销的减小.)
3. 鉴于该思路, 尝试减小SD-unit的W, H. (首先从重复的图案出发)



### LinFusion


