#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

if [[ $# -ge 1 && -n "${1}" ]]; then
  export FIREFOX_BINARY="${1}"
fi

if [[ $# -ge 2 && -n "${2}" ]]; then
  export BTFF_START_URL="${2}"
fi

npm run smoke:firefox
