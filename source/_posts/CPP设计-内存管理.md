---
abbrlink: 374bc41e
categories: CPP设计
date: 2023-12-08 19:53:40
mathjax: true
tags: [CPP设计, S7课上, 知识总结]
title: CPP 设计-内存管理
---

## 一、总论
内存管理的本质是资源管理，也就是很多程序最为重要的功能。

但是不同于 Python 或者 Java 这样有着很好内存抽象和比较大条的内存管理方式（动不动就在堆上分配空间），C++ 在更加“荒蛮”的内存上进行更加精细化的甚至还很有 C 特色的内存管理（并非 C++ 希望如此，只不过脱胎于 C 必然受到 C 的影响），是一件非常难的事情。

所以 C++ 内存管理看上去总是呈现一种“似乎解决了一个根本不会在 Java 中发生的问题”的模式。

## 二、RAII
RAII 是 Resource Acquisition Is Initialization 的缩写，意为“资源获取即初始化”。它并不是一种特殊的 C++ 语法设计，只是一种**设计理念**或者**编程范式**，充分利用了 C++ 在内存管理上的特性，也就是在栈上的局部变量总是随着栈的消失而自动析构的特性。

我们在内存管理上面临的主要问题就是“内存泄漏”，而就是如果一个内存资源不再会被关注了，那么它就应该被释放。这个问题在 C++ 中很难实现，是因为 C++ 没有一个很好的“守护者”来做这件事情。RAII 主张用栈来做这个“守护者”角色。

具体来说，就是将资源封装到类的内部，在构造类的时候申请资源，在析构类的时候释放资源。在栈上声明实例化类，这样当栈消亡的时候，析构函数会自动触发，进而释放资源。也就是说，不要在过程中申请和释放资源，而是一定要将资源封装成类。**用局部对象来表示资源，把管理资源的任务转化为管理局部对象的任务**，这就是 RAII 的真谛。

同时，资源类一般是要禁止拷贝的，这是因为拷贝可能是“浅拷贝”，这种浅拷贝会导致存在两个指针指向实际的资源，而这两个指针都会在栈消亡的时候调用析构函数，而资源只有一份，析构函数会调用两次，就会导致 bug 。所以往往我们还需要将拷贝函数私有化，总结成代码就是：

``` cpp
class Resource
{
public:
    Resource() { arr = new int[5]; }
    ~Resource() { delete [] arr; }
private:
    Resource(Resource const&);
    Resource& operator= (Resource const&);
    int *arr;
}
```

## 三、智能指针
### 3.1 shared_ptr
指针作为内存管理的 handler ，如果它能够智能一些，我们对于内存或者说资源管理就会轻松很多。

`shared_ptr` 就是这样的一种东西，因为我们衡量一片内存有没有用的标准就是“它还会不会被用”，而退一步，就是“有没有指针还指向它”，如果没有指针指向它了，那么它就一定不会被使用了，那么就是可以被释放的了。

在使用上，`shared_ptr` 并不和普通指针兼容，这是因为 `shared_ptr` 本质上是对于普通指针和计数器的封装，所以即使两者用某种手段进行类型转换的话，即使成功，也会因为不修改计数器而导致智能管理失效。换句话说，智能指针不是一个功能增强，而是一个功能体系，这个体系和普通指针体系是**互斥**的。

声明一个智能指针：

``` cpp
int *pr = new Resource();
std::shared_ptr<Resource> *spr = make_shared<Resource>();
```

可以看到智能指针抛弃了 `new` ，这是因为 `new` 的结果是一个普通指针，所以智能指针使用 `make_shared<typename>(Initialize_args)` 进行代替。

在使用上，智能指针重载了 `*` 和 `->` ，所以用法上和普通指针保持一致。也可以用 `if(p)` 判断是否为空指针。

### 3.2 weak_ptr
但是仔细思考就会得知，并非一片内存有指针指向，那么就可以说明它还会被使用，两个没有外界引用的资源可以分别指向对方，这样两个实体都不会被释放。C++ 提出了一种新的指针 `weak_ptr` 来解决这个问题。

`weak_ptr` 是与 `shared_ptr` 搭配出现的，它更像是一种“指向” `shared_ptr` 的指针而并非一种指向资源的指针，它的存在不会让资源的计数器增加。

