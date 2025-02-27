---
abbrlink: a860c828
categories: CPP设计
date: 2022-05-09 19:00:50
mathjax: true
tags: [CPP设计, S4课上, 知识总结]
title: CPP设计-面向对象
---

## 一、默认方法
### 1.1 总论
这是 CPP 与 Java 的OOP 最不同的地方。对于 Java ，基本上是没有默认的行为的，因为所有的对象其实都是指针，所以只有被定义过的方法会用到，而没有被定义过的方法，我们一点也不担心它会在什么其他地方出现，比如:

```java
Student cnx;					// 我们不担心 cnx 内部是怎样的，因为这个就是一个指针
Student qs = cnx;				// 我们不担心 qs 与 cnx 的关系，因为只不过是对象指针的赋值，而跟实际的两个 Student 没有关系
System.out.println(qs);			// 我们不担心 qs 的字符串化，因为来自 Object 类
classroom.answerQuestion(qs)	// 我们不担心 qs 到底是怎么传入的，因为我们知道传入的就是一个指针
...
end of execution				// 我们不关心 qs 和 cnx 的释放，因为都是 JVM 负责的
```​

但是对于 CPP 来说，这些就都是问题了。


```cpp
Student cnx;					// 真的定义了一个 Student 对象，里面的内存情况是啥样的？
Student qs = cnx;				// 真的将一个对象复制给了另一个对象，那么是怎么复制的？
string s = qs;					// 发生了类型转换，这么多的类型，都是怎么转换的？
answerQuestion(qs)				// 我传进去的到底是个什么，我可以修改它吗？
...
end of execution				// 谁来释放 cnx 和 qs，没有人管一下吗？
```

可以看到正是因为 CPP 提供了强大的功能，导致在我们没有给我们的类进行任何设计的时候，给人的感觉就是完全不知道会发生什么？当然程序不会有任何二义性的东西存在，它一定会按照一定的规则去执行的。只不过这个规则被 CPP 隐藏起来了，导致我们入门的时候对于各种东西都十分迷茫。

与之相对的 Java，一是功能不那么强大，比如没有重载运算符之类的骚操作。一个是代码一般都可以溯源，比如来自 Object 之类的。总之让人还比较安心。

这一章讨论的就是 CPP 提供的默认方法。这些方法有一个特点，就是一旦我们自己定义了可以实现相似功能的方法，这些方法就会消失不见。

### 1.2 默认构造函数

当我们啥啥都没有定义的时候，CPP 会给我们提供一个默认构造函数，这个函数可以帮助我们让语句运行起来，比如下面的语句

```cpp
#include <iostream>

using namespace std;

class Node
{
private:
	int x, y;
public:
	void show();	
}; 

void Node::show()
{
	cout << x << " " << y << endl;
}
 
int main()
{
	Node a;		// 可以直接这么写，然后就能跑
	a.show();
	
	return 0;	
} 
```

虽然没有构造函数，但是是可以运行的。

系统提供的默认构造函数大概长这样，大致意思就是啥都不干。

```cpp
Node::Node(){}
```

并不是只有定义了一个无参构造器这个默认构造器才会失效，而是只要定义了一个构造器，这个构造器就会失效，比如加上这样的一个构造器，上面的代码就运行不了。

```cpp
Node::Node(int xx, int yy)
{
	x = xx;
	y = yy;
}
```

### 1.3 默认析构函数

因为 CPP 没有 JVM 的自动回收对象的机制，所以对于 `new` 出的对象，他是没有办法回收的，所以我们需要手动的定义一个析构函数，方便在 `delete` 的时候调用。系统会默认提供一个，就是下面这样

```cpp
Node::~Node(){};
```

同样啥都不干，这个其实已经很好了，因为对于一般的类，只要不在构造的时候 `new`，这个默认的构造器就已经足够了。

### 1.4 复制构造函数和赋值运算符

因为我们会有这种操作

```cpp
Student qs;
Student cnx = qs;
```

所以这种 `=` 号的行为是怎么定义的？有人会说，那我不用不就得了，但是有的时候虽然可以避免使用等于号，但是架不住一不小心传参啊

```cpp
void answerQuestion(Student s)
{
	s.show();
}

answerQuestion(qs);
```

我们知道其实是函数传参发生了一个这样的过程

```cpp
Student s(qs)
```

也就类似于复制了，所以必须定义这种东西的行为，这种函数的声明如下

```cpp
Node Node::Node(const Node &n);
```

