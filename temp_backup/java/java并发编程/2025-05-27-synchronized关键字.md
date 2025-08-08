---
title: "synchronized 关键字"
date: 2025-05-27 09:09:09 +0800
categories: [JAVA, JAVA 并发编程]
tags: [并发编程, JUC]
pin: false
toc: true
math: true
---

## `synchronized` 的作用：

### 确保线程同步：

`synchronized` 可以确保多个线程在访问共享资源时，同一时间只有一个线程能够执行被 `synchronized` 修饰的代码块或方法。它通过对共享资源进行加锁的方式，防止多个线程同时对共享资源进行读写操作。

```java
public class Counter {
    private int count = 0;

    public synchronized void increment() {
        count++;
    }

    public synchronized int getCount() {
        return count;
    }
}
```

- 在这个例子中，`increment()` 和 `getCount()` 方法都被 `synchronized` 修饰，确保了同一时间只有一个线程能够访问这些方法。

### 确保内存可见性：

`synchronized` 不仅可以确保线程同步，还可以确保内存可见性。当一个线程进入 `synchronized` 代码块时，它会从主内存中读取共享变量的值；当线程退出 `synchronized` 代码块时，它会将共享变量的值刷新回主内存。这确保了变量的修改能够被其他线程看到。

```java
public class VisibilityExample {
    private int ready = 0;

    public synchronized void writer() {
        ready = 1; // 写操作
    }

    public synchronized void reader() {
        while (ready != 1) { // 读操作
            // 等待 ready 变为 1
        }
        System.out.println("Ready is 1");
    }
}
```

- 在这个例子中，`ready` 的读写操作都在 `synchronized` 方法中进行，确保了线程之间的内存可见性。

### 禁止指令重排序：

`synchronized` 也可以禁止指令重排序。在 `synchronized` 代码块中，编译器和处理器不会对指令进行重排序，这确保了代码的执行顺序与程序员的预期一致。

```java
public class SynchronizedOrderingExample {
    private int x = 0;
    private int y = 0;

    public synchronized void writer() {
        x = 1; // 写操作
        y = 1; // 写操作
    }

    public synchronized void reader() {
        if (y == 1) { // 读操作
            System.out.println("x = " + x); // 读操作
        }
    }
}
```

- 在这个例子中，`x` 和 `y` 的读写操作都在 `synchronized` 方法中进行，确保了指令不会被重排序。

## `synchronized` 的实现原理：

### 监视器锁（Monitor Lock）：

`synchronized` 的实现依赖于 Java 的监视器锁（Monitor Lock）。监视器锁是一种互斥锁，确保同一时间只有一个线程能够持有某个对象的锁。每个 Java 对象都有一个与之关联的监视器锁。

- 当一个线程进入 `synchronized` 代码块时，它会尝试获取对象的锁。
- 如果锁已经被其他线程持有，当前线程会阻塞，直到锁被释放。
- 当线程退出 `synchronized` 代码块时，它会释放对象的锁。

```java
volatile int x = 0;
```

- 写操作：`x = 1` 会在写入主内存后插入写屏障。
- 读操作：读取 `x` 会在读取主内存前插入读屏障。

### 锁的分类：

`synchronized` 可以用于两种类型的锁：

- 对象锁：锁住某个对象实例，适用于实例方法和同步代码块。
- 类锁：锁住整个类，适用于静态方法。

```java
public class SynchronizedExample {
    private int count = 0;

    // 对象锁
    public synchronized void increment() {
        count++;
    }

    // 类锁
    public static synchronized void staticIncrement() {
        count++;
    }

    // 同步代码块
    public void incrementWithBlock() {
        synchronized (this) { // 对象锁
            count++;
        }
    }

    // 静态同步代码块
    public void staticIncrementWithBlock() {
        synchronized (SynchronizedExample.class) { // 类锁
            count++;
        }
    }
}
```

- 在这个例子中，`increment()` 方法使用对象锁，`staticIncrement()` 方法使用类锁。
- `incrementWithBlock()` 方法使用对象锁的同步代码块，`staticIncrementWithBlock()` 方法使用类锁的同步代码块。

### happens-before 原则：

`synchronized` 也满足 happens-before 原则，确保了线程之间的内存可见性和执行顺序。具体规则如下：

- 对一个锁的解锁操作 happens-before 后续对同一个锁的加锁操作。
- 对一个锁的加锁操作 happens-before 后续对同一个锁的解锁操作。