在初始化方面， `weak_ptr` 接受一个 `shared_ptr` 作为构造参数：

``` cpp
std::weak_ptr<Class> wp = sp;
```

在使用上，`weak_ptr` 并没有重载 `*` 和 `->` ，所以它基本上没有指针的行为，它可以 `lock()` 方法先获得它“指向”的 `shared_ptr` 再进行处理，如下所示：

``` cpp
auto sp = wp.lock();
if (sp) {
    sp->DoSomething();
}
```

所以对于此节最开始形容的困境，我们可以用如下代码来解决：

``` cpp
class ClassB;

class ClassA
{
public:
    ClassA() { cout << "ClassA Constructor..." << endl; }
    ~ClassA() { cout << "ClassA Destructor..." << endl; }
    weak_ptr<ClassB> pb;  // 在 A 中弱引用 B ，原先为 shared_ptr<ClassB> pb
};

class ClassB
{
public:
    ClassB() { cout << "ClassB Constructor..." << endl; }
    ~ClassB() { cout << "ClassB Destructor..." << endl; }
    weak_ptr<ClassA> pa;  // 在 B 中弱引用 A ，原先为 shared_ptr<ClassA> pa
};

int main() {
    shared_ptr<ClassA> spa = make_shared<ClassA>();
    shared_ptr<ClassB> spb = make_shared<ClassB>();
    spa->pb = spb;
    spb->pa = spa;
}
```

在执行完 `main` 后，`classA, classB` 的引用数都是 0 ，自然可以安全释放。

那么具体该何时使用 `weak_ptr` 而何时使用 `shared_ptr` ： **一切应该不具有对象所有权，又想安全访问对象的情况，都是应该使用 `weak_ptr` 的** 。

举个例子：一个公司类可以拥有员工，那么这些员工就使用 `shared_ptr` 维护。另外有时候我们希望员工也能找到他的公司，所以也是用 `shared_ptr` 维护，这个时候问题就出来了。但是实际情况是，员工并不拥有公司，所以应该用 `weak_ptr` 来维护对公司的指针。

### 3.3 unique_ptr
当然，除了共享资源的释放问题外，如何确保资源是独占性（如果需要的话），也是一个问题（就好像我们在 RAII 这一章提出的私有化拷贝函数一样），我们发明了 `unique_ptr` 来满足这件事情。

在初始化方面，如下所示：

``` cpp
std::unique_ptr<int> up = std::make_unique<int>(10);
```

一旦我们初始化完成，那么就会避免其拷贝：

``` cpp
std::unique_ptr<int> up2 = up; // 非法
```

我们可以用 `std::move` 完成所有权的转移：

``` cpp
std::unique_ptr<Foo> p2(std::move(p1));
```

## 四、用引用减少不必要拷贝
### 4.1 都怪引用
对于一个庞大的资源，我们要避免它无意义的拷贝，但是在函数传参的时候，资源作为参数常常会造成拷贝，如下所示：

``` cpp
void foo(Resource r);
```

此时只要调用 `foo(r)` 就会导致 `r` 的拷贝。

在 C 和 C++ 中，可以用指针解决这个问题：

``` cpp
void foo(Resource *pr);
```

可以说，只要用指针解决这个问题（再搭配上智能指针，连内存管理都不会出问题），后面这一整节都是不需要阅读的（这也让我想不明白为啥非得用引用这个东西）。

但是人们可能就是喜欢用**引用**解决这个问题吧，所以还诞生了一个引用版的解决办法：

``` cpp
void foo(Resource &rr);
```

但是这种方法就会出现一个反人类的 bug ，就是如下调用是会报错的：

``` cpp
foo(Resource());
```

这里报错是因为我们并不允许这样的代码出现

``` cpp
Resource &rr = Resource();
```

因为引用的对象必须是一个**左值** ，也就是一个有地址的值，在上例中，`Resource()` 并没有地址，是一个右值，所以会报错。至于为什么必要要求引用的对象是一个**左值** ，这可能与引用的设计目标有关，引用常被用在参数修饰中，是为了给用户一种“原变量名”的使用体验，不像指针那样摆明了就是不一样。

如果一个引用的对象是一个右值，那么我们很容易写出这样的代码：

``` cpp
int &ri = 3;
ri = 4; // error! 3 = 4
```

