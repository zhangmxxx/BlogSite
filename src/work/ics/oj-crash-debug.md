---
cover: /assets/images/work/ics/oj-crash-debug/cover.png
icon: pen-to-square
date: 2024-10-15
category:
  - service test
tag:
  - web-backend
  - qcloud
  - testing
star: true
sticky: true
excerpt: <p> 分析评测服务器的 crash 信息，进行压力测试，并给出对策。 </p>
---
# 服务器崩溃调试
封面为此时的心理状态 :disappointed:。​
搭建的评测服务器在实际运行过程中屡次出现IO利用过高，系统卡死的情况。由于模拟并发的困难，于是按照网路上搜寻到的方法，进行了若干次无法验证的尝试，包括但不限于：减少 gunicorn worker 数量、改用 gevent 模式。不幸的是，服务器仍于2024年10月15日17时15分再次崩溃。痛定思痛，决定对产生问题的根源进行彻查。

## Crashing Snapshot

### Server Monitor

截取崩溃瞬时前后的服务器资源占用情况如下（from 17:14 to 17:20）：

::: details Expand to see details

![cpu and ram](/assets/images/work/ics/oj-crash-debug/cpu-ram.png)
![network](/assets/images/work/ics/oj-crash-debug/network.png)
![io](/assets/images/work/ics/oj-crash-debug/io.png)

:::

在崩溃瞬间（17:15:50）首先是存在一个 write 峰值（23807KB/s，wIOPS = 327）。随后进入稳定的卡死状态：CPU、RAM 监视信息缺失；**硬盘读流量居高不下，读IOPS高、服务时间短**；硬盘写流量为0；硬盘等待时间 10-25ms，繁忙比率100%；网络几乎断开，在 17:40 有过短暂的出流量，共计1.318MB。

### Gunicorn Log

截取对应时间段的 gunicorn debug.log 如下：

::: details Expand to see details

```
[2024-10-15 17:15:34 +0800] [463796] [DEBUG] GET /oj/ICS2024/PA1/src/bootstrap.min.js
[2024-10-15 17:16:34 +0800] [463801] [DEBUG] GET /oj/ICS2024/PA1/8XWUE5GV
[2024-10-15 17:16:34 +0800] [463813] [DEBUG] GET /oj/ICS2024/PA1/8XWUE5GV
[2024-10-15 17:40:40 +0800] [463796] [DEBUG] Closing connection.
[2024-10-15 17:40:40 +0800] [463814] [DEBUG] GET /oj/ICS2024/PA1/8XWUE5GV
[2024-10-15 17:40:40 +0800] [463796] [DEBUG] GET /oj/ICS2024/PA1/seJAotOr
[2024-10-15 17:40:40 +0800] [463814] [DEBUG] Closing connection.
[2024-10-15 17:40:40 +0800] [463813] [DEBUG] Closing connection.
[2024-10-15 17:40:40 +0800] [463801] [DEBUG] Closing connection.
[2024-10-15 17:40:40 +0800] [463814] [DEBUG] Closing connection.
[2024-10-15 17:40:40 +0800] [463814] [DEBUG] GET /oj/ICS2024/PA1/seJAotOr
[2024-10-15 17:40:40 +0800] [463813] [DEBUG] GET /oj/ICS2024/PA1/seJAotOr
[2024-10-15 17:40:40 +0800] [463801] [DEBUG] GET /oj/ICS2024/PA1/seJAotOr
[2024-10-15 17:40:40 +0800] [463814] [DEBUG] Closing connection.
[2024-10-15 17:40:40 +0800] [463796] [DEBUG] Closing connection.
[2024-10-15 17:40:40 +0800] [463813] [DEBUG] Closing connection.
[2024-10-15 17:40:40 +0800] [463801] [DEBUG] Closing connection.
[2024-10-15 17:40:40 +0800] [463813] [DEBUG] GET /oj/ICS2024/PA1/8XWUE5GV
[2024-10-15 17:40:40 +0800] [463814] [DEBUG] GET /oj/ICS2024/PA1/seJAotOr
[2024-10-15 17:40:40 +0800] [463801] [DEBUG] Closing connection.
[2024-10-15 17:40:41 +0800] [463796] [DEBUG] Closing connection.
[2024-10-15 17:40:41 +0800] [463796] [DEBUG] Ignoring connection reset
[2024-10-15 17:40:41 +0800] [463801] [DEBUG] Closing connection.
[2024-10-15 17:40:41 +0800] [463801] [DEBUG] Ignoring connection reset
[2024-10-15 17:40:41 +0800] [463801] [DEBUG] GET /oj/ICS2024/Lab1/6ovec4ju
[2024-10-15 17:40:41 +0800] [463814] [DEBUG] Closing connection.
[2024-10-15 17:40:41 +0800] [463814] [DEBUG] GET /oj/ICS2024/Lab1/6ovec4ju
... [hundreds of similar connections]
[2024-10-15 17:40:41 +0800] [463801] [DEBUG] Closing connection.
[2024-10-15 17:40:41 +0800] [463813] [DEBUG] GET /oj/ICS2024/PA1/src/bootstrap.min.js
[2024-10-15 17:40:41 +0800] [463814] [DEBUG] GET /oj/ICS2024/PA1/src/bootstrap.min.css
[2024-10-15 17:40:41 +0800] [463813] [DEBUG] GET /oj/ICS2024/PA1/src/bootstrap.min.js
[2024-10-15 17:40:41 +0800] [463813] [DEBUG] GET /oj/ICS2024/PA1/src/bootstrap.min.css
[2024-10-15 17:40:41 +0800] [463813] [DEBUG] GET /oj/ICS2024/PA1/src/bootstrap.min.js
[2024-10-15 17:40:46 +0800] [463801] [DEBUG] Ignoring EPIPE
[2024-10-15 17:42:53 +0800] [463813] [DEBUG] GET /favicon.ico
[2024-10-15 17:42:54 +0800] [463814] [DEBUG] Closing connection.
[2024-10-15 17:54:20 +0800] [463763] [ERROR] Worker (pid:463813) was sent SIGKILL! Perhaps out of memory?
[2024-10-15 17:54:20 +0800] [463763] [CRITICAL] WORKER TIMEOUT (pid:463796)
[2024-10-15 17:54:20 +0800] [463763] [CRITICAL] WORKER TIMEOUT (pid:463801)
[2024-10-15 17:54:22 +0800] [463763] [CRITICAL] WORKER TIMEOUT (pid:463814)
[2024-10-15 17:54:39 +0800] [2204630] [INFO] Booting worker with pid: 2204630
[2024-10-15 17:54:39 +0800] [463763] [ERROR] Worker (pid:463796) was sent SIGKILL! Perhaps out of memory?
[2024-10-15 17:54:39 +0800] [463763] [ERROR] Worker (pid:463801) was sent SIGKILL! Perhaps out of memory?
[2024-10-15 17:54:39 +0800] [463763] [ERROR] Worker (pid:463814) was sent SIGKILL! Perhaps out of memory?
```