但是具体的内容我不知道咋写，实现的功能就是一个“浅复制”，即数据成员都可以复制，但是如果数据成员是指针，那么指针指向的内容并不会被复制，但是数组会被完全拷贝。赋值运算符同理。

---

## 二、基本操作
### 2.1 定义一个对象

```cpp
// 如果有无参构造器可以这样用
Node a;				
Node a = Node();
Node *a = new Node();

// 如果是有参的构造器
Node a(x, y);
Node a = Node(x, y);
Node *a = new Node(x, y);
```

### 2.2 类的结构

对于 CPP 的一个类，一般是一个头文件放类的声明，一个放类的实现。类的定义包括数据成员的声明（同时也是定义，但是不允许初始化，除非是枚举类或者常量）和方法的声明。

```cpp
//--------------- node.h ------------------//

class Node
{
private:
	int x, y;
public:
	Node(int xx);
	Node(char *s);
	void show();	
};

//-------------- node.cpp -----------------//

Node::Node(int xx)
{
	x = xx;
	y = xx;
}

Node::Node(char *s)
{
	x = strlen(s);
	y = -strlen(s);
}

void Node::show()
{
	cout << x << " " << y << endl;
}
```

### 2.3 类的静态量和常量

在类中有两种定义常量的方法，都十分方便，如下所示：

```cpp
class Node
{
private:
	const int num = 1;
	enum{aa = 2, bb = 4};
	int x, y;
public:
	Node(int xx);
	Node(char *s);
	void show();	
}; 

void Node::show()
{
	cout << x << " " << y << " " << num << " " << aa << " " << bb << endl;
}
```

对于静态量，即可以被类的所有对象共享的变量（用 `static` 修饰）。静态值是不可以在类声明中初始化的，这是因为类声明只是描述了怎样分配内存，但是并没有实际分配内存。所以是没有办法给静态值初始化的，所以需要在外部给他进行初始化

```cpp
class Node
{
private:
	static int num;
	enum{aa = 2, bb = 4};
	int x, y;
public:
	Node(int xx);
	Node(char *s);
	void show();	
}; 

int Node::num = 1;
```

注意在外部进行定义的时候就不需要 `static` 关键字了。

### 2.4 公有继承
公有继承跟 Java 中的继承是类似的，具体的语法如下

```cpp
class DerivedClass : public BaseClass
{
...
}
```

因为要先创造基类对象，然后再创造子类对象，所以需要用初始化列表来指定基类的构造器。

在具体的使用方面，私有的数据成员是无法使用的，公有的方法是可以使用的，跟 Java 类似。

### 2.5 动态绑定
这个也与 Java 相似，基类的指针和引用都可以指向子类。所以当这种指针或者引用调用方法的时候，我们就需要区分到底是用的是子类的方法还是基类的方法。对于 Java 而言，如果指向的对象真的是子类的话，那么就一定会用子类的方法。但是对于 C++，这是一个有待商榷的事情。

只有当方法被声明成了 `virtual` 虚方法，才具有这种性质。`virtual` 关键字需要出现在父类和子类的方法声明中，只有都出现以后动态绑定直至才会发生作用。至于为什么这么麻烦，是因为维持动态绑定机制需要在对象内部维护一张**虚函数表**，这是一个很低效的事情，所以 CPP 选择了让用户自定义。

一般析构函数是虚方法，这是因为如果一个父类指针指向了子类对象，而析构方法使用的是父类析构，那么属于子类的那部分就没有办法释放了。

### 2.6 抽象类

抽象类是无法被实例化的类，他只能作为父类被继承然后实例化。导致它无法实例化的原因是他含有没有被定义的方法。这类方法被称为纯虚方法，需要用 `=0`去声明。

具体放一个示例，里面涉及了动态绑定机制和抽象类

`brass.h`

