---
abbrlink: 45420b6b
categories: 操作系统
date: 2022-04-28 20:22:20
mathjax: true
tags: [操作系统, S4课上, 直观理解]
title: 操作系统-OS不相信抽象
---

这是一次对于 MOS 内存管理的钻牛角尖梳理，在梳理过程中诞生了一些奇怪的东西。

## kseg0 的第一性映射

操作系统的代码不是 C 就是汇编。所以我们从一开始就在使用虚拟空间了。但是很有意思的是，我们为什么可以？我们在一开始的时候没有内存控制块，也没有页表结构。所以我们到底是怎么完成映射的？

其实就是对于 kseg0，只要我们往里面写东西，那么内容就会直接写到高位抹零后对应的物理地址上。这种映射是**第一性**的，也就是说，即使我一直不建立内存控制块，一直不建立页表结构，只要我用链接器把代码放到了 kseg0，那么这种关系依然是成立的。我写的每一段代码，操作的每一个数据，都是直接写到物理内存中的，不走 MMU，不查页表。这是一切的本源。

关于 kseg1 的情况，其实应该是书里写错了，采用的映射关系其实不是抹掉高 3 位以后映射到物理地址，而是映射到了设备总线。只有这样，才可以避免 kseg0 和 kseg1 的不同的虚拟页面映射到同一个物理页框。不同的虚拟页面确实可以映射到同一个物理页框，但是这意味着这两个虚拟页面的内容应该是相同的，但是显然这两个段内容显然不是相同的，所以两个段必然不能遵守书中的规则。

再次强调，这种直接映射是一切逻辑的起点，这个东西不会受任何其他规则的制约。比如说即使把 `0x80400000` 对应的物理页面分配给了某个用户进程（虽然不可能，我们初始化的时候就没有把这个内存控制块插入空闲链表），但是我只要一在操作系统中写代码，那么照样可以把这个物理页面弄脏。也就是说，在操作系统的代码中（用户程序代码下面讲），只有一个可以往物理地址写东西的方法，就是直接写在 kseg0 的虚拟地址空间。我们不会有 tlb 缺失，不会有缺页，不会有任何阻止我们写物理内存的方法，操作系统的所有内存管理东西，都是在管理其他进程读写物理内存的行为和权限，他自己没有任何戒律。

换一个角度阐述，因为我们写的是操作系统程序，我们写的所有东西都在直接的修改物理内存。这种简单的映射还提供了一种方法，就是我们可以按照我们自己的意愿修改任意的物理内存，因为而 kseg1 段比物理内存大，所以我们只需要修改虚拟地址空间，就可以完成所有物理内存的修改，没有任何东西可以阻止我的修改。

那么我们到底在干什么？我们内存管理的种种行为到底为何而存在？

## 避免操作系统伤到别人

```c
static void *alloc(u_int n, u_int align, int clear)
{
	extern char end[];
	u_long alloced_mem;

	/* Initialize `freemem` if this is the first time. The first virtual address that the
	 * linker did *not* assign to any kernel code or global variables. */
	if (freemem == 0) 
    {
		freemem = (u_long)end;
	}

	// Step 1: Round up `freemem` up to be aligned properly 
	freemem = ROUND(freemem, align);

	// Step 2: Save current value of `freemem` as allocated chunk. 
	alloced_mem = freemem;

	// Step 3: Increase `freemem` to record allocation. 
	freemem = freemem + n;

	// Check if we're out of memory. If we are, PANIC !! 
	if (PADDR(freemem) >= maxpa) 
    {
		panic("out of memory\n");
		return (void *)-E_NO_MEM;
	}

	// Step 4: Clear allocated chunk if parameter `clear` is set. 
	if (clear) 
    {
		bzero((void *)alloced_mem, n);
	}

	// Step 5: return allocated chunk. 
	return (void *)alloced_mem;
}
```

当有了上述概念以后，就可以看这个 `alloc` 了，就会发现这个东西没有起到分配空间的作用。因为 kseg0 向物理内存中写东西还要分配吗？不需要，我想写就写，不需要经过任何人的同意（这里可以换一个角度想，如果我写物理内存需要经过某些条件的约束，那么这些条件必然也需要被写进物理内存中才能发挥约束作用，那么这些条件是怎么写进物理内存的呢？要不要经过条件约束呢？）。那么这个函数是在干嘛，我们移动的 `freemem` 到底有啥作用。

其实我们移动 `freemem` 的意义就是记录一下我们写了多少，**他是写的结果，而不是写的许可**。我们之所以要记录这个结果，是因为要用这个结果去避免其他进程受到我的伤害。操作系统“有意”写过的地方，其他进程都是不能写的。这种“不能写”是强硬的，只要我写了到物理内存中，不存在被换出的可能，这块地方彻底成了禁区。



## 操作系统本身不需要页表

