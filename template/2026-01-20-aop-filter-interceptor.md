---
title: AOP、Filter、Interceptor 全面分析与对比
date: 2026-01-20 06:00:00 +0800
categories: [Java Backend, Spring]
tags: [AOP, Filter, Interceptor]
toc: true
math: true
pin: false
render_with_liquid: false
image:
  path: https://cdn.jsdelivr.net/gh/Zong-Liang/blog_images/blog/2024/daily_coding/20260120162322995.png
  lqip: data:image/webp;base64,UklGRpoAAABXRUJQVlA4WAoAAAAQAAAADwAABwAAQUxQSDIAAAARL0AmbZurmr57yyIiqE8oiG0bejIYEQTgqiDA9vqnsUSI6H+oAERp2HZ65qP/VIAWAFZQOCBCAAAA8AEAnQEqEAAIAAVAfCWkAALp8sF8rgRgAP7o9FDvMCkMde9PK7euH5M1m6VWoDXf2FkP3BqV0ZYbO6NA/VFIAAAA
---

AOP、Filter、Interceptor 常被用于日志、鉴权、限流、埋点等“横切需求”，但它们处在**不同的层级**，解决的问题也不一样。选错位置会带来隐性成本：链路丢失、性能浪费、或逻辑重复。本文从**概念、底层原理、使用方法、使用场景、选择策略**五个维度展开，给出清晰的对比框架，帮助你快速决策。

## 一、概念速览

- **Filter**：Servlet 规范的过滤器，面向 HTTP 请求/响应做“网关级”处理。
- **Interceptor**：Spring MVC 的拦截器，面向控制器执行流程做“路由级”处理。
- **AOP**：Spring 的面向切面编程，面向 Bean 方法做“业务级”织入。

一句话理解：

> Filter 处理“请求进来之前”，Interceptor 处理“请求到谁”，AOP 处理“谁的方法怎么执行”。

## 二、三者的“位置”

- **Filter（Servlet 规范）**：位于**Web 容器层**，请求进入 Spring 之前就可拦截。
- **Interceptor（Spring MVC）**：位于**MVC 处理流程**，能拿到 `Handler` 和 `ModelAndView`。
- **AOP（Spring AOP）**：位于**方法调用层**，对任意 Spring Bean 进行织入。

典型链路（简化）：

> Client → Filter → DispatcherServlet → Interceptor(pre) → Controller → Interceptor(post/after) → View → Filter → Client

AOP 则发生在 Controller/Service/Repository 的方法调用周围。

流程图（请求链路）：

```mermaid
sequenceDiagram
    participant C as Client
    participant F as Filter
    participant D as DispatcherServlet
    participant I as Interceptor
    participant H as Controller
    C->>F: HTTP Request
    F->>D: doFilter
    D->>I: preHandle
    I->>H: invoke
    H-->>I: return
    I-->>D: postHandle/afterCompletion
    D-->>F: response
    F-->>C: HTTP Response
```

## 三、底层原理（关键机制）

### 1. Filter 的底层原理

- **规范来源**：Java Servlet 规范。
- **执行机制**：容器在请求进入 Servlet 之前执行 FilterChain 的链式调用。
- **本质**：责任链模式（Chain of Responsibility）。

示意代码：

```java
public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) {
    // 前置处理
    chain.doFilter(req, res); // 传递到下一个 Filter/Servlet
    // 后置处理
}
```

核心特点：

- 由容器管理生命周期（初始化、销毁）。
- 只感知 `ServletRequest/Response`，不理解 Spring 的 `Handler`。

### 2. Interceptor 的底层原理

- **位置**：`DispatcherServlet` 内部。
- **执行机制**：在 `HandlerAdapter` 调用 `Controller` 前后执行 `HandlerInterceptor`。
- **本质**：MVC 流程中的回调扩展点。

示意代码：

```java
public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
    // 返回 false 可中断后续执行
    return true;
}
```

核心特点：

- 能拿到 `HandlerMethod`，适合基于注解/元数据的逻辑。
- 只对 Spring MVC 请求生效（与 WebFlux 不同）。

### 3. AOP 的底层原理

