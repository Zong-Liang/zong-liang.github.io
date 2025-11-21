#!/bin/bash

# 定义目标根目录 (注意：Shell脚本中使用正斜杠 / 作为路径分隔符)
BASE_DIR="_posts/posts_02_daily_coding/post_02_top_interview_150"

# 检查根目录是否存在，不存在则创建
if [ ! -d "$BASE_DIR" ]; then
    echo "正在创建根目录: $BASE_DIR"
    mkdir -p "$BASE_DIR"
fi

# 定义文件夹名称数组
folders=(
    "grp_01_数组_字符串"
    "grp_02_双指针"
    "grp_03_滑动窗口"
    "grp_04_矩阵"
    "grp_05_哈希表"
    "grp_06_区间"
    "grp_07_栈"
    "grp_08_链表"
    "grp_09_二叉树"
    "grp_10_二叉树层次遍历"
    "grp_11_二叉搜索树"
    "grp_12_图"
    "grp_13_图的广度优先搜索"
    "grp_14_字典树"
    "grp_15_回溯"
    "grp_16_分治"
    "grp_17_Kadane算法"
    "grp_18_二分查找"
    "grp_19_堆"
    "grp_20_位运算"
    "grp_21_数学"
    "grp_22_一维动态规划"
    "grp_23_多维动态规划"
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