但是如果引用不能兼容 `foo(Resource())` 这种表达，那么我们很容易就意识到，这个 `foo()` 没有那么好用，很莫名其妙，引用模拟原变量的目的就不能实现了（相比之下指针就没有这个目的）。

所以原来的 C++ 就又利用了“常量引用”来解决这个问题，因为常量引用要求只读，所以即使对象是一个右值，那么也不会导致什么坏现象，所以编译器就允许这种特例的存在：

``` cpp
const int &cri = 3; // ok
```

利用这个性质，我们就完成了引用版本的 `foo()` 函数，它需要写两个函数

``` cpp
void foo(Resource &rr);
void foo(const Resource &crr);
```

这样 `Resource &rr = Resource();` 就会调用第 2 个函数。唯一的缺点就是第 2 个函数里不能有对于引用的修改，功能会受到一定的限制。

### 4.2 引用的必要性
虽然在前面 3 种方法对比中，我指出引用法简直就是指针法的丐版，但是这种说法是有失偏颇的。当我们使用指针的时候，我们有一种倾向让其指向一个堆中的资源，如果指针指向一个栈中的资源的话，随着栈的消解，指针就变成空指针了，这当然是我们不想看到的，所以我们总是喜欢用堆的。而不加节制地使用堆的资源，就会造成性能的损失，没准还有内存的泄漏。

而引用因为和普通变量很像，所以它本身就代表着一种像管理普通变量一样管理资源的思路，通过拷贝或者移动来减少堆上空间的分配，并不是一无是处的。

### 4.3 右值引用
为了让上面的引用功能更加强大一些，我们提出了右值引用的概念，它可以代替原先的常量左值引用

``` cpp
const int &clri = 3; // ok
int &&rri = 3; // ok
```

在本质上，右值引用更像是一个语法糖，它为原来不能寻址的右值提供了一个地址，然后让右值引用指向它，所以右值引用是可以被修改的。

``` cpp
int tmp = 3;
int &&rri = std::move(tmp);
rri++;
```

这样我们就可以定义两个新的函数来解决之前提出的问题了，相比于常量左值引用的解决思路，它使得函数可以摆脱“常量只读”的困扰，提高表达能力，如下所示：

``` cpp
void foo(Resource &lrr);
void foo(Resource &&rrr);
```

这样 `Resource &rr = Resource();` 就会调用第 2 个函数。

### 4.4 右值移动——将亡未亡
我相信一开始人们使用这个新的特性的时候，就是把 `void foo(Resource &lrr)` 的函数实现一模一样拷贝到 `void foo(Resource &&rrr)` 种，有了新的语法糖，使得原本指针法一个函数就可以实现的事情，非得用两个一模一样的引用法函数实现，也不是太亏。

但是人们估计立刻就会发现很奇妙的地方，那就是 `void foo(Resource &&rrr)` 的实参非常有特点，是 `Resource()` ，这意味着，`Resource()` 这个代码，除了完成 `rrr = Resource()` 这个功能外，啥都没干，就没了（也叫亡了）。而我们在执行 `foo(Resource())` 这个代码的时候，在函数外调用了一次 `Resource()` ，如果恰巧，我们希望在实现中拿到一个 `Resource` 的副本，就必须再次调用一下构造器，也就是需要调用 2 次。这种需求是非常常见的，比如说 `vector.push_back(3)` 我们模拟一下这个过程：

``` cpp
#include <iostream>

class Resource {
public:
    Resource() {
        std::cout << "Constructing..." << std::endl;
    }
    Resource(const Resource& r) {
        std::cout << "Copy Constructing..." << std::endl;
    }
};


void addResource(Resource &&rrr) {
    Resource r = rrr;
}

int main(int argc, char *argv[])
{
    addResource(Resource());
}
```

这段代码会输出：

``` shell
Constructing...
Copy Constructing...
```

可如果仔细思考这件事，就会发现这么做完全没有必要，右值最大的特点就是它的生命只有写出表达式一瞬间，所以对于右值而言，我们没必要拷贝啊，我们如果可以直接用就好了，也就是将这个右值的生命周期延长就好了，这样就可以毫无负担的继承它的资源了。与之相对的，如果希望获得一个左值的资源，那通常就得拷贝了，因为左值意味着这个资源的生命周期本身就很长，要想拿到副本，就得复制一份资源。

