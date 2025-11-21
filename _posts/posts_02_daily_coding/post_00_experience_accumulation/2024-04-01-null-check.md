---
title: 判空最佳实践
date: 2024-04-01 06:00:00 +0800
categories: [Daily Coding, Experience Accumulation，Null Check]
tags: [Null Check]
toc: true
math: true
pin: false
render_with_liquid: false
image:
  path: https://cdn.jsdelivr.net/gh/Zong-Liang/blog_images/blog/2024/daily_coding/20251121102447000.png
  lqip: data:image/webp;base64,UklGRpoAAABXRUJQVlA4WAoAAAAQAAAADwAABwAAQUxQSDIAAAARL0AmbZurmr57yyIiqE8oiG0bejIYEQTgqiDA9vqnsUSI6H+oAERp2HZ65qP/VIAWAFZQOCBCAAAA8AEAnQEqEAAIAAVAfCWkAALp8sF8rgRgAP7o9FDvMCkMde9PK7euH5M1m6VWoDXf2FkP3BqV0ZYbO6NA/VFIAAAA
---

“判空”（Null Check）看似简单，却是 Java 开发中出现 Bug（尤其是 `NullPointerException`，即 NPE）最频繁的地方，也是代码 ba'd的重灾区。

在代码规范和实际开发中，我们不仅仅关注“怎么判空”，更关注 **“为什么需要判空”** 以及 **“如何优雅地处理空值”**。

以下是我针对不同场景，总结的判空最佳实践方案：

## 1. 字符串判空 (String)

字符串不仅要防 `null`，还要防空串 `""` 和纯空格 `"   "`。

- **❌ 不推荐（原生写法）：**

  ```java
  if (str != null && str.length() > 0) { ... }
  // 或者
  if (str != null && !str.equals("")) { ... }
  ```

  _缺点：啰嗦，容易漏掉由纯空格组成的字符串。_

- **✅ 推荐（工具类）：**
  **场景 A：允许纯空格（即只认为是 null 或 length=0 时为空）**
  使用 **Apache Commons Lang3** 的 `StringUtils`（这是业界标准）：

  ```java
  if (StringUtils.isEmpty(str)) { ... }
  ```

  **场景 B：严格判空（null、""、" " 都视为空）**
  这是业务开发中最常用的，尤其是处理用户输入时：

  ```java
  if (StringUtils.isBlank(str)) { ... }
  ```

  _(注：Java 11+ 原生支持 `str.isBlank()`，但前提是 `str` 本身不能为 `null`，所以 `StringUtils` 依然是最安全的切入点。)_

## 2. 集合与数组判空 (Collection, Map, Array)

- **❌ 不推荐（原生写法）：**

  ```java
  if (list != null && list.size() > 0) { ... }
  ```

- **✅ 推荐（工具类）：**
  使用 **Apache Commons Collections** 或 **Spring Framework** 自带的工具：

  ```java
  // 集合
  if (CollectionUtils.isEmpty(list)) { ... }
  // Map
  if (MapUtils.isEmpty(map)) { ... }
  ```

- **🌟 建议：**
  在**返回值**层面，**永远不要返回 null 的集合**。如果查询无结果，请返回 `Collections.emptyList()` 或 `Collections.emptyMap()`。

  这样调用方就不需要进行判空操作，直接 `for` 循环即可（空集合循环不会执行），代码会极其清爽。

## 3. 普通对象判空 & 级联调用

当你需要判断 `user` 是否为空，或者 `user.getAddress().getCity()` 这种深层链式调用时。

- **❌ 不推荐（深层嵌套）：**

  ```java
  if (user != null) {
      Address address = user.getAddress();
      if (address != null) {
          ...
      }
  }
  ```

  _缺点：代码像“楼梯”一样，难以阅读。_

- **✅ 推荐（Java 8+ Optional）：**
  利用 `Optional` 进行“链式流转”，优雅处理：
  ```java
  // 获取 city，如果中间任何环节为 null，则返回默认值 "Unknown"
  String city = Optional.ofNullable(user)
          .map(User::getAddress)
          .map(Address::getCity)
          .orElse("Unknown");
  ```

## 4. 方法入参校验 (Fail Fast 原则)

在方法内部，如果参数是 `null` 会导致后续逻辑无法运行，那么应该**尽早报错（Fail Fast）**，而不是默默处理。

- **✅ 推荐（JDK 7+ Objects）：**

  ```java
  public void processUser(User user) {
      // 如果 user 为 null，直接抛出 NPE 并带上自定义信息
      Objects.requireNonNull(user, "User object cannot be null");

      // 业务逻辑...
  }
  ```

- **✅ 推荐（Google Guava Preconditions）：**
  如果你在用 Guava，这是更强大的选择，通常用于校验参数合法性：
  ```java
  // 既判空，又可以判断业务规则
  Preconditions.checkNotNull(user, "User is null");
  Preconditions.checkArgument(age > 0, "Age must be positive");
  ```

## 5. 避免判空

最高级的判空是 **“设计上避免产生 null”**。

1.  **数据库设计：** 尽量设置字段 `NOT NULL` 并给默认值（如 `0`、`""`、`1970-01-01`），避免数据库查出来就是 null。
2.  **使用 Optional 作为返回值：** 如果一个方法可能找不到数据，返回 `Optional<T>` 而不是 `T`。这会强制调用者处理“不存在”的情况。
    ```java
    // 明确告诉调用者：这里可能没有 User
    public Optional<User> findUserById(String id);
    ```
3.  **Lombok 与 注解：** 使用 `@NonNull` 和 `@Nullable` 注解（如 JSR-305 或 Spring 的注解）。这不仅能让 IDE（IntelliJ IDEA）在编译期给出黄色警告，还能通过 Lombok 自动生成判空代码。

### 总结：你应该如何选择？

| 场景                  | 最佳实践代码                                   | 依赖库                              |
| :-------------------- | :--------------------------------------------- | :---------------------------------- |
| **字符串** (含空格)   | `StringUtils.isBlank(str)`                     | Apache Commons Lang3                |
| **集合/Map**          | `CollectionUtils.isEmpty(col)`                 | Apache Commons Collections / Spring |
| **链式取值** (防 NPE) | `Optional.ofNullable(obj).map().orElse()`      | JDK 8+                              |
| **方法必须非空**      | `Objects.requireNonNull(obj, msg)`             | JDK 7+                              |
| **对象是否为空**      | `Objects.isNull(obj)` / `Objects.nonNull(obj)` | JDK 7+ (配合 Stream 使用)           |

**记住一句格言：**"Null sucks." —— 尽量减少 Null 的传递，如果必须传递，请用 Optional 或注解显式声明。
