#!/usr/bin/env bash
# Downloads the default Whisper model for Velox (free, open source).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODELS_DIR="${VELOX_MODELS_DIR:-${ROOT_DIR}/models}"
MODEL_NAME="base-q5_1"
MODEL_FILE="ggml-${MODEL_NAME}.bin"
MODEL_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_FILE}"
TARGET_PATH="${MODELS_DIR}/${MODEL_FILE}"

mkdir -p "${MODELS_DIR}"

if [[ -f "${TARGET_PATH}" ]]; then
  SIZE="$(du -h "${TARGET_PATH}" | cut -f1)"
  echo "✓ Model already installed"
  echo "  Path: ${TARGET_PATH}"
  echo "  Size: ${SIZE}"
  exit 0
fi

echo "Downloading Whisper model: ${MODEL_NAME} (${MODEL_FILE})"
echo "Source: ${MODEL_URL}"
echo "Target: ${TARGET_PATH}"
echo ""
echo "This is ~60 MB and may take a minute depending on your connection."
echo ""

curl -L --fail --retry 3 --progress-bar \
  -o "${TARGET_PATH}.partial" \
  "${MODEL_URL}"

mv "${TARGET_PATH}.partial" "${TARGET_PATH}"

SIZE="$(du -h "${TARGET_PATH}" | cut -f1)"
echo ""
echo "✓ Download complete"
echo "  Path: ${TARGET_PATH}"
echo "  Size: ${SIZE}"