换句话说，正是在右值这种**亡**的性质下，具有右值引用参数的函数相比于具有左值引用的函数，性能更加好，因为它可以使用“移动”策略而非“拷贝”策略。举例如下：

``` cpp
class Array {
public:
    Array(int size) : size_(size) {
        data_ = new int[size_];
    }

    // 复制构造函数，深拷贝构造
    Array(const Array& temp_array) {
        data_ = new int[temp_array.size_];
        size_ = temp_array.size_;
        for (int i = 0; i < size_; i++) {
            data_[i] = temp_array.data_[i];
        }
        std::cout << "time wasting!\n";
    }

    // 移动构造函数，浅拷贝构造
    Array(Array&& temp_array) {
        data_ = temp_array.data_;
        size_ = temp_array.size_;
        // 为防止 temp_array 析构时 delete data，提前置空其 data_
        temp_array.data_ = nullptr;
        std::cout << "time saved!\n";
    }


    ~Array() {
        delete [] data_;
    }

public:
    int *data_;
    int size_;
};
```

### 4.5 求死
当**右值引用参数函数**发生开始利用右值性质进行转移以后，我们发现其实我们可以**利用“利用了右值引用性质的函数”**，也就是说，即使有些资源是左值，但是我们为了节约性能，希望它们进行资源转移而非拷贝，但是左值的生命周期并不是一瞬间，所以我们需要将其主动转换为右值，可以用如下函数来实现：

``` cpp
rval = std::move(lval) // std::move { static_cast<T&&>(lvalue) }
```

这是一种主动结束生命周期的声明，但是注意 2 点：

* 单纯的 `move` 不会造成所有权的转移
* 单纯的 `move` 不会造成生命周期缩短

这两个效果都是通过右值引用参数函数来实现的，如下所示：

``` cpp
Array(Array&& temp_array) {
    data_ = temp_array.data_; // 所有权转移
    size_ = temp_array.size_;
    temp_array.data_ = nullptr; // 生命周期缩短
}
```

但是因为往往**右值引用参数函数**都会有这些实现，所以 `std::move` 也都会有很好的效果。当我们希望通过献祭所有权的方式来获得高性能的时候，我们就可以主动为左值套上 `std::move` 来达到目的，比如说这样：

``` cpp
int main(int argc, char *argv[])
{
    Array a = Array(10);
    Array b = a; // 不献祭 time wasting!
    Array c = std::move(a); // 献祭 time saved!
}
```

另一个很好玩的应用就是关于 `emplace_back` 的实现，下边两种方法是等价的：

``` cpp
std::string str1 = "aacasxs";
std::vector<std::string> vec;
vec.push_back(std::move(str1));
vec.emplace_back("axcsddcas");
```

### 4.6 求死不能
当然有的时候也不是那么方便求死的，比如说如下所示：

``` cpp
#include <iostream>

void reference(int& v) {
    std::cout << "called left value" << std::endl;
}

void reference(int&& v) {
    std::cout << "called right value" << std::endl;
}

void pass(int&& v) {
    reference(v); // 始终调用 reference(int&)
}

int main()
{
    pass(1);
    return 0;
}
```

嵌套函数非常常见，但是因为实际上 `int&&` 本身是左值，所以他会调用第 1 个 `reference()` ，这就非常恼人了。当然这个问题可以用 `std::move()` 来解决，但是总是感觉有些愚蠢。

那有没有更加优雅的方法呢，有的，叫做 `std::forward<>()` ，其原理依然是类型转换，但是涉及了元编程知识和引用塌陷规律，规则非常复杂，不过效果非常优雅，看一个乐子就好了，如下所示：

``` cpp
#include <iostream>
#include <utility>

void reference(int& v) {
    std::cout << "called left value" << std::endl;
}

void reference(int&& v) {
    std::cout << "called right value" << std::endl;
}

template <typename T>
void pass(T&& v) {
    reference(std::forward<T>(v));
}

int main() {
    std::cout << "use right value" << std::endl;
    pass(1);

    std::cout << "use left value" << std::endl;
    int v = 1;
    pass(v);

    return 0;
}
```

其输出如下：

``` shell
use right value
called right value
use left value
called left value
```

也就是说，如果实参是一个左值，那么就会调用左值引用处理函数，如果实参是一个右值，那么就会调用一个右值处理函数。实现了所谓的“完美转发”。
