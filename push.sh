#!/bin/bash

hexo g -d

# 获取当前日期，并格式化为 YYYY-MM-DD 格式
commit_message=$(date +"%Y-%m-%d")

# 执行 git add
git add .

# 执行 git commit，提交信息为当前日期
git commit -m "$commit_message"

git push