操作系统需要页表吗？不需要啊，页表是记录虚拟地址到物理地址的映射关系的，不仅如此，页表还意味着映射地址必须经过页表的流程（tlb 之类的）。这显然不合理，因为页表必须先于映射，但是页表必须被写到物理内存中，所以又成了死结。

而且确实是这样的，我们先是在 kseg0 里面堆了一堆我们操作系统的代码，然后又往里面写了一大堆 `Pages` ，`Envs` 之类的结构体数组，这应该占了很多页了吧，那么我们把这些页的物理地址记录在了页表上了吗？我们用过 `page_insert` 吗？没有，一次都没有。操作系统写物理内存，一次都没登记。

那么为什么还有一个 `boot_pgdir` 。我们看一下这个东西被修改了什么？

```c
void boot_map_segment(Pde *pgdir, u_long va, u_long size, u_long pa, int perm)
{
	int i, va_temp;
	Pte *pgtable_entry;

	// Step 1: Check if `size` is a multiple of BY2PG. 
    size = ROUND(size, BY2PG);

    // Step 2: Map virtual address space to physical address. 
	// Hint: Use `boot_pgdir_walk` to get the page table entry of virtual address `va`.
    for (i = 0; i < size; i += BY2PG)
    {
        pgtable_entry = boot_pgdir_walk(pgdir, va + i, 1);
        *pgtable_entry = PTE_ADDR(pa + i) | (perm | PTE_V);
    }
}

void mips_vm_init()
{
	boot_map_segment(pgdir, UPAGES, n, PADDR(pages), PTE_R);
	boot_map_segment(pgdir, UENVS, n, PADDR(envs), PTE_R);
	printf("pmap.c:\t mips vm init success\n");
}
```

其实只有这两句话修改了 `boot_pgdir` 那么这是什么意思？意思是将将低 2G 中单独开辟一些空间映射到某个物理空间。这个物理空间是什么？是之前我们写结构体数组的空间。现在只是让这些物理页框在低 2G 也可以被看见了。换句话说，这里是两个映射，一个是我们写 Pages 数组的映射，这个是第一性的映射，我们啥都不需要干，而 `boot_map_segment` 是第二个映射，我们用 `boot_pgdir` 记录这种映射关系，是一种附庸，它不是通过用户进程向虚拟空间里写东西，经过地址转换后写到物理地址空间去的。而是把映射关系调整成一个写好的页面。

也就是说，`boot_pgdir` 不是给操作系统自己用的，而是为了让用户用的，我们可以在复制页表的时候看到

```c
for (i = 0; i < PDX(UTOP); ++i)
{
    pgdir[i] = 0;
}

for (i = PDX(UTOP); i < 1024; ++i)
{
    if (i != PDX(UVPT))
    {
        pgdir[i] = boot_pgdir[i];
    }
}
```

严格的讲，都不用复制到 1024，因为 `boot_pgdir` 有用的就两项，所以这样也可以。

```c
for (i = PDX(UTOP); i < PDX(UVPT); ++i)
{
    pgdir[i] = boot_pgdir[i];
}
```



## TLB 模糊了页表的使用

我们这里讨论用户进程。想一想我们我们在理论课上学的东西，每个用户进程都需要使用页表完成地址映射，使用的方法是查询页表，找到对应的页表项，页表项上记录着对应页面的物理地址，拿到这个物理地址以后再去访问物理地址。

那么这个过程是用户进程负责的吗？不是，因为要不然我们就没必要提出虚拟地址空间这个抽象了，我们提出这个抽象的目的就是为了不让用户进程感知到物理内存的细节。那么是操作系统在负责吗？似乎也不太是（这里是为了行文的流畅，其实有一部分是的），因为到 lab3 我们已经涉及简单的用户进程了，但是我们在操作系统的代码里并没有看到对这些用户进程的某种保护，比如说当用户进程运行的时候，把它的虚拟地址收集起来，然后作为参数传递给像 `page_lookup, pgdir_walk` 之类的函数，然后得到结果以后还得把转换好的物理地址传递回去（或者把访存结果传回去），怎么看都没有代码去实现这些东西。

那么会不会是硬件，似乎也不是（依然是为了行文流畅），因为我们用的是二级页表啊，这是硬件能管理的吗？我们有多个页目录，硬件不仅得负责管理这么多页目录，而且每个页目录，还得进行一个二级检索，二级检索还是一种递进式的，这对于硬件来说太复杂了。

那么到底是什么样子的？应该这么说**硬件支持了TLB的正常功能，而操作系统支持了TLB的缺失异常**。在解释这句话前，首先先说一下为啥话题跳到 TLB 了？可以这么理解，其实 CPU 是没办法直接访问物理内存的，他必须经过 TLB。所有的物理页号，其实不来自物理内存中的页表，而是来自 TLB。有了这个概念，其实就可以发现设计的巧妙之处了。

