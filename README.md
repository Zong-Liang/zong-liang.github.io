# Live and learn!


给出图中算法题的详细解题思路，并给出每一种方法对应的Java代码，返回结果参照下面的格式：

## 解题思路:

这道题是"合并区间"问题。要求合并所有重叠的区间，并返回一个不重叠的区间数组。关键是要先对区间按起始位置排序，然后依次判断是否需要合并。

### 方法一：排序+遍历合并（推荐）

先按区间起始位置排序，然后遍历数组，依次判断当前区间是否与前一个区间重叠。

```java
class Solution {
    public int[][] merge(int[][] intervals) {
        if (intervals.length <= 1) {
            return intervals;
        }
        
        // 按起始位置排序
        Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
        
        List<int[]> merged = new ArrayList<>();
        
        for (int[] interval : intervals) {
            // 如果结果列表为空，或当前区间与上一个区间不重叠
            if (merged.isEmpty() || merged.get(merged.size() - 1)[1] < interval[0]) {
                merged.add(interval);
            } else {
                // 合并区间：更新上一个区间的结束位置
                merged.get(merged.size() - 1)[1] = Math.max(merged.get(merged.size() - 1)[1], interval[1]);
            }
        }
        
        return merged.toArray(new int[merged.size()][]);
    }
}
```

**时间复杂度**：$O(n \log n)$，主要是排序的时间复杂度。

**空间复杂度**：$O(n)$，存储结果的空间。

### 方法二：使用栈

利用栈的特性来处理区间合并，栈顶始终保持当前正在处理的区间。

```java
class Solution {
    public int[][] merge(int[][] intervals) {
        if (intervals.length <= 1) {
            return intervals;
        }
        
        // 按起始位置排序
        Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
        
        Stack<int[]> stack = new Stack<>();
        stack.push(intervals[0]);
        
        for (int i = 1; i < intervals.length; i++) {
            int[] current = intervals[i];
            int[] top = stack.peek();
            
            // 如果当前区间与栈顶区间重叠
            if (current[0] <= top[1]) {
                // 合并区间
                top[1] = Math.max(top[1], current[1]);
            } else {
                // 不重叠，直接入栈
                stack.push(current);
            }
        }
        
        return stack.toArray(new int[stack.size()][]);
    }
}
```

**时间复杂度**：$O(n \log n)$，主要是排序的时间复杂度。

**空间复杂度**：$O(n)$，栈的空间。

**推荐使用方法一（排序+遍历合并）**，它思路最清晰，代码最简洁，也是最常用的解法。

**核心思想**：

1. 首先按区间起始位置排序，这样重叠的区间必然相邻
2. 遍历排序后的区间数组，判断当前区间是否与前一个区间重叠
3. 如果重叠就合并（更新结束位置），如果不重叠就添加新区间
4. 重叠判断条件：前一个区间的结束位置 >= 当前区间的开始位置
