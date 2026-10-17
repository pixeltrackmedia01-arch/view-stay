#!/usr/bin/env bash
# Package the committed source tree (HEAD) as deploy/viewstay.zip for Hostinger's
# Node.js "build from archive" pipeline. The server clones this repo and builds from the zip.
set -euo pipefail
cd "$(dirname "$0")/.."
git archive --format=zip -o deploy/viewstay.zip HEAD -- . ':!deploy'
echo "deploy/viewstay.zip ($(stat -c%s deploy/viewstay.zip) bytes) from $(git rev-parse --short HEAD)"
