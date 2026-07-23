$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$log = Join-Path $root 'web-dev.log'

$env:NEXT_IGNORE_INCORRECT_LOCKFILE = "1"
Set-Location $root
& $npm run dev:web *> $log
