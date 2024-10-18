---
cover: /assets/images/devinit/server-survive/cover.png
icon: pen-to-square
date: 2024-10-09
category:
  - server config
tag:
  - linux
  - docker
  - python-env
  - network-proxy
star: true
sticky: true
excerpt: <p> 坐拥8张A6000，500GB运行内存，却仍然无法顺畅地进行实验？是的，这样的悲剧切切实实地发生在课题组内的每个同学身上。本篇将记录在多人共享的服务器上生存的若干tricks。 </p>
---

# 服务器生存指南
> 坐拥8张A6000，500GB运行内存，却仍然无法顺畅地进行实验？是的，这样的悲剧切切实实地发生在课题组内的每个同学身上。本篇将记录在多人共享的服务器上生存的若干tricks。

## No Space Left on Device

### 合理存放 data 与 code

一般来说，实验服务器会将存储空间划分为 code 和 data 两部分，分别挂载不同的磁盘。其中，data 部分对应的存储空间远大于 code 部分。以我所使用的服务器为例，`df -h` 的输出如下：

 ```
 Filesystem      Size  Used Avail Use% Mounted on
 udev            252G     0  252G   0% /dev
 tmpfs            51G  3.5M   51G   1% /run
 /dev/sda3       431G  407G  2.4G 100% /
 tmpfs           252G  401M  252G   1% /dev/shm
 tmpfs           5.0M     0  5.0M   0% /run/lock
 tmpfs           252G     0  252G   0% /sys/fs/cgroup
 /dev/loop1       56M   56M     0 100% /snap/core18/2697
 /dev/loop0      128K  128K     0 100% /snap/bare/5
 /dev/loop2       92M   92M     0 100% /snap/gtk-common-themes/1535
 /dev/loop3       50M   50M     0 100% /snap/snapd/18357
 /dev/loop4      347M  347M     0 100% /snap/gnome-3-38-2004/119
 /dev/nvme0n1    7.0T  5.4T  1.3T  82% /data1
 /dev/loop5       64M   64M     0 100% /snap/core20/1822
 /dev/loop7      219M  219M     0 100% /snap/gnome-3-34-1804/77
 /dev/loop6       46M   46M     0 100% /snap/snap-store/638
 /dev/sda1       734M  158M  524M  24% /boot
 /dev/sdb1       7.3T  6.0T  937G  87% /data2
 ```

因此，正确的做法应该是将所有的数据集下载到 `/data1` 和 `/data2` 目录下。

### **隐式的空间占用**

在安装环境、下载模型等过程中，**临时目录和缓存**会隐式占用磁盘空间。不同的库会有不同的路径设置逻辑，同一库的不同版本间，占用路径的设置也会有区别，需时刻查阅手册。这里列举较为常见的例子：

#### 修改 conda env 的安装路径

由于课题组的研究方向是CV，不可避免的会用到 pytorch 库，因此即使只在 `/home` 目录下存放 code 以及安装环境，也会占用很多空间。

> 正确的解决方法应该是实现环境的复用，对于各用户所需的相同的 torch 版本，只保留一份 conda 环境，但这需要全体组员的协作，并且假定了在固定 torch 版本后，不存在对于某些库的不同版本的需求。

可以通过 `conda create --prefix=/path/to/your/env` 来自定义 `conda env` 的安装路径。这样就可以逃离拥挤的 `/home` 目录。

#### 修改 pip cache 以及 TMPDIR

修改 conda env 安装路径后，可以发现在安装环境时， `~/miniconda3` 目录大小确实不再增加，但仍然会遇到磁盘空间不足的问题。这就不得不提 pip install 过程中隐式占用的两个目录：

- **cache**：用于缓存已下载的包和安装数据。pip 会将从 PyPI（Python 包索引）或其他源下载的包存储在本地缓存中，以便在下次安装相同版本的包时不需要再次下载。缓存目录位置可以通过 `pip cache dir` 命令查看，默认位于用户的主目录下的 `.cache/pip` 目录中。因此，需要通过 `pip config set global.cache-dir "/path/to/your/cache/pip"` 将 cache 目录也放在 /data 目录下。
- **TMPDIR**：TMPDIR 目录用于存储安装过程中生成的临时文件。pip 需要在安装包时解压压缩包、构建 wheels、编译扩展模块等，这些操作都会在临时目录中完成。当 TMPDIR 环境变量不存在时，会默认使用 `/var/tmp`，从 `df -h` 的输出可知，这与 `/home` 目录占用了同一块磁盘的空间。因此，需要设置 TMPDIR 环境变量至 `/path/to/your/tmp`。

#### 修改HF_HOME

Hugging Face 也会使用缓存机制来存储下载的模型等（例如 `from_pretrained()` 加载的模型），使用的缓存目录为`$HF_HOME/.cache/huggingface` 。现在的大模型 chekcpoint 动辄5GB+，是一笔很大的存储开销。既然缓存目录的定义方式使用了环境变量，我们也就不必去源码中硬编码路径了，直接设置 `$HF_HOME` 即可。

#### 修改 docker_root

docker 的根目录（默认为 `/var/lib/docker`）是 docker 存储数据的位置。这个目录保存了与 docker 相关的所有数据，包括：

- **镜像（Images）**：下载或构建的 docker 镜像被存储在该目录中。
- **容器（Containers）**：运行或停止的容器及其数据也存储在这个目录中。
- **卷（Volumes）**：如果你使用了 docker 卷来持久化数据，卷数据会保存在根目录的子目录中。

在 docker 中安装环境、下载数据，所占用的正是 docker 根目录的空间。可以通过在 `/etc/docker/daemon.json` 中添加如下内容以修改 docker 根目录：

```json
{
"data-root": "/path/to/your/new/docker_root"
}
```



## Cope with Proxy

正常情况下，为服务器配置代理是非常容易的。然而，真实情况是，实验服务器通过局域网与 Gateway Server 连通，而 Gateway Server 只开放了某端口用作流量入口，即无法通过 ssh 连接。 因此，第一跳必须是 Gateway Server，且无法在其上配置多级代理，配置代理计划落空。但绝望中仍有一线生机：

### 使用镜像站

绝大多数情况下，所需安装的库、所需下载的模型在镜像站中都会有备份。以 Hugging Face 为例，可以设置 `HF_ENDPOINT="https://hf-mirror.com"` 来从镜像站拉取模型。apt、pip、conda 等也类似。

### 离线安装

可以检索库的 manual install 方式，将其中所需的源文件透过代理下载到本地，然后通过 scp 传到服务器上，再从源文件进行安装。这一方法甚至对 vscode 拓展也适用：在 [vscode extension market](https://marketplace.visualstudio.com/vscode) 找到目标插件，选择 Downoad Extension，传输到服务器后，通过 Extension -> Install from VSIX... 即可离线安装插件。



> [!note]
>
> to be extended