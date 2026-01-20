---
layout: post
title: 办公工具-Server Cli 工具推荐
mathjax: true
categories: 办公工具
tags:
  - 办公工具
  - S11课上
  - 工具总结
abbrlink: 2eb2eeb5
date: 2026-01-20 21:38:17
---

## 一、背景

在使用服务器等非非本地电脑的情况下，我们常常面临一个非常原始的 shell。这种原始的环境，不仅会降低开发的效率，而且还会导致操作错误的概率大大增加（比如还未激活某个 python 的虚拟环境，就进行一些包的安装等，或者在错误的路径下删除文件）。

![img](./办公工具-Server-Cli-工具推荐/clear.png)

在 LLM Agent 和 VSCode 自动化的背景下，大大降低了 shell 中需要优化的 cli 工具的数量，比如说 docker，文件管理器，编译命令，下载命令，direnv，手册查询命令，git 客户端等，这些都可以很好被 Agent 或者 VSCode 代替。

在这种严苛的环境下，这对 cli 工具提供了更加严苛的要求和品味，我总结为如下几点：

- 提高 UI 中信息的密度（Agent 确实不需要，但是人眼需要）
- 解决非 project 问题（project 的问题有 VSCode 和 Agent）
- 易于部署、维护（在网络受限和权限受限的情况下快速部署）
- 要不破坏原有 shell 中的传统工具和规范（避免 make 和 agent 依赖）
- 在使用时，不引入额外的心智负担。即，尽可能无缝加强原有的体验（这点其实与上面有些 tradeoff，功能的加强，往往意味着原有工具的语义发生了变化）。

这篇文章主要有两点贡献：

