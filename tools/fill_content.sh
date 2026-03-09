#!/bin/bash

# ================= 配置区域 =================
# 根目录路径
BASE_DIR="_posts/leetcode_notes/02_top_interview_150"

# 检查目录是否存在
if [ ! -d "$BASE_DIR" ]; then
    echo "❌ 错误: 找不到目录 $BASE_DIR"
    exit 1
fi

echo "🚀 开始遍历并填充文件内容..."

# 使用 find 命令查找该目录下所有的 .md 文件
# -print0 和 read -d $'\0' 用于正确处理包含特殊字符的路径（虽然这里文件名应该很干净）
find "$BASE_DIR" -type f -name "*.md" | while IFS= read -r filepath; do

    # 1. 获取文件名 (e.g., 2024-03-01-88-合并两个有序数组.md)
    filename=$(basename "$filepath")

    # 2. 获取父目录名 (e.g., 01_数组_字符串)
    parent_dir=$(dirname "$filepath")
    folder_name=$(basename "$parent_dir")

    # ================= 解析逻辑 =================

    # A. 提取日期 (前10位: YYYY-MM-DD)
    date_str="${filename:0:10}"

    # B. 提取标题
    # 从第12位开始截取 (跳过 "YYYY-MM-DD-")，并去掉末尾的 .md
    # title_temp 是 "88-合并两个有序数组.md"
    title_temp="${filename:11}"
    # title_final 是 "88-合并两个有序数组"
    title_final="${title_temp%.md}"

    # C. 提取分类名称 (从文件夹名中处理)
    # 逻辑：去除开头的数字前缀
    # 例如: "01_数组_字符串" -> "数组_字符串"
    # 例如: "17_Kadane算法" -> "Kadane算法"
    category_name=$(echo "$folder_name" | sed -E 's/^[0-9]+_//')

    # ================= 写入内容 =================

    # 使用 cat EOF 将内容覆盖写入文件
    cat > "$filepath" <<EOF
---
title: $title_final
date: $date_str 06:00:00 +0800
categories: [Daily Coding, Top Interview 150, $category_name]
tags: [$category_name]
toc: true
math: true
pin: false
render_with_liquid: false
image:
  path:
  lqip: data:image/webp;base64,UklGRpoAAABXRUJQVlA4WAoAAAAQAAAADwAABwAAQUxQSDIAAAARL0AmbZurmr57yyIiqE8oiG0bejIYEQTgqiDA9vqnsUSI6H+oAERp2HZ65qP/VIAWAFZQOCBCAAAA8AEAnQEqEAAIAAVAfCWkAALp8sF8rgRgAP7o9FDvMCkMde9PK7euH5M1m6VWoDXf2FkP3BqV0ZYbO6NA/VFIAAAA
---
EOF

    echo "✅ 已写入: $filename (分类: $category_name)"

done

echo "🎉 所有文件填充完毕！"