```cpp
#ifndef _BRASS_H_
#define _BRASS_H_

#include <iostream>
#include <string>

// Abstract Base class
class AcctABC
{
private:
	std::string fullName;
	long acctNum;
	double balance;
protected:
	struct Formatting
	{
		std::ios_base::fmtflags flag;
		std::streamsize pr;
	};
	const std::string &FullName() const {return fullName;}
	long AcctNum() const {return acctNum;}
	Formatting SetFormat() const;
	void Restore(Formatting &f) const;
public:
	AcctABC(const std::string &s = "Nullbody", long an = -1, double bal = 0.0);
	void Deposit(double amt);
	virtual void Withdraw(double amt)=0;
	double Balance() const {return balance;}
	virtual void ViewAcct()const=0;
	virtual ~AcctABC() {};	
};

// Brass Account Class
class Brass : public AcctABC
{
public:
	Brass(const std::string &s = "Nullbody", long an = -1, double bal = 0.0)
		: AcctABC(s, an, bal)
	{}
	virtual void Withdraw(double amt);
	virtual void ViewAcct() const;
	virtual ~Brass() {}
};

// Brass Plus Account Class
class BrassPlus : public AcctABC
{
private:
	double maxLoan;
	double rate;
	double owesBank;
public:
	BrassPlus(const std::string &s = "Nullbody", long an = -1, double bal = 0.0, 
		double ml = 500, double r = 0.10);
	BrassPlus(const Brass &ba, double m1 = 500, double r = 0.10);
	virtual void ViewAcct() const;
	virtual void Withdraw(double amt);
	void ResetMax(double m) {maxLoan = m;}
	void ResetRate(double r) {rate = r;}
	void ResetOwes() {owesBank = 0;} 
};

#endif
```

`brass.cpp`

```cpp
#include <iostream>
#include "brass.h"

using std::cout;
using std::endl;
using std::string;
using std::ios_base;

// format print
typedef std::ios_base::fmtflags format;
typedef std::streamsize precis;
format setFormat();
void restore(format f, precis p);


// Abstract Base Class
AcctABC::AcctABC(const string &s, long an, double bal)
{
	fullName = s;
	acctNum = an;
	balance = bal;
}

void AcctABC::Deposit(double amt)
{
	if (amt < 0)
	{
		cout << "Negative deposit not allowed; " << "deposit is canceled\n";
	}
	else
	{
		balance += amt;
	}
}

// pure virtual function also can be defined
void AcctABC::Withdraw(double amt)
{
	balance -= amt;
}

// protected methods for formatting
AcctABC::Formatting AcctABC::SetFormat() const
{
	// set up ###.## format
	Formatting f;
	f.flag = cout.setf(ios_base::fixed, ios_base::floatfield);
	f.pr = cout.precision(2);
	return f;
}

void AcctABC::Restore(Formatting &f) const
{
	cout.setf(f.flag, ios_base::floatfield);
	cout.precision(f.pr);
}

// Brass methods
void Brass::Withdraw(double amt)
{	
	if (amt < 0)
	{
		cout << "Withdrawal amount must be positive.\n";
	}
	else if (amt <= Balance())
	{
		AcctABC::Withdraw(amt);
	}
	else
	{
		cout << "Withdrawal amount of $ " << amt << " exceeds your balance.\n";
	}	
}

void Brass::ViewAcct() const
{
	Formatting f = SetFormat();
	cout << "Brass Client: " << FullName() << endl;
	cout << "Account Number: " << AcctNum() << endl;
	cout << "Balance $" << Balance() << endl;
	Restore(f);	
}

// BrassPlus methods
BrassPlus::BrassPlus(const std::string &s, long an, double bal, double ml, double r)
: AcctABC(s, an, bal)
{
	maxLoan = ml;
	owesBank = 0.0;
	rate = r;
}

BrassPlus::BrassPlus(const Brass &ba, double ml, double r)
: AcctABC(ba) // use implicit copy constructor
{
	maxLoan = ml;
	owesBank = 0.0;
	rate = r;
}

void BrassPlus::ViewAcct() const
{
	Formatting f = SetFormat();
	
	cout << "BrassPlus Client: " << FullName() << endl;
	cout << "Accout Number: " << AcctNum() << endl;
	cout << "Balance: $" << Balance() << endl;
	cout << "Maximum loan: $" << maxLoan << endl;
	cout << "Owed to bank: $" << owesBank << endl;
	cout.precision(3);
	cout << "Loan Rate: " << 100 * rate << "%\n";
	Restore(f);
}

void BrassPlus::Withdraw(double amt)
{
	Formatting f = SetFormat();
	double bal = Balance();
	
	if (amt <= bal)
	{
		AcctABC::Withdraw(amt);
	}
	else if (amt <= bal + maxLoan - owesBank)
	{
		double advanced = amt - bal;
		owesBank += advanced * (1.0 + rate);
		cout << "Bank advance: $" << advanced << endl;
		cout << "Finance charge: $" << advanced * rate << endl;
		Deposit(advanced);
		AcctABC::Withdraw(amt);
	}
	else
	{
		cout << "Withdrawal amount of $ " << amt << " exceeds your balance.\n";
	}
}
```