- 推荐了一系列符合上述要求的 cli 工具
- 实现了一个易于部署和维护的[框架](https://github.com/Thysrael/dotfiles)

---

## 二、原有 shell 的增强

这章介绍的是，不需要新下载任何 cli 工具，就可以获得更良好的体验的方法。

### 2.1 快捷键的使用

默认的 shell 应该使用的 emacs 键位（或者说 mac 键位）：

- `Tab` 补全
- `C-f` 前进一个字符
- `C-b` 后退一个字符
- `C-a` 回到行首
- `C-e` 回到行尾
- `M-f` 前进一个单词
- `M-b` 后退一个单词

BTW，将 `casplock` 改成“单击是 `Esc`，合击是 `Ctrl`”，是一个非常非常好的习惯。

### 2.2 配置基础工具

在 agent 和 vscode 的围剿下我们还能用到的需要配置后才能更加好用的基础工具，只有 `vim`，`git` 和 `tmux` 了。

Vim 比较有趣的点，是相对行号，行高亮，指示 mode 的光标等特性。Git 主要是需要登记自己的邮箱，全局 ignore 文件等特性。TMux 主要是对于不同 session ，window 的显示等。

这些工具一般都在服务器上有，所以我们只需要写好配置文件就可以了。

### 2.3 Env 与 Alias

通过修改环境变量和设置 alias ，我们也可以提高一定的工作效率，比如说：

```Bash
# git
alias ga="git add ."
alias gc="git commit -m"
alias gp="git push"
alias gl="git log --graph --oneline --decorate "

# tmux
alias tl="tmux ls"
alias ta="tmux attach -t"
alias tk="tmux kill-session -t"
alias tn="tmux new -s"

# proxy
export HTTPS_PROXY=http://ipads:ipads123@202.120.40.82:11235
```

总之，这些配置同样需要写到一个文件里，只是不是写到某个工具的配置文件里，而是写到 shell 的配置文件里。

## 三、UI 信息密度的增加

### 3.1 Nerd Font：带 Icon 的字体

传统的 icon 是一个图片，自然是无法显示在只能显示 char 的 termianl 中（现在 kitty 等先进终端到可以）。

Nerd Font 是一类特殊的 font，他们有些 char 就是 icon，因此是可以在 termial 中显示的。利用这一点，我们就可以提高 UI 的信息密度了（icon 的表达能力是 ≥ char 的，就比如 `≥` 的表达能力是大于 `大于等于` 的）。

### 3.2 P10K：带附加信息的双行 Prompt

在 shell 的 prompt 中可以呈现许多有用的信息，比如当前的路径，所处的 host，所处的虚拟环境等。

![img](./办公工具-Server-Cli-工具推荐/20260120214219662.png)

但是最重要的一点是，shell prompt 应该是双行设置，不然很容易出现信息挤压的情况。

单行：

![img](./办公工具-Server-Cli-工具推荐/20260120214219712.png)

双行

![img](./办公工具-Server-Cli-工具推荐/20260120214219704.png)

我目前使用 p10k，缺点是只能在 zsh 中使用，优点是速度快。

也可以使用 starship。

### 3.3 Lsd：带 Icon 的 ls

Lsd 是 ls 的增强，用于给每个 item 加上图标：

![img](./办公工具-Server-Cli-工具推荐/20260120214219816.png)

### 3.4 Bat：彩色的 Cat

提供代码高亮的 cat

![img](./办公工具-Server-Cli-工具推荐/20260120214220446.png)

## 四、非 Project 功能的增强

### 4.1 Zoxide：Cd 的模糊跳转

传统的 cd 往往是需要层次跳转的，也就是先跳到一个浅层目录下，然后再跳一个短距离。这主要是两点原因：

- 人很难记住一个完整的路径（虽然可以用 tab 补全）
- 敲入一个完整路径太费事了。

Zoxide 解决了这个问题，它维护了一个历史路径库（cache），对输入的路径进行模糊匹配，找出最有可能的路径，然后跳转过去。

![img](./办公工具-Server-Cli-工具推荐/20260120214219715.png)

而路径往往具有极好的局部性，所以 zoxide 的效果非常显著。

### 4.2 FZF：Fuzzy Search Everything

在命令行敲命令的时候，经常会出现有一个部分非常复杂，非常难敲的情况。

有一些复杂命令是那种敲过一遍，但是还需要继续敲的情况，这个时候我们一般会搜索历史，但是原生的搜索功能非常弱，而 FZF 强化了这一点：

![img](./办公工具-Server-Cli-工具推荐/20260120214219789.png)

另一种是路径非常复杂，导致我们没法快速敲出来（我们设置都不能快速记住）

![img](./办公工具-Server-Cli-工具推荐/20260120214219870.png)

### 4.3 Zsh-AutoSuggestion：Zsh 命令的自动补全

这个功能非常常见了，是 zsh 的插件，用于提示可能的历史命令：

![img](./办公工具-Server-Cli-工具推荐/20260120214219860.png)

## 五、Naive Dotfiles 框架

[GitHub - Thysrael/dotfiles: Thysrael's naive dotfiles.](https://github.com/Thysrael/dotfiles)

### 5.1 Tools

综上所述，我们需要在一个新的 server 上面部署两个东西，一个是工具的**配置文件**，另一个是工具的**二进制文件**。

配置文件的难点在于要进行版本管理，因为配置文件是需要更新的。

二进制文件的难点在于下载，因为网络可能是受限的，而且多个工具的下载也很麻烦。

NaiveDotfiles 采用如下工具实现这些功能：

- `git`：用 git 管理配置文件
- `ln`：软链接将配置文件集中
- `make`：用 make 来整理部署脚本
- Github Release + Action：预先收集所有工具的二进制包，并统一打包

![img](./办公工具-Server-Cli-工具推荐/20260120214220014.png)

### 5.2 Quick Start

用如下命令 clone 仓库：

```Shell
git clone --recursive https://github.com/Thysrael/dotfiles.git
```

用如下命令下载相关的 cli 工具：

```Shell
./toolkit.sh
```

用如下命令部署：

```Shell
make server # the programs on cli server
make clean-server # remove the config
```

也可以只针对特定应用进行部署，比如说：

```Shell
make tmux # deploy tmux config files
make clean-tmux # clear tmux config files
```

### 5.3 Limitations

- Git 的信息有些是我的，需要重新配置。
- 如果原来就有配置文件了，使用这个框架后，原来的配置文件可能被删除。
