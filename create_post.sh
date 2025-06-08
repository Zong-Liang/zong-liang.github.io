#!/bin/bash

# 脚本：快速创建 Chirpy 主题博客文章文件

# 定义文章存放目录
POSTS_DIR="_posts"

# 检查 _posts 目录是否存在
if [ ! -d "$POSTS_DIR" ]; then
  echo "错误：找不到 '$POSTS_DIR' 目录。请确保您在项目的根目录下运行脚本。"
  exit 1
fi

# 1. 获取文章标题
read -p "请输入文章标题: " POST_TITLE

# 检查标题是否为空
if [ -z "$POST_TITLE" ]; then
  echo "错误：文章标题不能为空。"
  exit 1
fi

# 2. 清理标题用于文件名
# 转换为小写，将空格替换为连字符，移除常见文件路径/URL不安全字符，移除首尾连字符
SANITIZED_TITLE=$(echo "$POST_TITLE" |
  tr '[:upper:]' '[:lower:]' |
  sed 's/[[:space:]]/-/g' | # 将空格替换为连字符
  sed 's/[\\/:*?"<>|]//g' | # 移除常见文件路径/URL不安全字符，允许中文字符 <--- 修改为这一行
  sed 's/--+/-/g' |         # 将连续的连字符替换为单个
  sed 's/^-//' |            # 移除开头的连字符
  sed 's/-$//')             # 移除结尾的连字符

# 再次检查清理后的标题是否为空
if [ -z "$SANITIZED_TITLE" ]; then
  echo "错误：清理标题后生成的文件名无效。请尝试一个包含字母或数字的标题。"
  exit 1
fi

# 3. 获取当前日期 (YYYY-MM-DD 格式)
CURRENT_DATE=$(date +%Y-%m-%d)

# 4. 获取当前日期和时间 (用于 Front Matter 的 date 字段)
# 格式示例: YYYY-MM-DD HH:MM:SS +0800
# 临时设置时区为上海 (UTC+8)
CURRENT_DATETIME=$(TZ="Asia/Shanghai" date +%Y-%m-%d\ %H:%M:%S\ %z)

# 5. 构造完整的文件名和路径
FILENAME="$CURRENT_DATE-$SANITIZED_TITLE.md"
FULL_PATH="$POSTS_DIR/$FILENAME"

# 6. 检查文件是否已存在 (虽然日期通常能保证唯一性，但做个检查更好)
if [ -f "$FULL_PATH" ]; then
  echo "错误：文件 '$FULL_PATH' 已经存在。"
  exit 1
fi

# 7. 创建文件并写入 Front Matter 和基本内容
# 使用 Here Document (<<EOF) 来方便写入多行内容
cat <<EOF >"$FULL_PATH"
---
title: "$POST_TITLE"
date: $CURRENT_DATETIME
categories: [JAVA, JAVA基础]
tags: [技巧, 中等]
pin: false
toc: true
math: true
# image: /assets/img/default_post_banner.png # 可选：如果您有默认的顶部图片，取消注释并修改路径
---

# $POST_TITLE

在此开始撰写您的博客文章内容。

<!--more--> # 可选：取消注释，设置摘要分隔符，<!--more--> 之前的内容将显示在文章列表中作为摘要。

EOF

# 8. 输出成功信息
echo "成功创建新的文章文件：$FULL_PATH"
echo "请打开此文件，更新分类、标签，并开始撰写您的内容！"

# 脚本结束
exit 0
