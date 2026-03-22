# Daily_Blogging

![](https://cdn.jsdelivr.net/gh/Zong-Liang/blog_images/blog/20251118102911817.svg)

## Talk is cheap, show me the blog.

This is a personal blog built on top of `jekyll-theme-chirpy`, deeply customized with a tailored **Catppuccin** aesthetic.

### 🎨 Theme & Typography Features
The blog features a highly polished reading experience:
- **Themes**: Exclusively uses **Catppuccin Latte** (Light Mode) and **Catppuccin Macchiato** (Dark Mode).
- **Body Fonts**: `Nunito` & `Quicksand` for a playful, rounded, and friendly reading vibe, with `STYuanti` (幼圆/圆体) natively mapped for perfectly soft Chinese characters.
- **Code Fonts**: A "Golden Straight" mix of `Fira Code` (English) and `LXGW WenKai Mono Lite` / 霞鹜文楷等宽版 (Chinese), ensuring elegant handwritten-style documentation without sacrificing strict code alignment.

---

## 💻 Local Development

### 1. Prerequisites

Before running the project locally, ensure you have the following installed:
- [Ruby](https://rubyinstaller.org/) (Version 3.0 or higher is recommended)
- Bundler

You can install/update Bundler by running:
```sh
gem install bundler
```

> **Note for Windows users**: If `bundle install` fails during native extensions build, ensure you have installed the **RubyInstaller with MSYS2 Devkit**, which gives you `make` and `gcc`.

### 2. Install Dependencies

Navigate to the project root directory and install all required gems:
```sh
bundle install
```

### 3. Start the Local Server

Run the local Jekyll server with live-reload enabled (so the browser refreshes automatically when you modify files):
```sh
bundle exec jekyll serve --livereload
```
Your site will then be available at 👉 **http://127.0.0.1:4000**

#### ⚠️ Port Conflicts
If you encounter a `Permission denied - bind(2) for 127.0.0.1:4000` or `Address already in use` error, it means port 4000 is occupied by another application. You can easily specify a different port to start the server:
```sh
bundle exec jekyll serve --livereload --port 8888
```
Then visit 👉 **http://127.0.0.1:8888**

*(Alternatively, the repository provides a legacy cross-platform wrapper entrypoint: `ruby tools/dev.rb`)*
