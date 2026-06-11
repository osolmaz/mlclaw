#!/usr/bin/env bash
set -euo pipefail

MIN_NODE_MAJOR="${HCLAW_MIN_NODE_MAJOR:-22}"
NODE_VERSION="${HCLAW_NODE_VERSION:-v24.16.0}"
PACKAGE_SPEC="${HCLAW_NPM_SPEC:-huggingclaw}"
CACHE_ROOT="${HCLAW_CACHE_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/huggingclaw}"

die() {
  printf 'hclaw: %s\n' "$*" >&2
  exit 1
}

node_major() {
  "$1" -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || printf '0\n'
}

node_is_compatible() {
  local node_bin="$1"
  local major
  major="$(node_major "$node_bin")"
  [ "$major" -ge "$MIN_NODE_MAJOR" ]
}

system_node() {
  if command -v node >/dev/null 2>&1 && node_is_compatible "$(command -v node)"; then
    command -v node
  fi
}

platform_name() {
  case "$(uname -s)" in
    Darwin) printf 'darwin' ;;
    Linux) printf 'linux' ;;
    *) die "unsupported operating system: $(uname -s)" ;;
  esac
}

arch_name() {
  case "$(uname -m)" in
    x86_64 | amd64) printf 'x64' ;;
    arm64 | aarch64) printf 'arm64' ;;
    *) die "unsupported CPU architecture: $(uname -m)" ;;
  esac
}

cached_node_dir() {
  printf '%s/node/%s-%s-%s\n' "$CACHE_ROOT" "$NODE_VERSION" "$(platform_name)" "$(arch_name)"
}

install_node() {
  command -v curl >/dev/null 2>&1 || die "curl is required to install Node.js"
  command -v tar >/dev/null 2>&1 || die "tar is required to install Node.js"

  local os arch archive_name url temp_dir target_dir
  os="$(platform_name)"
  arch="$(arch_name)"
  archive_name="node-${NODE_VERSION}-${os}-${arch}"
  url="https://nodejs.org/dist/${NODE_VERSION}/${archive_name}.tar.xz"
  target_dir="$(cached_node_dir)"

  if [ -x "$target_dir/bin/node" ] && node_is_compatible "$target_dir/bin/node"; then
    printf '%s\n' "$target_dir"
    return
  fi

  temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/hclaw-node.XXXXXX")"
  mkdir -p "$(dirname "$target_dir")"
  printf 'hclaw: installing Node.js %s into %s\n' "$NODE_VERSION" "$target_dir" >&2
  if ! curl -fsSL "$url" -o "$temp_dir/node.tar.xz"; then
    rm -rf "$temp_dir"
    die "failed to download Node.js from $url"
  fi
  if ! tar -xJf "$temp_dir/node.tar.xz" -C "$temp_dir"; then
    rm -rf "$temp_dir"
    die "failed to unpack Node.js archive"
  fi
  rm -rf "$target_dir"
  mv "$temp_dir/$archive_name" "$target_dir"
  rm -rf "$temp_dir"
  printf '%s\n' "$target_dir"
}

run_with_node() {
  local node_bin="$1"
  shift
  local npm_cli node_path
  node_path="$(dirname "$node_bin")"
  npm_cli="$(dirname "$node_bin")/../lib/node_modules/npm/bin/npm-cli.js"
  if [ -f "$npm_cli" ]; then
    PATH="$node_path:$PATH" exec "$node_bin" "$npm_cli" exec --yes --package "$PACKAGE_SPEC" -- huggingclaw "$@"
  fi
  if command -v npm >/dev/null 2>&1; then
    PATH="$node_path:$PATH" exec npm exec --yes --package "$PACKAGE_SPEC" -- huggingclaw "$@"
  fi
  die "npm was not found for Node runtime $node_bin"
}

main() {
  local node_bin node_dir
  node_bin="$(system_node || true)"
  if [ -n "$node_bin" ]; then
    run_with_node "$node_bin" "$@"
  fi
  node_dir="$(install_node)"
  run_with_node "$node_dir/bin/node" "$@"
}

main "$@"