:::

在 17:15 左右，并没有异常信息；而在 17:40:40 - 17:40:41，短短2秒内，出现了上百个连接，且都是与结果查询界面有关。显然，不可能有这么多 client 在几乎一瞬间发出这么多查询请求：这多半是某种事件队列累积的结果。

## Analysis

### Write Rate

通过 server monitor 的记录可以判断，是某个异常的 write 操作，引发了 crash。但该操作的 write 特征并不显著：write rate = 23807KB/s，wIOPS = 327，这并没有偏离正常区间太多，并且在正常运行时，也会有类似的极值点。

### Read Rate

同时，值得注意的是，所有可能的请求，都只产生了 write 流量，而在系统卡死后，却只有 read 流量。这个流量大概率不是进程正常运行的结果，如果能找出该进程，或许能反向推导出 crash 原因。

在 iotop 中，大部分进程的 read rate 都是 0，唯有 YDservice 会产生 1-3MB/s 的 read rate。这是腾讯云服务器的监控进程。网路上关于它的评价也只有“占用资源”，并未见“导致崩溃”，故暂不对其进行测试。

## Test & Reproduce

这里对文件上传、评测结果查询和 docker run 进行测试。

由于涉及非 web API 的测试，以及涉及通过脚本执行上传任务，传统的 http_load、ab 等工具并不适用。这里选用 [GNU parallel](https://en.wikipedia.org/wiki/GNU_parallel) 来模拟并发。

> parallel 也可用于并行化命令，例如并行化 `find -name -exec` 中的 exec 部分。

### File Upload

通过模拟 [submit.sh](http://175.24.131.173:8080/static/submit.sh) 中的提交过程，使用如下 command 模拟并发上传文件：

```bash
parallel -n0 --jobs 8 curl -F "token=DIBYHMnd" -F "course=ICS2024" -F "module=PA1" -F "file=@upload.tar.bz2" http://175.24.131.173:8080/upload ::: {1..8}
# equals to
seq 8 | parallel -n0 --jobs 8 curl -F "token=DIBYHMnd" -F "course=ICS2024" -F "module=PA1" -F "file=@upload.tar.bz2" http://175.24.131.173:8080/upload
```

参数解释：

- -n0：args 不作为参数传递给实际的指令，显然，我们并不想将 index 传参给 curl 命令；
- --jobs：parallel 默认会产生与 CPU 核心数相同数目的并发进程，通过 jobs 可以显式修改；
- 所有进程执行 command 的总次数是由传递给 parallel 的参数个数决定的。也就是说，这里的 seq 8、:::{1..8} 可以替换为任何输出个数为 8 的命令。

输出结果如下：

::: details Expand to see details

```bash
[SUCC ✓] Received qtigP4RhEjPNlRUz at 2024-10-16 16:44:44
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 9059k  100    69  100 9058k     63  8381k  0:00:01  0:00:01 --:--:-- 8387k
[SUCC ✓] Received 8CDd1jUa8JSY7Nn3 at 2024-10-16 16:44:44
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 9059k  100    69  100 9058k     59  7837k  0:00:01  0:00:01 --:--:-- 7843k
[SUCC ✓] Received sRI7HlL0800SwhTF at 2024-10-16 16:44:44
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 9059k  100    69  100 9058k     55  7284k  0:00:01  0:00:01 --:--:-- 7288k
[SUCC ✓] Received HYi9C5NFhrFkg31b at 2024-10-16 16:44:44
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 9059k  100    69  100 9058k     55  7232k  0:00:01  0:00:01 --:--:-- 7235k
[SUCC ✓] Received aRqFfhx97fN3gqAS at 2024-10-16 16:44:44
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 9059k  100    69  100 9058k     54  7117k  0:00:01  0:00:01 --:--:-- 7121k
[SUCC ✓] Received 4RHLZwKBwem6IpE0 at 2024-10-16 16:44:44
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 9059k  100    69  100 9058k     54  7115k  0:00:01  0:00:01 --:--:-- 7116k
[SUCC ✓] Received RX6P2OkVVO5BkFjO at 2024-10-16 16:44:44
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 9059k  100    69  100 9058k     53  7060k  0:00:01  0:00:01 --:--:-- 7060k
[SUCC ✓] Received gU1oRySJzmB017k4 at 2024-10-16 16:44:44
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 9059k  100    69  100 9058k     52  6865k  0:00:01  0:00:01 --:--:-- 6868k
```

:::

这里使用了一个 11.8 MB 的文件作为测试，考虑到12MB 的上传限制，理应超过了现阶段的绝大部分提交。后续还测试了 32 并发，结果类似。在 8 并发下查看 iotop 可以发现，write rate 已经达到了一个相当大的值，但仍然可以正常处理。

![iotop info](/assets/images/work/ics/oj-crash-debug/parallel-iotop.png)

尝试使用超出大小限制的文件，也能够得到预期的 reject：

::: details Expand to see details

```bash
[FAIL ✗] File is too large!
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0 15.8M  100    39    0  157k    521  2101k  0:00:07 --:--:--  0:00:07 2124k
[FAIL ✗] File is too large!
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0 15.8M  100    39    0  128k    513  1684k  0:00:09 --:--:--  0:00:09 1707k
[FAIL ✗] File is too large!
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  1 15.8M  100    39    1  243k    474  2963k  0:00:05 --:--:--  0:00:05 2971k
[FAIL ✗] File is too large!
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  1 15.8M  100    39    1  271k    489  3401k  0:00:04 --:--:--  0:00:04 3432k
[FAIL ✗] File is too large!
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  1 15.8M  100    39    1  267k    481  3299k  0:00:04 --:--:--  0:00:04 3340k
[FAIL ✗] File is too large!
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0 15.8M  100    39    0     0    481      0 --:--:-- --:--:-- --:--:--   481
[FAIL ✗] File is too large!
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0 15.8M  100    39    0     0    469      0 --:--:-- --:--:-- --:--:--   469
[FAIL ✗] File is too large!
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0 15.8M  100    39    0  145k    430  1604k  0:00:10 --:--:--  0:00:10 1615k
```

:::

由此可以判断，文件上传服务不会引起服务器崩溃。

### Result Query

类似的，采用如下命令，模拟评测结果并发查询。由于 curl client 没有缓存，server 端是我自己写的，也没有缓存，所以大可以使用相同 token 进行查询。

```bash
seq 1 8 | parallel -n0 --jobs 8 curl http://175.24.131.173/oj/ICS2024/PA1/seJAotOr
```

结果并未引发崩溃。

### Docker Run

评测是串行过程，不可能存在并发。保险起见，使用如下命令强行创建 2 并发评测进程，进行测试：

```bash
find ./ -name "daemon[1-9].py" | parallel python {}
```

其中，因为 `daemon.py` 通过 fcntl.flock(fp.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB) 设置了并发锁，所以使用了 `daemon.py` 的两份 copy；{ } 表示将输出完整传递给命令。然而，发现该进程始终处于 write、read 均为 0 的状态，但能够完成评测，疑似 iotop 无法对其进行分析。无论如何，2 并发评测并不会引起服务器崩溃。

同时，也手动模拟了提交评测 + 文件上传的并发：单独运行 `daemon.py` ，同时启动 32 并发的 11.8MB 文件上传，并未引发崩溃。

### Concluison

测试了可能的并发情况，服务器响应均正常，并且在实际情况下，性能理应有很大的冗余。

## Solution

No Solution，but countermeasures。既然无法复现 crash 以验证解决方法的有效性，那么就无法得出 solution。不过，倒是可以提高错误恢复的速度：**设置告警**。