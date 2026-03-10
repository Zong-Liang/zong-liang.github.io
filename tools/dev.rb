#!/usr/bin/env ruby

root_dir = File.expand_path("..", __dir__)
host = ENV.fetch("JEKYLL_HOST", "127.0.0.1")
port = ENV.fetch("JEKYLL_PORT", "4000")

if RUBY_PLATFORM.match?(/mswin|mingw|cygwin/)
  ruby_bins = [
    "C:/Ruby40-x64/bin",
    "C:/Ruby34-x64/bin",
    "C:/Ruby33-x64/bin"
  ]
  ruby_bin = ruby_bins.find { |dir| Dir.exist?(dir) }
  if ruby_bin
    path_entries = ENV.fetch("PATH", "").split(";")
    ENV["PATH"] = "#{ruby_bin};#{ENV['PATH']}" unless path_entries.include?(ruby_bin)
  end
end

Dir.chdir(root_dir)

unless system("bundle", "--version", out: File::NULL, err: File::NULL)
  warn "bundle was not found in PATH."
  warn "Install Bundler first, for example: gem install bundler -v 2.6.9"
  warn "If Ruby is not in PATH yet, install Ruby and reopen your terminal."
  exit 1
end

puts "Installing gems into vendor/bundle..."
exit 1 unless system("bundle", "install")

puts "Starting Jekyll at http://#{host}:#{port}"
exec("bundle", "exec", "ruby", "-S", "jekyll", "serve", "--host", host, "--port", port, "--livereload")
