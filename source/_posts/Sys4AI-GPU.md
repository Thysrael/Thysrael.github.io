---
layout: post
title: Sys4AI-GPU
mathjax: true
categories: Sys4AI
tags:
  - Sys4AI
  - S10假期
  - 知识总结
abbrlink: 848ac0f9
date: 2025-09-13 09:38:10
---

## 一、Hardware

### 1.1 SM

采用我两年半前写下的博文开篇：“**GPU 是一个由多个 SIMD 处理器组成的 MIMD 处理器**。”

这句话的意思是说，GPU 是一个多核系统，它这里说的“核”，指的是像多核 CPU 中的 core，它对应的不是 CUDA Core，而是 SM。而 SM 本身是一个 SIMD 处理器，也就是说，SM 是一个 SIMD 处理器。CUDA Core 其实对应的是一个 ALU 。一个 SM 中有多个 CUDA Core，所以它可以用一条指令进行多个标量的计算（送入不同的 CUDA Core）。

人们常常将 CPU 比作一个无所不知的教授，GPU 比喻成成百上千个小学生。而实际上，GPU 更像是一组长着很多只不协调的手的大学生。这个比喻中，SM 对应“大学生”，而 CUDA Core 等 SM 中的计算单元对应“手”。

SM 才是指令的执行者，而不是 CUDA Core 是指令的执行者。我之所以会产生 CUDA Core 才是执行者的错觉，我猜测是因为在 SIMT 模型中，thread 对应的往往是 CUDA Core 这样的计算单元（其实也不是一一对应），而在 CPU 体系中，thread 和与之对应的 CPU Core 是指令的执行者，这就很容易让人产生，CUDA Core 才是指令的执行者的误解。

![image-20211104155056775](./Sys4AI-GPU/image-20211104155056775.png)

每个 SM 核都有自己独立的寄存器文件，L1 Cache/Shared Memory，指令调度单元等。

### 1.2 Schedule

现在 CPU 也有两种趋势，一个是尽可能的增加 CPU Core 的数目，另一个是尽可能的增加 CPU 的向量指令集的能力。这就导致在某种意义上来说，CPU 系统就变成了“一组长着很多只手的教授们”，和 GPU 就非常类似了。那么到底 GPU 有什么其他独特的能力呢？

我觉得有一个方面就是两者在面对 `ld/st` 访存指令导致的延迟的处理思路不同。CPU 通过构建多级 cache，来尽量降低访存指令的延迟（其实还有乱序发射）。而 GPU 并没有构建多级 cache（我猜测是因为多个核心的 cache 的硬件开销过大了），一旦遇到访存指令阻塞的情况，GPU 会立刻切换“另一个指令”来执行，充分利用那些闲置的计算资源（也就是 schedule）。这种设计思路，是一种不降低指令延迟的前提下，提高系统吞吐的方法。

那么 GPU 是如何找到那条在访存阻塞时，可以被调度填充的指令呢？如果是 CPU，CPU 会在当前线程中的后续指令里，找一条与当前指令不存在数据依赖的指令，这依赖于 scoreboard 结构。我不确定 GPU 中能不能也实现相似的功能，毕竟 scoreboard 比较复杂。但是无论如何，CPU 和 GPU 都要面对，找不到一条不存在数据依赖的指令的情况，CPU 一般就选择阻塞等待了，反正在有多级 cache 的情况下，等待时间也不会太久。而 GPU 则不行，在没有 cache 的情况下，一旦等待，那时间可就长了。所以 GPU 选择切换“线程”，从另一个“线程”中找一条指令来执行。显然两条来自不同线程的指令，之间一定是不存在数据依赖的。在 GPU 中，我们称“线程”为 warp 。

这就又引入了一大堆问题。首先，难道切换 warp 本身是没有开销的吗？在 CPU 中，切换线程虽然不用更改地址空间，但是寄存器、PC 这些上下文状态还是要借助内存来保存和恢复的，那这样开销就大了（即使对于 CPU 来说，开销也很大）。那而 GPU 的 warp 切换按理说开销也不会小，甚至更大。这是因为 SM 是一个 SIMD 处理器，涉及到的寄存器数目非常庞大，而且 GPU 的访存延迟更高。

但是实际上，warp 切换基本上是零开销的。这是因为 GPU 根本不借助内存去保存和恢复上下文；而是为每个 warp 准备单独的寄存器文件，无论这个 warp 是否活跃。所以切换 warp，就是单纯的改一下指针就好了。也就是说，虽然 GPU 的 cache 资源非常少，但是寄存器资源非常多。

这种设计更理论的来说，被称作硬件多线程（Hardware Multithreading），每个 warp 相当于是一个 SM 的硬件线程。其实这种设计在 CPU 中也有出现，被称为同步多线程（Simultaneous Multithreading, SMT），在 Intel 中被称为超线程（Hyper-Threading, HT），也就是在一个 CPU Core 中，有多份独立的寄存器文件和 PC，但是只有一份 ALU 等执行单元。HT 的表现就是“逻辑核心”数目大于“物理核心”数目。

