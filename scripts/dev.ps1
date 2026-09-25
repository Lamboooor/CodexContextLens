param([ValidateSet('test','package','check','release')][string]$Task = 'test')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) { $nodeFile = $nodeCommand.Source }
else {
    $locationFile = Join-Path $projectRoot '.tools/node-location.txt'
    if (!(Test-Path -LiteralPath $locationFile)) { throw 'Node.js 22+ is required.' }
    $nodeFolder = (Get-Content -LiteralPath $locationFile -Raw).Trim()
    $nodeFile = Join-Path $projectRoot ".tools/$nodeFolder/node.exe"
}
Push-Location $projectRoot
try {
    switch ($Task) {
        'test' { & $nodeFile scripts/test.cjs }
        'package' { & $nodeFile scripts/build.cjs }
        'check' { python scripts/check-package.py }
        'release' { & $nodeFile scripts/release-check.cjs }
    }
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally { Pop-Location }