就是硬件负责 TLB 的正常功能，也就是说，当用户进程给出一个虚拟地址的时候，硬件会拿着这个地址去查找 TLB，如果有的话，那么就找到物理页面了，拿着物理页号去访存就行了。如果没有的话，那么就引发一个缺页异常（对的，缺页异常不是说虚拟页面不在物理内存中，而是虚拟页面不在 TLB 中），把活就丢给操作系统了。

这个过程最有意思的就是，其实硬件是没有意识到有页表这个结构的，他干的事情就是查 TLB，核对，有用就使，没有就异常。他对于页表是一级还是两级，页表是这个还是那个，有没有自映射，其实一点想法都没有。

那么当引发异常以后，我们的操作系统干了什么？可以很容易看到哈，找到异常向量组，发现处理这类异常的函数是 `handle_tlb()`，然后再把通用的部分忽略，发现实现功能的是 `do_refill` 这个函数，我们看一下

```assembly
.extern tlbra
.set	noreorder
NESTED(do_refill,0 , sp)
			.extern	mCONTEXT
//this "1" is important
1:			
			lw		k1,			mCONTEXT
			and		k1,			0xfffff000
			mfc0	k0,			CP0_BADVADDR
			srl		k0,			20
			and		k0,			0xfffffffc
			addu	k0,			k1
			lw		k1,			0(k0)
			nop
			
			move	t0,			k1
			and		t0,			0x0200
			beqz	t0,			NOPAGE
			nop
			
			and		k1,			0xfffff000
			mfc0	k0,			CP0_BADVADDR
			srl		k0,			10
			and		k0,			0xfffffffc
			and		k0,			0x00000fff
			addu	k0,			k1
			or		k0,			0x80000000
			lw		k1,			0(k0)
			nop
			
			move	t0,			k1
			and		t0,			0x0200
			beqz	t0,			NOPAGE
			nop
			
			move	k0,			k1
			and		k0,			0x1
			beqz	k0,			NoCOW
			nop
			and		k1,			0xfffffbff
NoCOW:
			mtc0	k1,         CP0_ENTRYLO0
			nop
			tlbwr

			j		2f
			nop
NOPAGE:
			mfc0    a0,         CP0_BADVADDR
			lw		a1,         mCONTEXT
			nop
				
			sw	 	ra,         tlbra
			jal		pageout
			nop
			
			lw		ra,         tlbra
			nop

			j	    1b
2:			nop

			jr		ra
			nop
END(do_refill)
```

首先我们需要找到引发异常的地址的页目录项，这个地址被存在了 `CP0_BADVADDR`。此时的页目录为 `mCONTEXT`。

```assembly
lw		k1,			mCONTEXT			# k1 存着当前用户进程页目录的地址
and		k1,			0xfffff000			# k1 的后12位偏移量被抹去，其实应该本来就没有
mfc0	k0,			CP0_BADVADDR		# k0 存着引发异常的虚拟地址
srl		k0,			20					# 取出 k0 的一级页目录号并 * 4,这是因为一个页目录是 4 字节
and		k0,			0xfffffffc			# 抹去 k0 后 2 位，对齐
addu	k0,			k1					# 页目录基地址加偏移量
lw		k1,			0(k0)				# k1 现在存着对应的页目录项
nop
```

当我们拿到这个页目录项以后，要看这个页目录项是否有效

```assembly
move	t0,			k1					# t0 存着页目录项
and		t0,			0x0200				# 0x200 是 PTE_V，所以进行与运算，如果该位有效，则 t0 非 0
beqz	t0,			NOPAGE				# 如果是 0 ，无效，那么跳转到 NOPAGE
nop
```

我们来看 NOPAGE 的操作

```assembly
NOPAGE:
mfc0    a0,         CP0_BADVADDR		# 把 a0 存成出现异常的虚拟地址
lw		a1,         mCONTEXT			# 把 a1 存成当前页目录地址
nop
sw	 	ra,         tlbra				# 把当前的栈指针保存一下，
										# 这么做是因为又要调用新的函数了，ra 马上被覆盖了。tlbra是块内存指定空间
jal		pageout							# 调用 pageout 这个C函数
nop
```

我们来看一下 pageout

```c
void pageout(int va, int context)
{
	...
	if ((r = page_alloc(&p)) < 0) 
	{
		panic ("page alloc error!");
	}

	p->pp_ref++;

	page_insert((Pde *)context, p, VA2PFN(va), PTE_R);
	printf("pageout:\t@@@___0x%x___@@@  ins a page \n", va);
}
```

可以看出这个函数就是就是分配一个空闲物理页面，然后把对应关系建立起来。这里才是用到页表结构的地方。也就是说，这个函数是体现我们用页表管理映射关系的地方。但是这里还没完，因为这个其实对应的是虚拟页面没有在物理内存中被映射的情况。解决了这个问题，还有把映射好的物理页号填到 TLB 中的工作。