`main.cpp`

```cpp
#include <iostream>
#include <string>
#include "brass.h"

const int CLIENTS = 4;

int main(int argc, char** argv) 
{
	using std::cin;
	using std::cout;
	using std::endl;
	
	AcctABC *p_clients[CLIENTS];
	std::string tmp;
	long tmpNum;
	double tmpBal;
	char kind;
	
	for (int i = 0; i < CLIENTS; i++)
	{
		cout << "Enter client's name: ";
		getline(cin, tmp);
		
		cout << "Enter client's account number: ";
		cin >> tmpNum;
		
		cout << "Enter opening balance: $";
		cin >> tmpBal;
		
		cout << "Enter 1 fo Brass Account or 2 for BrassPlus Account: ";
		while (cin >> kind && (kind != '1' && kind != '2'))
		{
			cout << "Enter either 1 or 2: ";
		}
		
		if (kind == '1')
		{
			p_clients[i] = new Brass(tmp, tmpNum, tmpBal);
		}
		else
		{
			double tmax, trate;
			
			cout << "Enter the overdraft limit: $";
			cin >> tmax;
			
			cout << "Enter the interest rate as a decimal fraction: ";
			cin >> trate;
			
			p_clients[i] = new BrassPlus(tmp, tmpNum, tmpBal, tmax, trate);
		}
		while (cin.get() != '\n')
		{
			continue;
		}
	}
	
	cout << endl;
	
	for (int i = 0; i < CLIENTS; i++)
	{
		p_clients[i]->ViewAcct();
		cout << endl;
	}
	
	for (int i = 0; i < CLIENTS; i++)
	{
		delete p_clients[i];
	}
	
	cout << "Done.\n";
	
	return 0;
}
```


---


## 三、特点操作
### 3.1 类型转换
这个是个很神奇的地方，就是基本上什么类型都可以给对象赋值，只要定义了相关的单参量的构造函数。大概这样

```cpp
Node::Node(int xx)
{
	x = xx;
	y = xx;
}

Node a = 2;
```

这就能跑了，而且跑起来还贼对。最离谱的还有这样的

```cpp
Node::Node(char *s)
{
	x = strlen(s);
	y = -strlen(s);
}

// 依然可以跑，输出“13， -13”
Node a = "Hello, world.";
```

可以看到，基本上只要是有定义，就可以跑。

### 3.2 初始化列表
对于构造函数，其实现开辟一块内存空间，然后再执行构造函数，所以其实对于每个数据成员，构造函数的赋值都不是初始化。如果是这样的话，那么如果数据成员有 `const` 常量的话，就会报错

```cpp
class Node
{
private:
	static int num;
	enum{aa = 2, bb = 4};
	const int x, y;
public:
	Node(int xx);
	Node(char *s);
	void show();	
}; 

// 这里报错“uninitialized const int”
Node::Node(int xx)
{
	x = xx;
	y = xx;
}
```

所以就需要初始化列表来辅助，把构造函数改成这样

```cpp
Node::Node(int xx)
:x(xx), y(xx)
{}
```

初始化列表就是在开辟内存空间的时候进行的一次初始化，所以是可以的，我们即使不使用 const，也尽量在初始化列表中初始化数据成员，因为比较高效。

### 3.3 内联函数
在类声明中定义的函数会被自动设置成内联函数，一般的 `getter` 和 `setter` 都是内联函数。

这个特性是十分有必要的，类声明在头文件中，如果不是内联函数，很有可能出现定义多次的情况。

### 3.4 运算符重载
其实运算符可以看做一种函数，只要稍微有点离散基础的人，都可以很好的理解这件事情。所以就不细讲了。只说一下声明格式

```cpp
returnType operator op(argument-list);
```

当对象使用重载运算符的时候，其实就是在使用第二行这个函数。

```cpp
object op arguments;
ogject.op(arguments);
```

### 3.5 友元函数

上面的运算符有一个问题，就是对于二元运算符，它要求对象一定是前面那个运算数。《C++ Primer Plus》中讲到一个有意思的东西，对于时间，我们定义一个乘法重载

```cpp
Time operator*(double n) const;
```

然后就会发生一个滑稽的事情，就是不再满足乘法分配律

```cpp
timer * 12;			// VALID 'timer * 12' equals 'timer.operator*(12)' 
12 * timer			// INVALID
```

