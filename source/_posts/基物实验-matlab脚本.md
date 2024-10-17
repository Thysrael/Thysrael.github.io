---
abbrlink: 60099a32
categories: 基物实验
date: 2022-06-11 17:23:20
mathjax: true
tags: [基物实验, S4复习, 工具总结]
title: 基物实验-matlab脚本
---

这里列举一下在基物实验数据处理中用到很多次的脚本，

使用的时候需要把每个函数单独保存在一个文件中

可以使用如下查询命令查看使用方法

```matlab
help function_name
```

## 线性回归

函数如下

```matlab
function [p, r, b, a, b_u, b_ua, b_ub, a_u, a_ua, a_ub] = linear_regression(y_delta, x, x_name, x_sym, y, y_name, y_sym)
% 函数形式：
%   [p, r, b, a, b_u, b_ua, b_ub, a_u, a_ua, a_ub] = linear_regression(y_delta, x, x_name, x_sym, y, y_name, y_sym)
% 参数：
%   y_delta 是测量 y 的仪器误差
%   x 是自变量的纵向向量，x_name 是自变量的变量名，x_sym 是自变量的单位
%   y 是应变量的纵向向量，y_name 是自变量的变量名，y_sym 是自变量的单位
% 返回值：
%   p 是多项式系数向量
%   r 是相关系数
%   a 是截距，a_u 是截距的不确定度，a_ua 是截距 A 类不确定度，a_ub 是截距的 B 类不确定度
%   b 是斜率，b_u 是斜率的不确定度，b_ua 是斜率 A 类不确定度，b_ub 是斜率的 B 类不确定度

    % 一元线性回归
    k = length(x);
    p = polyfit(x, y, 1);
    % 进行检验
    Y = polyval(p, x);
    R = corrcoef(x,y);
    r = R(2,1);
    b = p(1);
    a = p(2);
    % 计算不确定都
    y_ub = y_delta / sqrt(3);
    b_ua = b * sqrt((1 / r^2 - 1) / (k - 2));
    a_ua = sqrt(mean(x.^2)) * b_ua;
    b_ub = y_ub * sqrt(1 / (k * (mean(x.^2) - mean(x)^2)));
    a_ub = b_ub * sqrt(mean(x.^2));
    b_u = sqrt(b_ua^2 + b_ub^2);
    a_u = sqrt(a_ua^2 + a_ub^2);
    % 绘图
    plot(x,y,'*'),title([x_name, '-', y_name]),xlabel(x_sym),ylabel(y_sym)
    hold on;
    plot(x,Y)
    grid on;
end
```

使用方式如下

```
x = xlsread('data1.xlsx', 'A2:A33');
y = xlsread('data1.xlsx', 'B2:B33');

[p, r, b, a, b_u, b_ua, b_ub, a_u, a_ua, a_ub] = linear_regression(0.00001, x, '电流', 'I(A)', y, '磁感应强度', 'B(mT)')
```

## 直接不确定度计算

```matlab
function [x_u, x_ua, x_ub] = uncertainty(x, delta)
% 函数形式：
%   [x_u, x_ua, x_ub] = uncertainty(x, delta)
% 参数：
%   x 是待分析的向量
%   delta 是测量误差
% 返回值：
%   x_u 是不确定度，x_ua 是 A 类不确定度，x_ub B 类不确定度

    k = length(x);
    x_ua = sqrt(sum((x - mean(x)).^2) / (k * (k - 1)));
    x_ub = delta / sqrt(3);
    x_u = sqrt(x_ua^2 + x_ub^2);
end
```

使用方式如下

```matlab
d_p = [130.08, 130.06, 130.04, 130.04, 130.00, 129.96]./ 1000;
[d_p_u, d_p_ua, d_p_ub] = uncertainty(d_p, 0.02 / 1000);
```

## 间接不确定度计算

```matlab
function u = IndirectUn(f, parameters, values, uncertaintys)
% 函数形式：
%   u = IndirectUn(f, parameters, values, uncertaintys)
% 参数：
%   f 为函数，是符号量组成的表达式
%   parameter 为形参表，是符号向量
%	value 为实参表，是实际的每个参数的取值
% 	uncertaintys 为各个参数的不确定度
% 返回值：
%   u 合成不确定度

    len = length(parameters);
    items = zeros(1, len);
    % 直接利用定义求解
    for i = 1:len
        diff_xi = subs(diff(f, parameters(i)), parameters, values);
        items(i) = (diff_xi * uncertaintys(i))^2;
    end
    
    u = sqrt(sum(items));
end
```

使用方法如下

```matlab
% 间接不确定度分析
values = [m_p d_p h_p h_s d_s theta_1 theta_2];
us = [m_p_u d_p_u h_p_u h_s_u d_s_u theta_1_u theta_2_u];
% 将其全都重新声明为符号量
syms m_p d_p h_p h_s d_s theta_1 theta_2;
% 构造符号函数
f = m_p * 400 * 0.045 * ((d_p + 4 * h_p) / (d_p + 2 * h_p)) * (h_s / (theta_1 - theta_2)) * (2 / (pi * d_s^2));
u = IndirectUn(f, [m_p d_p h_p h_s d_s theta_1 theta_2], values, us)
```

## 绘图

```matlab
function draw(x, x_name, x_sym, y, y_name, y_sym)
    plot(x,y),title([x_name, '-', y_name]),xlabel(x_sym),ylabel(y_sym)
    grid on
end
```

很简单很容易理解。
