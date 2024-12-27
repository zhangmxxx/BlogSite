---
cover: /assets/images/work/ics/oj-server-devlog/cover.png
icon: pen-to-square
date: 2024-10-18
category:
  - server config
  - ics ta work
tag:
  - web-backend
  - qcloud
  - docker
  - apt
star: true
sticky: true
excerpt: <p> 评测服务器相关的架构、配置以及常见问题。 </p>
---

# 评测服务器开发日志
## Architecture
该服务器部署在 qcloud 上，可分为两个部分：webserver 和 judger。
- webserver 基于 gunicorn + nginx 部署，用于接收提交文件、提供静态文件和响应结果查询；
- judger 由 teacher why 提供，用于评测提交文件。

二者完全解耦，可部署在不同的服务器之上：judger 会通过 ssh 连接到 webserver，来拉取提交文件；完成评测后，再将结果写入 webserver。当然，由于 ssh 的目标可以是 localhost，二者也可以部署于同一服务器上。

> webserver 的所有接口均来自于 judger 中的相关调用，以及[实验须知](http://www.why.ink:8080/ICS/2022/labs/Labs)。

## Config
### Proxies
1. bashrc 中的 http_proxy、https_proxy、PROXY（used in v2ray download script）。 注意在切换到不同用户时，特别是 sudo 切换到 root 时, 需要保证该用户目录下有设置。
2. /etc/apt/apt.conf：用于配置 apt 的代理。但是透过该代理无法访问腾讯云的 apt source。
3. /etc/systemd/system/docker.service.d：docker pull 的代理.

### Nginx
<HopeIcon icon="book"/> [**tutorial**](https://github.com/xitu/gold-miner/blob/master/TODO/how-to-configure-nginx-for-a-flask-web-application.md)
nginx 采用了层次化的配置，其中，有关 http、events 的配置（作用于全部 server）位于 /etc/nginx/nginx.conf，而有关代理服务器的配置，则位于 /etc/nginx/sites-available/server-name：
```nginx
server {
    listen 80;
    server_name 175.24.131.173;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    client_max_body_size 12M;
}
```
配置项解释如下：
- **listen**：nginx 的监听端口（并不是指 nginx 只会代理来自这个端口的流量）；
- **server_name**：代理的主机名。当同一服务器对应了多个 ip、hostname 时，可以使用该配置项进行区分；
- **location**：针对符合某种特征的 url 请求的响应规则。这里将所有请求都转发给了后端的 gunicorn 服务器。一个[更好的做法](/todo.md)是由 nginx 来处理静态文件的请求。
- **client_max_body_size**：允许上传的最大大小。

### Docker
judger 会运行 docker 来进行评测：
```python
args = [ 'docker', 'run',
          '--rm', '-i', '-t',
          '--network', 'none',
          '-m', '2048m', # Memory limit
          '--name', name,
          '-u', 'root',
          '--tmpfs', '/dev/shm:exec',
          '--shm-size=1536m',
          '--ipc', 'private',
          '--cap-add', 'SYS_PTRACE',
          '--ulimit', f'cpu={cpu_rlim}:{cpu_rlim}', # CPU runtime limit
          '--mount', f'type=bind,source={self._path},target=/shared',
        ] + [ self._img ] + [ 'bash', '/shared/entry-root.sh' ]
      retcode = subprocess.call(
        args,
        stdin=os.fdopen(master_fd),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
      )
```
其中 self._img = sandbox22。那么，该如何配置 sandbox22 这个 image 呢？注意到在 docker/container 目录下有 sandbox22\.docker 文件：

```docker
FROM ubuntu22:ics
ENV DEBIAN_FRONTEND=noninteractive
COPY change-source.sh /tmp/

RUN useradd -ms /bin/bash oj
RUN useradd -ms /bin/bash admin
RUN usermod -u 1000 oj  // change uid
RUN groupmod -g 1000 oj // change uid
USER oj
WORKDIR /home/oj
```

可以看到在该 dockerfile 中，对基准 image ubuntu22:ics 进行了一系列的初始化。因此，我们只需要按照 PA guidebook 中的[相关章节](https://nju-projectn.github.io/ics-pa-gitbook/ics2024/0.3.html#installing-tools-for-pas)，安装运行所需的库，并将安装完环境的 ubuntu22.04 image 注册为 ubuntu22:ics，再通过如下命令构建 sandbox22 image：

```bash
docker build -f /path/to/sandbox22.docker .
```

::: tip

值得注意的是其中的 usermod 与 groupmod 的设置。对于一个目录，其所有权是根据 uid 来分配的。当该目录被共享至容器中时，容器中**拥有相同 uid 的用户**会获得所有权。因此，为了保证容器中的用户 oj 能够对 workspace 写入，必须使得 oj 与 host 中的 ubuntu（uid = 1000）的 uid 一致。

:::

## Issues

### Upload Failure

- 当上传文件过大（70MB+）时，会出现 (56) Recv failure: Connection reset by peer 和 (55) Send failure: Broken pipe。但这是异常的提交文件大小。经检查发现，该提交文件包含并在 git 中追踪了过大的 pdf 文件（50MB+），而在文件大小正常（10MB-）的情况下，提交并不会出错。因此，选择限制上传文件大小，并指导使用 git-filter-repo 将曾经 track 过的大文件从记录中删掉。

- 当通过代理上传文件时，即使是小文件，也可能出现客户端接收不到 [SUCC ✓] 回复的情况。因此，只需要在提交时 unset http_proxy 即可。

### gcc-multilib & riscv conflict

gcc-multilib 和 g++-riscv64-linux-gnu 存在冲突，安装其一，apt 会移除另一。但是，先安装前者，后安装后者，会使得 gcc-multilib 被（错误？）保留。

### Stuck on Judged Submissions

如果是在 find\.py 中就通过 os.path.exists(f'{fname}.result') 筛除掉已评测的提交，在小于1s内即可完成，后续只会遍历未评测的提交。 但如果“在这里先把所有的提交记录都找出来, 后续只对没有对应result文件的提交进行评测”， 即使禁用了 debug 输出，例如 “skipping judged submit”、“Invoke submit [submit_id]” ，仍然会很慢，大约需要 3-5 分钟来遍历已评测的提交。原因是，这些无用的提交会经历一系列预处理，由于庞大的数量，这些操作会很耗时。自然要采用前者。

### Vastly Runtime for the Same Code

在 Lab3 的评测中，发现对于同一份代码，评测得到的加速比差距很大（能达到25%）：

```
root@0eb1fce04bc5:/shared/shared/ics-env/perftune# ./perftune-64 hard
n = 9999998
naive[1609100935.000000], sub[154156502.000000]
[[all-tests-passed]]
=[[[-speedup-10.4381-]]]=
root@0eb1fce04bc5:/shared/shared/ics-env/perftune# ./perftune-64 hard
n = 9999998
naive[1358157781.000000], sub[152781548.000000]
[[all-tests-passed]]
=[[[-speedup-8.8895-]]]=
```

首先，这种情况在本地机器上无法复现。其次，通过使用 `rdtscp` 、 `clock_gettime()`  对框架中的 `rdtsc` 进行替换，发现结果皆是如此，并且使用 `time ./perftune-64 hard` 计时，发现时间与现实时间一致。综上所述，问题在于 `naive` 确实运行时间差异很大。同时注意到，运行时间较短的 sub，其时间波动较小。因此，猜测是长时间运行的程序会触发云服务器的资源调度变化，从而导致较大的时间波动，并且这个影响远大于系统的本身调度（按理说时间短的程序，时间波动更大）。