所以没有办法，我们只能再定义一个友元函数来改这个疏忽。所谓的友元函数就是对于私有的数据成员依然具有可见性的函数。他们同样需要在类声明中声明，并用关键词 `friend` 修饰 ，示例如下

```cpp
class Time
{
private:
	int hours;
	int minutes;
public:
	Time();
	Time(int h, int m = 0);
	void AddMin(int m);
	void AddHr(int h);
	void Reset(int h = 0, int m = 0);
	Time operator+(const Time & t) const;
	void Show() const;
	Time operator*(double n) const;
	friend Time operator*(double m, const Time & t);					 // 友元函数
	friend std::ostream & operator<<(std::ostream & os, const Time & t); // 友元函数
};
```

具体的定义如下

```cpp
Time operator*(double mult, const Time & t) 
{
	Time result;
	long totalminutes = t.hours * mult * 60 + t.minutes * mult;
	result.hours = totalminutes / 60;
	result.minutes = totalminutes % 60;
	return result;
}
```

可以看到它是可以使用类内部的数据成员的。

### 3.6 const 方法

对于一个 const 的对象，使用方法的时候是需要仔细考量的，比如说对于一个打印方法

```cpp
void Node::show()
{
	cout << x << " " << y << " " << num << " " << aa << " " << bb << endl;
}
```

即使没有修改数据成员的值，但是在执行下面语句的时候，依然是会报错的

```cpp
const Node a = 3;
a.show();				// INVALID 'descard qualifiers'
```

这是很好理解的，在前面对 `const` 的介绍中，我们指出，不是真的没修改就没问题，而是我们必须显式的声明不会修改。所以我们得操作一下。但是问题就来了，因为对象的数据成员是**隐式**调用的，我们没有显式的传参，所以没有参数给咱们 `const` 修饰。

所以最后我们的处理办法是在函数的结尾写一个 `const`。注意声明处和定义处都是需要书写的

```cpp
void show() const;	

void Node::show() const
{
	cout << x << " " << y << " " << num << " " << aa << " " << bb << endl;
}
```

### 3.7 组合、私有继承、保护继承
如果想要讨论私有继承，首先先补充一些访问权限的知识，CPP 中访问权限分为 3 种，而访问场景可以分为 4 种，列表如下：

| 种类 / 情形 | 类内访问 | 友元访问 | 子类内访问 | 实例访问 |
|-------------|----------|----------|------------|----------|
| public      | yes      | yes      | yes        | yes      |
| protected   | yes      | yes      | yes        | no       |
| private     | yes      | yes      | no         | no       |

也就是说，权限并不限制**类内访问和友元访问**这两种形式，只有 `public` 可实现实例访问，`protected` 不能被实例访问，所以一般在类内的 `typedef` 和 `friend` 会用 `protected` 修饰，因为这些声明本身也不应当通过实例访问。

我们知道权限控制的对象有两个，一个是数据，另一个是方法，对于这一节有用的是对于方法的权限控制，如果一个方法是 `public` 的，那么就意味着我们可以通过它的实例调用这个方法，其本质是这个实例承担了这个 `public` 方法对应的**责任** 。权限控制的本质是责任的控制。而如果一个方法是 `private` 的，那么这个方法并不意味着一种责任（这就好像白大褂要是穿到街上，那么就意味着救死扶伤的责任，而只在家里穿，未尝不是一种 cosplay ）。而当我们谈到继承的时候，衍生类如果和基类保持一种 `is-a` 的关系，那么就意味着，衍生类继承了基类的责任。

而 3 种继承的本质是“在衍生类中修改或者保持基类权限”，这种修改的是“以严为准的”，如下所示：

| 继承方式 / 基类权限 | public    | protected | private |
|---------------------|-----------|-----------|---------|
| public              | public    | protected | private |
| protected           | protected | protected | private |
| private             | private   | private   | private |

表格中的内容是衍生类继承的数据和方法在衍生类中的权限。

也可以理解为 `public` 继承并不会改变基类中原有的权限，而 `protected, private` 继承都会对于原有的权限进行一定的修改。他们会将原本 `public` 的方法变成严格的权限，也就是说，衍生类和基类间就不再具有 `is-a` 的关系了。也就是说，“私有继承”在逻辑上并不是一种“继承”。事实也正是如此，私有继承并不能让衍生类隐式转换成基类，如下所示：

``` cpp
class Person { ... };
class Student: private Person { ... };     // inheritance is now private
void eat(const Person& p);                 // anyone can eat

Person p;                                  // p is a Person
Student s;                                 // s is a Student
eat(p);                                    // fine, p is a Person
eat(s);                                    // error! a Student isn't a Person
```

