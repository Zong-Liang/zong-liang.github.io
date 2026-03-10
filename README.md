# Daily_Blogging

![](https://cdn.jsdelivr.net/gh/Zong-Liang/blog_images/blog/20251118102911817.svg)

## Talk is cheap, show me the blog.

## Local Development

This project currently uses the local Ruby toolchain directly.
It does not include a Docker-based or zero-setup development environment.
The repository keeps a single cross-platform dev entrypoint:
`ruby tools/dev.rb`.

### Prerequisites

Before running the dev script, make sure your machine already has:

- Ruby installed and available in `PATH`
- Bundler installed

This project is currently using Bundler `2.6.9`.
If Bundler is missing, install it with:

```sh
gem install bundler -v 2.6.9
```

Quick install commands:

```sh
# macOS (Homebrew)
brew install ruby
gem install bundler -v 2.6.9

# Windows (winget / Microsoft Store package)
winget install "Ruby 4.0"
gem install bundler -v 2.6.9
```

On Windows, PowerShell / CMD / Git Bash are all fine as long as `ruby` and
`bundle` are available in `PATH`.

If `bundle install` fails on Windows because of native extensions, install the
RubyInstaller MSYS2 Devkit as well, then rerun the commands above.

Run the local Jekyll site with:

```sh
ruby tools/dev.rb
```

Optional overrides:

```sh
JEKYLL_HOST=127.0.0.1 JEKYLL_PORT=4000 ruby tools/dev.rb
```

The script will:

- install project gems into `vendor/bundle`
- start the Jekyll site at `http://127.0.0.1:4000`

The script will not:

- install Ruby for you
- install Bundler for you
- provision Docker / Dev Container automatically