- **核心机制**：Spring 通过动态代理织入切面。
- **实现方式**：
  - JDK 动态代理（基于接口）
  - CGLIB 代理（基于子类）
- **本质**：代理模式 + 切点表达式（Pointcut）

示意代码：

```java
@Around("execution(* com.example.service..*(..))")
public Object around(ProceedingJoinPoint pjp) throws Throwable {
    return pjp.proceed();
}
```

核心特点：

- 与协议无关，可作用于任意 Spring Bean。
- **自调用失效**是典型陷阱（未经过代理）。

流程图（AOP 代理调用）：

```mermaid
sequenceDiagram
    participant Caller as Caller
    participant Proxy as Spring Proxy
    participant Target as Target Bean
    Caller->>Proxy: invoke()
    Proxy->>Proxy: before/around advice
    Proxy->>Target: method()
    Target-->>Proxy: result
    Proxy->>Proxy: after advice
    Proxy-->>Caller: result
```

## 四、对比总表

| 维度       | Filter                                   | Interceptor               | AOP                       |
| ---------- | ---------------------------------------- | ------------------------- | ------------------------- |
| 所在层级   | Servlet 容器                             | Spring MVC                | Spring 容器 / 代理层      |
| 作用范围   | Web 请求                                 | Web 请求 + 处理器         | 任意 Bean 方法            |
| 依赖规范   | Java Servlet 规范                        | Spring MVC                | Spring AOP                |
| 可见对象   | `ServletRequest/Response`                | `Handler`, `ModelAndView` | JoinPoint/方法参数/返回值 |
| 配置方式   | `@WebFilter` 或 `FilterRegistrationBean` | `WebMvcConfigurer`        | `@Aspect`                 |
| 执行时机   | 最早/最外层                              | 进入/退出 Controller      | 方法调用前后              |
| 异常处理   | 容器层                                   | MVC 层                    | 方法层                    |
| 跨协议能力 | 仅 HTTP                                  | 仅 HTTP                   | 与协议无关                |
| 典型场景   | 编解码、XSS、CORS、日志                  | 登录校验、权限、限流      | 事务、审计、埋点          |

## 五、使用方法（最小可用配置）

### 1. Filter 注册方式

- **方式 A**：`@WebFilter` + `@ServletComponentScan`
- **方式 B**：`FilterRegistrationBean`

常见：在 Spring Boot 中直接继承 `OncePerRequestFilter` 并声明为 `@Component`。

示例（FilterRegistrationBean）：

```java
@Bean
public FilterRegistrationBean<TraceIdFilter> traceIdFilter() {
    FilterRegistrationBean<TraceIdFilter> bean = new FilterRegistrationBean<>();
    bean.setFilter(new TraceIdFilter());
    bean.addUrlPatterns("/*");
    bean.setOrder(1);
    return bean;
}
```

### 2. Interceptor 注册方式

- 实现 `HandlerInterceptor`
- 在 `WebMvcConfigurer#addInterceptors` 中注册

示例（基于注解的拦截）：

```java
@Override
public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
    if (handler instanceof HandlerMethod method) {
        RequireLogin anno = method.getMethodAnnotation(RequireLogin.class);
        if (anno != null) {
            // 校验登录
        }
    }
    return true;
}
```

### 3. AOP 使用方式

- 定义切面类 `@Aspect`
- 配置切点表达式（如 `@annotation`、`execution`）
- 通过 `@Around/@Before/@After` 等通知织入逻辑

示例（方法级注解切面）：

```java
@Around("@annotation(Metrics)")
public Object around(ProceedingJoinPoint pjp) throws Throwable {
    long start = System.nanoTime();
    try {
        return pjp.proceed();
    } finally {
        long cost = System.nanoTime() - start;
    }
}
```

## 六、适用场景建议

### 1. Filter 更适合“通用且底层”的需求

- **跨应用、跨框架通用**：如编码、CORS、GZIP、XSS 过滤。
- **请求前置处理**：比如在进入 Spring 前做统一身份验证、灰度路由。
- **全局请求/响应包装**：如记录原始 body、包装 response。