那么“私有继承”有什么用呢？我们说私有继承是**软件实现**中的概念，与**软件设计**无关。它和“组合”所表示的 `has-a` 关系相似但不同，它在实现语义上是一种 `is-implemented-in-terms-of` ，也就是说“衍生类的实现和基类很类似”。基类和衍生类可以毫无关系，但是他们在一些责任的实现上是相同的，所以他们有一个私有继承关系。

而在使用上，私有继承的使用方法和组合有一定的对照关系，可以看成是一种“匿名组合”，比如说调用方法时，有如下差别

``` cpp
// combination
component.method()
// private inheritance
Base::method()
```

在使用基类或者组件的时候

``` cpp
// combination
this->componet
// private inheritance
(Base *) this
```

此外我们还可以用 `public` 权限声明搭配 `using` 语法来使得衍生类实现部分基类的责任：

``` cpp
class Derived : private Base
{
public:
    using Base::baseMethod;
}

Derived de;
de.baseMethod();
```

### 3.8 友元类
在类 A 中指明类 B 能够直接访问类 A 中的 `private` 和 `protected` 成员，那么类 B 就是类 A 的友元类。

声明方式如下：

``` cpp
class A
{
    //...
    friend class B;
    //...
}
```

需要强调，`friend` 声明可以在 `public, protected, private` 任何一个作用域下，没有任何区别。

友元类具有如下性质：

- 无法被继承，也就是如果 `B` 是 `A` 的友元，`subB` 是 `B` 的子类，不能推导出 `subB` 是 `A` 的友元。
- 无法被传递，也就是如果 `B` 是 `A` 的友元， `C` 是 `B` 的友元，不能推导出 `C` 是 `A` 的友元。

### 3.9 内部类
如果一个类定义在另一个类的内部，这个内部的类就叫做内部类。

对于 `OuterClass` ，其看待 `InnerClass` 与看待其他类并没有什么区别，并不能通过 `OuterClass` 的对象来访问 `Inner` 的数据。不过 `OuterClass` 可以实例化 `InnerClass` ，就和实例化其他类一样。在本质上，外部类无非仅仅限定了内部类类名的作用域范围。

对于其他类或者过程，其看待 `InnerClass` 与其声明位置有关，如果 `InnerClass` 是 `public` 的，那么可以用 `OuterClass::InnerClass` 来实例化一个内部类对象，而如果是 `private` 的，那么则无法实例化内部对象（只有 `OuterClass` 可以实例化这样的 `InnerClass` ）

而 `InnerClass` 是 `OuterClass` 的友元类，并不需要特殊的 `friend` 声明。但是外部类不是内部类的友元。

### 3.10 成员指针
成员指针指的是指向类成员的指针。也就是可以**指向类内的某种数据类型**的指针。它只能用于类的**非静态成员变量**。

举例来说

``` cpp
class Foo
{
public:
    DataPtr dataPtr;
    FuncPtr funcPtr;
    int data;
    void func();
};

// member pointer for data -> `int *`
using DataPtr = int (Foo::*);
// member pointer for function -> `void (*)()`
using FuncPtr = void (Foo::*)();

int main()
{
    Foo f;
    DataPtr dataPtr = &Foo::data;
    FuncPtr funcPtr = &Foo::func;
    auto pf = &f;
    // `.*` and `->*`
    std::cout << f.*dataPtr << pf->*dataPtr << std::endl;
}
```

可以看到在类型声明阶段，在原来的类型声明前加上了类名 `Foo` ：

``` cpp
// member pointer for data -> `int *`
using DataPtr = int (Foo::*);
// member pointer for function -> `void (*)()`
using FuncPtr = void (Foo::*)();
```

这种类型的指针并不会指向具体的内容，而是会指向某个类内成员的类型，如下所示：

``` cpp
DataPtr dataPtr = &Foo::data;
FuncPtr funcPtr = &Foo::func;
```

正因如此，这种类型的指针在读写其指向的内容的时候，并不能直接使用 `*ptr` ，而必须与相应的实例相结合才能发挥作用，同时需要使用特殊的运算符 `.*` 和 `->*` 。

``` cpp
// same as `f.data` and `f.data`
std::cout << f.*dataPtr << pf->*dataPtr << std::endl;
```

从本质来说，成员指针描述了**特定成员的位置距离实例的起点有多少个字节** 。