## `synchronized` 的使用场景：

### 保护共享资源：

`synchronized` 常用于保护共享资源，确保多个线程在访问共享资源时不会出现数据竞争或线程安全问题。

```java
public class Counter {
    private int count = 0;

    public synchronized void increment() {
        count++;
    }

    public synchronized int getCount() {
        return count;
    }
}
```

- 在这个例子中，`increment()` 和 `getCount()` 方法都被 `synchronized` 修饰，确保了对 `count` 的访问是线程安全的。

### 确保内存可见性：

`synchronized` 可以确保线程之间的内存可见性，防止因缓存导致的变量不一致问题。

```java
public class VisibilityExample {
    private int ready = 0;

    public synchronized void writer() {
        ready = 1; // 写操作
    }

    public synchronized void reader() {
        while (ready != 1) { // 读操作
            // 等待 ready 变为 1
        }
        System.out.println("Ready is 1");
    }
}
```

- 在这个例子中，`ready` 的读写操作都在 `synchronized` 方法中进行，确保了线程之间的内存可见性。

### 防止指令重排序：

`synchronized` 可以用于防止指令重排序，确保程序的逻辑正确性。

```java
public class SynchronizedOrderingExample {
    private int x = 0;
    private int y = 0;

    public synchronized void writer() {
        x = 1; // 写操作
        y = 1; // 写操作
    }

    public synchronized void reader() {
        if (y == 1) { // 读操作
            System.out.println("x = " + x); // 读操作
        }
    }
}
```

- 在这个例子中，`x` 和 `y` 的读写操作都在 `synchronized` 方法中进行，确保了指令不会被重排序。

## `synchronized` 的性能开销：

### 锁的开销：

`synchronized` 的实现依赖于监视器锁，锁的获取和释放会引入一定的性能开销。每次进入或退出 `synchronized` 代码块时，线程都需要进行锁的获取和释放操作，这可能会导致线程阻塞。

### 锁的优化：

为了减少锁的开销，Java 虚拟机（JVM）对锁进行了优化，包括：

- 偏向锁（Biased Locking）：偏向锁是一种轻量级的锁，它假设锁在大部分时间内只被一个线程持有。如果锁被一个线程多次获取，JVM 会将锁偏向该线程，减少锁的开销。
- 轻量级锁（Lightweight Locking）：轻量级锁是一种基于锁消除的优化技术，它通过锁的消除来减少锁的开销。
- 自旋锁（Spin Lock）：自旋锁是一种锁的优化技术，它通过让线程在等待锁时进行自旋（即不断尝试获取锁）来减少线程的阻塞时间。

### 锁的升级：

JVM 会根据锁的使用情况自动对锁进行升级，从偏向锁升级到轻量级锁，再到重量级锁。锁的升级过程是透明的，程序员不需要手动干预。

## `synchronized` 的替代方案：

### `java.util.concurrent.locks` 包：

`synchronized` 是 Java 中最基本的同步机制，但它也有一些限制，例如锁的粒度较粗、无法中断锁的等待等。为了弥补这些不足，Java 提供了 `java.util.concurrent.locks` 包，其中包含了一些更高级的锁机制，例如 `ReentrantLock`、`ReadWriteLock` 等。

```java
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

public class Counter {
    private int count = 0;
    private final Lock lock = new ReentrantLock();

    public void increment() {
        lock.lock(); // 获取锁
        try {
            count++;
        } finally {
            lock.unlock(); // 释放锁
        }
    }

    public int getCount() {
        lock.lock(); // 获取锁
        try {
            return count;
        } finally {
            lock.unlock(); // 释放锁
        }
    }
}
```

- 在这个例子中，`ReentrantLock` 提供了比 `synchronized` 更灵活的锁控制，例如可以尝试获取锁、设置锁的超时时间等。

### `volatile` 关键字：

`volatile` 是 Java 中另一个用于解决线程安全问题的关键字，它可以确保变量的内存可见性和禁止指令重排序。虽然 `volatile` 不能保证复合操作的原子性，但它在某些场景下可以替代 `synchronized`。

```java
public class VolatileExample {
    private volatile boolean ready = false;

    public void writer() {
        ready = true; // 写操作
    }

    public void reader() {
        while (!ready) { // 读操作
            // 等待 ready 变为 true
        }
        System.out.println("Ready is true");
    }
}
```

- 在这个例子中，`ready` 被声明为 `volatile`，确保了线程之间的内存可见性。