最后再介绍一下 SM 中的 Warp Scheduler 和 Dispatch Unit。其中 Warp Scheduler 负责挑选出特定 warp 的特定指令，而 Dispatch Unit 负责将这条指令，发送（issue）给执行单元执行，这主要有两个部分，一个是选择合适的执行单元（比如整数计算就发给 CUDA Core，访存就发给访存单元），另一个是对 warp 进行一定的拆分，这是因为 warp 的数目一般是 32 ，而有些计算资源只有 8 个，那么就需要分 4 次发射。

### 1.3 SIMT

GPU 又在 SIMD 的基础上，实现了更为灵活的 SIMT 的抽象，这同样需要硬件的支持。SIMT 这种灵活性的意味着每个线程都可以进行 **独立访存** 和 **独立控制流** ，这两点都是 SIMD 难以进行的。

独立访存意味着每个线程都可以随机化的访问地址，而不是必须访问一组连贯的地址，牺牲的是 SIMD 整体访存的效率。在实现上，需要为每个 thread 配置一个访存单元，而如果是普通的 SIMD，其实一个 warp 配置一个访存单元就够了。

独立控制流意味着不同 thread 可以执行不同的代码，牺牲的是执行效率。在实现上，采用的是指令掩码（Mask）。

这里我们最后讨论一下 SIMT 的范围。其实很容易就会发现，warp 就是 SIMT 的范围。因为 warp 里有 32 个 thread，也就是 warp 内的每个指令，都会同时对应 32 个线程进行处理。

而如果到了软件范畴，其实 SIMT 的范围扩大了，我们使用 `(ctaid, tid)` 来完成对于 thread 的索引，当 CTA（Cooperative Thread Array）数目和 CTA 内 thread 数目增多时，SIMT 的范围就会扩大。而在底层硬件上，这些扩大的范围，最终还是会被分割成多个 warp SIMT 去执行。

### 1.4 Memory Hierarchy

GPU 的 Memory Hiearchy 如下所示：

![image-20250913163324918](./Sys4AI-GPU/image-20250913163324918.png)

GPU 的 L1 Cache 在 SM 内，L2 Cache 在 GPU 片上，由所有 SM 所共享，而显存则在 GPU 片下（围绕 GPU 芯片的一堆小正方形芯片）。

从图上数据可以看出，GPU 的 Reg File 的大小是大于 L1 Cache 的。GPU 的各级 Cache 都远小于 CPU 的各级 Cache。这些现象都反应了我们前面提到的不同的设计思想。

显存在实现上是 HBM（High Bandwidth Memory）。它的带宽大约是 1,000x GB/s 量级的，这比 CPU 使用的 DDR 带宽（一般是 100x GB/s）高一个量级，是无愧 HBM 这个名字的。但是考虑到 GPU 的计算能力是 10,000x GB/s 量级的，又比 HBM 的带宽高一个量级，因此 GPU 在 LLM 任务中，往往是内存瓶颈的。另外强调，这里的的带宽，指的是将数据从显存，搬运到 GPU 上的带宽。

### 1.5 Interconnect

一个完整的 GPU 计算节点的互联图如下所示：

![nvidia-pascal-nvlink-power8](./Sys4AI-GPU/nvidia-pascal-nvlink-power8.jpg)

可以看到，如果想要搬运数据从 CPU Memory 搬运到 GPU Memory，需要走较为缓慢的 PCIe 通路（10x GB/s），而 GPU Memory 之间的数据搬运，则可以走 NVLink（100x GB/s）。

现在的 LLM 都非常庞大，而 GPU 显存只有 10x GB 大小，所以很有可能出现显存容纳不下数据的情况。而如果我们将其 offload 到 CPU Memory 上，我们就需要忍受 PCIe 的低带宽，这甚至比 HBM 的低带宽更难以接受。

如果是分布式场景，我们一般会把参数都加载到显存后再开始任务，而不同 GPU 中的数据交换，通过 NVLink 交换，而不是用 CPU Memory 做中转（走 PCIe 太慢了）；而如果是边缘设备，我们就要想办法解决 PCIe 的瓶颈了，比如说稀疏注意力机制。

### 1.6 Terminology

| 实体               | NVIDIA                                     | AMD                                 |
| ------------------ | ------------------------------------------ | ----------------------------------- |
| SIMD Processor     | SM (Streaming Processor)                   | CU (Compute Unit)                   |
| Group of Threads   | Warp                                       | Wavefront (Wave)                    |
| ALU                | CUDA Core                                  | SP (Stream Processor)               |
| On-chip Scratchpad | Shared Memory                              | LDS (Local Data Share)              |
| CTA                | Block Group                                | Work Group                          |
| Ecosystem          | CUDA (Compute Unified Device Architecture) | ROCm (Radeon Open Compute platform) |

这里整理一下 NVIDIA 和 AMD GPU 的不同术语对比。

---



## 二、CUDA

### 2.1 CTA

理解 CTA 的关键，在于理解软件编程模型与硬件之间的对应关系。
