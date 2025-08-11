给出图中算法题的详细解题思路，并给出对应的Java代码，返回结果参照下面的格式：

## 解题思路：

这是一道关于字母异位词分组的问题。需要将具有相同字母但顺序不同的字符串归为一组。

### 方法一：排序分组法（推荐）

核心思想是将每个字符串排序后作为键，相同键的字符串属于同一组。

**算法步骤：**

1. 遍历字符串数组
2. 将每个字符串的字符排序，得到排序后的字符串作为键
3. 使用 `HashMap`，键为排序后的字符串，值为原字符串列表
4. 将 `HashMap` 中的所有值转换为结果列表

```java
class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        if (strs == null || strs.length == 0) {
            return new ArrayList<>();
        }

        // 使用HashMap存储分组结果
        Map<String, List<String>> map = new HashMap<>();

        for (String str : strs) {
            // 将字符串转为字符数组并排序
            char[] chars = str.toCharArray();
            Arrays.sort(chars);
            String sortedStr = new String(chars);

            // 如果键不存在，创建新的列表
            if (!map.containsKey(sortedStr)) {
                map.put(sortedStr, new ArrayList<>());
            }
            // 将原字符串添加到对应组中
            map.get(sortedStr).add(str);

            // map.computeIfAbsent(sortedStr, k -> new ArrayList<>()).add(str);
        }

        // 返回所有分组
        return new ArrayList<>(map.values());
    }
}
```

**时间复杂度：** $O(n \times k \log k)$，其中 $n$ 是字符串数组长度，$k$ 是字符串的最大长度。排序每个字符串需要 $O(k \log k)$ 时间。

**空间复杂度：** $O(n \times k)$，存储所有字符串和排序后的键。

### 方法二：字符计数法

使用字符频次统计作为键，避免排序操作。

**算法步骤：**

1. 遍历字符串数组
2. 统计每个字符串中各字符的出现频次
3. 将频次数组转换为字符串作为键
4. 使用 `HashMap` 进行分组

```java
class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        if (strs == null || strs.length == 0) {
            return new ArrayList<>();
        }

        Map<String, List<String>> map = new HashMap<>();

        for (String str : strs) {
            // 统计字符频次，假设只包含小写字母
            int[] count = new int[26];
            for (char c : str.toCharArray()) {
                count[c - 'a']++;
            }

            // 将频次数组转换为字符串作为键
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 26; i++) {
                sb.append('#').append(count[i]);
            }
            String key = sb.toString();

            // 分组
            if (!map.containsKey(key)) {
                map.put(key, new ArrayList<>());
            }
            map.get(key).add(str);

            // map.computeIfAbsent(key, k -> new ArrayList<>()).add(str);
        }

        return new ArrayList<>(map.values());
    }
}
```

**时间复杂度：** $O(n \times k)$，其中 $n$ 是字符串数组长度，$k$ 是字符串的最大长度。

**空间复杂度：** $O(n \times k)$，存储所有字符串和计数键。

**推荐使用方法一（排序分组法）**，因为它简单易懂，适用范围广；如果对性能要求较高且字符串长度较短，可以考虑方法二（字符计数法）。

