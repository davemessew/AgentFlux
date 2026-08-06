#!/bin/sh
set -eu
cd "$(dirname "$0")"
pnpm install --frozen-lockfile
pnpm build
exec pnpm start
