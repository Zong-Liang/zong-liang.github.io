#!/bin/bash

# 定义目标根目录 (注意：Shell脚本中使用正斜杠 / 作为路径分隔符)
BASE_DIR="_posts/leetcode_notes/02_top_interview_150"

# 检查根目录是否存在，不存在则创建
if [ ! -d "$BASE_DIR" ]; then
    echo "正在创建根目录: $BASE_DIR"
    mkdir -p "$BASE_DIR"
fi

# 定义文件夹名称数组
folders=(
    "01_数组_字符串"
    "02_双指针"
    "03_滑动窗口"
    "04_矩阵"
    "05_哈希表"
    "06_区间"
    "07_栈"
    "08_链表"
    "09_二叉树"
    "10_二叉树层次遍历"
    "11_二叉搜索树"
    "12_图"
    "13_图的广度优先搜索"
    "14_字典树"
    "15_回溯"
    "16_分治"
    "17_Kadane算法"
    "18_二分查找"
    "19_堆"
    "20_位运算"
    "21_数学"
    "22_一维动态规划"
    "23_多维动态规划"
)

# 遍历数组并创建文件夹
echo "开始在 $BASE_DIR 下创建文件夹..."

for folder in "${folders[@]}"; do
    TARGET_PATH="$BASE_DIR/$folder"
    if [ ! -d "$TARGET_PATH" ]; then
        mkdir -p "$TARGET_PATH"
        echo "✅ 已创建: $folder"
    else
        echo "⚠️ 已存在: $folder (跳过)"
    fi
done

echo "🎉 所有操作完成！"
