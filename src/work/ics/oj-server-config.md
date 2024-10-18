---
cover: /assets/images/server_debug/cover.png
icon: pen-to-square
date: 2024-10-18
category:
  - qcloud
  - server config
  - web-backend
tag:
  - python
star: true
sticky: true
excerpt: <p> 解释了评测服务器相关的部分配置、运行逻辑以及常见问题。 </p>
---



# 评测服务器配置

### qloud服务器上所有的proxy设置

1. bashrc中的http_proxy, https_proxy, PROXY(这是在v2ray下载时发现脚本中使用的环境变量). 注意在切换到不同用户时, 特别是sudo时, 需要保证该用户目录下有设置
2. /etc/apt/apt.conf, 但是透过该代理无法访问腾讯云的文件. 暂时没有跑通过.
3. /etc/systemd/system/docker.service.d, docker pull 的代理.



### Vmware虚拟机端口映射

1. 22端口被host的ssh服务占用, 需要修改vmware端口映射. (Player需要手动改config)
2. 另一主机能ssh (-p 22) wsl, host能ssh -p 8889 VM, 为什么另一主机不能ssh -p 8889 VM? WSL是等值映射, 22端口默认开放, 但8889就不一定了. 而host之所以能通过192.168.1.101访问, 是因为这个ip地址不需要出站. 跟localhost效果相近.



### nginx配置

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
    client_max_body_size 100M;
}
```



### 上传问题: 

1. 无代理, 两个进程同步上传, 251M文件, 没有问题.

2. 透过代理, 可能出现上传成功但没有服务器端回复, 连接卡住的情况.(Mac)

3. 透过代理, 还有可能出现超时, 客户端没有接收到回复的情况. (WSL)

上述两种情况倒是可以理解: 因为curl脚本过于简陋的问题, 导致服务器端没法经由代理反向传回信息. (正常的http连接应该会有更复杂的头部, 以实现上述过程).

4. 剩下的就是喜闻乐见的(56) Recv failure: Connection reset by peer 和 (55) Send failure: Broken pipe. (amax). 难道真的是连网服务器的问题?

> 结论: 在没有代理的环境下上传.



### 提交文件过大问题

关于文件保存问题: 为什么有的submit那么大.

可以用git-filter-repo将曾经track过的大文件(例如pdf)从记录中删掉.



### 轮询查找未评测提交

如果是在 find.py 中就进行 os.path.exists(f'{fname}.result') 的判断, 则很符合预期地, 运行的很快

但如果"在这里先把所有的提交记录都找出来, 后续只对没有对应result文件的提交进行评测", 即使禁用了debug输出, 例如 "skipping judged submit"、“Invoke submit [submit_id]” ，仍然会很慢（3-5分钟级别）原因是：这些无用的提交会经历例如Path(line).relative_to(FILERECV_DIR) for line in p.stdout.decode('utf-8').splitlines()的处理。

自然采用前者。