$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
pnpm build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
pnpm start
exit $LASTEXITCODE
