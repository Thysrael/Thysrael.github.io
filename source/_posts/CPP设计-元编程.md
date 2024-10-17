---
abbrlink: ad223710
categories: CPP设计
date: 2022-05-09 21:40:13
mathjax: true
tags: [CPP设计, S4课上, 知识总结]
title: CPP设计-元编程
---

## 总论
当我们去说元编程的时候，我觉得我们其实有很多方面，大致有如下几个：

* 可以自动生成代码
* 可以执行字符串源码
* 在运行时可以修改源码

总之每一个都是对于“源码只读”这个规矩的挑战。对于 C 而言，可以用**宏**来生成代码，而对于 C++ 而言，可以用 template 来代替宏。而对于其他元编程能力，C++ 显得有些为难。

总之，需要明确，C++ template 有着和 C 的 define 相同的设计思路，可以看作是宏的强化。它提供了一种类型安全，方便调试的宏。这种思路在强调 template 和宏一样，本质上都是在产生源码。

但是又不止于此，就像宏也可以传参一样，template 也有某种独立的语言机制，甚至这种语言机制有自己的数据类型和流程控制，聪明的程序员根据这些语法，发明了许多神秘的黑魔法。从这个角度看，C++ 其实是 2 门语言，一种是 template 编译器语言（对标 C 的预处理其），另一种是 C++ 编译器语言。

## 定义
正因为 template 是独立的语言，所以就不要用普通的 C++ 语法去思考 template 语法。

我觉得最重要的一个语法就是，template 并没有和 C 一样，有“定义”和“声明”的区别，它只有一个东西，就是定义。定义又可以分为类模板和函数模板，如下所示

类模板：

``` cpp
template <typename T>
class vector
{
public:
    void clear()
    {
        // Function body
    }

private:
    T* elements;
};
```

函数模板：

``` cpp
template <typename T> void foo(T const& v) { /* impelement */ }
template <typename T> T foo() { /* impelement */ }
template <typename T, typename U> U foo(T const&) { /* impelement */ }
```

其中最重要的就是不要写那种“声明”，不然就会在“定义”的时候很痛苦。

## 实例化
当模板定义后，需要进行实例化，也就是生成普通的 C++ 代码，这就是这门 template 语言的结果。

实例化是通过在标识符后的 `<>` 传入的，而定义是在标识符前的 `<>` 定义的，而在普通情况下，这两者应该是具有对应关系的。

``` cpp
int result = Add<int>(a, b);
```

## 数据类型
template 中的 `<>` 就像参数一样，而 `typenmae` 就像参数的数据类型一样，实际上，除了 `typename` 以外，还有 `int` ，比如下面这种

``` cpp
template <typename T, int BufSize>
class buffer_t {
public:
    T& alloc();
    void free(T& item);
private:
    T data[BufSize];
}

buffer_t<int, 100> buf; // 100 作为模板参数
```

## 流程控制
特化和偏特化结构就像 template 这门语言的 if-else 一样，根据参数的**不同内容和不同个数**进行分支（这么看像是函数重载也可以），分支的结果就是产生不同的代码，这个过程称为特化或者偏特化。

首先用一个例子看一下特化的结构

``` cpp
#include <iostream>

// 模板的元型
template <typename T> class TypeToID
{
public:
    static int const ID = -1;
};

// 特化，也就是只能前面的 `<>` 为空，这种特化形式只能匹配特定的 type
template <> class TypeToID<char>
{
public:
    static int const ID = 0;
};

// 偏特化，前面的 `<>` 里面依然有内容，用于辅助后面的 `<>` 进行描述，它可以匹配一类 type
// 函数模板只能使用特化，这也是我们用模板类举例的原因
template <typename T> class TypeToID<T*>
{
public:
    static int const ID = 1;
};

int main(int argc, char *argv[])
{
    std::cout << TypeToID<char*>::ID << std::endl; // 1
    std::cout << TypeToID<char>::ID << std::endl; // 0
    std::cout << TypeToID<int>::ID << std::endl; // -1
    return 0;
}
```

可以看到我们利用模板实现了一个根据不同类型返回不同整数的模板，在逻辑上功能是这样的：

``` java
if (type instanceof Pointer) {
    return 1;
}
else if (type instanceof Char) {
    return 0;
}
else {
    return -1;
}
```

除了分支功能外，还可以使用递归功能，如下所示：

``` cpp
#include <iostream>

// 基准情况，匹配不是指针的类型
template <typename T>
class RemovePointer
{
public:
    typedef T Result;
};

// 递归情况，匹配指针类型
template <typename T>
class RemovePointer<T*>
{
public:
    // 去掉一层 * 后进行再次调用这个模板，递归
    typedef typename RemovePointer<T>::Result Result;
};

int main()
{
    RemovePointer<float***>::Result x;
    std::cout << typeid(x).name() << std::endl; // f
    return 0;
}
```

这个会生成如下函数

``` cpp
class RemovePointer<float***>
{
public:
    typedef RemovePointer<float**>::Result Result;
};

class RemovePointer<float**>
{
public:
    typedef RemovePointer<float*>::Result Result;
};

class RemovePointer<float*>
{
public:
    typedef RemovePointer<float>::Result Result;
};

class RemovePointer<float>
{
public:
    typedef float Result;
};

int main()
{
    RemovePointer<float***>::Result x;
    std::cout << typeid(x).name() << std::endl; // f
    return 0;
}
```

如果有了递归和分支，那么基本上就啥都能算了。

## 默认实参
如题所示：

``` cpp
template <typename T0, typename T1 = void> struct DoWork;

template <typename T> struct DoWork<T> {};
template <>           struct DoWork<int> {};
template <>           struct DoWork<float> {};
template <>           struct DoWork<int, int> {};
```

这样的好处就是可以传入不定长的参数，比如说最开始的 `tuple` 就是这样实现的：

``` cpp
// Tuple 的声明，来自 boost
struct null_type;

template <
  class T0 = null_type, class T1 = null_type, class T2 = null_type,
  class T3 = null_type, class T4 = null_type, class T5 = null_type,
  class T6 = null_type, class T7 = null_type, class T8 = null_type,
  class T9 = null_type>
class tuple;

// Tuple的一些用例
tuple<int> a;
tuple<double&, const double&, const double, double*, const double*> b;
tuple<A, int(*)(char, int), B(A::*)(C&), C> c;
tuple<std::string, std::pair<A, B> > d;
tuple<A*, tuple<const A*, const B&, C>, bool, void*> e;
```

## 实际应用
### 用特化提供 hash 函数
在 C++ 中，`std::hash` 是标准库提供的一个函数对象，用于计算给定类型的哈希值。对于自定义的类型，如果你想在使用哈希表等数据结构时通过该类型作为键，就需要提供一个哈希函数。`std::hash` 提供了一个通用的框架，可以通过特化来为自定义类型提供哈希函数。

例如：

``` cpp
struct MyStruct {
    int x;
    std::string y;
};
```

然后你想在 `std::unordered_map` 中使用 `MyStruct` 作为键，你可以提供一个哈希函数，通常是通过特化 `std::hash`：

``` cpp
#include <functional>

namespace std {
    template <>
    struct hash<MyStruct> {
        std::size_t operator()(const MyStruct& obj) const {
            // 在这里实现哈希函数的计算
            // 可以使用 std::hash<> 来计算基本类型的哈希值
            return hash<int>()(obj.x) ^ (hash<std::string>()(obj.y) << 1);
        }
    };
}
```