出来这个函数以后，就是一些收尾工作

```assembly
			lw		ra,         tlbra 			# 把栈指针恢复了
			nop		
			j	    1b							# 跳回一开始重新来一遍
2:			nop
			jr		ra							# do_refill 执行完成
			nop
```

那么如果页目录项有效呢？我们会继续执行，检索第二级页表

```assembly
and		k1,			0xfffff000				# k1 原来是页目录项，抹掉后 12 位权限位
mfc0	k0,			CP0_BADVADDR			# k0 存着异常的地址
srl		k0,			10						# 取出 k0 的二级页表号并 * 4,这是因为一个页目录是 4 字节
and		k0,			0xfffffffc				# 抹去 k0 后 2 位，对齐
and		k0,			0x00000fff				# 前面的一级页目录号去掉
addu	k0,			k1						# 基地址加偏移量
or		k0,			0x80000000				# 物理地址转换成虚拟地址
lw		k1,			0(k0)					# 把对应的页表项存到 k1
nop
```

然后接着对页表项进行权限检查

```assembly
move	t0,			k1
and		t0,			0x0200
beqz	t0,			NOPAGE
nop
```

然后下面开展重填操作（如果都处理好了）

```assembly
    move	k0,			k1					# k0 k1 存着万事具备的页表项
    and		k0,			0x1					# 看 k0 的最低位，是 PTE_COW copy on write 不是啥重要东西
    beqz	k0,			NoCOW				# 如果没有，就不需要特殊处理了
    nop
    and		k1,			0xfffffbff			# 有的话，把 PTE_R 位置 0 ，相当于限制写权限
NoCOW:
    mtc0	k1,         CP0_ENTRYLO0		# 把 k1 装到 EntryLow 中
    nop
    tlbwr									# 随便找个 tlb 项用 EntryLow 覆盖掉
    j		2f
```

综上，能看见页表的是操作系统，而不是硬件。操作系统在 TLB 缺失异常的时候，给 TLB 提供的内容都是经过页表系统管理的，所以 TLB 的所有内容都是经过页表系统管理的，不得不说真是巧妙啊。



## 操作系统无法使用页表

这也是一个很有意思的事情，就是操作系统虽然负责所有进程页表的维护，但是它自己是没有办法使用页表的。这跟前面一条形成了补充关系，也就是，操作系统完成地址映射不需要页表，同时也没法使用页表。

我们想想用户进程使用的那个流程，是因为访问了 TLB，才有了使用页表的机会。操作系统又不访问 TLB，所以当然没有使用页表的机会了。这就导致，很多显然的事情，操作系统做起来会比较困难，这是因为操作系统只有在 kseg0 有很大权力，而他在其他地方，没有直接映射的权力，同时也没有借助页表的权力。比如一个例子

```c
static int load_icode_mapper(u_long va, u_int32_t sgsize,
                             u_char *bin, u_int32_t bin_size, void *user_data)
{
    ...
    page_alloc(&p)
   	bcopy(bin + i, page2kva(p), MIN(bin_size - i, BY2PG));
    ...
}
```

我第一次看这个函数的参数的时候觉得很吃饱了撑的，因为拷贝数据啊，为啥要把虚拟地址写成 `page2kva(p)` ，这个东西啥都不叫啊，我随便分配了一个物理页面，然后把他逆映射到内核虚拟空间，我又不是往内核拷贝用户代码，我为啥这么写？而且在给了虚拟地址的情况下，写成这样不好嘛。

```c
bcopy(bin + i, va, MIN(bin_size - i, BY2PG));
```

是不行的，这是因为 `va` 是一个低 2G 的地址，所以我们没有办法拷贝他，就是拷贝了，也不能写到物理内存上去（或者抹零以后覆盖掉其他的东西？），所以是不行的。

我们在回看这个奇怪的函数参数

```c
bcopy(bin + i, page2kva(p), MIN(bin_size - i, BY2PG));
```

确实我们没有在 kseg0 里面拷贝这些代码，但是确实我们借助了 kseg0 的第一性映射，把代码写到了物理内存正确的位置，这就好了，其他的东西，其实是没有必要关心的（可以细琢摸，很妙）。



## 操作系统不相信抽象

说了这么多，做一个总结。其实就一个意思，就是**对于操作系统来说，其实是没有虚拟空间概念的**。这就是一个很简单的道理，虚拟空间是一种抽象，一种假的东西。这就好比一个魔术师，他可以让所有人相信这是魔法，但是他不能让自己相信这是魔法，不然这就成为了真正的魔法。

如果进一步讲，不只是虚拟空间这一个抽象，进程、文件系统，**所有操作系统构筑的抽象对于操作系统来说都是没有意义的**。