> 要点：Filter 不知道 Spring 的 `Handler`，更像“HTTP 层网关”。

### 2. Interceptor 更适合“与 MVC 流程强相关”的需求

- **登录态校验与权限控制**：需要路由信息、注解、或控制器元数据。
- **接口级限流/防刷**：按 URL、Handler Method 精细控制。
- **请求耗时统计**：结合 handler 信息输出更精细日志。

> 要点：能拿到 `HandlerMethod`，非常适合做基于注解的逻辑。

### 3. AOP 更适合“业务方法维度”的横切能力

- **事务**（`@Transactional`）
- **方法级日志/审计/埋点**
- **权限校验（方法级）**
- **重试、熔断、监控**

> 要点：AOP 不局限于 Web，请求外也能生效。

## 七、三者的协作策略

可以把三者看成**三层拦截**：

1. **Filter**：在网络入口做粗粒度拦截（跨域、解码、黑名单）。
2. **Interceptor**：在 MVC 路由阶段做“接口级”控制。
3. **AOP**：在业务方法层做“方法级”控制。

分层是为了**职责清晰、逻辑聚焦**，避免在一个层面堆所有功能。

流程图（分层协作）：

```mermaid
flowchart LR
    A[Filter: 网络入口] --> B[Interceptor: 路由控制]
    B --> C[AOP: 方法级横切]
    C --> D[业务逻辑]
```

## 八、常见坑与注意点

### 1. AOP 自调用失效

同一个类中方法 A 调用方法 B，B 上的切面不会生效（未经过代理）。

**解决**：

- 通过 `ApplicationContext` 获取代理调用
- 或拆分到不同 Bean

### 2. Filter 与 Interceptor 的执行顺序

- **Filter 在最外层**，一定先于 Interceptor 执行。
- Interceptor 的 `postHandle` 在 Controller 执行后，但在 View 渲染前。
- `afterCompletion` 最后执行，常用于清理资源。

### 3. 响应体多次读取

Filter 中读取 request body 后，后续无法再读。

**解决**：使用 `HttpServletRequestWrapper` 缓存 body。

示例（缓存请求体）：

```java
public class CachedBodyRequest extends HttpServletRequestWrapper {
    private final byte[] body;

    public CachedBodyRequest(HttpServletRequest request) throws IOException {
        super(request);
        this.body = request.getInputStream().readAllBytes();
    }

    @Override
    public ServletInputStream getInputStream() {
        ByteArrayInputStream bais = new ByteArrayInputStream(body);
        return new DelegatingServletInputStream(bais);
    }
}
```

## 九、典型代码示例

### 1. Filter（一次请求只执行一次）

```java
@Component
public class TraceIdFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String traceId = UUID.randomUUID().toString();
            MDC.put("traceId", traceId);
            response.setHeader("X-Trace-Id", traceId);
            filterChain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
```

### 2. Interceptor（Controller 级别）

```java
@Component
public class AuthInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {
        // 登录校验
        return true;
    }
}

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AuthInterceptor())
                .addPathPatterns("/api/**");
    }
}
```

### 3. AOP（方法级）

```java
@Aspect
@Component
public class MetricsAspect {

    @Around("@annotation(Metrics)")
    public Object around(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        try {
            return pjp.proceed();
        } finally {
            long cost = System.currentTimeMillis() - start;
            // 上报指标
        }
    }
}
```

## 十、怎么选择？（决策清单）

按下面顺序判断即可：

1. **是否只关心 HTTP 请求本身？**
   - 是 → **Filter**
2. **是否依赖路由/Controller/注解信息？**
   - 是 → **Interceptor**
3. **是否是业务方法级别的横切能力？**
   - 是 → **AOP**

补充判断：

- **需要跨协议/非 Web 场景复用** → 选 AOP
- **需要在进入 Spring 之前就处理** → 选 Filter
- **需要和 MVC 生命周期紧密配合** → 选 Interceptor

## 十一、总结

Filter 是 HTTP 网关层，Interceptor 是 MVC 处理层，AOP 是业务方法层。三者各司其职、互补协作。正确的选择可以减少侵入性、降低耦合、提升性能与可维护性。
